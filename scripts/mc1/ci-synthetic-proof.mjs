// CI-only composition of the existing Dashboard MC1 proof with an actual,
// disposable Gateway instance. Never runs on an owner installation.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const GATEWAY_SHA = "9c42bdc21073020c3d7194446b0f2ae929eb25a2";
const gatewaySource = path.resolve(process.env.AIVERSE_CI_GATEWAY_SOURCE || "gateway-source");
const proofEntry = path.resolve("dist/scripts/mc1/proof.js");

async function freeLoopbackPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function runProof(env, token) {
  const child = spawn(process.execPath, [proofEntry], {
    cwd: process.cwd(), env, shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  const append = (prev, chunk) => (prev + chunk.toString()).slice(-16000);
  child.stdout.on("data", (chunk) => { stdout = append(stdout, chunk); });
  child.stderr.on("data", (chunk) => { stderr = append(stderr, chunk); });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 18 * 60 * 1000);
  try {
    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    if (stdout.includes(token) || stderr.includes(token)) {
      throw new Error("MC1 proof output exposed a synthetic Gateway bearer credential");
    }
    if (exitCode !== 0) {
      throw new Error("Existing MC1 proof exited " + String(exitCode) +
        ": " + stderr.slice(-2400).replaceAll(token, "[REDACTED]") +
        "\n" + stdout.slice(-1200).replaceAll(token, "[REDACTED]"));
    }
    return JSON.parse(stdout);
  } finally {
    clearTimeout(timeout);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

async function main() {
  assert.equal(process.env.CI, "true", "Only a disposable hosted CI runner may execute this proof");
  assert.equal(process.env.AIVERSE_GATEWAY_TOKEN, undefined,
    "Never import an owner Gateway token into a synthetic CI run");
  const head = execFileSync("git", ["-C", gatewaySource, "rev-parse", "HEAD"],
    { encoding: "utf8" }).trim();
  assert.equal(head, GATEWAY_SHA, "Gateway source must match the exact accepted merge commit");
  const { installComponent, setupComponent } = await import(
    pathToFileURL(path.join(gatewaySource, "src", "lifecycle.mjs")).href);
  const { loadConfig } = await import(
    pathToFileURL(path.join(gatewaySource, "src", "config.mjs")).href);
  const { startServer } = await import(
    pathToFileURL(path.join(gatewaySource, "src", "server.mjs")).href);

  const root = await mkdtemp(path.join(tmpdir(), "aiverse-mc1-github-synthetic-"));
  const systemRoot = path.join(root, "synthetic-system");
  const gatewayHome = path.join(root, "gateway-home");
  const labRoot = path.join(root, "disposable-mission-control-lab");
  const hostConfig = path.join(root, "synthetic-host.json");
  let live;
  try {
    await mkdir(systemRoot, { recursive: true });
    await writeFile(path.join(systemRoot, "AI-VERSE.yaml"), "schema_version: 2.0\n");
    await writeFile(hostConfig, JSON.stringify({
      transport: "json-subprocess",
      command: [process.execPath, path.join(gatewaySource, "fixtures", "fake-host.mjs")],
      timeout_seconds: 10, max_output_bytes: 1048576,
      max_stderr_bytes: 65536, env_names: [], cwd: systemRoot
    }));
    const gatewayPort = await freeLoopbackPort();
    const missionControlPort = await freeLoopbackPort();
    assert.notEqual(missionControlPort, gatewayPort);

    await installComponent({ home: gatewayHome });
    const setup = await setupComponent({
      home: gatewayHome, system_root: systemRoot,
      host_config: hostConfig, runtime: "deterministic",
      system_id: "ci-synthetic", workspace: "operator", port: gatewayPort
    });
    const token = setup.api_token;
    assert.ok(typeof token === "string" && token.startsWith("avg_"));
    live = await startServer(await loadConfig(gatewayHome), gatewayHome);
    assert.equal(live.port, gatewayPort);
    const base = "http://127.0.0.1:" + String(live.port);
    const denied = await fetch(base + "/status");
    assert.equal(denied.status, 401, "no public access to authenticated Gateway status");
    const bad = await fetch(base + "/status", {
      headers: { authorization: "Bearer intentionally-wrong-test-token" }
    });
    assert.equal(bad.status, 401, "incorrect Gateway token must be rejected");

    // Reuse exactly the accepted Dashboard MC1 Mission Control runner.
    // Never pass real system paths, external credentials or a production runtime.
    const result = await runProof({
      ...process.env,
      AIVERSE_GATEWAY_HOME: gatewayHome,
      AIVERSE_GATEWAY_URL: base,
      AIVERSE_GATEWAY_TOKEN: token,
      AIVERSE_MC1_LAB_ROOT: labRoot,
      AIVERSE_MC1_PORT: String(missionControlPort),
      AIVERSE_MC1_KEEP_LAB_DATA: "0",
      AIVERSE_MC1_ALLOW_REMOTE: "0"
    }, token);
    assert.equal(result.ok, true);
    assert.equal(result.task, "MC1.4");
    assert.equal(result.aiverse_gateway.system_id, "ci-synthetic");
    assert.equal(result.aiverse_gateway.workspace_id, "operator");
    assert.equal(result.aiverse_gateway.model, "aiverse");
    assert.equal(result.mission_control.pin, "5483a0e1eef15b467c167e95796791112cedbb7c");
    assert.equal(result.mission_control.dispatch_model, "local/aiverse");
    assert.equal(result.mission_control.marker_present, true,
      "a real response must carry the unique task marker; transport-only success is insufficient");
    assert.equal(result.isolation.mission_control_data, "disposable-lab-only");
    const stillHealthy = await fetch(base + "/status", {
      headers: { authorization: "Bearer " + token }
    });
    assert.equal(stillHealthy.status, 200,
      "Mission Control teardown must preserve the canonical Gateway lifecycle");
    console.log(JSON.stringify({
      success: true,
      evidence: "hosted synthetic MC1 real HTTP dispatch and response",
      gateway_merge: GATEWAY_SHA,
      mission_control_pin: result.mission_control.pin,
      system_id: result.aiverse_gateway.system_id,
      workspace_id: result.aiverse_gateway.workspace_id,
      marker_present: true,
      member_release: false,
      owner_machine_proved: false
    }, null, 2));
  } finally {
    if (live) await live.close();
    await rm(root, { recursive: true, force: true });
  }
}
main().catch((error) => {
  // Only synthetic secrets are generated in this process; runProof still redacts its output.
  console.error("Hosted synthetic proof failed: " + String(error.message || error));
  process.exitCode = 1;
});
