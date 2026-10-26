import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { assertLocalModelTrial, LOCAL_TRIAL, LOCAL_TRIAL_RECORD } from "../scripts/mc1/local-model-admission.js";
import { assertMc1RoutingGate, MISSION_CONTROL_PIN } from "../scripts/mc1/lib.js";

describe("owner-approved disposable local-model admission", () => {
  it("admits only the exact approved record, local runtime and disposable binding", () => {
    const lab = realpathSync(mkdtempSync(join(tmpdir(), "aiverse-mc1-real-local-")));
    const root = resolve(lab, "trial-system"), home = resolve(lab, "gateway-home");
    mkdirSync(join(root, ".aiverse", "os"), { recursive: true }); mkdirSync(home);
    writeFileSync(join(root, "AI-VERSE.yaml"), "schema_version: 2.0\n");
    writeFileSync(join(root, ".aiverse", "os", "setup.json"), "{}");
    const hostPath = join(home, "host.json");
    writeFileSync(hostPath, JSON.stringify({ transport: "json-subprocess", command: ["python3", join(root, "scripts", "ai_verse_host_adapter.py"), "--root", root], env_names: [] }));
    const cfg = { enabled: true, auth: { required: true }, system: { root, id: LOCAL_TRIAL.system_id, default_workspace: "operator" },
      server: { host: "127.0.0.1", port: 18787, allow_remote: false },
      runtime: { kind: "openai-compatible", base_url: LOCAL_TRIAL.runtime_origin, model: LOCAL_TRIAL.model, api_key_env: null },
      goal_owner_config: null, host_adapter_config: hostPath };
    const configPath = join(home, "config.json");
    const put = (value: unknown) => writeFileSync(configPath, JSON.stringify(value));
    const input = { systemRoot: root, systemId: LOCAL_TRIAL.system_id, runtime: "openai-compatible", gatewayHome: home, gatewayUrl: LOCAL_TRIAL.gateway_origin };
    const now = Date.parse("2026-10-26T20:00:00Z");
    try {
      put(cfg); assert.doesNotThrow(() => assertLocalModelTrial(input, LOCAL_TRIAL_RECORD, now));
      for (const bad of [
        { ...cfg, system: { ...cfg.system, id: "personal" } },
        { ...cfg, system: { ...cfg.system, default_workspace: "other" } },
        { ...cfg, server: { ...cfg.server, host: "0.0.0.0" } },
        { ...cfg, runtime: { ...cfg.runtime, base_url: "https://external.example" } },
        { ...cfg, runtime: { ...cfg.runtime, model: "different-model" } },
        { ...cfg, runtime: { ...cfg.runtime, api_key_env: "PAID_KEY" } },
        { ...cfg, runtime: { kind: "deterministic" } },
        { ...cfg, auth: { required: false } },
      ]) { put(bad); assert.throws(() => assertLocalModelTrial(input, LOCAL_TRIAL_RECORD, now)); }
      put(cfg);
      assert.throws(() => assertLocalModelTrial(input, LOCAL_TRIAL_RECORD, Date.parse("2026-10-28T00:00:00Z")));
      const altered = join(lab, "altered.json");
      writeFileSync(altered, readFileSync(LOCAL_TRIAL_RECORD, "utf8").replace("qwen3:0.6b", "other"));
      assert.throws(() => assertLocalModelTrial(input, altered, now));
      const link = join(lab, "linked.json"); symlinkSync(LOCAL_TRIAL_RECORD, link);
      assert.throws(() => assertLocalModelTrial(input, link, now));
      assert.throws(() => assertLocalModelTrial({ ...input, systemRoot: process.cwd() }, LOCAL_TRIAL_RECORD, now));
      assert.throws(() => assertLocalModelTrial({ ...input, gatewayUrl: "http://localhost:18787" }, LOCAL_TRIAL_RECORD, now));
      assert.throws(() => assertMc1RoutingGate({ pin: MISSION_CONTROL_PIN, ciSynthetic: false, ciEnvironment: false,
        systemId: "personal", runtime: "openai-compatible", systemRoot: process.cwd() }));
    } finally { rmSync(lab, { recursive: true, force: true }); }
  });
});
