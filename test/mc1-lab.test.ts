import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DEFAULT_GATEWAY_URL,
  MISSION_CONTROL_PIN,
  buildMissionControlEnvironment,
  isPathWithin,
  normalizeGatewayUrl,
  preflightGateway,
  readGatewayBinding,
  redactSecrets,
  removeLabPath,
  settingsFromEnv,
  type Mc1Settings,
} from "../scripts/mc1/lib.js";

describe("MC1 automation safety and Gateway preflight", () => {
  const roots: string[] = [];
  let server: Server | null = null;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = null;
    }
    for (const root of roots) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("pins the audited Mission Control commit", () => {
    assert.equal(
      MISSION_CONTROL_PIN,
      "5483a0e1eef15b467c167e95796791112cedbb7c",
    );
  });

  it("normalizes Gateway URLs and defaults to loopback", () => {
    assert.equal(normalizeGatewayUrl(), DEFAULT_GATEWAY_URL);
    assert.equal(
      normalizeGatewayUrl("http://127.0.0.1:8787///"),
      "http://127.0.0.1:8787",
    );
    assert.throws(() => normalizeGatewayUrl("file:///tmp/gateway"));
  });

  it("lab containment is cross-platform and deletion refuses escape", () => {
    const root = mkdtempSync(join(tmpdir(), "mc1-root-"));
    roots.push(root);
    const child = join(root, "runs", "one");
    mkdirSync(child, { recursive: true });
    assert.equal(isPathWithin(child, root), true);
    assert.equal(isPathWithin(join(root, "..", "escape"), root), false);
    assert.throws(() => removeLabPath(join(root, "..", "escape"), root));
  });

  it("reads the canonical local Gateway binding without exposing auth hashes", () => {
    const base = mkdtempSync(join(tmpdir(), "mc1-gw-"));
    roots.push(base);
    const systemRoot = join(base, "system");
    const home = join(base, "gateway");
    mkdirSync(systemRoot);
    mkdirSync(home);
    writeFileSync(join(systemRoot, "AI-VERSE.yaml"), "schema_version: 2\n");
    writeFileSync(
      join(home, "config.json"),
      JSON.stringify({
        enabled: true,
        system: {
          id: "system-a",
          root: systemRoot,
          default_workspace: "operator",
        },
        server: { host: "127.0.0.1", port: 8787 },
        auth: { keys: [{ verifier: "must-not-leak" }] },
      }),
    );
    const settings = settingsFromEnv({
      AIVERSE_GATEWAY_HOME: home,
      AIVERSE_GATEWAY_TOKEN: "secret-token",
    });
    const binding = readGatewayBinding(settings);
    assert.equal(binding.systemId, "system-a");
    assert.equal(binding.defaultWorkspace, "operator");
    assert.equal("auth" in binding, false);
  });

  it("preflights health, authenticated status, model and explicit workspace smoke", async () => {
    const base = mkdtempSync(join(tmpdir(), "mc1-http-"));
    roots.push(base);
    const systemRoot = join(base, "system");
    const home = join(base, "gateway");
    mkdirSync(systemRoot);
    mkdirSync(home);
    writeFileSync(join(systemRoot, "AI-VERSE.yaml"), "schema_version: 2\n");

    let smokeWorkspace: unknown = null;
    server = createServer(async (req, res) => {
      const auth = req.headers.authorization;
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (req.url === "/health") {
        return send(200, {
          ok: true,
          component: "ai-verse-gateway",
          version: "test",
        });
      }
      if (auth !== "Bearer secret-token") {
        return send(401, { error: { code: "AUTH", message: "bad token" } });
      }
      if (req.url === "/status") {
        return send(200, {
          component: "ai-verse-gateway",
          state: "ready",
          system_id: "system-a",
          runtime: "deterministic",
        });
      }
      if (req.url === "/v1/models") {
        return send(200, {
          object: "list",
          data: [{ id: "aiverse", object: "model" }],
        });
      }
      if (req.url === "/v1/chat/completions" && req.method === "POST") {
        let raw = "";
        for await (const chunk of req) raw += chunk.toString();
        const parsed = JSON.parse(raw);
        smokeWorkspace = parsed.metadata?.workspace_id;
        return send(200, {
          choices: [{ message: { content: "smoke ok" } }],
          usage: { prompt_tokens: 2, completion_tokens: 2 },
        });
      }
      return send(404, { error: "not found" });
    });
    await new Promise<void>((resolve) =>
      server?.listen(0, "127.0.0.1", () => resolve()),
    );
    const address = server.address();
    assert.ok(address && typeof address === "object");
    writeFileSync(
      join(home, "config.json"),
      JSON.stringify({
        enabled: true,
        system: {
          id: "system-a",
          root: systemRoot,
          default_workspace: "operator",
        },
        server: { host: "127.0.0.1", port: address.port },
      }),
    );

    const settings: Mc1Settings = {
      gatewayUrl: `http://127.0.0.1:${address.port}`,
      gatewayToken: "secret-token",
      gatewayHome: home,
      labRoot: join(base, "lab"),
      missionControlDir: join(base, "lab", "mission-control"),
      missionControlPort: 3017,
    };
    const result = await preflightGateway(settings, { smokeChat: true });
    assert.equal(result.ok, true);
    assert.equal(result.binding.systemId, "system-a");
    assert.equal(result.binding.defaultWorkspace, "operator");
    assert.equal(result.smoke?.content, "smoke ok");
    assert.equal(smokeWorkspace, "operator");
  });

  it("builds Mission Control proof env in memory and redacts secrets", () => {
    const base = mkdtempSync(join(tmpdir(), "mc1-env-"));
    roots.push(base);
    const settings: Mc1Settings = {
      gatewayUrl: "http://127.0.0.1:8787",
      gatewayToken: "gateway-secret",
      gatewayHome: join(base, "gateway"),
      labRoot: join(base, "lab"),
      missionControlDir: join(base, "lab", "mission-control"),
      missionControlPort: 3017,
    };
    const dataDir = join(settings.labRoot, "runs", "1", "data");
    mkdirSync(dataDir, { recursive: true });
    const env = buildMissionControlEnvironment({
      settings,
      dataDir,
      mcApiKey: "mc-secret",
      adminPassword: "admin-secret",
      authSecret: "auth-secret",
    });
    assert.equal(env.LOCAL_LLM_ENDPOINT, "http://127.0.0.1:8787/v1");
    assert.equal(env.LOCAL_LLM_API_KEY, "gateway-secret");
    assert.equal(env.MC_DISABLE_RUNTIME_SCAN, "1");
    assert.equal(env.NEXT_PUBLIC_GATEWAY_OPTIONAL, "true");

    const sanitized = redactSecrets(
      {
        gatewayToken: "gateway-secret",
        detail: "Bearer gateway-secret and mc-secret",
        nested: { password: "admin-secret", ordinary: "safe" },
      },
      ["gateway-secret", "mc-secret", "admin-secret"],
    );
    assert.equal(sanitized.gatewayToken, "[REDACTED]");
    assert.equal(sanitized.detail.includes("gateway-secret"), false);
    assert.equal(sanitized.detail.includes("mc-secret"), false);
    assert.equal(sanitized.nested.password, "[REDACTED]");
    assert.equal(sanitized.nested.ordinary, "safe");
  });
  it("local runner prompts without echoing and clears the token", () => {
    const script = readFileSync(
      resolve("scripts/mc1/run-local.sh"),
      "utf8",
    );
    assert.match(script, /read -r -s AIVERSE_GATEWAY_TOKEN/);
    assert.match(script, /trap cleanup_secret EXIT INT TERM/);
    assert.match(script, /unset AIVERSE_GATEWAY_TOKEN/);
    assert.match(script, /npm ci/);
    assert.match(script, /npm run mc1:proof/);
    assert.doesNotMatch(script, /echo .*AIVERSE_GATEWAY_TOKEN/);
  });

});
