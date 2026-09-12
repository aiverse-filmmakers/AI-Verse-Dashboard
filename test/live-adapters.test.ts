import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AdapterRegistry,
  CliJsonlAdapter,
  LocalEchoAdapter,
  SessionStore,
  validateAdapterDescriptor,
} from "../packages/live/src/index.js";

const ECHO_SCRIPT = `let s="";process.stdin.on("data",c=>{s+=c});process.stdin.on("end",()=>{const m=JSON.parse(s);console.log(JSON.stringify({reply:"cli:"+m.message}))});`;
const BAD_JSON_SCRIPT = `console.log("not json");`;
const SLOW_SCRIPT = `setTimeout(()=>console.log(JSON.stringify({reply:"late"})),5000);`;

describe("live Task 5 (Phase 2): adapter contract + working cli-jsonl adapter", () => {
  it("descriptor validates fail-closed", () => {
    const ok = validateAdapterDescriptor({
      name: "sidecar",
      kind: "cli-jsonl",
      command: ["node", "-e", ECHO_SCRIPT],
      timeoutMs: 4000,
    });
    assert.equal(ok.name, "sidecar");
    assert.throws(() => validateAdapterDescriptor({ name: "Bad Name!", kind: "cli-jsonl", command: ["x"] }), /ADAPTER_INVALID/);
    assert.throws(() => validateAdapterDescriptor({ name: "x", kind: "nope" }), /ADAPTER_INVALID/);
    assert.throws(() => validateAdapterDescriptor({ name: "x", kind: "cli-jsonl" }), /needs command/);
    assert.throws(() =>
      validateAdapterDescriptor({ name: "x", kind: "cli-jsonl", command: ["x"], timeoutMs: 99999 }),
    );
    assert.throws(() =>
      validateAdapterDescriptor({ name: "x", kind: "local-echo", command: [] }),
    );
  });

  it("cli-jsonl round-trips through a child process, per system", async () => {
    const sessions = new SessionStore();
    sessions.create("house-a", "shared", { sessionId: "sess-1" });
    sessions.create("house-b", "shared", { sessionId: "sess-1" });
    const events: { systemId: string }[] = [];
    const adapter = new CliJsonlAdapter(
      sessions,
      { name: "sidecar", kind: "cli-jsonl", command: ["node", "-e", ECHO_SCRIPT] },
      (ev) => events.push(ev),
    );
    const ack = await adapter.send("house-a", "sess-1", "ping");
    assert.equal(ack.accepted, true);
    const history = sessions.history("house-a", "sess-1");
    assert.equal(history.length, 2);
    assert.equal(history[1].body, "cli:ping");
    assert.equal(sessions.history("house-b", "sess-1").length, 0);
    assert.equal(events.length, 1);
    assert.equal(events[0].systemId, "house-a");
    const caps = await adapter.capabilities("house-a");
    assert.equal(caps.abort, true);
  });

  it("bad output, slow child, and missing binary fail as error-events", async () => {
    const sessions = new SessionStore();
    sessions.create("house-a", "shared", { sessionId: "sess-1" });
    const bad = new CliJsonlAdapter(sessions, {
      name: "bad",
      kind: "cli-jsonl",
      command: ["node", "-e", BAD_JSON_SCRIPT],
    });
    await assert.rejects(() => bad.send("house-a", "sess-1", "hi"), /ADAPTER_BAD_REPLY/);
    const history = sessions.history("house-a", "sess-1");
    assert.equal(history[history.length - 1].kind, "error-event");

    const slow = new CliJsonlAdapter(sessions, {
      name: "slow",
      kind: "cli-jsonl",
      command: ["node", "-e", SLOW_SCRIPT],
      timeoutMs: 300,
    });
    await assert.rejects(() => slow.send("house-a", "sess-1", "hi"), /ADAPTER_TIMEOUT/);

    const missing = new CliJsonlAdapter(sessions, {
      name: "missing",
      kind: "cli-jsonl",
      command: ["./does-not-exist-binary-xyz"],
    });
    await assert.rejects(() => missing.send("house-a", "sess-1", "hi"), /ADAPTER_/);
  });

  it("registry scopes adapters per system; echo still works", async () => {
    const sessions = new SessionStore();
    sessions.create("house-a", "shared", { sessionId: "sess-1" });
    const registry = new AdapterRegistry();
    const echo = new LocalEchoAdapter(sessions);
    const cli = new CliJsonlAdapter(sessions, {
      name: "sidecar",
      kind: "cli-jsonl",
      command: ["node", "-e", ECHO_SCRIPT],
    });
    registry.register("house-a", "echo", echo);
    registry.register("house-a", "sidecar", cli);
    assert.deepEqual(registry.names("house-a").sort(), ["echo", "sidecar"]);
    assert.throws(() => registry.register("house-a", "echo", echo), /ADAPTER_DUPLICATE/);
    assert.throws(() => registry.get("house-b"), /ADAPTER_NOT_FOUND/);
    assert.throws(() => registry.get("house-a", "ghost"), /ADAPTER_NOT_FOUND/);
    const ack = await registry.get("house-a", "echo").send("house-a", "sess-1", "hi");
    assert.equal(ack.accepted, true);
    const history = sessions.history("house-a", "sess-1");
    assert.match(history[history.length - 1].body, /receipt/);
  });
});
