import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  DASHBOARD_WS_PROTOCOL,
  subscriptionRequestSchema,
  systemIdSchema,
} from "../../../packages/protocol/src/index.js";
import { QueryRouter } from "./query-router.js";
import {
  createGatewayAuthToken,
  hasBearerAuthorization,
  hasWebSocketAuthorization,
} from "./auth.js";
import { SubscriptionHub } from "./subscriptions.js";

/**
 * Localhost HTTP + WebSocket server (Task 4).
 * Binds 127.0.0.1 only — never 0.0.0.0 (Blueprint §binding). Each WS
 * connection declares one systemId; frames for other systems are rejected.
 * Origin is checked against loopback hosts; non-loopback origins are
 * refused (Blueprint threat #9).
 */

export const DEFAULT_PORT = 3100;
const MAX_BODY_BYTES = 256 * 1024;

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);
const MAX_TRUSTED_ORIGIN_PORT = 65_535;

function isLoopbackOrigin(origin: string | undefined): boolean {
  if (origin === undefined) return true; // non-browser client
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" || url.username || url.password) return false;
    if (!LOOPBACK_HOSTS.has(url.hostname)) return false;
    if (url.pathname !== "/" || url.search || url.hash) return false;
    if (url.port) {
      const port = Number(url.port);
      if (!Number.isInteger(port) || port < 1 || port > MAX_TRUSTED_ORIGIN_PORT) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export interface GatewayServer {
  port: number;
  /** Privileged local session token. Host code must pass it to trusted clients. */
  authToken: string;
  close(): Promise<void>;
}

export async function startGateway(
  router: QueryRouter,
  hub: SubscriptionHub,
  opts?: { port?: number; host?: string; authToken?: string },
): Promise<GatewayServer> {
  const host = "127.0.0.1";
  const authToken = createGatewayAuthToken(opts?.authToken);
  if (opts?.host !== undefined && opts.host !== "127.0.0.1" && opts.host !== "localhost") {
    throw new Error("gateway binds loopback only; remote access must use a tunnel");
  }
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    void handleHttp(req, res, router, authToken);
  });
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols(protocols) {
      return protocols.has(DASHBOARD_WS_PROTOCOL) ? DASHBOARD_WS_PROTOCOL : false;
    },
  });

  server.on("upgrade", (req, socket, head) => {
    if (!hasWebSocketAuthorization(req.headers, authToken)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Bearer\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const origin = req.headers.origin as string | undefined;
    if (!isLoopbackOrigin(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    const url = new URL(req.url ?? "/ws", "http://127.0.0.1");
    if (url.pathname !== "/ws") {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    const systemId = url.searchParams.get("systemId") ?? "";
    if (!systemIdSchema.safeParse(systemId).success) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      void handleSocket(ws, systemId, router, hub);
    });
  });

  const requested = opts?.port ?? DEFAULT_PORT;
  const actual: number = await new Promise<number>((resolve) => {
    server.listen(requested, host, () => {
      const addr = server.address();
      resolve(typeof addr === "object" && addr !== null ? addr.port : requested);
    });
  });
  return {
    port: actual,
    authToken,
    async close() {
      wss.close();
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(buf);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function handleHttp(
  req: IncomingMessage,
  res: ServerResponse,
  router: QueryRouter,
  authToken: string,
): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!hasBearerAuthorization(req.headers, authToken)) {
      res.writeHead(401, {
        "content-type": "application/json",
        "www-authenticate": "Bearer",
      });
      res.end(JSON.stringify({
        ok: false,
        error: { code: "UNAUTHENTICATED", message: "local gateway authentication required" },
      }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, phase: "phase-2-live" }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/rpc") {
      const origin = req.headers.origin as string | undefined;
      if (!isLoopbackOrigin(origin)) {
        res.writeHead(403, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: { code: "FORBIDDEN_ORIGIN", message: "non-loopback origin" } }));
        return;
      }
      const frame = JSON.parse(await readBody(req)) as unknown;
      const out = router.handle(frame);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(out));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: { code: "NOT_FOUND", message: "unknown route" } }));
  } catch (err) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: { code: "BAD_REQUEST", message: String((err as Error).message).slice(0, 200) } }));
  }
}

function handleSocket(
  ws: WebSocket,
  boundSystem: string,
  router: QueryRouter,
  hub: SubscriptionHub,
): void {
  let activeSubId: string | undefined;
  const socketSubIds = new Set<string>();
  ws.on("message", (data) => {
    let frame: unknown;
    try {
      frame = JSON.parse(String(data)) as unknown;
    } catch {
      ws.send(JSON.stringify({ type: "res", v: "1.0", id: "unparseable", ok: false, error: { code: "INVALID_ENVELOPE", message: "bad json" }, observedAt: new Date().toISOString() }));
      return;
    }
    const tagged = (frame as { type?: string }).type;
    // Subscribe control frame: Dashboard-local, bound to this socket's system.
    if (tagged === "subscribe") {
      const parsed = subscriptionRequestSchema.safeParse(frame);
      if (!parsed.success) {
        ws.send(JSON.stringify({
          type: "res",
          v: "1.0",
          id: "subscribe",
          ok: false,
          systemId: boundSystem,
          error: { code: "INVALID_SUBSCRIPTION", message: "invalid workspace subscription" },
          observedAt: new Date().toISOString(),
        }));
        return;
      }

      const nextWorkspace = parsed.data.workspaceId;
      try {
        router.assertSubscriptionWorkspace(boundSystem, nextWorkspace);
      } catch (err) {
        ws.send(JSON.stringify({
          type: "res",
          v: "1.0",
          id: "subscribe",
          ok: false,
          systemId: boundSystem,
          error: {
            code: (err as { code?: string }).code ?? "WORKSPACE_NOT_REGISTERED",
            message: (err as Error).message.slice(0, 300),
          },
          observedAt: new Date().toISOString(),
        }));
        return;
      }

      if (activeSubId !== undefined) {
        hub.unsubscribe(activeSubId);
        socketSubIds.delete(activeSubId);
        activeSubId = undefined;
      }

      const nextSubId = hub.subscribe(
        boundSystem,
        (ev) => {
          ws.send(JSON.stringify({ type: "event", v: "1.0", ...ev }));
        },
        nextWorkspace,
      );
      activeSubId = nextSubId;
      socketSubIds.add(nextSubId);
      ws.send(JSON.stringify({
        type: "res",
        v: "1.0",
        id: "subscribe",
        ok: true,
        systemId: boundSystem,
        result: { subscribed: true, workspaceId: nextWorkspace },
        observedAt: new Date().toISOString(),
      }));
      return;
    }
    // RPC frames must stay inside this socket's bound system.
    const sys = (frame as { systemId?: string }).systemId;
    if (sys !== undefined && sys !== boundSystem) {
      ws.send(
        JSON.stringify({
          type: "res", v: "1.0", id: (frame as { id?: string }).id ?? "unknown",
          ok: false, systemId: boundSystem,
          error: { code: "SYSTEM_MISMATCH", message: "frame systemId does not match this connection" },
          observedAt: new Date().toISOString(),
        }),
      );
      return;
    }
    const out = router.handle(frame);
    ws.send(JSON.stringify(out));
  });
  ws.on("close", () => {
    for (const subId of socketSubIds) hub.unsubscribe(subId);
    socketSubIds.clear();
    activeSubId = undefined;
  });
}
