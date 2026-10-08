import { SYSTEM_ID_PATTERN, WORKSPACE_ID_PATTERN } from "./ids.js";

/**
 * Dashboard protocol method registry (Task 1).
 *
 * Queries are read-only. Commands name the forward-to-OS surface and remain
 * subject to the command boundary. Purpose is query-only and workspace-bound.
 */

export const QUERY_METHODS = [
  "system.list",
  "system.get",
  "system.info",
  "workspace.list",
  "workspace.get",
  "workspace.health",
  "workspace.inbox.list",
  "purpose.get",
  "initiative.list",
  "initiative.get",
  "task.list",
  "task.get",
  "task.children",
  "run.list",
  "run.get",
  "run.logs",
  "cron.list",
  "cron.history",
  "agent.list",
  "agent.sessions",
  "usage.summary",
  "graph.query",
  "graph.node",
  "source.preview",
] as const;

export const COMMAND_METHODS = [
  "chat.send",
  "chat.abort",
  "task.start",
  "task.cancel",
  "task.retry",
  "cron.create",
  "cron.pause",
  "cron.resume",
  "cron.runNow",
  "approval.resolve",
  "initiative.activate",
  "inbox.resolve",
] as const;

/** Protocol-level methods: Dashboard-local, never OS-bound. */
export const PROTOCOL_METHODS = ["protocol.handshake", "protocol.capabilities"] as const;

export const ALL_METHODS = [...PROTOCOL_METHODS, ...QUERY_METHODS, ...COMMAND_METHODS] as const;

export type QueryMethod = (typeof QUERY_METHODS)[number];
export type CommandMethod = (typeof COMMAND_METHODS)[number];
export type ProtocolMethod = (typeof PROTOCOL_METHODS)[number];
export type DashboardMethod = (typeof ALL_METHODS)[number];

const SYSTEM_OPTIONAL = new Set<string>([
  "protocol.handshake",
  "protocol.capabilities",
  "system.list",
]);

const WORKSPACE_SCOPED = new Set<string>([
  "workspace.get",
  "workspace.health",
  "workspace.inbox.list",
  "purpose.get",
  "initiative.list",
  "initiative.get",
  "task.list",
  "task.get",
  "task.children",
  "run.list",
  "run.get",
  "run.logs",
  "cron.list",
  "cron.history",
  "agent.list",
  "agent.sessions",
  "usage.summary",
  "graph.query",
  "graph.node",
  "source.preview",
  "chat.send",
  "chat.abort",
  "task.start",
  "task.cancel",
  "task.retry",
  "cron.create",
  "cron.pause",
  "cron.resume",
  "cron.runNow",
  "approval.resolve",
  "initiative.activate",
  "inbox.resolve",
]);

export function isKnownMethod(method: string): method is DashboardMethod {
  return (ALL_METHODS as readonly string[]).includes(method);
}

export function isQueryMethod(method: string): method is QueryMethod {
  return (QUERY_METHODS as readonly string[]).includes(method);
}

export function isCommandMethod(method: string): method is CommandMethod {
  return (COMMAND_METHODS as readonly string[]).includes(method);
}

export function requiresSystem(method: string): boolean {
  return !SYSTEM_OPTIONAL.has(method);
}

export function requiresWorkspace(method: string): boolean {
  return WORKSPACE_SCOPED.has(method);
}

export const PROTOCOL_ERRORS = {
  INVALID_ENVELOPE: "INVALID_ENVELOPE",
  UNKNOWN_METHOD: "UNKNOWN_METHOD",
  SYSTEM_REQUIRED: "SYSTEM_REQUIRED",
  WORKSPACE_REQUIRED: "WORKSPACE_REQUIRED",
  INVALID_ID: "INVALID_ID",
  RAW_ROOT_FORBIDDEN: "RAW_ROOT_FORBIDDEN",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  VERSION_MISMATCH: "VERSION_MISMATCH",
  COMMAND_BLOCKED_READ_ONLY: "COMMAND_BLOCKED_READ_ONLY",
} as const;

export type ProtocolErrorCode =
  (typeof PROTOCOL_ERRORS)[keyof typeof PROTOCOL_ERRORS];

export function assertQueryOnly(method: string): void {
  if (isCommandMethod(method)) {
    const err = new Error(
      `command ${method} blocked: Phase 1 is read-only, no command boundary yet`,
    ) as Error & { code: ProtocolErrorCode };
    err.code = PROTOCOL_ERRORS.COMMAND_BLOCKED_READ_ONLY;
    throw err;
  }
  if (!isKnownMethod(method)) {
    const err = new Error(`unknown method ${method}`) as Error & {
      code: ProtocolErrorCode;
    };
    err.code = PROTOCOL_ERRORS.UNKNOWN_METHOD;
    throw err;
  }
}

export function scopeKey(systemId: string, ...parts: string[]): string {
  if (!SYSTEM_ID_PATTERN.test(systemId)) {
    throw new Error(`invalid systemId for scope key: ${systemId}`);
  }
  return [systemId, ...parts].join(":");
}

export function workspaceScopeKey(
  systemId: string,
  workspaceId: string,
  ...parts: string[]
): string {
  if (!SYSTEM_ID_PATTERN.test(systemId)) {
    throw new Error(`invalid systemId for scope key: ${systemId}`);
  }
  if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
    throw new Error(`invalid workspaceId for scope key: ${workspaceId}`);
  }
  return [systemId, workspaceId, ...parts].join(":");
}
