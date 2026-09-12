import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WebSocket } from "ws";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import {
  LocalEchoAdapter,
  SessionStore,
  groupToolsBySession,
  publishLive,
} from "../packages/live/src/index.js";
import { QueryRouter, SubscriptionHub, startGateway } from "../apps/gateway/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;
const PORT = 32105;

function makeOs(label: string, systemId: string): { root: string; reg: SystemRegistry } {
  const root = mkdtempSync(join(tmpdir(), `dash-act-${label}-`));
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

describe("live Task 3 (Phase 2): activity stream + task rail over WS", () => {
  it("publishLive validates session scope; tool groups per session", async () => {
    const sessions = new SessionStore();
    const hub = new SubscriptionHub();
    sessions.create("house-a", "shared", { sessionId: "sess-1" });
    sessions.create("house-a", "shared", { sessionId: "sess-2" });
    const adapter = new LocalEchoAdapter(sessions, (ev) =>
      hub.publish({ ...ev, workspaceId: "shared" }),
    );
    await adapter.send("house-a", "sess-1", "go");
    sessions.append("house-a", "sess-1", {
      id: "t-1",
      kind: "tool-call",
      role: "agent",
      body: "tool ls",
    });
    sessions.append("house-a", "sess-1", {
      id: "t-2",
      kind: "tool-call",
      role: "agent",
      body: "tool cat",
    });
    sessions.append("house-a", "sess-2", {
      id: "t-3",
      kind: "tool-call",
      role: "agent",
      body: "tool ps",
    });

    const groups = groupToolsBySession(sessions, "house-a", "shared");
    assert.equal(groups.length, 2);
    assert.equal(groups.find((g) => g.sessionId === "sess-1")?.toolCount, 2);
    assert.equal(groups.find((g) => g.sessionId === "sess-2")?.toolCount, 1);
    assert.equal(groups.find((g) => g.sessionId === "sess-1")?.lastTool?.id, "t-2");

    // Unknown session or wrong workspace fails before any publish.
    const seen: unknown[] = [];
    hub.subscribe("house-a", (ev) => seen.push(ev));
    assert.throws(() =>
      publishLive(hub, sessions, {
        event: "tool.started",
        systemId: "house-a",
        workspaceId: "shared",
        sessionId: "ghost",
      }),
    );
    assert.throws(() =>
      publishLive(hub, sessions, {
        event: "tool.started",
        systemId: "house-a",
        workspaceId: "other",
        sessionId: "sess-1",
      }),
    );
    assert.equal(seen.length, 0);
    publishLive(hub, sessions, {
      event: "tool.started",
      systemId: "house-a",
      workspaceId: "shared",
      sessionId: "sess-1",
      entryId: "t-2",
    });
    assert.equal(seen.length, 1);
  });

  it("WS streams live events scoped to the socket system", async () => {
    const a = makeOs("a", "house-a");
    const roots = [a.root];
    try {
      const sessions = new SessionStore();
      sessions.create("house-a", "shared", { sessionId: "sess-1" });
      const router = new QueryRouter(a.reg, new DisposableCache());
      router.attachSessions(sessions);
      const hub = new SubscriptionHub();
      const gw = await startGateway(router, hub, { port: PORT });
      try {
        const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?systemId=house-a`);
        await new Promise<void>((resolve, reject) => {
          ws.on("open", resolve);
          ws.on("error", reject);
        });
        const frames: Record<string, unknown>[] = [];
        ws.on("message", (d) => frames.push(JSON.parse(String(d)) as Record<string, unknown>));
        ws.send(JSON.stringify({ type: "subscribe", workspaceId: "shared" }));
        await new Promise((r) => setTimeout(r, 200));

        // Adapter event bridges into the hub for this system only.
        const adapter = new LocalEchoAdapter(sessions, (ev) =>
          hub.publish({ ...ev, workspaceId: "shared" }),
        );
        await adapter.send("house-a", "sess-1", "live?");
        publishLive(hub, sessions, {
          event: "tool.started",
          systemId: "house-a",
          workspaceId: "shared",
          sessionId: "sess-1",
        });
        await new Promise((r) => setTimeout(r, 300));
        const live = frames.filter((f) => f.type === "event");
        assert.ok(live.length >= 2);
        assert.ok(live.every((f) => (f as { systemId: string }).systemId === "house-a"));
        ws.close();
      } finally {
        await gw.close();
      }
    } finally {
      for (const r of roots) {
        try {
          rmSync(r, { recursive: true, force: true });
        } catch { /* ignore */ }
      }
    }
  });
});
