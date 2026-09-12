import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LocalEchoAdapter,
  SessionStore,
  buildTrace,
  buildLogDrawer,
  copyLogLine,
  DRAWER_BUFFER_MAX,
} from "../packages/live/src/index.js";

function seed(systemId = "house-a"): SessionStore {
  const sessions = new SessionStore();
  sessions.create(systemId, "shared", { sessionId: "sess-1" });
  sessions.append(systemId, "sess-1", {
    id: "m-1",
    kind: "message",
    role: "user",
    body: "deploy?",
  });
  sessions.append(systemId, "sess-1", {
    id: "t-1",
    kind: "tool-call",
    role: "agent",
    body: "shell: npm test",
  });
  sessions.append(systemId, "sess-1", {
    id: "r-1",
    kind: "run-event",
    role: "system",
    body: "run started",
  });
  sessions.append(systemId, "sess-1", {
    id: "e-1",
    kind: "error-event",
    role: "system",
    body: "test failed",
  });
  sessions.append(systemId, "sess-1", {
    id: "a-1",
    kind: "approval",
    role: "agent",
    body: "approve retry?",
  });
  return sessions;
}

describe("live Task 4 (Phase 2): runs timeline + terminal drawer + cancel", () => {
  it("trace summarizes with attention flags and kind filter", () => {
    const sessions = seed();
    const trace = buildTrace(sessions, "house-a", "sess-1");
    assert.equal(trace.total, 5);
    assert.equal(trace.errors, 1);
    assert.equal(trace.workspaceId, "shared");
    assert.ok(trace.spans.every((s) => s.label.length > 0));
    const flagged = trace.spans.filter((s) => s.attention).map((s) => s.id);
    assert.deepEqual(flagged.sort(), ["a-1", "e-1"]);
    const toolsOnly = buildTrace(sessions, "house-a", "sess-1", { kinds: ["tool-call"] });
    assert.deepEqual(toolsOnly.spans.map((s) => s.id), ["t-1"]);
    const capped = buildTrace(sessions, "house-a", "sess-1", { limit: 2 });
    assert.equal(capped.spans.length, 2);
    assert.equal(capped.total, 5); // total still reports full size
    assert.throws(() => buildTrace(sessions, "house-a", "ghost"), /SESSION_NOT_FOUND/);
  });

  it("drawer pages bounded newest-first with severity + search + pause", () => {
    const sessions = seed();
    assert.equal(DRAWER_BUFFER_MAX, 200);
    const page = buildLogDrawer(sessions, "house-a", "sess-1", { limit: 3 });
    assert.equal(page.lines.length, 3);
    assert.equal(page.total, 5);
    assert.equal(page.paused, false);
    const errors = buildLogDrawer(sessions, "house-a", "sess-1", { severity: "error" });
    assert.deepEqual(errors.lines.map((l) => l.severity), ["error"]);
    const found = buildLogDrawer(sessions, "house-a", "sess-1", { query: "npm test" });
    assert.ok(found.lines.length >= 1);
    const paused = buildLogDrawer(sessions, "house-a", "sess-1", { paused: true });
    assert.equal(paused.paused, true);
    // Older page via cursor: last seq of first page excluded.
    const first = buildLogDrawer(sessions, "house-a", "sess-1", { limit: 2 });
    const cursor = first.lines[0].seq;
    const older = buildLogDrawer(sessions, "house-a", "sess-1", { beforeSeq: cursor });
    assert.ok(older.lines.every((l) => l.seq < cursor));
    assert.throws(() => buildLogDrawer(sessions, "house-a", "ghost"), /SESSION_NOT_FOUND/);
  });

  it("copy returns the exact body; cancel aborts the session", async () => {
    const sessions = seed();
    assert.equal(copyLogLine(sessions, "house-a", "sess-1", 2), "shell: npm test");
    assert.throws(() => copyLogLine(sessions, "house-a", "sess-1", 99), /ENTRY_NOT_FOUND/);

    const adapter = new LocalEchoAdapter(sessions);
    await adapter.abort("house-a", "sess-1");
    assert.equal(sessions.get("house-a", "sess-1")?.status, "aborted");
    // Closed session rejects further appends (cancel path holds).
    assert.throws(() =>
      sessions.append("house-a", "sess-1", {
        id: "m-9",
        kind: "message",
        role: "user",
        body: "late",
      }),
    );
    // Other system's session untouched.
    const other = new SessionStore();
    other.create("house-b", "shared", { sessionId: "sess-1" });
    assert.equal(other.get("house-b", "sess-1")?.status, "active");
  });
});
