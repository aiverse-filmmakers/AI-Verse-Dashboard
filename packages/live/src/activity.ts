import type { SessionStore } from "./sessions.js";
import type { SubscriptionHub } from "../../../apps/gateway/src/subscriptions.js";

/**
 * Live event bridge (Phase 2 Task 3).
 * Session-scoped live activity stream: adapter/session events publish
 * into the hub partitioned by systemId + workspaceId. Tool-call grouping
 * collapses tool sequences per session for the task rail.
 */

export type LiveEventName =
  | "chat.message"
  | "chat.aborted"
  | "tool.started"
  | "tool.finished"
  | "run-event"
  | "error-event";

export interface LivePublish {
  event: LiveEventName;
  systemId: string;
  workspaceId: string;
  sessionId: string;
  entryId?: string;
  payload?: unknown;
}

export function publishLive(
  hub: SubscriptionHub,
  sessions: SessionStore,
  publish: LivePublish,
): void {
  // Fail closed: session must exist in this system before any event flows.
  const session = sessions.get(publish.systemId, publish.sessionId);
  if (!session) {
    throw Object.assign(new Error(`unknown session ${publish.sessionId}`), {
      code: "SESSION_NOT_FOUND",
    });
  }
  if (session.workspaceId !== publish.workspaceId) {
    throw Object.assign(new Error("session does not belong to that workspace"), {
      code: "SESSION_NOT_FOUND",
    });
  }
  hub.publish({
    event: publish.event,
    systemId: publish.systemId,
    workspaceId: publish.workspaceId,
    payload: {
      sessionId: publish.sessionId,
      ...(publish.entryId ? { entryId: publish.entryId } : {}),
      ...(publish.payload !== undefined ? { data: publish.payload } : {}),
    },
  });
}

export interface ToolGroup {
  sessionId: string;
  toolCount: number;
  lastTool?: { id: string; body: string; createdAt: string };
  errors: number;
}

/** Group tool-call entries per session for the task rail. */
export function groupToolsBySession(
  sessions: SessionStore,
  systemId: string,
  workspaceId: string,
): ToolGroup[] {
  const out: ToolGroup[] = [];
  for (const summary of sessions.summaries(systemId, workspaceId)) {
    const history = sessions.history(systemId, summary.sessionId, 500);
    const tools = history.filter((e) => e.kind === "tool-call");
    const errors = history.filter((e) => e.kind === "error-event").length;
    const last = tools[tools.length - 1];
    out.push({
      sessionId: summary.sessionId,
      toolCount: tools.length,
      ...(last ? { lastTool: { id: last.id, body: last.body.slice(0, 200), createdAt: last.createdAt } } : {}),
      errors,
    });
  }
  return out.sort((a, b) => (a.sessionId < b.sessionId ? -1 : 1));
}
