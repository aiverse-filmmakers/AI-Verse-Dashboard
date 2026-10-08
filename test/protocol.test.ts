import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_METHODS, COMMAND_METHODS, MAX_PARAMS_BYTES, PANEL_ID_PATTERN, PRESENTATIONS,
  PROTOCOL_ERRORS, PURPOSE_CONTROL_METHODS, QUERY_METHODS, WORKSPACE_ID_PATTERN,
  assertQueryOnly, eventSchema, isCommandMethod, isPurposeControlMethod, isQueryMethod,
  negotiateHandshake, panelIdSchema, parseFrame, presentationSchema, requestSchema,
  requiresSystem, requiresWorkspace, responseSchema, scopeKey, workspaceScopeKey,
} from "../packages/protocol/src/index.js";

describe("protocol Task 1: versioned envelope + systemId/workspaceId rules", () => {
  it("handshake negotiates major 1 and rejects others", () => {
    const ok = negotiateHandshake(1);
    assert.equal(ok.serverProtocol, "1.0");
    assert.equal(ok.phase, "phase-2-live");
    assert.throws(() => negotiateHandshake(2), /VERSION_MISMATCH/);
  });

  it("OS-bound and workspace-bound methods require explicit ids", () => {
    for (const method of ["purpose.get", "purpose.change.propose"]) {
      assert.equal(requiresSystem(method), true);
      assert.equal(requiresWorkspace(method), true);
    }
    assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "a", method: "purpose.get", workspaceId: "ws-1" }).success, false);
    assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "b", method: "purpose.get", systemId: "aiverse-01" }).success, false);
    assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "c", method: "purpose.get", systemId: "aiverse-01", workspaceId: "film-project-x" }).success, true);
    assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "d", method: "system.list" }).success, true);
  });

  it("workspace ids exactly match canonical OS/Purpose scope ids", () => {
    const max = `a${"b".repeat(127)}`;
    for (const good of ["a", "film-project", max]) assert.equal(WORKSPACE_ID_PATTERN.test(good), true, good);
    for (const bad of ["Film", "film_project", "film-", "-film", `a${"b".repeat(128)}`, "../x", "a/b", ""]) {
      assert.equal(WORKSPACE_ID_PATTERN.test(bad), false, bad);
      assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "w", method: "purpose.get", systemId: "aiverse-01", workspaceId: bad }).success, false, bad);
    }
  });

  it("rejects traversal, absolute, and Windows-style system ids", () => {
    for (const bad of ["../x", "/etc/passwd", "C:\\win", "\\\\srv\\s", "a/b", "", "UPPER HAS SPACE"]) {
      assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "e", method: "system.get", systemId: bad }).success, false);
    }
  });

  it("rejects raw-root params keys and oversized params", () => {
    for (const params of [{ root: "/tmp/os" }, { filter: { rootPath: "/x" } }, { items: [{ databasePath: "/y" }] }]) {
      const r = requestSchema.safeParse({ type: "req", v: "1.0", id: "g", method: "task.list", systemId: "aiverse-01", workspaceId: "ws-1", params });
      assert.equal(r.success, false);
      if (!r.success) assert.match(r.error.issues[0].message, new RegExp(PROTOCOL_ERRORS.RAW_ROOT_FORBIDDEN));
    }
    const big = { blob: "x".repeat(MAX_PARAMS_BYTES + 1) };
    assert.equal(requestSchema.safeParse({ type: "req", v: "1.0", id: "h", method: "task.list", systemId: "aiverse-01", workspaceId: "ws-1", params: big }).success, false);
  });

  it("keeps general commands blocked and admits only the explicit Purpose control method in the router", () => {
    assert.equal(isCommandMethod("chat.send"), true);
    assert.equal(isQueryMethod("purpose.get"), true);
    assert.equal(isPurposeControlMethod("purpose.change.propose"), true);
    assert.deepEqual([...PURPOSE_CONTROL_METHODS], ["purpose.change.propose"]);
    assert.throws(() => assertQueryOnly("chat.send"), /blocked/);
    assert.throws(() => assertQueryOnly("purpose.change.propose"), /blocked/);
    assert.doesNotThrow(() => assertQueryOnly("purpose.get"));
    assert.throws(() => assertQueryOnly("nope.method"), /unknown method/);
    assert.equal(COMMAND_METHODS.length, 13);
    assert.equal(QUERY_METHODS.length, 24);
    assert.equal(ALL_METHODS.length, 39);
  });

  it("responses and events round-trip with systemId provenance", () => {
    const res = responseSchema.parse({ type: "res", v: "1.0", id: "i", ok: true, systemId: "aiverse-01", result: { tasks: [] }, observedAt: new Date().toISOString() });
    assert.equal(res.ok, true);
    const badRes = responseSchema.safeParse({ type: "res", v: "1.0", id: "j", ok: false, observedAt: new Date().toISOString() });
    assert.equal(badRes.success, false);
    const ev = eventSchema.parse({ type: "event", v: "1.0", event: "task.updated", systemId: "aiverse-01", workspaceId: "ws-1", seq: 7, observedAt: new Date().toISOString() });
    assert.equal(ev.seq, 7);
    assert.equal(parseFrame({ type: "req", v: "1.0", id: "k", method: "system.list" }).type, "req");
  });

  it("scope keys namespace by systemId and enforce canonical workspace ids", () => {
    assert.notEqual(scopeKey("aiverse-01", "tasks", "t-1"), scopeKey("aiverse-02", "tasks", "t-1"));
    assert.equal(workspaceScopeKey("aiverse-01", "ws-1", "inbox"), "aiverse-01:ws-1:inbox");
    assert.throws(() => workspaceScopeKey("aiverse-01", "WS_1", "inbox"), /invalid workspaceId/);
  });

  it("panel ids are slugs and presentations are full/compact/hud", () => {
    assert.deepEqual([...PRESENTATIONS], ["full", "compact", "hud"]);
    assert.ok(PANEL_ID_PATTERN.test("purpose"));
    assert.equal(panelIdSchema.safeParse("../evil").success, false);
    assert.equal(presentationSchema.safeParse("full").success, true);
    assert.equal(presentationSchema.safeParse("hud").success, true);
  });
});
