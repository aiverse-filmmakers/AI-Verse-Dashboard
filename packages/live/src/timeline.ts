/**
 * Chat timeline model (Phase 2 Task 1, shell §8).
 * Heterogeneous typed entries: prose is one kind among tool calls,
 * approvals, tasks, handoffs, files, diffs, runs, errors, and commands.
 * A transcript entry is a projection of canonical/runtime state —
 * never an alternate store.
 */

export const TIMELINE_KINDS = [
  "message",
  "tool-call",
  "approval",
  "task-card",
  "handoff",
  "file-card",
  "diff-card",
  "preview-card",
  "run-event",
  "error-event",
  "command-confirm",
] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export type TimelineRole = "user" | "agent" | "system";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  role: TimelineRole;
  systemId: string;
  workspaceId: string;
  sessionId: string;
  body: string;
  ref?: { kind: string; id: string };
  createdAt: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-_]{0,63}$/;

export function normalizeTimelineEntry(
  scope: { systemId: string; workspaceId: string; sessionId: string },
  raw: Record<string, unknown>,
): TimelineEntry {
  const id = raw.id;
  const kind = raw.kind ?? "message";
  const role = raw.role ?? "user";
  const body = raw.body;
  if (typeof id !== "string" || !ID_RE.test(id)) throw new Error(`bad timeline id ${String(id)}`);
  if (typeof kind !== "string" || !(TIMELINE_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`bad timeline kind ${String(kind)}`);
  }
  if (role !== "user" && role !== "agent" && role !== "system") {
    throw new Error(`bad timeline role ${String(role)}`);
  }
  if (typeof body !== "string" || body.length === 0 || body.length > 8192) {
    throw new Error("bad timeline body");
  }
  const entry: TimelineEntry = {
    id,
    kind: kind as TimelineKind,
    role,
    systemId: scope.systemId,
    workspaceId: scope.workspaceId,
    sessionId: scope.sessionId,
    body,
    createdAt: new Date().toISOString(),
  };
  if (raw.ref !== undefined) {
    const ref = raw.ref as { kind?: unknown; id?: unknown };
    if (typeof ref.kind !== "string" || typeof ref.id !== "string") {
      throw new Error("bad timeline ref");
    }
    entry.ref = { kind: ref.kind.slice(0, 64), id: ref.id.slice(0, 128) };
  }
  if (typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))) {
    entry.createdAt = raw.createdAt;
  }
  return entry;
}
