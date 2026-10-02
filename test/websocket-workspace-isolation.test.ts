import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { SystemRegistry } from "../packages/registry/src/index.js";
import {
  DASHBOARD_WS_PROTOCOL,
  dashboardWsAuthProtocol,
} from "../packages/protocol/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { QueryRouter, SubscriptionHub, startGateway } from "../apps/gateway/src/index.js";

const OS_MANIFEST = `schema_version: "2.0"
architecture: unified-workspace
`;

function makeOs(): { root: string; reg: SystemRegistry; systemId: string } {
  const root = mkdtempSync(join(tmpdir(), "dash-ws-iso-"));
  writeFileSync(join(root, "AI-VERSE.yaml"), OS_MANIFEST);
  writeFileSync(join(root, "AGENTS.md"), "# agents\n");
  for (const d of ["operator", "workspaces", "system"]) mkdirSync(join(root, d));
  const reg = new SystemRegistry();
  const rec = reg.register(root, { label: "ws-isolation" });
  return { root, reg, systemId: rec.systemId };
}

function makeWorkspace(root: string, id: string): void {
  const dir = join(root, "workspaces", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "WORKSPACE.yaml"),
    `schema_version: "2.0"\nid: "${id}"\nname: "${id}"\nstatus: "active"\n`,
  );
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

describe("WSA-2026-038 websocket workspace resubscribe isolation", () => {
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

  it("replaces A -> B -> A scope, rejects invalid workspaces, and releases all subscriptions on close", async () => {
    const { root, reg, systemId } = makeOs();
    roots.push(root);
    makeWorkspace(root, "ws-a");
    makeWorkspace(root, "ws-b");

    const router = new QueryRouter(reg, new DisposableCache());
    const hub = new SubscriptionHub();
    const gateway = await startGateway(router, hub, { port: 0 });
    servers.push(gateway);

    const ws = new WebSocket(
      `ws://127.0.0.1:${gateway.port}/ws?systemId=${systemId}`,
      [DASHBOARD_WS_PROTOCOL, dashboardWsAuthProtocol(gateway.authToken)],
    );
    await new Promise<void>((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });

    const frames: Record<string, unknown>[] = [];
    ws.on("message", (data) => {
      frames.push(JSON.parse(String(data)) as Record<string, unknown>);
    });

    const successfulSubscriptions = (): number =>
      frames.filter((frame) => frame.id === "subscribe" && frame.ok === true).length;
    const failedSubscriptions = (): number =>
      frames.filter((frame) => frame.id === "subscribe" && frame.ok === false).length;
    const hasMarker = (marker: string): boolean =>
      frames.some((frame) =>
        frame.type === "event"
        && (frame.payload as { marker?: string } | undefined)?.marker === marker,
      );

    ws.send(JSON.stringify({ type: "subscribe", workspaceId: "ws-a" }));
    await waitFor(() => successfulSubscriptions() === 1, "workspace A subscription");
    assert.equal(hub.subscriberCount(systemId), 1);

    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId: "ws-a",
      payload: { marker: "a-before-switch" },
    });
    await waitFor(() => hasMarker("a-before-switch"), "initial A event");

    ws.send(JSON.stringify({ type: "subscribe", workspaceId: "ws-b" }));
    await waitFor(() => successfulSubscriptions() === 2, "workspace B subscription");
    assert.equal(hub.subscriberCount(systemId), 1, "old A subscription must be removed");

    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId: "ws-a",
      payload: { marker: "stale-a-after-b" },
    });
    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId: "ws-b",
      payload: { marker: "b-active" },
    });
    await waitFor(() => hasMarker("b-active"), "active B event");
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(hasMarker("stale-a-after-b"), false);

    ws.send(JSON.stringify({ type: "subscribe", workspaceId: "ws-a" }));
    await waitFor(() => successfulSubscriptions() === 3, "workspace A resubscription");
    assert.equal(hub.subscriberCount(systemId), 1, "old B subscription must be removed");

    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId: "ws-b",
      payload: { marker: "stale-b-after-a" },
    });
    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId: "ws-a",
      payload: { marker: "a-active-again" },
    });
    await waitFor(() => hasMarker("a-active-again"), "active A event after switch back");
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(hasMarker("stale-b-after-a"), false);

    ws.send(JSON.stringify({ type: "subscribe", workspaceId: "../escape" }));
    await waitFor(() => failedSubscriptions() === 1, "protocol-invalid workspace rejection");
    assert.equal(hub.subscriberCount(systemId), 1);

    ws.send(JSON.stringify({ type: "subscribe", workspaceId: "ghost" }));
    await waitFor(() => failedSubscriptions() === 2, "unregistered workspace rejection");
    assert.equal(hub.subscriberCount(systemId), 1);

    hub.publish({
      event: "source.changed",
      systemId,
      workspaceId: "ws-a",
      payload: { marker: "a-still-active-after-rejects" },
    });
    await waitFor(
      () => hasMarker("a-still-active-after-rejects"),
      "existing scope preserved after rejected resubscribe",
    );

    const closed = new Promise<void>((resolve) => ws.once("close", () => resolve()));
    ws.close();
    await closed;
    await waitFor(() => hub.subscriberCount(systemId) === 0, "socket subscription cleanup");
    assert.equal(hub.subscriberCount(), 0);
  });
});
