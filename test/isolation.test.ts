import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  statSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { SystemRegistry } from "../packages/registry/src/index.js";
import {
  ADAPTER_ERRORS,
  DisposableCache,
  getWorkspace,
  readMarkdownFile,
  resolveWorkspaceRoot,
} from "../packages/os-read-adapter/src/index.js";
import { SubscriptionHub } from "../apps/gateway/src/index.js";
import { QueryRouter } from "../apps/gateway/src/index.js";
import { DashboardClient } from "../packages/client/src/index.js";
import {
  LayoutManager,
  PanelRegistry,
  defaultPhase1Panels,
} from "../apps/web/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

const SHARED_FILES: Record<string, string> = {
  "WORKSPACE.yaml": `schema_version: "2.0"\nid: "shared"\nname: "Shared name"\nstatus: "active"\n`,
  "context/CURRENT.md": "# Current Workspace Context\n\n## Objective\n\nSame objective.\n\n## Next useful actions\n\n- same action\n",
  "STATE.md": "---\ntitle: Same\n---\n\n# identical body\n",
};

/** Build a byte-identical OS fixture tree. Returns root. */
function makeIdenticalOs(label: string): string {
  const root = mkdtempSync(join(tmpdir(), `dash-iso-${label}-`));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const ws = join(root, "workspaces", "shared");
  mkdirSync(join(ws, "context"), { recursive: true });
  mkdirSync(join(ws, "inbox"), { recursive: true });
  for (const [rel, content] of Object.entries(SHARED_FILES)) {
    writeFileSync(join(ws, rel), content);
  }
  return root;
}

/** sha256 over every file's relative path + bytes, sorted. */
function treeHash(root: string): string {
  const files: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      try {
        const st = statSync(full);
        if (st.isDirectory()) walk(full, `${prefix}${name}/`);
        else if (st.isFile()) files.push(`${prefix}${name}`);
      } catch { /* ignore */ }
    }
  };
  walk(join(root, "workspaces", "shared"), "");
  const h = createHash("sha256");
  for (const rel of files) {
    h.update(rel);
    h.update(readFileSync(join(root, "workspaces", "shared", rel)));
  }
  return h.digest("hex");
}

describe("isolation Task 7: A vs B, traversal, symlink, byte-identical fixtures", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const r of roots.splice(0)) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  });

  it("fixtures start byte-identical, then reads stay in-registry per system", () => {
    const rootA = makeIdenticalOs("a");
    const rootB = makeIdenticalOs("b");
    roots.push(rootA, rootB);
    assert.equal(treeHash(rootA), treeHash(rootB));

    const regA = new SystemRegistry();
    const regB = new SystemRegistry();
    const sysA = regA.register(rootA).systemId;
    const sysB = regB.register(rootB).systemId;

    const wsA = resolveWorkspaceRoot(regA, sysA, "shared");
    const wsB = resolveWorkspaceRoot(regB, sysB, "shared");
    const projA = readMarkdownFile(wsA, "STATE.md");
    const projB = readMarkdownFile(wsB, "STATE.md");
    assert.equal(projA.sha256, projB.sha256); // identical content …
    assert.equal(projA.path, projB.path);

    // … but tampering B is visible only through B's registry.
    writeFileSync(join(rootB, "workspaces", "shared", "STATE.md"), "---\ntitle: Changed\n---\n\n# diverged\n");
    const projA2 = readMarkdownFile(resolveWorkspaceRoot(regA, sysA, "shared"), "STATE.md");
    const projB2 = readMarkdownFile(resolveWorkspaceRoot(regB, sysB, "shared"), "STATE.md");
    assert.equal(projA2.sha256, projA.sha256);
    assert.notEqual(projB2.sha256, projA.sha256);

    // Cross-registry resolve fails: B's systemId unknown to A's registry.
    // (Both registries auto-assign aiverse-01, so use an id A's registry
    // never issued — the point is regA cannot resolve B's system.)
    assert.throws(() => resolveWorkspaceRoot(regA, "house-b", "shared"), /./);
    assert.notEqual(wsA, wsB);
    // getWorkspace returns a value (never throws for comparison); the real
    // assertion is root inequality: A's resolved root is never B's root.
    assert.notEqual(getWorkspace(regA, sysA, "shared").rootReal, wsB);
  });

  it("caches never share across systems: adapter cache + web client", async () => {
    const cache = new DisposableCache();
    cache.putProjection("aiverse-01", "shared", "STATE.md", 100, 10, { body: "A" });
    cache.putProjection("aiverse-02", "shared", "STATE.md", 100, 10, { body: "B" });
    assert.deepEqual(cache.getProjection("aiverse-01", "shared", "STATE.md", 100, 10), { body: "A" });
    cache.invalidateSystem("aiverse-01");
    assert.equal(cache.getProjection("aiverse-01", "shared", "STATE.md", 100, 10), undefined);
    assert.deepEqual(cache.getProjection("aiverse-02", "shared", "STATE.md", 100, 10), { body: "B" });

    let sends = 0;
    const fetchFn = async (_url: string, init: { body: string }) => {
      sends += 1;
      const frame = JSON.parse(init.body) as { systemId: string };
      return {
        async json() {
          return { ok: true, result: { echo: frame.systemId }, systemId: frame.systemId, observedAt: new Date().toISOString() };
        },
      };
    };
    const clientA = new DashboardClient("http://127.0.0.1:9", { systemId: "aiverse-01", workspaceId: "shared" }, fetchFn);
    const clientB = new DashboardClient("http://127.0.0.1:9", { systemId: "aiverse-02", workspaceId: "shared" }, fetchFn);
    const ra = await clientA.query("task.list");
    const rb = await clientB.query("task.list");
    assert.deepEqual((ra.result as { echo: string }).echo, "aiverse-01");
    assert.deepEqual((rb.result as { echo: string }).echo, "aiverse-02");
    assert.equal(sends, 2); // no shared cache entry served the other system
    await clientA.query("task.list");
    assert.equal(sends, 2); // own cache hit still works
  });

  it("subscriptions and seq are per-system; identical ids do not collide", () => {
    const hub = new SubscriptionHub();
    const seenA: unknown[] = [];
    const seenB: unknown[] = [];
    hub.subscribe("aiverse-01", (ev) => seenA.push(ev));
    hub.subscribe("aiverse-02", (ev) => seenB.push(ev));
    const d1 = hub.publish({ event: "task.updated", systemId: "aiverse-01", workspaceId: "shared", payload: { id: "t-1" } });
    const d2 = hub.publish({ event: "task.updated", systemId: "aiverse-02", workspaceId: "shared", payload: { id: "t-1" } });
    assert.equal(seenA.length, 1);
    assert.equal(seenB.length, 1);
    assert.equal(d1?.seq, 1);
    assert.equal(d2?.seq, 1); // independent monotonic seq per system
    const d3 = hub.publish({ event: "task.updated", systemId: "aiverse-01", workspaceId: "shared", payload: { id: "t-2" } });
    assert.equal(d3?.seq, 2);
    assert.equal(seenB.length, 1);
  });

  it("traversal matrix fails closed on identical fixtures", () => {
    const root = makeIdenticalOs("t");
    roots.push(root);
    const reg = new SystemRegistry();
    const sys = reg.register(root).systemId;
    const ws = resolveWorkspaceRoot(reg, sys, "shared");
    const attacks = [
      "../STATE.md",
      "..\\STATE.md",
      "../../etc/passwd",
      "/etc/passwd",
      "C:\\Windows\\x.md",
      "\\\\srv\\share\\x.md",
      "sub/../../STATE.md",
      "STATE.md\0",
    ];
    for (const bad of attacks) {
      assert.throws(() => readMarkdownFile(ws, bad), /./, bad);
    }
    assert.throws(
      () => resolveWorkspaceRoot(reg, sys, "../shared"),
      (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.UNKNOWN_WORKSPACE,
    );
  });

  it("symlink escapes fail closed; interior symlinks still read", () => {
    const root = makeIdenticalOs("s");
    roots.push(root);
    const outside = mkdtempSync(join(tmpdir(), "dash-iso-out-"));
    roots.push(outside);
    writeFileSync(join(outside, "secret.md"), "secret");
    const reg = new SystemRegistry();
    const sys = reg.register(root).systemId;
    const wsDir = join(root, "workspaces", "shared");
    symlinkSync(join(outside, "secret.md"), join(wsDir, "escape.md"));
    symlinkSync(join(wsDir, "STATE.md"), join(wsDir, "alias.md"));
    const ws = resolveWorkspaceRoot(reg, sys, "shared");
    assert.throws(
      () => readMarkdownFile(ws, "escape.md"),
      (e: Error & { code: string }) => e.code === ADAPTER_ERRORS.ESCAPE_REJECTED,
    );
    const alias = readMarkdownFile(ws, "alias.md"); // interior link: fine
    assert.match(alias.body, /identical body/);
  });

  it("gateway never falls back: unknown system or workspace fails, B untouched", () => {
    const rootA = makeIdenticalOs("g1");
    const rootB = makeIdenticalOs("g2");
    roots.push(rootA, rootB);
    const regA = new SystemRegistry();
    const regB = new SystemRegistry();
    const sysA = regA.register(rootA).systemId;
    const sysB = regB.register(rootB).systemId;
    const routerA = new QueryRouter(regA, new DisposableCache());

    const ok = routerA.handle({
      type: "req", v: "1.0", id: "1", method: "workspace.get",
      systemId: sysA, workspaceId: "shared",
    });
    assert.equal(ok.ok, true);

    const foreignSys = routerA.handle({
      type: "req", v: "1.0", id: "2", method: "workspace.get",
      systemId: "house-b", workspaceId: "shared",
    });
    assert.equal(foreignSys.ok, false);

    const foreignWs = routerA.handle({
      type: "req", v: "1.0", id: "3", method: "workspace.get",
      systemId: sysA, workspaceId: "ghost",
    });
    assert.equal(foreignWs.ok, false);

    // B's own registry is unaffected and still serves.
    const routerB = new QueryRouter(regB, new DisposableCache());
    const okB = routerB.handle({
      type: "req", v: "1.0", id: "4", method: "workspace.get",
      systemId: sysB, workspaceId: "shared",
    });
    assert.equal(okB.ok, true);
  });

  it("panels on different systems share no scope; detached keeps binding; presets leak nothing", () => {
    const reg = new PanelRegistry();
    for (const p of defaultPhase1Panels()) reg.register(p);
    const layout = new LayoutManager(reg);
    const a = layout.mount("now", { systemId: "aiverse-01", workspaceId: "shared" });
    const b = layout.mount("now", { systemId: "aiverse-02", workspaceId: "shared" });
    assert.notEqual(a.instanceId, b.instanceId);
    assert.equal(layout.get(a.instanceId)?.systemId, "aiverse-01");
    assert.equal(layout.get(b.instanceId)?.systemId, "aiverse-02");

    // Switching the "main" instance retargets only that instance explicitly.
    layout.setState(a.instanceId, "detached");
    assert.equal(layout.get(a.instanceId)?.systemId, "aiverse-01");
    layout.retarget(b.instanceId, { systemId: "aiverse-01", workspaceId: "shared" });
    assert.equal(layout.get(a.instanceId)?.systemId, "aiverse-01");

    const preset = layout.savePreset("iso-check");
    const raw = JSON.stringify(preset);
    assert.ok(!raw.includes("identical body"));
    assert.ok(!raw.includes("tmp/") && !raw.includes("dash-iso"));
    assert.ok(!raw.includes("secret"));
  });

  it("protocol rejects raw-root params and bad ids before any read", () => {
    const root = makeIdenticalOs("p");
    roots.push(root);
    const reg = new SystemRegistry();
    const sys = reg.register(root).systemId;
    const router = new QueryRouter(reg, new DisposableCache());
    const evil = router.handle({
      type: "req", v: "1.0", id: "e", method: "task.list",
      systemId: sys, workspaceId: "shared", params: { root: "/tmp/x" },
    });
    assert.equal(evil.ok, false);
    const badId = router.handle({
      type: "req", v: "1.0", id: "f", method: "system.get",
      systemId: "../evil",
    });
    assert.equal(badId.ok, false);
  });
});
