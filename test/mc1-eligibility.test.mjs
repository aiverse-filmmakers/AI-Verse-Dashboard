import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inspectGatewayConfig, inspectReadiness, evaluateReadiness } from "../scripts/mc1/eligibility.mjs";

const validPin = "570b74195b0837131ae015a06fe466472f12001a";
const gate = { schema_version: "mc1-owner-audit-gate/1.0", mission_control_source_revision: validPin, decision: "BLOCKED", explicit_owner_release: null };
const inspected = { home: "found", binding: "local_config_matches", runtime: "json-subprocess" };

describe("MC1 pre-token owner eligibility", () => {
  it("holds the exact audited MC1.4 gate without assuming conditional dogfood is a release", () => {
    const result = evaluateReadiness(gate, inspected);
    assert.equal(result.ok, false);
    assert.equal(result.code, "MC1_GATE_BLOCKED");
  });
  it("fails closed on missing/stale/mismatched source and unreviewed owner approval", () => {
    for (const mutated of [
      null, {}, { ...gate, schema_version: "unknown" },
      { ...gate, mission_control_source_revision: "unreviewed" },
    ]) assert.equal(evaluateReadiness(mutated, inspected).code, "MC1_GATE_INVALID");
    assert.equal(evaluateReadiness({ ...gate, decision: "RELEASED", explicit_owner_release: null }, inspected).code, "MC1_GATE_BLOCKED");
    assert.equal(evaluateReadiness({ ...gate, decision: "RELEASED", explicit_owner_release: { signed: true } }, inspected).code, "MC1_OWNER_ADMISSION_NOT_IMPLEMENTED",
      "a mutable approval file must not silently activate the real owner proof");
    assert.equal(evaluateReadiness({ ...gate, decision: "RELEASED", explicit_owner_release: { signed: true } },
      { ...inspected, binding: "unverified" }).code, "MC1_LOCAL_RUNTIME_UNVERIFIED");
    assert.equal(evaluateReadiness({ ...gate, decision: "RELEASED", explicit_owner_release: { signed: true } },
      { ...inspected, runtime: "deterministic" }).code, "MC1_LOCAL_RUNTIME_UNVERIFIED");
  });
  it("checks loopback Gateway identity/runtime without printing or needing secrets", () => {
    const root = mkdtempSync(join(tmpdir(), "mc1-eligibility-"));
    try {
      const system = join(root, "os");
      const home = join(root, "gateway");
      mkdirSync(system);
      mkdirSync(home);
      writeFileSync(join(system, "AI-VERSE.yaml"), "schema_version: 2.0\n");
      writeFileSync(join(home, "config.json"), JSON.stringify({
        enabled: true, system: { id: "private-id", root: system, default_workspace: "operator" },
        server: { host: "127.0.0.1", port: 8787 },
        runtime: { kind: "json-subprocess" },
        auth: { keys: [{ verifier: "SENSITIVE_HASH_MUST_NOT_LOG" }] }
      }));
      const good = inspectGatewayConfig(home, "http://127.0.0.1:8787");
      assert.deepEqual(good, { home: "found", binding: "local_config_matches", runtime: "json-subprocess" });
      assert.equal(inspectGatewayConfig(home, "https://example.com:8787").binding, "unverified");
      assert.equal(inspectGatewayConfig(home, "http://127.0.0.1:9999").binding, "unverified");
      assert.equal(inspectGatewayConfig(home, "http://127.0.0.1:8787/?token=x").binding, "unverified");
      const gatePath = join(root, "gate.json");
      writeFileSync(gatePath, JSON.stringify(gate));
      const actual = inspectReadiness({ gatePath, env: {
        AIVERSE_GATEWAY_HOME: home, AIVERSE_GATEWAY_URL: "http://127.0.0.1:8787",
        AIVERSE_GATEWAY_TOKEN: "SECRET_TOKEN_NOT_ALLOWED_IN_LOGS"
      } });
      const text = JSON.stringify(actual);
      assert.equal(actual.code, "MC1_GATE_BLOCKED");
      assert.doesNotMatch(text, /SENSITIVE_HASH|SECRET_TOKEN|private-id|\/gateway|\/os/);
      const link = join(root, "linked-gateway");
      mkdirSync(link);
      symlinkSync(join(home, "config.json"), join(link, "config.json"));
      assert.equal(inspectGatewayConfig(link).home, "unsafe_config");
      assert.equal(inspectReadiness({ gatePath: join(root, "missing.json"), env: { AIVERSE_GATEWAY_HOME: home } }).code,
        "MC1_GATE_MISSING_OR_INVALID");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("aborts the local runner before token entry, npm install or starting Mission Control", () => {
    const script = readFileSync(resolve("scripts/mc1/run-local.sh"), "utf8");
    const eligibility = script.indexOf("node scripts/mc1/eligibility.mjs");
    const prompt = script.indexOf('read -r -s AIVERSE_GATEWAY_TOKEN');
    const npmInstall = script.indexOf("npm ci");
    const proof = script.indexOf("npm run mc1:proof");
    assert.ok(eligibility > 0 && prompt > eligibility && npmInstall > eligibility && proof > npmInstall);
    const result = spawnSync("bash", ["scripts/mc1/run-local.sh"], {
      cwd: process.cwd(), encoding: "utf8", timeout: 10000,
      env: { ...process.env, AIVERSE_GATEWAY_TOKEN: "CANARY_DO_NOT_LOG", LOCAL_LLM_API_KEY: "OTHER_CANARY" }
    });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stdout, /MC1_GATE_BLOCKED/);
    assert.doesNotMatch(result.stdout + result.stderr, /CANARY|OTHER_CANARY|Gateway token \(input hidden\)|Preparing the verified|Running the disposable/);
  });
});
