import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DashboardClient } from "../packages/client/src/index.js";
import {
  LayoutManager,
  PanelRegistry,
  defaultPhase1Panels,
  renderShellModel,
  stateSurface,
  STATUS_LABEL,
  COMPONENT_STATES,
} from "../apps/web/src/index.js";

function stubFetch(handler: (frame: Record<string, unknown>) => unknown) {
  return async (_url: string, init: { body: string }) => ({
    async json() {
      return handler(JSON.parse(init.body) as Record<string, unknown>);
    },
  });
}

describe("web shell Task 5: client + panels + layout + shell model", () => {
  it("client sends IDs, caches per system, never raw roots", async () => {
    let sends = 0;
    const fetchFn = stubFetch((frame) => {
      sends += 1;
      assert.ok(frame.systemId === "aiverse-01" || frame.systemId === "aiverse-02");
      assert.ok(frame.workspaceId === "ws-1");
      return { ok: true, result: { n: 1 }, systemId: frame.systemId, observedAt: new Date().toISOString() };
    });
    const a = new DashboardClient("http://127.0.0.1:9", { systemId: "aiverse-01", workspaceId: "ws-1" }, fetchFn);
    const b = new DashboardClient("http://127.0.0.1:9", { systemId: "aiverse-02", workspaceId: "ws-1" }, fetchFn);
    await a.query("task.list");
    await a.query("task.list"); // cache hit
    await b.query("task.list"); // different system: no shared entry
    assert.equal(sends, 2);
    assert.equal(a.cacheStats().entries, 1);
    assert.equal(b.cacheStats().entries, 1);
    // Cross-system frame rejected before send.
    const evil = new DashboardClient("http://127.0.0.1:9", { systemId: "../evil" }, fetchFn);
    await assert.rejects(() => evil.query("task.list"));
  });

  it("registry holds Phase 1 panels; layout mounts with explicit scope", () => {
    const reg = new PanelRegistry();
    for (const p of defaultPhase1Panels()) reg.register(p);
    assert.equal(reg.list().length, 5);
    assert.throws(() => reg.register(defaultPhase1Panels()[0]), /already registered/);

    const layout = new LayoutManager(reg);
    const now = layout.mount("now", { systemId: "aiverse-01", workspaceId: "ws-1" });
    assert.equal(now.state, "docked");
    assert.equal(now.systemId, "aiverse-01");
    // Workspace-scoped panel without workspace fails closed.
    assert.throws(() => layout.mount("now", { systemId: "aiverse-01" }), /requires a workspaceId/);
    // Usage is system-scoped only: workspace rejected.
    assert.throws(
      () => layout.mount("usage", { systemId: "aiverse-01", workspaceId: "ws-1" }),
      /not workspace-scoped/,
    );
    const usage = layout.mount("usage", { systemId: "aiverse-01" });
    assert.equal(usage.workspaceId, undefined);
  });

  it("three panels reposition without data change; hide/restore keeps scope", () => {
    const reg = new PanelRegistry();
    for (const p of defaultPhase1Panels()) reg.register(p);
    const layout = new LayoutManager(reg);
    const a = layout.mount("now", { systemId: "aiverse-01", workspaceId: "ws-1" }, { placement: "center" });
    const b = layout.mount("health", { systemId: "aiverse-01", workspaceId: "ws-1" }, { placement: "left" });
    const c = layout.mount("inbox", { systemId: "aiverse-01", workspaceId: "ws-1" }, { placement: "right" });
    layout.setState(b.instanceId, "floating");
    layout.setState(c.instanceId, "hidden");
    const restored = layout.setState(c.instanceId, "docked");
    assert.equal(restored.systemId, "aiverse-01");
    assert.equal(restored.workspaceId, "ws-1");
    assert.equal(layout.get(a.instanceId)?.placement, "center");
    // Detached keeps original system until explicit retarget (shell §2.2).
    layout.setState(a.instanceId, "detached");
    assert.equal(layout.get(a.instanceId)?.systemId, "aiverse-01");
    const moved = layout.retarget(a.instanceId, { systemId: "aiverse-02", workspaceId: "ws-9" });
    assert.equal(moved.systemId, "aiverse-02");
  });

  it("presets carry presentation only; compact exists; hud gated", () => {
    const reg = new PanelRegistry();
    for (const p of defaultPhase1Panels()) reg.register(p);
    const layout = new LayoutManager(reg);
    layout.mount("health", { systemId: "aiverse-01", workspaceId: "ws-1" }, { presentation: "compact" });
    const preset = layout.savePreset("Control Room");
    const raw = JSON.stringify(preset);
    assert.ok(!raw.includes("canonical") || raw.includes("panelId"));
    assert.ok(!raw.includes("tasks:") && !raw.includes("memory"));
    layout.reset();
    assert.equal(layout.list().length, 0);
    layout.loadPreset(preset);
    assert.equal(layout.list().length, 1);
    assert.equal(layout.list()[0].presentation, "compact");
    // Now has no hud: rejected.
    const now = layout.mount("now", { systemId: "aiverse-01", workspaceId: "ws-1" });
    assert.throws(() => layout.setState(now.instanceId, "hud"), /no hud/);
    const health = layout.list().find((i) => i.panelId === "health");
    assert.ok(health);
    layout.setState(health.instanceId, "hud");
    assert.equal(layout.get(health.instanceId)?.presentation, "hud");
  });

  it("shell model shows switchers, provenance, states at desktop and narrow", () => {
    const panels = [
      {
        instanceId: "inst-1", panelId: "now", title: "Now", presentation: "full",
        state: "docked", systemId: "aiverse-01", workspaceId: "ws-1",
        status: "working" as const, body: "Focus: ship", freshness: "fresh" as const,
        observedAt: "2026-09-12T00:00:00Z",
      },
    ];
    const desktop = renderShellModel({
      systems: [{ id: "aiverse-01", label: "House A" }, { id: "aiverse-02", label: "House B" }],
      workspaces: [{ id: "ws-1", label: "WS 1" }],
      activeSystemId: "aiverse-01",
      activeWorkspaceId: "ws-1",
      panels,
      viewportWidth: 1280,
    });
    assert.equal(desktop.narrow, false);
    assert.equal(desktop.systems.filter((s) => s.selected).length, 1);
    assert.equal(desktop.panels[0].statusLabel, STATUS_LABEL.working);
    assert.match(desktop.panels[0].provenance, /aiverse-01\/ws-1/);
    const narrow = renderShellModel({
      systems: [{ id: "aiverse-01", label: "House A" }],
      workspaces: [],
      activeSystemId: "aiverse-01",
      panels,
      viewportWidth: 390,
    });
    assert.equal(narrow.narrow, true);
    assert.ok(COMPONENT_STATES.includes("stale"));
    assert.equal(stateSurface("loading"), "Loading…");
    assert.match(stateSurface("error", "Down."), /Down/);
  });
});
