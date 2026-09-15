import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";

export const MISSION_CONTROL_REPO =
  "https://github.com/builderz-labs/mission-control.git";
export const MISSION_CONTROL_PIN =
  "5483a0e1eef15b467c167e95796791112cedbb7c";
export const DEFAULT_GATEWAY_URL = "http://127.0.0.1:8787";
export const DEFAULT_MC_PORT = 3017;

export interface Mc1Settings {
  gatewayUrl: string;
  gatewayToken: string;
  gatewayHome: string;
  labRoot: string;
  missionControlDir: string;
  missionControlPort: number;
}

export interface GatewayBinding {
  systemId: string;
  defaultWorkspace: string;
  root: string;
  host: string;
  port: number;
  enabled: boolean;
}

export interface GatewayPreflight {
  ok: true;
  gatewayUrl: string;
  health: Record<string, unknown>;
  status: Record<string, unknown>;
  model: Record<string, unknown>;
  binding: GatewayBinding;
  smoke?: {
    content: string;
    usage?: Record<string, unknown>;
  };
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export function commandName(base: string): string {
  return process.platform === "win32" ? `${base}.cmd` : base;
}

export function requireNode22(): void {
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isInteger(major) || major < 22) {
    throw new Error(
      `MC1 requires Node.js 22 or newer. Current: ${process.version}`,
    );
  }
}

export function normalizeGatewayUrl(raw?: string): string {
  const url = new URL(raw?.trim() || DEFAULT_GATEWAY_URL);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Gateway URL must use http or https");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (url.pathname === "/") url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "127.0.0.1" ||
    h === "localhost" ||
    h === "::1" ||
    h === "[::1]"
  );
}

export function settingsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Mc1Settings {
  const gatewayUrl = normalizeGatewayUrl(env.AIVERSE_GATEWAY_URL);
  const token = env.AIVERSE_GATEWAY_TOKEN?.trim() || "";
  const gatewayHome = resolve(
    env.AIVERSE_GATEWAY_HOME?.trim() || join(homedir(), ".aiverse", "gateway"),
  );
  const labRoot = resolve(
    env.AIVERSE_MC1_LAB_ROOT?.trim() ||
      join(homedir(), ".ai-verse-dashboard", "labs", "mc1"),
  );
  const port = Number(env.AIVERSE_MC1_PORT || DEFAULT_MC_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("AIVERSE_MC1_PORT must be an integer from 1024 to 65535");
  }
  return {
    gatewayUrl,
    gatewayToken: token,
    gatewayHome,
    labRoot,
    missionControlDir: join(labRoot, "mission-control"),
    missionControlPort: port,
  };
}

export function requireGatewayToken(settings: Mc1Settings): void {
  if (!settings.gatewayToken) {
    throw new Error(
      "AIVERSE_GATEWAY_TOKEN is required. Export the real Gateway bearer token locally; never commit it.",
    );
  }
}

export function assertDefaultLocalProof(settings: Mc1Settings): void {
  const url = new URL(settings.gatewayUrl);
  if (
    !isLoopbackHost(url.hostname) &&
    process.env.AIVERSE_MC1_ALLOW_REMOTE !== "1"
  ) {
    throw new Error(
      "MC1 defaults to a loopback Gateway. Set AIVERSE_MC1_ALLOW_REMOTE=1 only for an explicitly reviewed trusted remote Gateway.",
    );
  }
}

export function isPathWithin(child: string, parent: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export function assertSafeLabPath(path: string, labRoot: string): void {
  const resolvedPath = resolve(path);
  const resolvedRoot = resolve(labRoot);
  if (resolvedPath === resolvedRoot) return;
  if (!isPathWithin(resolvedPath, resolvedRoot)) {
    throw new Error(`Refusing operation outside MC1 lab root: ${resolvedPath}`);
  }
}

export function removeLabPath(path: string, labRoot: string): void {
  assertSafeLabPath(path, labRoot);
  if (resolve(path) === resolve(labRoot)) {
    throw new Error("Refusing to delete the MC1 lab root itself");
  }
  rmSync(path, { recursive: true, force: true });
}

export function runCommand(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  } = {},
): CommandResult {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: "utf8",
    shell: false,
    timeout: options.timeoutMs ?? 120_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(
      `Failed to run ${command}: ${String(result.error.message)}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} exited ${String(result.status)}`,
        String(result.stderr || "").slice(-4000),
        String(result.stdout || "").slice(-2000),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return {
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

export function verifyTooling(): void {
  requireNode22();
  runCommand("git", ["--version"], { timeoutMs: 10_000 });
  runCommand(commandName("corepack"), ["--version"], { timeoutMs: 10_000 });
}

export function ensurePinnedMissionControlLab(
  settings: Mc1Settings,
  options: { install?: boolean; resetDirty?: boolean } = {},
): {
  path: string;
  pin: string;
  installed: boolean;
} {
  verifyTooling();
  mkdirSync(settings.labRoot, { recursive: true });
  assertSafeLabPath(settings.missionControlDir, settings.labRoot);

  if (!existsSync(settings.missionControlDir)) {
    runCommand(
      "git",
      [
        "clone",
        "--filter=blob:none",
        "--no-checkout",
        MISSION_CONTROL_REPO,
        settings.missionControlDir,
      ],
      { timeoutMs: 180_000 },
    );
  }

  if (!existsSync(join(settings.missionControlDir, ".git"))) {
    throw new Error(
      `MC1 lab path exists but is not a Git repository: ${settings.missionControlDir}`,
    );
  }

  const remote = runCommand(
    "git",
    ["-C", settings.missionControlDir, "remote", "get-url", "origin"],
    { timeoutMs: 10_000 },
  ).stdout;
  const acceptedRemotes = new Set([
    MISSION_CONTROL_REPO,
    "https://github.com/builderz-labs/mission-control",
    "git@github.com:builderz-labs/mission-control.git",
  ]);
  if (!acceptedRemotes.has(remote)) {
    throw new Error(
      `MC1 lab origin is not Builderz Mission Control: ${remote}`,
    );
  }

  const dirty = runCommand(
    "git",
    ["-C", settings.missionControlDir, "status", "--porcelain"],
    { timeoutMs: 10_000 },
  ).stdout;
  if (dirty && options.resetDirty !== true) {
    throw new Error(
      "MC1 Mission Control lab has local changes. Remove/reset the disposable lab or rerun with the explicit reset option.",
    );
  }
  if (dirty && options.resetDirty === true) {
    runCommand(
      "git",
      ["-C", settings.missionControlDir, "reset", "--hard"],
      { timeoutMs: 15_000 },
    );
    runCommand(
      "git",
      ["-C", settings.missionControlDir, "clean", "-fd"],
      { timeoutMs: 15_000 },
    );
  }

  runCommand(
    "git",
    [
      "-C",
      settings.missionControlDir,
      "fetch",
      "--depth",
      "1",
      "origin",
      MISSION_CONTROL_PIN,
    ],
    { timeoutMs: 180_000 },
  );
  runCommand(
    "git",
    ["-C", settings.missionControlDir, "checkout", "--detach", MISSION_CONTROL_PIN],
    { timeoutMs: 30_000 },
  );
  const head = runCommand(
    "git",
    ["-C", settings.missionControlDir, "rev-parse", "HEAD"],
    { timeoutMs: 10_000 },
  ).stdout;
  if (head !== MISSION_CONTROL_PIN) {
    throw new Error(
      `Mission Control pin mismatch. Expected ${MISSION_CONTROL_PIN}, got ${head}`,
    );
  }

  let installed = existsSync(join(settings.missionControlDir, "node_modules"));
  if (options.install !== false) {
    runCommand(
      commandName("corepack"),
      ["pnpm", "install", "--frozen-lockfile"],
      { cwd: settings.missionControlDir, timeoutMs: 600_000 },
    );
    installed = true;
  }

  return { path: settings.missionControlDir, pin: head, installed };
}

export function readGatewayBinding(settings: Mc1Settings): GatewayBinding {
  const configPath = join(settings.gatewayHome, "config.json");
  if (!existsSync(configPath)) {
    throw new Error(
      `Gateway config not found at ${configPath}. Set AIVERSE_GATEWAY_HOME if this Gateway uses a non-default home.`,
    );
  }
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as {
    enabled?: unknown;
    system?: { id?: unknown; root?: unknown; default_workspace?: unknown };
    server?: { host?: unknown; port?: unknown };
  };
  const systemId = String(raw.system?.id || "").trim();
  const defaultWorkspace = String(raw.system?.default_workspace || "").trim();
  const root = String(raw.system?.root || "").trim();
  const host = String(raw.server?.host || "").trim();
  const port = Number(raw.server?.port);
  if (
    !systemId ||
    !defaultWorkspace ||
    !root ||
    !host ||
    !Number.isInteger(port)
  ) {
    throw new Error("Gateway config is missing system/workspace/server binding");
  }
  return {
    systemId,
    defaultWorkspace,
    root: realpathSync(root),
    host,
    port,
    enabled: raw.enabled !== false,
  };
}

async function parseJsonResponse(
  response: Response,
  label: string,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  }
  if (!response.ok) {
    const safe = JSON.stringify(parsed).slice(0, 1000);
    throw new Error(`${label} failed HTTP ${response.status}: ${safe}`);
  }
  return parsed;
}

export async function preflightGateway(
  settings: Mc1Settings,
  options: { smokeChat?: boolean } = {},
): Promise<GatewayPreflight> {
  requireGatewayToken(settings);
  assertDefaultLocalProof(settings);
  const binding = readGatewayBinding(settings);
  const configuredUrl = new URL(settings.gatewayUrl);

  if (
    isLoopbackHost(configuredUrl.hostname) &&
    isLoopbackHost(binding.host) &&
    Number(configuredUrl.port || (configuredUrl.protocol === "https:" ? 443 : 80)) !==
      binding.port
  ) {
    throw new Error(
      `Gateway URL port ${configuredUrl.port || "(default)"} does not match local Gateway config port ${binding.port}`,
    );
  }

  const healthResponse = await fetch(`${settings.gatewayUrl}/health`);
  const health = await parseJsonResponse(healthResponse, "Gateway /health");
  if (health.component !== "ai-verse-gateway" || health.ok !== true) {
    throw new Error("Gateway /health did not identify a healthy AI-Verse Gateway");
  }

  const authHeaders = {
    Authorization: `Bearer ${settings.gatewayToken}`,
  };
  const status = await parseJsonResponse(
    await fetch(`${settings.gatewayUrl}/status`, { headers: authHeaders }),
    "Gateway /status",
  );
  if (status.component !== "ai-verse-gateway" || status.state !== "ready") {
    throw new Error("Gateway /status is not ready");
  }
  if (String(status.system_id || "") !== binding.systemId) {
    throw new Error(
      `Gateway HTTP system_id ${String(status.system_id)} does not match local config ${binding.systemId}`,
    );
  }

  const models = await parseJsonResponse(
    await fetch(`${settings.gatewayUrl}/v1/models`, { headers: authHeaders }),
    "Gateway /v1/models",
  );
  const data = Array.isArray(models.data) ? models.data : [];
  const model = data.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as Record<string, unknown>).id === "aiverse",
  ) as Record<string, unknown> | undefined;
  if (!model) {
    throw new Error('Gateway /v1/models does not advertise model "aiverse"');
  }

  let smoke: GatewayPreflight["smoke"];
  if (options.smokeChat === true) {
    const nonce = randomBytes(6).toString("hex");
    const body = {
      model: "aiverse",
      messages: [
        {
          role: "user",
          content:
            `MC1 gateway smoke ${nonce}. Reply briefly. Do not modify files or external systems.`,
        },
      ],
      metadata: {
        workspace_id: binding.defaultWorkspace,
      },
      timeout_ms: 120000,
    };
    const response = await parseJsonResponse(
      await fetch(`${settings.gatewayUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
      "Gateway chat smoke",
    );
    const choices = Array.isArray(response.choices) ? response.choices : [];
    const first = choices[0] as
      | { message?: { content?: unknown } }
      | undefined;
    const content =
      typeof first?.message?.content === "string"
        ? first.message.content.trim()
        : "";
    if (!content) throw new Error("Gateway chat smoke returned no assistant content");
    smoke = {
      content,
      ...(response.usage && typeof response.usage === "object"
        ? { usage: response.usage as Record<string, unknown> }
        : {}),
    };
  }

  return {
    ok: true,
    gatewayUrl: settings.gatewayUrl,
    health,
    status,
    model,
    binding,
    ...(smoke ? { smoke } : {}),
  };
}

export function randomSecret(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function buildMissionControlEnvironment(input: {
  settings: Mc1Settings;
  dataDir: string;
  mcApiKey: string;
  adminPassword: string;
  authSecret: string;
}): NodeJS.ProcessEnv {
  const { settings } = input;
  assertSafeLabPath(input.dataDir, settings.labRoot);
  return {
    ...process.env,
    PORT: String(settings.missionControlPort),
    MISSION_CONTROL_DATA_DIR: input.dataDir,
    AUTH_USER: "aiverse-mc1",
    AUTH_PASS: input.adminPassword,
    AUTH_SECRET: input.authSecret,
    API_KEY: input.mcApiKey,
    MC_DISABLE_RUNTIME_SCAN: "1",
    NEXT_PUBLIC_GATEWAY_OPTIONAL: "true",
    OPENCLAW_ENABLED: "0",
    LOCAL_LLM_ENDPOINT: `${settings.gatewayUrl}/v1`,
    LOCAL_LLM_API_KEY: settings.gatewayToken,
  };
}

export function redactSecrets<T>(
  value: T,
  secrets: string[],
): T {
  const unique = [...new Set(secrets.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  const visit = (input: unknown): unknown => {
    if (typeof input === "string") {
      let output = input;
      for (const secret of unique) {
        output = output.split(secret).join("[REDACTED]");
      }
      return output;
    }
    if (Array.isArray(input)) return input.map(visit);
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>).map(([key, item]) => [
          key,
          /token|secret|password|api.?key/i.test(key)
            ? "[REDACTED]"
            : visit(item),
        ]),
      );
    }
    return input;
  };
  return visit(value) as T;
}

export async function requestJson(
  url: string,
  options: RequestInit & { apiKey?: string } = {},
): Promise<Record<string, unknown>> {
  const headers = new Headers(options.headers);
  if (options.apiKey) headers.set("x-api-key", options.apiKey);
  const response = await fetch(url, { ...options, headers });
  return parseJsonResponse(response, url);
}

export async function waitForMissionControl(
  baseUrl: string,
  apiKey: string,
  child: ChildProcessWithoutNullStreams,
  options: { timeoutMs?: number; logTail?: () => string } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Mission Control exited early with code ${child.exitCode}. ${options.logTail?.() || ""}`,
      );
    }
    try {
      await requestJson(`${baseUrl}/api/tasks?limit=1`, {
        apiKey,
        signal: AbortSignal.timeout(2000),
      });
      return;
    } catch (error) {
      lastError = String((error as Error).message || error);
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
    }
  }
  throw new Error(
    `Timed out waiting for Mission Control: ${lastError}. ${options.logTail?.() || ""}`,
  );
}

export function startMissionControl(
  settings: Mc1Settings,
  env: NodeJS.ProcessEnv,
): {
  child: ChildProcessWithoutNullStreams;
  logTail: () => string;
} {
  const child = spawn(commandName("corepack"), ["pnpm", "dev"], {
    cwd: settings.missionControlDir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  }) as ChildProcessWithoutNullStreams;

  let logs = "";
  const append = (chunk: Buffer | string) => {
    logs = (logs + chunk.toString()).slice(-16_000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  return { child, logTail: () => logs };
}

export async function stopChild(
  child: ChildProcessWithoutNullStreams,
): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((resolvePromise) => {
      child.once("close", () => resolvePromise());
    }),
    new Promise<void>((resolvePromise) => {
      setTimeout(() => {
        if (child.exitCode === null) child.kill("SIGKILL");
        resolvePromise();
      }, 5000);
    }),
  ]);
}
