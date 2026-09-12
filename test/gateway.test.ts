import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { QueryRouter, SubscriptionHub, startGateway } from "../apps/gateway/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

const PORTS = { t1: 32101, t2: 32102, t3: 32103 };

function makeOs(label: string): { root: string; reg: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), `dash-gw-${label}-`));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const reg = new SystemRegistry();
  const rec = reg.register(root, { label });
  return { root, reg, systemId: rec.systemId };
}

function makeWorkspace(osRoot: string, id: string, files?: Record<string, string>): void {
  const dir = join(osRoot, "workspaces", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "${id}"\nname: "${id} name"\nstatus: "active"\n`,
  );
  for (const [rel, content] of Object.entries(files ?? {})) {
    writeFileSync(join(dir, rel), content);
  }
}

async function rpc(port: number, frame: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`http://127.0.0.1:${port}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(frame),
  });
  return (await res.json()) as Record<string, unknown>;
}

describe("gateway Task 4: query path + subscriptions, no cross-system fallback", () => {
  const roots: string[] = [];
  const servers: { close(): Promise<void> }[] = [];
  afterEach(async () => {
    for (const s of servers.splice(0)) {
      try {
        await s.close();
      } catch { /* ignore */ }
    }
    for (const r of roots.splice(0)) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  });

  it("serves reads with provenance; blocks commands; binds loopback only", async () => {
    const { root, reg, systemId } = makeOs("a");
    roots.push(root);
    makeWorkspace(root, "ws-1", { "STATE.md": "---\ntitle: State\n---\n\n# hi\n" });
    const router = new QueryRouter(reg, new DisposableCache());
    const gw = await startGateway(router, new SubscriptionHub(), { port: PORTS.t1 });
    servers.push(gw);

    const health = (await (await fetch(`http://127.0.0.1:${PORTS.t1}/health`)).json()) as {
      ok: boolean;
    };
    assert.equal(health.ok, true);

    const sys = await rpc(PORTS.t1, { type: "req", v: "1.0", id: "1", method: "system.list" });
    assert.equal(sys.ok, true);

    const preview = await rpc(PORTS.t1, {
      type: "req", v: "1.0", id: "2", method: "source.preview",
      systemId, workspaceId: "ws-1", params: { path: "STATE.md" },
    });
    assert.equal(preview.ok, true);
    const prov = (preview.result as { provenance: Record<string, unknown> }).provenance;
    assert.equal(prov.systemId, systemId);
    assert.equal(prov.freshness, "fresh");
    assert.equal(prov.canonical, true);

    const blocked = await rpc(PORTS.t1, {
      type: "req", v: "1.0", id: "3", method: "chat.send",
      systemId, workspaceId: "ws-1", params: {},
    });
    assert.equal(blocked.ok, false);
    assert.equal((blocked.error as { code: string }).code, "COMMAND_BLOCKED_READ_ONLY");

    await assert.rejects(
      startGateway(router, new SubscriptionHub(), { port: PORTS.t1 + 100, host: "0.0.0.0" }),
      /loopback only/,
    );
  });

  it("missing in A never serves B over HTTP", async () => {
    const b = makeOs("b2");
    roots.push(b.root);
    makeWorkspace(b.root, "shared", { "STATE.md": "from B" });
    const routerB = new QueryRouter(b.reg, new DisposableCache());
    const gw = await startGateway(routerB, new SubscriptionHub(), { port: PORTS.t2 });
    servers.push(gw);

    const okB = await rpc(PORTS.t2, {
      type: "req", v: "1.0", id: "1", method: "workspace.get",
      systemId: b.systemId, workspaceId: "shared",
    });
    assert.equal(okB.ok, true);

    // A foreign systemId is unknown to this registry: fail, not fallback.
    const miss = await rpc(PORTS.t2, {
      type: "req", v: "1.0", id: "2", method: "workspace.get",
      systemId: "aiverse-02", workspaceId: "shared",
    });
    assert.equal(miss.ok, false);
  });

  it("subscriptions partition by systemId; WS rejects cross-system frames", async () => {
    const { root, reg, systemId } = makeOs("c");
    roots.push(root);
    makeWorkspace(root, "ws-1");
    const router = new QueryRouter(reg, new DisposableCache());
    const hub = new SubscriptionHub();
    const gw = await startGateway(router, hub, { port: PORTS.t3 });
    servers.push(gw);

    const hubSeenA: unknown[] = [];
    const hubSeenB: unknown[] = [];
    hub.subscribe(systemId, (ev) => hubSeenA.push(ev));
    hub.subscribe("aiverse-02", (ev) => hubSeenB.push(ev));
    hub.publish({ event: "source.changed", systemId, workspaceId: "ws-1", payload: { file: "x" } });
    hub.publish({ event: "source.changed", systemId, workspaceId: "ws-1", payload: { file: "x" } }); // dedupe
    assert.equal(hubSeenA.length, 1);
    assert.equal(hubSeenB.length, 0);
    assert.equal((hubSeenA[0] as { seq: number }).seq, 1);

    const ws = new WebSocket(`ws://127.0.0.1:${PORTS.t3}/ws?systemId=${systemId}`);
    await new Promise<void>((resolve, reject) => {
      ws.on("open", resolve);
      ws.on("error", reject);
    });
    const frames: Record<string, unknown>[] = [];
    ws.on("message", (d) => frames.push(JSON.parse(String(d)) as Record<string, unknown>));
    ws.send(JSON.stringify({ type: "subscribe", workspaceId: "ws-1" }));
    await new Promise((r) => setTimeout(r, 200));
    hub.publish({ event: "source.changed", systemId, workspaceId: "ws-1", payload: { file: "live" } });
    await new Promise((r) => setTimeout(r, 300));
    assert.ok(frames.some((f) => f.type === "event" && (f as { systemId: string }).systemId === systemId));

    // Cross-system frame on this socket must be rejected, not rerouted.
    ws.send(JSON.stringify({ type: "req", v: "1.0", id: "x", method: "system.get", systemId: "aiverse-02" }));
    await new Promise((r) => setTimeout(r, 300));
    const mismatch = frames.find((f) => f.id === "x") as
      | { ok: boolean; error: { code: string } }
      | undefined;
    assert.ok(mismatch);
    assert.equal(mismatch.ok, false);
    assert.equal(mismatch.error.code, "SYSTEM_MISMATCH");
    ws.close();
  });
});
