// Explicitly approved local-model trial. Never imports a personal OS or token.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, lstat, rm, writeFile, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { LOCAL_TRIAL, assertLocalModelTrial } from "../../dist/scripts/mc1/local-model-admission.js";

const gatewaySource = path.resolve(process.env.AIVERSE_MC1_GATEWAY_SOURCE || "gateway-source");
const osSource = path.resolve(process.env.AIVERSE_MC1_OS_SOURCE || "os-source");
const safeEnv = Object.fromEntries(["PATH", "HOME", "TMPDIR", "SystemRoot"].filter((k) => process.env[k]).map((k) => [k, process.env[k]]));
const git = (root, ...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
const owner = async (file) => import(pathToFileURL(path.join(gatewaySource, "src", file)).href);

async function fingerprint(root) {
  const hash = createHash("sha256");
  async function visit(dir) {
    for (const name of (await readdir(dir)).sort()) {
      const file = path.join(dir, name);
      if (path.relative(root, file).split(path.sep)[0] === "runtime") continue;
      const s = await lstat(file);
      assert.ok(!s.isSymbolicLink(), "trial OS must not contain symlinks");
      if (s.isDirectory()) await visit(file);
      else { hash.update(path.relative(root, file)); hash.update(await readFile(file)); }
    }
  }
  await visit(root);
  return hash.digest("hex");
}

async function runProof(env, token) {
  const child = spawn(process.execPath, ["dist/scripts/mc1/proof.js"], {
    env, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (b) => { stdout = (stdout + b).slice(-24000); });
  child.stderr.on("data", (b) => { stderr = (stderr + b).slice(-24000); });
  const kill = () => { try { process.platform === "win32" ? child.kill("SIGKILL") : process.kill(-child.pid, "SIGKILL"); } catch (e) { if (e.code !== "ESRCH") throw e; } };
  const timer = setTimeout(kill, 240000);
  try {
    const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
    assert.ok(!stdout.includes(token) && !stderr.includes(token), "trial output must not expose its ephemeral bearer");
    assert.equal(code, 0, "local model proof failed: " + stderr.slice(-1800).replaceAll(token, "[REDACTED]") + stdout.slice(-800).replaceAll(token, "[REDACTED]"));
    return JSON.parse(stdout);
  } finally { clearTimeout(timer); kill(); }
}

async function main() {
  assert.notEqual(process.env.CI, "true", "a real local trial must not impersonate synthetic CI");
  assert.equal(process.env.AIVERSE_GATEWAY_TOKEN, undefined, "never import a personal Gateway token");
  assert.equal(git(gatewaySource, "rev-parse", "HEAD"), LOCAL_TRIAL.gateway_revision);
  assert.equal(git(osSource, "rev-parse", "HEAD"), LOCAL_TRIAL.os_revision);
  assert.equal(git(gatewaySource, "status", "--porcelain"), "", "Gateway source must be clean");
  const tags = await (await fetch(LOCAL_TRIAL.runtime_origin + "/api/tags", { signal: AbortSignal.timeout(5000), redirect: "error" })).json();
  const model = tags.models?.find((m) => m.name === LOCAL_TRIAL.model);
  assert.equal(model?.digest, LOCAL_TRIAL.model_digest, "local model digest must match the approved download");
  const ollama = await (await fetch(LOCAL_TRIAL.runtime_origin + "/api/version", { redirect: "error" })).json();
  const { installComponent, setupComponent, doctorComponent } = await owner("lifecycle.mjs");
  const { loadConfig } = await owner("config.mjs");
  const { startServer } = await owner("server.mjs");
  const { HostClient } = await owner("host-adapter.mjs");
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "aiverse-mc1-real-local-")));
  const systemRoot = path.join(root, "trial-system");
  const home = path.join(root, "gateway-home");
  let live, evidence, deniedEffects = 0;
  try {
    await mkdir(systemRoot);
    const archive = execFileSync("git", ["-C", osSource, "archive", LOCAL_TRIAL.os_revision], { maxBuffer: 100 * 1024 * 1024 });
    const archivePath = path.join(root, "public-os.tar");
    await writeFile(archivePath, archive);
    execFileSync("tar", ["-xf", archivePath, "-C", systemRoot]);
    const osCli = path.join(systemRoot, "bin", "ai-verse-os.mjs");
    const osSetup = JSON.parse(execFileSync(process.execPath, [osCli, "setup", "--dir", systemRoot, "--json"], { env: safeEnv, encoding: "utf8" }));
    assert.equal(osSetup.state, "ready", "canonical standalone OS setup must be ready");
    const osDoctor = JSON.parse(execFileSync(process.execPath, [osCli, "doctor", "--dir", systemRoot, "--json"], { env: safeEnv, encoding: "utf8" }));
    assert.equal(osDoctor.state, "ready", "canonical OS doctor must pass before the trial");
    await installComponent({ home });
    const setup = await setupComponent({ home, system_root: systemRoot,
      runtime: "openai-compatible", base_url: LOCAL_TRIAL.runtime_origin, model: LOCAL_TRIAL.model,
      system_id: LOCAL_TRIAL.system_id, workspace: LOCAL_TRIAL.workspace_id, port: 18787 });
    const config = await loadConfig(home);
    assertLocalModelTrial({ gatewayHome: home, gatewayUrl: LOCAL_TRIAL.gateway_origin,
      systemRoot, systemId: LOCAL_TRIAL.system_id, runtime: config.runtime.kind });
    const host = new HostClient(path.join(home, "host.json"));
    assert.equal((await host.describe()).adapter_id, "ai-verse-os:host");
    await host.readContext("operator");
    await assert.rejects(host.readContext("workspace:invalid!"));
    const gatewayDoctor = await doctorComponent({ home });
    assert.equal(gatewayDoctor.state, "ready", "Gateway doctor must be ready");
    const before = await fingerprint(systemRoot);
    live = await startServer(config, home);
    // An additional experiment guard, never a substitute for canonical reads:
    // any attempted domain mutation fails this read-only trial immediately.
    live.engine.host.requestAction = async () => { deniedEffects += 1; throw new Error("local model trial forbids owner effects"); };
    const noAuth = await fetch(LOCAL_TRIAL.gateway_origin + "/status");
    assert.equal(noAuth.status, 401);
    const wrongAuth = await fetch(LOCAL_TRIAL.gateway_origin + "/status", { headers: { authorization: "Bearer incorrect-trial-token" } });
    assert.equal(wrongAuth.status, 401);
    const result = await runProof({ ...safeEnv,
      AIVERSE_GATEWAY_HOME: home, AIVERSE_GATEWAY_URL: LOCAL_TRIAL.gateway_origin,
      AIVERSE_GATEWAY_TOKEN: setup.api_token,
      AIVERSE_MC1_LAB_ROOT: path.join(root, "mission-control-lab"), AIVERSE_MC1_PORT: "3017",
      AIVERSE_MC1_LOCAL_MODEL_TRIAL: "1", AIVERSE_MC1_KEEP_LAB_DATA: "0",
    }, setup.api_token);
    assert.equal(result.ok, true);
    assert.equal(result.mission_control.marker_present, true, "real model must return the unique marker");
    assert.equal(result.aiverse_gateway.system_id, LOCAL_TRIAL.system_id);
    assert.equal(result.aiverse_gateway.workspace_id, LOCAL_TRIAL.workspace_id);
    assert.equal(result.aiverse_gateway.runtime, "openai-compatible");
    assert.equal(result.mission_control.pin, LOCAL_TRIAL.mission_control_revision);
    assert.equal(result.mission_control.local_routing_compatibility_alias, false);
    await live.close(); live = null;
    assert.equal(deniedEffects, 0, "the real model or background review attempted a forbidden effect");
    assert.equal(await fingerprint(systemRoot), before, "canonical trial OS files must remain unchanged");
    evidence = { success: true, trial: LOCAL_TRIAL.id,
      dashboard_revision: git(process.cwd(), "rev-parse", "HEAD"),
      gateway_revision: LOCAL_TRIAL.gateway_revision, os_revision: LOCAL_TRIAL.os_revision,
      mission_control_revision: LOCAL_TRIAL.mission_control_revision,
      platform: process.platform, node_version: process.version, ollama_version: ollama.version,
      model: LOCAL_TRIAL.model, model_digest: model.digest, runtime: "openai-compatible",
      host_adapter: "ai-verse-os:host", os_setup: "ready", os_doctor: "ready", gateway_doctor: "ready",
      dispatch_model: "local/aiverse", marker_present: true, system_id: LOCAL_TRIAL.system_id,
      workspace_id: "operator", missing_and_wrong_token_rejected: true,
      guarded_effect_attempts: deniedEffects, canonical_os_unchanged: true,
      real_model_proved: true, private_owner_os_proved: false, member_release: false };
  } finally {
    if (live) await live.close();
    await rm(root, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  }
  console.log(JSON.stringify({ ...evidence, lab_removed: true }, null, 2));
}
main().catch((e) => { console.error(String(e.message || e)); process.exitCode = 1; });
