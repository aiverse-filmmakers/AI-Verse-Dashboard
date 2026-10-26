#!/usr/bin/env node
/**
 * Credential-free MC1 owner readiness inspection.
 * Designed to run BEFORE prompting for a Gateway token, npm ci, or cloning MC.
 * A gate record is evidence, NOT executable authorization on its own.
 */
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_GATE = join(ROOT, "docs", "mc1-owner-audit-gate.json");
const REQUIRED_MC_PIN = "570b74195b0837131ae015a06fe466472f12001a";

export function inspectGatewayConfig(home, declaredUrl = "http://127.0.0.1:8787") {
  const output = { home: "not_found", binding: "unverified", runtime: "unverified" };
  const p = join(resolve(home), "config.json");
  try {
    const info = lstatSync(p);
    if (!info.isFile() || info.isSymbolicLink()) {
      return { ...output, home: "unsafe_config" };
    }
    const config = JSON.parse(readFileSync(p, "utf8"));
    output.home = "found";
    const url = new URL(declaredUrl);
    const server = config.server;
    const hostOk = ["127.0.0.1", "::1", "localhost"].includes(String(server?.host));
    const urlOk = url.protocol === "http:" &&
      ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname) &&
      !url.username && !url.password && !url.search && !url.hash &&
      (url.pathname === "/" || url.pathname === "") &&
      Number(url.port || 80) === Number(server?.port);
    const root = String(config.system?.root || "");
    const rootOk = root && existsSync(join(root, "AI-VERSE.yaml")) &&
      realpathSync(root) === resolve(root);
    output.binding = hostOk && urlOk && rootOk && Boolean(config.system?.id) &&
      Boolean(config.system?.default_workspace) && config.enabled !== false
      ? "local_config_matches" : "unverified";
    const kind = config.runtime?.kind;
    output.runtime = ["json-subprocess", "openai-compatible", "deterministic"].includes(kind)
      ? kind : "unsupported_or_unconfigured";
    return output;
  } catch {
    // Deliberately never print paths, raw config, tokens, verifier hashes or JSON errors.
    return output;
  }
}

export function evaluateReadiness(gate, inspection) {
  if (gate?.schema_version !== "mc1-owner-audit-gate/1.0" ||
      gate?.mission_control_source_revision !== REQUIRED_MC_PIN) {
    return { ok: false, code: "MC1_GATE_INVALID", message: "No qualified MC1 gate record for the selected routing pin." };
  }
  if (gate.decision !== "RELEASED" || !gate.explicit_owner_release) {
    return {
      ok: false, code: "MC1_GATE_BLOCKED",
      message: "MC1.4 is not approved for an owner/runtime trial. No token or install is needed."
    };
  }
  if (inspection.binding !== "local_config_matches" ||
      !["json-subprocess", "openai-compatible"].includes(inspection.runtime)) {
    return {
      ok: false, code: "MC1_LOCAL_RUNTIME_UNVERIFIED",
      message: "Approved local loopback Gateway and supported non-test runtime configuration were not verified."
    };
  }
  // Do not infer that a mutable JSON status independently grants authority.
  // The actual owner admission path remains blocked in lib.ts until an audited
  // scoped-release implementation is reviewed and merged separately.
  return {
    ok: false, code: "MC1_OWNER_ADMISSION_NOT_IMPLEMENTED",
    message: "Owner release metadata is present, but runtime admission still needs a separately reviewed implementation."
  };
}

export function inspectReadiness({ gatePath = DEFAULT_GATE, env = process.env } = {}) {
  let gate;
  try {
    const f = lstatSync(gatePath);
    if (!f.isFile() || f.isSymbolicLink()) throw new Error("unsafe gate");
    gate = JSON.parse(readFileSync(gatePath, "utf8"));
  } catch {
    return { ok: false, code: "MC1_GATE_MISSING_OR_INVALID", gateway: { home: "unverified", binding: "unverified", runtime: "unverified" } };
  }
  const home = resolve(env.AIVERSE_GATEWAY_HOME || join(homedir(), ".aiverse", "gateway"));
  const inspected = inspectGatewayConfig(home, env.AIVERSE_GATEWAY_URL || "http://127.0.0.1:8787");
  return {
    ...evaluateReadiness(gate, inspected),
    gateway: inspected,
    audit_gate: gate.decision === "BLOCKED" ? "blocked" : "unverified"
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outcome = inspectReadiness();
  process.stdout.write(JSON.stringify(outcome, null, 2) + "\n");
  process.exitCode = outcome.ok ? 0 : 2;
}
