import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Deliberately separate from the global BLOCKED owner gate. This is one
// owner-authorized local-model experiment, not general production admission.
export const LOCAL_TRIAL = {
  id: "mc1-local-qwen-2026-10-26",
  consent_ref: "codex:01a174f1-94a3-7c31-93ec-fd95f80c68bd:01a17993-92d8-7550-bd7a-325df757e3b8:user",
  dashboard_base: "705e11b81baff6777a4f6409dde153b3e36d0092",
  gateway_revision: "81d49a04c14caf2429cc0acd3a77f1072a1465f0",
  os_revision: "d490db4c02e7b72c5cc8eae07080eccfa4dc3989",
  mission_control_revision: "570b74195b0837131ae015a06fe466472f12001a",
  system_id: "mc1-local-real",
  workspace_id: "operator",
  gateway_origin: "http://127.0.0.1:18787",
  runtime_origin: "http://127.0.0.1:11439",
  model: "qwen3:0.6b",
  model_digest: "7df6b6e09427a769808717c0a93cadc4ae99ed4eb8bf5ca557c90846becea435",
  expires_at: "2026-10-27T23:59:59Z",
  private_data: false,
  external_credentials: false,
  effects: false,
} as const;
export const LOCAL_TRIAL_RECORD = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/mc1-local-model-trial-2026-10-26.json");
const RECORD_SHA256 = "12ca00eedefc85c1546689f5cd965577eb5ce5d3284f02394065642b28ab7743";

export function assertLocalModelTrial(input: {
  systemRoot: string; systemId: string; runtime: string;
  gatewayHome: string; gatewayUrl: string;
}, recordPath = LOCAL_TRIAL_RECORD, now = Date.now()): void {
  const refuse = () => { throw new Error("MC1 local-model trial scope, approval or binding does not match"); };
  const regular = (p: string) => { const s = lstatSync(p); if (!s.isFile() || s.isSymbolicLink()) refuse(); };
  try {
    regular(recordPath);
    const bytes = readFileSync(recordPath);
    // Git may check out JSON as CRLF on Windows; scope content stays identical.
    if (createHash("sha256").update(bytes.toString().replace(/\r\n/g, "\n")).digest("hex") !== RECORD_SHA256 ||
        JSON.stringify(JSON.parse(bytes.toString())) !== JSON.stringify(LOCAL_TRIAL) ||
        !Number.isFinite(now) || now > Date.parse(LOCAL_TRIAL.expires_at)) refuse();
    const root = realpathSync(input.systemRoot);
    if (lstatSync(input.systemRoot).isSymbolicLink()) refuse();
    const lab = dirname(root);
    const rel = relative(realpathSync(tmpdir()), lab);
    if (rel.includes("/") || rel.includes("\\") || !/^aiverse-mc1-real-local-[A-Za-z0-9_-]+$/.test(rel) ||
        root !== join(lab, "trial-system") ||
        realpathSync(input.gatewayHome) !== join(lab, "gateway-home")) refuse();
    regular(join(root, "AI-VERSE.yaml"));
    regular(join(root, ".aiverse", "os", "setup.json"));
    const cfgPath = join(input.gatewayHome, "config.json");
    regular(cfgPath);
    const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
    if (input.systemId !== LOCAL_TRIAL.system_id || input.runtime !== "openai-compatible" ||
        input.gatewayUrl !== LOCAL_TRIAL.gateway_origin ||
        cfg.system?.root !== root || cfg.system?.id !== LOCAL_TRIAL.system_id ||
        cfg.system?.default_workspace !== LOCAL_TRIAL.workspace_id || cfg.enabled !== true ||
        cfg.server?.host !== "127.0.0.1" || cfg.server?.port !== 18787 || cfg.server?.allow_remote !== false ||
        cfg.auth?.required !== true || cfg.runtime?.kind !== "openai-compatible" ||
        cfg.runtime?.base_url !== LOCAL_TRIAL.runtime_origin || cfg.runtime?.model !== LOCAL_TRIAL.model ||
        cfg.runtime?.api_key_env || cfg.goal_owner_config) refuse();
    if (realpathSync(cfg.host_adapter_config) !== join(lab, "gateway-home", "host.json")) refuse();
    const host = JSON.parse(readFileSync(cfg.host_adapter_config, "utf8"));
    if (host.transport !== "json-subprocess" || host.command?.length !== 4 || host.command[0] !== "python3" ||
        host.command[1] !== join(root, "scripts", "ai_verse_host_adapter.py") ||
        host.command[2] !== "--root" || host.command[3] !== root || host.env_names?.length) refuse();
  } catch { refuse(); }
}

export function restrictTrialHost(host: {
  authorizeAction: (request: unknown, signal?: unknown) => Promise<unknown>;
  requestAction: (...args: unknown[]) => Promise<unknown>;
}) {
  const stats = { denied_authorizations: 0, forbidden_dispatches: 0 };
  const ownerAuthorize = host.authorizeAction.bind(host);
  host.authorizeAction = async (request, signal) => {
    await ownerAuthorize(request, signal);
    // Intersect real owner policy with this trial's stricter no-effect scope.
    // Context reads use separate unchanged host methods.
    stats.denied_authorizations += 1;
    return { allowed: false, decision: "deny", reason: "local real-model trial admits no owner effects" };
  };
  host.requestAction = async () => {
    stats.forbidden_dispatches += 1;
    throw new Error("local model trial forbids owner effects");
  };
  return stats;
}
