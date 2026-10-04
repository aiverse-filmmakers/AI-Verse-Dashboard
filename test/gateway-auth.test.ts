import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import {
  DASHBOARD_WS_PROTOCOL,
  dashboardWsAuthProtocol,
} from "../packages/protocol/src/index.js";
import { DashboardClient } from "../packages/client/src/index.js";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { QueryRouter, SubscriptionHub, startGateway } from "../apps/gateway/src/index.js";

const MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;
const WRONG_TOKEN = "wrong_dashboard_token_0123456789abcdef";

function makeOs(): { root: string; reg: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), "dash-auth-"));
  writeFileSync(join(root, "AI-VERSE.yaml"), MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const dir of ["operator", "workspaces", "system"]) mkdirSync(join(root, dir));
  const workspace = join(root, "workspaces", "ws-1");
  mkdirSync(workspace, { recursive: true });
  writeFileSync(
    join(workspace, "WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "ws-1"\nname: "Auth workspace"\nstatus: "active"\n',
  );
  const reg = new SystemRegistry();
  const record = reg.register(root, { label: "Auth OS" });
  return { root, reg, systemId: record.systemId };
}

async function httpJson(
  port: number,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown>; authenticate: string | null }> {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, init);
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
    authenticate: response.headers.get("www-authenticate"),
  };
}

function websocket(
  url: string,
  options?: { protocols?: string[]; headers?: Record<string, string> },
): WebSocket {
  if (options?.protocols) {
    return new WebSocket(url, options.protocols, { headers: options.headers });
  }
  return new WebSocket(url, { headers: options?.headers });
}

async function waitFor(
  predicate: () => boolean,
  message: string,
  timeoutMs = 1500,
): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`timed out waiting for ${message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function expectWsRejected(
  url: string,
  expectedStatus: number,
  options?: { protocols?: string[]; headers?: Record<string, string> },
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ws = websocket(url, options);
    let settled = false;
    ws.once("unexpected-response", (_req, res) => {
      settled = true;
      try {
        assert.equal(res.statusCode, expectedStatus);
        res.resume();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    ws.once("open", () => {
      if (settled) return;
      ws.close();
      reject(new Error("WebSocket unexpectedly authenticated"));
    });
    ws.once("error", (err) => {
      if (!settled) reject(err);
    });
  });
}

describe("WSA-2026-040 Dashboard local read authentication", () => {
  const roots: string[] = [];
  const servers: { close(): Promise<void> }[] = [];

  afterEach(async () => {
    for (const server of servers.splice(0)) {
      try {
        await server.close();
      } catch {
        // best-effort cleanup
      }
    }
    for (const root of roots.splice(0)) {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  });

  it("default-denies unauthenticated HTTP before any local route or RPC method", async () => {
    const { root, reg, systemId } = makeOs();
    roots.push(root);
    const gateway = await startGateway(
      new QueryRouter(reg, new DisposableCache()),
      new SubscriptionHub(),
      { port: 0 },
    );
    servers.push(gateway);

    const healthDenied = await httpJson(gateway.port, "/health");
    assert.equal(healthDenied.status, 401);
    assert.equal(healthDenied.authenticate, "Bearer");
    assert.equal(
      (healthDenied.body.error as { code?: string }).code,
      "UNAUTHENTICATED",
    );
    assert.equal(JSON.stringify(healthDenied.body).includes(gateway.authToken), false);

    const frame = {
      type: "req",
      v: "1.0",
      id: "sys",
      method: "system.list",
    };
    const noAuth = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(frame),
    });
    assert.equal(noAuth.status, 401);

    const wrongAuth = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${WRONG_TOKEN}`,
      },
      body: JSON.stringify(frame),
    });
    assert.equal(wrongAuth.status, 401);

    const originOnly = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify(frame),
    });
    assert.equal(originOnly.status, 401, "loopback Origin must not authenticate");

    const futureRoute = await httpJson(gateway.port, "/future-command");
    assert.equal(futureRoute.status, 401, "future local routes inherit authentication by default");

    const unauthCommand = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "req",
        v: "1.0",
        id: "cmd-unauth",
        method: "chat.send",
        systemId,
        workspaceId: "ws-1",
        params: {},
      }),
    });
    assert.equal(unauthCommand.status, 401);

    const authHeaders = {
      "content-type": "application/json",
      authorization: `Bearer ${gateway.authToken}`,
    };
    const health = await httpJson(gateway.port, "/health", {
      headers: { authorization: `Bearer ${gateway.authToken}` },
    });
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);
    assert.equal(JSON.stringify(health.body).includes(gateway.authToken), false);

    const allowed = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(frame),
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.ok, true);

    const authenticatedFutureRoute = await httpJson(gateway.port, "/future-command", {
      headers: { authorization: `Bearer ${gateway.authToken}` },
    });
    assert.equal(authenticatedFutureRoute.status, 404);

    const authCommand = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        type: "req",
        v: "1.0",
        id: "cmd-auth",
        method: "chat.send",
        systemId,
        workspaceId: "ws-1",
        params: {},
      }),
    });
    assert.equal(authCommand.status, 200);
    assert.equal(authCommand.body.ok, false);
    assert.equal(
      (authCommand.body.error as { code?: string }).code,
      "COMMAND_BLOCKED_READ_ONLY",
    );

    for (const origin of [
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://localhost",
      "http://127.0.0.1",
    ]) {
      const allowedOrigin = await httpJson(gateway.port, "/rpc", {
        method: "POST",
        headers: { ...authHeaders, origin },
        body: JSON.stringify(frame),
      });
      assert.equal(allowedOrigin.status, 200, `approved loopback Origin should pass: ${origin}`);
    }

    for (const origin of [
      "https://localhost:5173",
      "http://localhost.attacker.example:5173",
      "http://192.168.1.20:5173",
      "http://localhost:65536",
      "http://localhost/path",
      "http://user@localhost:5173",
    ]) {
      const rejectedOrigin = await httpJson(gateway.port, "/rpc", {
        method: "POST",
        headers: { ...authHeaders, origin },
        body: JSON.stringify(frame),
      });
      assert.equal(rejectedOrigin.status, 403, `unapproved Origin must be rejected: ${origin}`);
    }

    const nonLoopbackOrigin = await httpJson(gateway.port, "/rpc", {
      method: "POST",
      headers: {
        ...authHeaders,
        origin: "https://example.com",
      },
      body: JSON.stringify(frame),
    });
    assert.equal(nonLoopbackOrigin.status, 403, "authentication must not replace Origin policy");

    const client = new DashboardClient(
      `http://127.0.0.1:${gateway.port}`,
      { systemId, workspaceId: "ws-1" },
      gateway.authToken,
    );
    const result = await client.query("workspace.get", { noCache: true });
    assert.equal((result.result as { workspace: { id: string } }).workspace.id, "ws-1");
  });

  it("rejects unauthenticated WebSocket upgrades and accepts token-authenticated clients", async () => {
    const { root, reg, systemId } = makeOs();
    roots.push(root);
    const hub = new SubscriptionHub();
    const gateway = await startGateway(
      new QueryRouter(reg, new DisposableCache()),
      hub,
      { port: 0 },
    );
    servers.push(gateway);

    const url = `ws://127.0.0.1:${gateway.port}/ws?systemId=${systemId}`;

    await expectWsRejected(url, 401);
    await expectWsRejected(url, 401, {
      headers: { Origin: "http://localhost" },
    });
    await expectWsRejected(url, 401, {
      protocols: [
        DASHBOARD_WS_PROTOCOL,
        dashboardWsAuthProtocol(WRONG_TOKEN),
      ],
    });
    assert.equal(hub.subscriberCount(), 0);

    for (const origin of ["http://localhost:5173", "http://127.0.0.1:3000"]) {
      const portedOrigin = websocket(url, {
        origin,
        protocols: [
          DASHBOARD_WS_PROTOCOL,
          dashboardWsAuthProtocol(gateway.authToken),
        ],
      });
      await new Promise<void>((resolve, reject) => {
        portedOrigin.once("open", resolve);
        portedOrigin.once("error", reject);
      });
      portedOrigin.close();
    }

    const browserStyle = websocket(url, {
      protocols: [
        DASHBOARD_WS_PROTOCOL,
        dashboardWsAuthProtocol(gateway.authToken),
      ],
    });
    await new Promise<void>((resolve, reject) => {
      browserStyle.once("open", resolve);
      browserStyle.once("error", reject);
    });
    assert.equal(browserStyle.protocol, DASHBOARD_WS_PROTOCOL);
    assert.equal(
      browserStyle.protocol.includes(gateway.authToken),
      false,
      "auth protocol must not be echoed as the selected protocol",
    );
    browserStyle.close();
    await new Promise<void>((resolve) => browserStyle.once("close", () => resolve()));

    const bearerStyle = websocket(url, {
      headers: { authorization: `Bearer ${gateway.authToken}` },
    });
    await new Promise<void>((resolve, reject) => {
      bearerStyle.once("open", resolve);
      bearerStyle.once("error", reject);
    });
    bearerStyle.send(JSON.stringify({ type: "subscribe", workspaceId: "ws-1" }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(hub.subscriberCount(systemId), 1);

    bearerStyle.close();
    await new Promise<void>((resolve) => bearerStyle.once("close", () => resolve()));
    await waitFor(
      () => hub.subscriberCount(systemId) === 0,
      "authenticated websocket subscription cleanup",
    );
    assert.equal(hub.subscriberCount(systemId), 0);
  });

  it("rejects weak configured tokens before binding a listener", async () => {
    const { root, reg } = makeOs();
    roots.push(root);
    await assert.rejects(
      startGateway(
        new QueryRouter(reg, new DisposableCache()),
        new SubscriptionHub(),
        { port: 0, authToken: "too-short" },
      ),
      /32-256 base64url-safe characters/,
    );
  });
});
