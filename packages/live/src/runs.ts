import type { TimelineEntry, TimelineKind } from "./timeline.js";
import type { SessionStore } from "./sessions.js";

/**
 * Runs timeline + terminal drawer model (Phase 2 Task 4, Blueprint §8D).
 * Chronological trace over a session's typed entries: tool calls, model
 * calls (as messages), files, approvals, runs, errors/retries. Default
 * view summarizes; raw log pages load on demand in bounded slices.
 * The drawer is a bounded in-browser buffer: newest N lines, severity
 * filter, text search, pause flag — never the whole transcript in DOM.
 */

export type SpanKind = Extract<
  TimelineKind,
  | "tool-call"
  | "message"
  | "approval"
  | "task-card"
  | "run-event"
  | "error-event"
  | "file-card"
  | "diff-card"
  | "handoff"
>;

export interface TraceSpan {
  id: string;
  kind: SpanKind;
  role: string;
  label: string;
  body: string;
  createdAt: string;
  attention: boolean;
}

export interface TraceView {
  sessionId: string;
  systemId: string;
  workspaceId: string;
  spans: TraceSpan[];
  total: number;
  errors: number;
  startedAt?: string;
  endedAt?: string;
  observedAt: string;
}

const TRACEABLE: ReadonlySet<string> = new Set([
  "tool-call",
  "message",
  "approval",
  "task-card",
  "run-event",
  "error-event",
  "file-card",
  "diff-card",
  "handoff",
]);

function labelFor(entry: TimelineEntry): string {
  switch (entry.kind) {
    case "tool-call":
      return `tool: ${entry.body.slice(0, 80)}`;
    case "approval":
      return `approval: ${entry.body.slice(0, 80)}`;
    case "task-card":
      return `task: ${entry.body.slice(0, 80)}`;
    case "run-event":
      return `run: ${entry.body.slice(0, 80)}`;
    case "error-event":
      return `error: ${entry.body.slice(0, 80)}`;
    case "file-card":
    case "diff-card":
      return `file: ${entry.body.slice(0, 80)}`;
    case "handoff":
      return `handoff: ${entry.body.slice(0, 80)}`;
    default:
      return entry.body.slice(0, 80);
  }
}

/** Chronological trace for one session, bounded, oldest-first. */
export function buildTrace(
  sessions: SessionStore,
  systemId: string,
  sessionId: string,
  opts?: { limit?: number; kinds?: SpanKind[] },
): TraceView {
  const session = sessions.get(systemId, sessionId);
  if (!session) {
    throw Object.assign(new Error(`SESSION_NOT_FOUND: unknown session ${sessionId}`), {
      code: "SESSION_NOT_FOUND",
    });
  }
  const limit = Math.max(1, Math.min(opts?.limit ?? 100, 500));
  const kinds = opts?.kinds;
  const entries = sessions.history(systemId, sessionId, 500).filter((e) => {
    if (!TRACEABLE.has(e.kind)) return false;
    if (kinds !== undefined && !(kinds as string[]).includes(e.kind)) return false;
    return true;
  });
  const sliced = entries.slice(-limit);
  const spans: TraceSpan[] = sliced.map((e) => ({
    id: e.id,
    kind: e.kind as SpanKind,
    role: e.role,
    label: labelFor(e),
    body: e.body,
    createdAt: e.createdAt,
    attention: e.kind === "error-event" || e.kind === "approval",
  }));
  return {
    sessionId,
    systemId,
    workspaceId: session.workspaceId,
    spans,
    total: entries.length,
    errors: entries.filter((e) => e.kind === "error-event").length,
    ...(entries[0] ? { startedAt: entries[0].createdAt } : {}),
    ...(entries.length > 0 ? { endedAt: entries[entries.length - 1].createdAt } : {}),
    observedAt: new Date().toISOString(),
  };
}

export type LogSeverity = "info" | "warning" | "error";

export interface LogLine {
  seq: number;
  severity: LogSeverity;
  text: string;
  createdAt: string;
}

export interface LogDrawer {
  sessionId: string;
  systemId: string;
  lines: LogLine[];
  total: number;
  paused: boolean;
  filter?: LogSeverity;
  query?: string;
  observedAt: string;
}

export const DRAWER_BUFFER_MAX = 200;

function severityOf(entry: TimelineEntry): LogSeverity {
  if (entry.kind === "error-event") return "error";
  if (entry.kind === "approval" || entry.kind === "run-event") return "warning";
  return "info";
}

/**
 * Terminal drawer page: newest entries rendered as log lines.
 * Bounded to DRAWER_BUFFER_MAX; older pages load via beforeSeq cursor.
 * ANSI is passed through untouched in text (renderer concern).
 */
export function buildLogDrawer(
  sessions: SessionStore,
  systemId: string,
  sessionId: string,
  opts?: {
    limit?: number;
    beforeSeq?: number;
    severity?: LogSeverity;
    query?: string;
    paused?: boolean;
  },
): LogDrawer {
  const session = sessions.get(systemId, sessionId);
  if (!session) {
    throw Object.assign(new Error(`SESSION_NOT_FOUND: unknown session ${sessionId}`), {
      code: "SESSION_NOT_FOUND",
    });
  }
  const all = sessions.history(systemId, sessionId, 500);
  const numbered: LogLine[] = all.map((e, i) => ({
    seq: i + 1,
    severity: severityOf(e),
    text: `[${e.kind}] ${e.body}`.slice(0, 2000),
    createdAt: e.createdAt,
  }));
  let lines = numbered;
  const before = opts?.beforeSeq;
  if (before !== undefined) {
    lines = lines.filter((l) => l.seq < before);
  }
  if (opts?.severity !== undefined) {
    lines = lines.filter((l) => l.severity === opts.severity);
  }
  if (opts?.query !== undefined && opts.query.length > 0) {
    const q = opts.query.toLowerCase().slice(0, 128);
    lines = lines.filter((l) => l.text.toLowerCase().includes(q));
  }
  const limit = Math.max(1, Math.min(opts?.limit ?? 50, DRAWER_BUFFER_MAX));
  const page = lines.slice(-limit);
  return {
    sessionId,
    systemId,
    lines: page,
    total: lines.length,
    paused: opts?.paused ?? false,
    ...(opts?.severity ? { filter: opts.severity } : {}),
    ...(opts?.query ? { query: opts.query.slice(0, 128) } : {}),
    observedAt: new Date().toISOString(),
  };
}

/** Copy-exact payload for one log line (command/output copy button). */
export function copyLogLine(
  sessions: SessionStore,
  systemId: string,
  sessionId: string,
  seq: number,
): string {
  const session = sessions.get(systemId, sessionId);
  if (!session) {
    throw Object.assign(new Error(`SESSION_NOT_FOUND: unknown session ${sessionId}`), {
      code: "SESSION_NOT_FOUND",
    });
  }
  const all = sessions.history(systemId, sessionId, 500);
  const entry = all[seq - 1];
  if (!entry) {
    throw Object.assign(new Error(`ENTRY_NOT_FOUND: unknown log seq ${seq}`), { code: "ENTRY_NOT_FOUND" });
  }
  return entry.body;
}
