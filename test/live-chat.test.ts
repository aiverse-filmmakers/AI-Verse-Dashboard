import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import {
  LocalEchoAdapter,
  SessionStore,
  normalizeTimelineEntry,
  TIMELINE_KINDS,
} from "../packages/live/src/index.js";
import { QueryRouter, SubscriptionHub } from "../apps/gateway/src/index.js";
import { LayoutManager, PanelRegistry, phase2Panels } from "../apps/web/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

function makeOs(label: string, systemId: string): { root: string; reg: SystemRegistry } {
  const root = mkdtempSync(join(tmpdir(), `dash-live-${label}-`));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const dir = join(root, "workspaces", "shared");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "shared"\nname: "Shared"\nstatus: "active"\n`,
  );
  const reg = new SystemRegistry();
  reg.register(root, { label, systemId });
  return { root, reg };
}

describe("live Task 1 (Phase 2): chat sessions + runtime adapter, per-system isolation", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const r of roots.splice(0)) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  });

  it("timeline normalizes 11 typed kinds fail-closed", () => {
    assert.equal(TIMELINE_KINDS.length, 11);
    const e = normalizeTimelineEntry(
      { systemId: "house-a", workspaceId: "shared", sessionId: "sess-1" },
      { id: "e-1", kind: "approval", role: "agent", body: "approve this" },
    );
    assert.equal(e.kind, "approval");
    assert.throws(() =>
      normalizeTimelineEntry(
        { systemId: "house-a", workspaceId: "shared", sessionId: "sess-1" },
        { id: "e-2", kind: "nope", role: "user", body: "x" },
      ),
    );
    assert.throws(() =>
      normalizeTimelineEntry(
        { systemId: "house-a", workspaceId: "shared", sessionId: "sess-1" },
        { id: "bad id!", kind: "message", role: "user", body: "x" },
      ),
    );
  });

  it("same session id on two systems never shares history", () => {
    const store = new SessionStore();
    const sa = store.create("house-a", "shared", { sessionId: "sess-1", provider: "p", model: "m" });
    const sb = store.create("house-b", "shared", { sessionId: "sess-1", provider: "p", model: "m" });
    assert.equal(sa.sessionId, sb.sessionId);
    store.append("house-a", "sess-1", { id: "a-1", kind: "message", role: "user", body: "hello A" });
    assert.equal(store.history("house-a", "sess-1").length, 1);
    assert.equal(store.history("house-b", "sess-1").length, 0);
    assert.equal(store.list("house-a").length, 1);
    assert.equal(store.list("house-b").length, 1);
    // Closed sessions reject appends.
    store.abort("house-a", "sess-1");
    assert.throws(() =>
      store.append("house-a", "sess-1", { id: "a-2", kind: "message", role: "user", body: "late" }),
    );
  });

  it("adapter echoes within the same system and emits scoped events", async () => {
    const store = new SessionStore();
    const events: { systemId: string; workspaceId: string }[] = [];
    const adapter = new LocalEchoAdapter(store, (ev) => events.push(ev));
    store.create("house-a", "shared", { sessionId: "sess-1" });
    const ack = await adapter.send("house-a", "sess-1", "status?");
    assert.equal(ack.accepted, true);
    const history = store.history("house-a", "sess-1");
    assert.equal(history.length, 2);
    assert.equal(history[1].role, "agent");
    assert.match(history[1].body, /receipt/);
    assert.equal(events.length, 1);
    assert.equal(events[0].systemId, "house-a");
    const caps = await adapter.capabilities("house-a");
    assert.equal(caps.abort, true);
    await adapter.abort("house-a", "sess-1");
    assert.equal(store.get("house-a", "sess-1")?.status, "aborted");
    // Oversized message rejected before any write.
    store.create("house-a", "shared", { sessionId: "sess-2" });
    await assert.rejects(() => adapter.send("house-a", "sess-2", "x".repeat(9000)));
    assert.equal(store.history("house-a", "sess-2").length, 0);
  });

  it("chat panels mount per system; gateway routes chat history read-only", () => {
    const a = makeOs("a", "house-a");
    const b = makeOs("b", "house-b");
    roots.push(a.root, b.root);

    const preg = new PanelRegistry();
    for (const p of phase2Panels()) preg.register(p);
    const layout = new LayoutManager(preg);
    const chatA = layout.mount("chat", { systemId: "house-a", workspaceId: "shared" });
    const chatB = layout.mount("chat", { systemId: "house-b", workspaceId: "shared" });
    assert.notEqual(chatA.instanceId, chatB.instanceId);
    layout.setState(chatA.instanceId, "detached");
    assert.equal(layout.get(chatA.instanceId)?.systemId, "house-a");

    // Gateway still serves reads for both; chat.send stays a named-but-blocked command.
    const router = new QueryRouter(a.reg, new DisposableCache());
    const list = router.handle({
      type: "req", v: "1.0", id: "1", method: "task.list",
      systemId: "house-a", workspaceId: "shared",
    });
    assert.equal(list.ok, true);
    const blocked = router.handle({
      type: "req", v: "1.0", id: "2", method: "chat.send",
      systemId: "house-a", workspaceId: "shared", params: {},
    });
    assert.equal(blocked.ok, false);

    // Chat events partition by system through the hub.
    const hub = new SubscriptionHub();
    const seenA: unknown[] = [];
    const seenB: unknown[] = [];
    hub.subscribe("house-a", (ev) => seenA.push(ev));
    hub.subscribe("house-b", (ev) => seenB.push(ev));
    hub.publish({ event: "chat.message", systemId: "house-a", workspaceId: "shared", payload: {} });
    assert.equal(seenA.length, 1);
    assert.equal(seenB.length, 0);
    void b;
  });
});
