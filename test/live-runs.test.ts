import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { LocalEchoAdapter, SessionStore } from "../packages/live/src/index.js";
import { GATEWAY_PHASE, QueryRouter } from "../apps/gateway/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

function makeOs(label: string, systemId: string): { root: string; reg: SystemRegistry } {
  const root = mkdtempSync(join(tmpdir(), `dash-runs-${label}-`));
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

function wired(systemId: string): { router: QueryRouter; sessions: SessionStore } {
  const { root, reg } = makeOs(systemId, systemId);
  (wired as unknown as { roots: string[] }).roots.push(root);
  const sessions = new SessionStore();
  const router = new QueryRouter(reg, new DisposableCache());
  router.attachSessions(sessions);
  return { router, sessions };
}
(wired as unknown as { roots: string[] }).roots = [];

describe("live Task 2 (Phase 2): agent + runs reads over sessions, per-system", () => {
  afterEach(() => {
    const roots = (wired as unknown as { roots: string[] }).roots.splice(0);
    for (const r of roots) {
      try {
        rmSync(r, { recursive: true, force: true });
      } catch { /* ignore */ }
    }
  });

  it("gateway phase is live and capabilities list agent/run reads", () => {
    assert.equal(GATEWAY_PHASE, "phase-2-live");
    const { router } = wired("house-a");
    const caps = router.handle({ type: "req", v: "1.0", id: "c", method: "protocol.capabilities" });
    assert.equal(caps.ok, true);
    const methods = (caps.result as { methods: string[]; phase: string }).methods;
    assert.ok(methods.includes("agent.list"));
    assert.ok(methods.includes("run.logs"));
    assert.equal((caps.result as { phase: string }).phase, "phase-2-live");
  });

  it("agent.list + agent.sessions serve this system's sessions only", async () => {
    const { router, sessions } = wired("house-a");
    const { router: routerB, sessions: sessionsB } = wired("house-b");
    sessions.create("house-a", "shared", { sessionId: "sess-1", provider: "p", model: "m" });
    const adapter = new LocalEchoAdapter(sessions);
    await adapter.send("house-a", "sess-1", "hello");
    sessions.append("house-a", "sess-1", {
      id: "r-1",
      kind: "run-event",
      role: "system",
      body: "run started",
    });
    sessionsB.create("house-b", "shared", { sessionId: "sess-1" });

    const list = router.handle({
      type: "req", v: "1.0", id: "1", method: "agent.list",
      systemId: "house-a", workspaceId: "shared",
    });
    assert.equal(list.ok, true);
    const agents = (list.result as { agents: { sessionId: string; entryCount: number }[] }).agents;
    assert.equal(agents.length, 1);
    assert.equal(agents[0].entryCount, 3);
    assert.ok(!("entries" in agents[0])); // summaries only, no bodies

    const one = router.handle({
      type: "req", v: "1.0", id: "2", method: "agent.sessions",
      systemId: "house-a", workspaceId: "shared", params: { sessionId: "sess-1" },
    });
    assert.equal(one.ok, true);
    assert.equal(
      ((one.result as { session: { entries: unknown[] } }).session.entries).length,
      3,
    );

    // B's router serves only B's session; A's session id is invisible there.
    const cross = routerB.handle({
      type: "req", v: "1.0", id: "3", method: "agent.sessions",
      systemId: "house-b", workspaceId: "shared", params: { sessionId: "sess-1" },
    });
    assert.equal(cross.ok, true);
    assert.equal(
      ((cross.result as { session: { entries: unknown[] } }).session.entries).length,
      0,
    );
    const missing = routerB.handle({
      type: "req", v: "1.0", id: "4", method: "agent.sessions",
      systemId: "house-b", workspaceId: "shared", params: { sessionId: "ghost" },
    });
    assert.equal(missing.ok, false);
  });

  it("run.list filters kinds; run.get/logs fetch one entry with workspace check", async () => {
    const { router, sessions } = wired("house-a");
    sessions.create("house-a", "shared", { sessionId: "sess-1" });
    sessions.create("house-a", "other", { sessionId: "sess-9" });
    const adapter = new LocalEchoAdapter(sessions);
    await adapter.send("house-a", "sess-1", "go");
    sessions.append("house-a", "sess-1", {
      id: "t-1",
      kind: "tool-call",
      role: "agent",
      body: "tool ls",
    });
    sessions.append("house-a", "sess-1", {
      id: "e-1",
      kind: "error-event",
      role: "system",
      body: "boom",
    });
    sessions.append("house-a", "sess-9", {
      id: "o-1",
      kind: "run-event",
      role: "system",
      body: "other ws",
    });

    const runs = router.handle({
      type: "req", v: "1.0", id: "1", method: "run.list",
      systemId: "house-a", workspaceId: "shared",
    });
    assert.equal(runs.ok, true);
    const items = (runs.result as { runs: { id: string }[] }).runs;
    assert.ok(items.some((r) => r.id === "t-1"));
    assert.ok(items.some((r) => r.id === "e-1"));
    assert.ok(!items.some((r) => r.id === "o-1")); // other workspace excluded

    const filtered = router.handle({
      type: "req", v: "1.0", id: "2", method: "run.list",
      systemId: "house-a", workspaceId: "shared", params: { kinds: ["error-event"], limit: 10 },
    });
    assert.deepEqual(
      (filtered.result as { runs: { id: string }[] }).runs.map((r) => r.id),
      ["e-1"],
    );

    const got = router.handle({
      type: "req", v: "1.0", id: "3", method: "run.get",
      systemId: "house-a", workspaceId: "shared", params: { entryId: "t-1" },
    });
    assert.equal(got.ok, true);
    assert.equal((got.result as { entry: { body: string } }).entry.body, "tool ls");

    const wrongWs = router.handle({
      type: "req", v: "1.0", id: "4", method: "run.logs",
      systemId: "house-a", workspaceId: "other", params: { entryId: "t-1" },
    });
    assert.equal(wrongWs.ok, false);

    const missing = router.handle({
      type: "req", v: "1.0", id: "5", method: "run.get",
      systemId: "house-a", workspaceId: "shared",
    });
    assert.equal(missing.ok, false);
  });

  it("unattached router fails closed; commands still blocked", () => {
    const { root, reg } = makeOs("bare", "house-a");
    (wired as unknown as { roots: string[] }).roots.push(root);
    const bare = new QueryRouter(reg, new DisposableCache());
    const noSessions = bare.handle({
      type: "req", v: "1.0", id: "1", method: "agent.list",
      systemId: "house-a", workspaceId: "shared",
    });
    assert.equal(noSessions.ok, false);
    const blocked = bare.handle({
      type: "req", v: "1.0", id: "2", method: "chat.send",
      systemId: "house-a", workspaceId: "shared", params: {},
    });
    assert.equal(blocked.ok, false);
  });
});
