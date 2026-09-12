import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_METHODS,
  COMMAND_METHODS,
  MAX_PARAMS_BYTES,
  PROTOCOL_ERRORS,
  QUERY_METHODS,
  assertQueryOnly,
  eventSchema,
  isCommandMethod,
  isQueryMethod,
  negotiateHandshake,
  parseFrame,
  requestSchema,
  requiresSystem,
  requiresWorkspace,
  responseSchema,
  scopeKey,
  workspaceScopeKey,
} from "../packages/protocol/src/index.js";

describe("protocol Task 1: versioned envelope + systemId/workspaceId rules", () => {
  it("handshake negotiates major 1 and rejects others", () => {
    const ok = negotiateHandshake(1);
    assert.equal(ok.serverProtocol, "1.0");
    assert.equal(ok.phase, "phase-1-read-only");
    assert.throws(() => negotiateHandshake(2), /VERSION_MISMATCH/);
    assert.throws(() => negotiateHandshake(0), /VERSION_MISMATCH/);
  });

  it("OS-bound methods require systemId; system.list does not", () => {
    assert.equal(requiresSystem("task.list"), true);
    assert.equal(requiresSystem("system.list"), false);
    const missing = requestSchema.safeParse({
      type: "req",
      v: "1.0",
      id: "a",
      method: "task.list",
      workspaceId: "ws-1",
    });
    assert.equal(missing.success, false);
    const listed = requestSchema.safeParse({
      type: "req",
      v: "1.0",
      id: "b",
      method: "system.list",
    });
    assert.equal(listed.success, true);
  });

  it("workspace-scoped methods require workspaceId", () => {
    assert.equal(requiresWorkspace("task.list"), true);
    assert.equal(requiresWorkspace("system.info"), false);
    const missing = requestSchema.safeParse({
      type: "req",
      v: "1.0",
      id: "c",
      method: "task.list",
      systemId: "aiverse-01",
    });
    assert.equal(missing.success, false);
    const full = requestSchema.safeParse({
      type: "req",
      v: "1.0",
      id: "d",
      method: "task.list",
      systemId: "aiverse-01",
      workspaceId: "film-project-x",
      params: { status: "open" },
    });
    assert.equal(full.success, true);
  });

  it("rejects traversal, absolute, and Windows-style ids", () => {
    for (const bad of ["../x", "/etc/passwd", "C:\\win", "\\\\srv\\s", "a/b", "a..b/c", "", "UPPER HAS SPACE"]) {
      const r = requestSchema.safeParse({
        type: "req",
        v: "1.0",
        id: "e",
        method: "system.get",
        systemId: bad,
      });
      assert.equal(r.success, false, `systemId ${bad} must fail`);
    }
    const w = requestSchema.safeParse({
      type: "req",
      v: "1.0",
      id: "f",
      method: "task.get",
      systemId: "aiverse-01",
      workspaceId: "../../etc",
    });
    assert.equal(w.success, false);
  });

  it("rejects raw-root params keys at any depth", () => {
    for (const params of [
      { root: "/tmp/os" },
      { fsRoot: "/tmp/os" },
      { filter: { rootPath: "/x" } },
      { items: [{ databasePath: "/y" }] },
    ]) {
      const r = requestSchema.safeParse({
        type: "req",
        v: "1.0",
        id: "g",
        method: "task.list",
        systemId: "aiverse-01",
        workspaceId: "ws-1",
        params,
      });
      assert.equal(r.success, false, JSON.stringify(params));
      if (!r.success) {
        assert.match(r.error.issues[0].message, new RegExp(PROTOCOL_ERRORS.RAW_ROOT_FORBIDDEN));
      }
    }
  });

  it("rejects oversized params beyond 64 KiB", () => {
    const big = { blob: "x".repeat(MAX_PARAMS_BYTES + 1) };
    const r = requestSchema.safeParse({
      type: "req",
      v: "1.0",
      id: "h",
      method: "task.list",
      systemId: "aiverse-01",
      workspaceId: "ws-1",
      params: big,
    });
    assert.equal(r.success, false);
  });

  it("Phase 1 blocks commands but allows queries", () => {
    assert.equal(isCommandMethod("chat.send"), true);
    assert.equal(isQueryMethod("task.list"), true);
    assert.throws(() => assertQueryOnly("chat.send"), /blocked/);
    assert.doesNotThrow(() => assertQueryOnly("task.list"));
    assert.throws(() => assertQueryOnly("nope.method"), /unknown method/);
    assert.equal(COMMAND_METHODS.length, 12);
    assert.equal(QUERY_METHODS.length, 23);
    assert.equal(ALL_METHODS.length, 37);
  });

  it("responses and events round-trip with systemId provenance", () => {
    const res = responseSchema.parse({
      type: "res",
      v: "1.0",
      id: "i",
      ok: true,
      systemId: "aiverse-01",
      result: { tasks: [] },
      observedAt: new Date().toISOString(),
    });
    assert.equal(res.ok, true);
    const badRes = responseSchema.safeParse({
      type: "res",
      v: "1.0",
      id: "j",
      ok: false,
      observedAt: new Date().toISOString(),
    });
    assert.equal(badRes.success, false);
    const ev = eventSchema.parse({
      type: "event",
      v: "1.0",
      event: "task.updated",
      systemId: "aiverse-01",
      workspaceId: "ws-1",
      seq: 7,
      observedAt: new Date().toISOString(),
    });
    assert.equal(ev.seq, 7);
    const routed = parseFrame({
      type: "req",
      v: "1.0",
      id: "k",
      method: "system.list",
    });
    assert.equal(routed.type, "req");
    assert.throws(() => parseFrame({ type: "bogus" }), /INVALID_ENVELOPE/);
  });

  it("scope keys namespace by systemId so A never collides with B", () => {
    const a = scopeKey("aiverse-01", "tasks", "t-1");
    const b = scopeKey("aiverse-02", "tasks", "t-1");
    assert.notEqual(a, b);
    assert.equal(a, "aiverse-01:tasks:t-1");
    assert.equal(workspaceScopeKey("aiverse-01", "ws-1", "inbox"), "aiverse-01:ws-1:inbox");
    assert.throws(() => scopeKey("../evil", "tasks"), /invalid systemId/);
  });
});
