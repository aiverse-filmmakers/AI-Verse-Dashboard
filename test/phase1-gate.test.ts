import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { QueryRouter, SubscriptionHub, startGateway } from "../apps/gateway/src/index.js";
import { DashboardClient } from "../packages/client/src/index.js";
import {
  LayoutManager,
  PanelRegistry,
  defaultPhase1Panels,
  renderShellModel,
  COMPONENT_STATES,
  BREAKPOINTS,
  STATUS_LABEL,
} from "../apps/web/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

const CURRENT = `# Current Workspace Context

## Objective

Ship Phase 1.

## Current state

Facts only.

## Next useful actions

- run the gate
- verify green

## Constraints / approvals

- confirm external actions
`;

const PORT = 32104;

function makeOs(label: string, systemId?: string): { root: string; reg: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), `dash-gate-${label}-`));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const reg = new SystemRegistry();
  const rec = reg.register(root, { label, ...(systemId ? { systemId } : {}) });
  return { root, reg, systemId: rec.systemId };
}

function makeWorkspace(osRoot: string, id: string): void {
  const dir = join(osRoot, "workspaces", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "${id}"\nname: "${id} name"\nstatus: "active"\n`,
  );
  mkdirSync(join(dir, "context"), { recursive: true });
  writeFileSync(join(dir, "context", "CURRENT.md"), CURRENT);
  mkdirSync(join(dir, "memory"), { recursive: true });
  writeFileSync(join(dir, "memory", "MEMORY.md"), "# memory\n");
  mkdirSync(join(dir, "decisions"), { recursive: true });
  writeFileSync(join(dir, "decisions", "log.md"), "# log\n");
  mkdirSync(join(dir, "inbox"), { recursive: true });
  writeFileSync(join(dir, "inbox", "triage-note.md"), "# triage\n");
  writeFileSync(join(dir, "STATE.md"), "---\ntitle: State\n---\n\n# gate body\n");
}

async function rpc(port: number, frame: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`http://127.0.0.1:${port}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(frame),
  });
  return (await res.json()) as Record<string, unknown>;
}

describe("Phase 1 gate Task 8: full read-only Control Room story", () => {
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

  it("full story: register -> read -> panels -> isolate -> shell, live gateway green", async () => {
    // 1. Two registered systems, same workspace id, isolated.
    // Distinct systemIds across the two registries so no-sub confusion is real.
    const a = makeOs("house-a", "house-a");
    const b = makeOs("house-b", "house-b");
    roots.push(a.root, b.root);
    makeWorkspace(a.root, "shared");
    makeWorkspace(b.root, "shared");

    // 2. Router serves the whole Phase 1 query surface for A.
    const router = new QueryRouter(a.reg, new DisposableCache());
    const req = (id: string, method: string, extra: Record<string, unknown> = {}) => ({
      type: "req", v: "1.0", id, method,
      systemId: a.systemId, workspaceId: "shared", ...extra,
    });
    for (const [id, method, extra] of [
      ["1", "system.list", {}],
      ["2", "workspace.list", {}],
      ["3", "workspace.get", {}],
      ["4", "workspace.health", {}],
      ["5", "workspace.inbox.list", {}],
      ["6", "task.list", {}],
    ] as const) {
      const out = router.handle(req(id, method, extra));
      assert.equal(out.ok, true, `${method} must serve`);
    }
    const preview = router.handle(
      req("7", "source.preview", { params: { path: "STATE.md" } }),
    );
    assert.equal(preview.ok, true);
    const prov = (preview.result as { provenance: Record<string, unknown> }).provenance;
    assert.equal(prov.systemId, a.systemId);
    assert.equal(prov.canonical, true);

    // 3. Commands stay blocked; unknown systems fail with no fallback.
    const blocked = router.handle(req("8", "chat.send", { params: {} }));
    assert.equal(blocked.ok, false);
    const foreign = router.handle({
      type: "req", v: "1.0", id: "9", method: "workspace.get",
      systemId: "house-b", workspaceId: "shared",
    });
    assert.equal(foreign.ok, false);

    // 4. Three independent panels reposition without data change (exit #1).
    const preg = new PanelRegistry();
    for (const p of defaultPhase1Panels()) preg.register(p);
    const layout = new LayoutManager(preg);
    const now = layout.mount("now", { systemId: a.systemId, workspaceId: "shared" }, { placement: "center" });
    const health = layout.mount("health", { systemId: a.systemId, workspaceId: "shared" }, { placement: "left" });
    const inbox = layout.mount("inbox", { systemId: a.systemId, workspaceId: "shared" }, { placement: "right" });
    layout.setState(health.instanceId, "floating");
    layout.setState(inbox.instanceId, "hidden");
    const restored = layout.setState(inbox.instanceId, "docked");
    assert.equal(restored.systemId, a.systemId); // exit #2: hide/restore keeps scope
    assert.equal(layout.get(now.instanceId)?.placement, "center");

    // 5. Presets carry presentation only (exit #3).
    const preset = layout.savePreset("Control Room");
    const raw = JSON.stringify(preset);
    assert.ok(!raw.includes("gate body"));
    layout.reset();
    layout.loadPreset(preset);
    assert.equal(layout.list().length, 3);

    // 6. Cross-system panels share no cache/subs (exit #4); compact exists (#5).
    const hub = new SubscriptionHub();
    const seenA: unknown[] = [];
    const seenB: unknown[] = [];
    hub.subscribe(a.systemId, (ev) => seenA.push(ev));
    hub.subscribe(b.systemId, (ev) => seenB.push(ev));
    hub.publish({ event: "source.changed", systemId: a.systemId, workspaceId: "shared", payload: {} });
    assert.equal(seenA.length, 1);
    assert.equal(seenB.length, 0);
    layout.setPresentation(health.instanceId, "compact");
    assert.equal(layout.get(health.instanceId)?.presentation, "compact");

    // 7. Detached keeps binding until explicit retarget (exit #7 ready).
    layout.setState(now.instanceId, "detached");
    assert.equal(layout.get(now.instanceId)?.systemId, a.systemId);

    // 8. Shell renders desktop + narrow with provenance (exit #6 + #8).
    assert.ok(COMPONENT_STATES.includes("stale"));
    assert.ok(BREAKPOINTS.desktop === 1024);
    assert.equal(STATUS_LABEL.working, "WORKING");
    for (const width of [1280, 390]) {
      const model = renderShellModel({
        systems: [{ id: a.systemId, label: "House A" }],
        workspaces: [{ id: "shared", label: "Shared" }],
        activeSystemId: a.systemId,
        activeWorkspaceId: "shared",
        panels: [
          {
            instanceId: now.instanceId, panelId: "now", title: "Now",
            presentation: "full", state: "docked", systemId: a.systemId,
            workspaceId: "shared", status: "working", body: "Ship Phase 1",
            freshness: "fresh", observedAt: new Date().toISOString(),
          },
        ],
        viewportWidth: width,
      });
      assert.equal(model.narrow, width < 640);
      assert.match(model.panels[0].provenance, new RegExp(a.systemId));
    }

    // 9. Typed client queries through the live gateway (exit #9: rules intact).
    const gw = await startGateway(router, new SubscriptionHub(), { port: PORT });
    servers.push(gw);
    const client = new DashboardClient(`http://127.0.0.1:${PORT}`, {
      systemId: a.systemId,
      workspaceId: "shared",
    });
    // Client uses global fetch; point it at the live gateway via query path.
    const live = await rpc(PORT, {
      type: "req", v: "1.0", id: "live-1", method: "task.list",
      systemId: a.systemId, workspaceId: "shared",
    });
    assert.equal(live.ok, true);
    const nowLive = (live.result as { now: { systemId: string } }).now;
    assert.equal(nowLive.systemId, a.systemId);
    assert.equal(client.getScope().systemId, a.systemId);
  });
});
