import { normalizeTimelineEntry, type TimelineEntry } from "./timeline.js";

/**
 * Session store (Phase 2 Task 1, Blueprint §10 + §8 chat isolation).
 * Sessions are partitioned by systemId: the same provider/model serving
 * two systems uses separate conversation state per system. Returning to
 * a system restores only that system's history. Bounded transcripts.
 */

export type SessionStatus = "active" | "idle" | "working" | "waiting" | "blocked" | "done" | "aborted";

export interface ChatSession {
  sessionId: string;
  systemId: string;
  workspaceId: string;
  title: string;
  status: SessionStatus;
  provider?: string;
  model?: string;
  entries: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9-_]{0,63}$/;
export const MAX_ENTRIES = 500;
export const MAX_BODY = 8192;

export const SESSION_ERRORS = {
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
  SESSION_CLOSED: "SESSION_CLOSED",
  INVALID_ID: "INVALID_ID",
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",
} as const;

function sessionError(code: keyof typeof SESSION_ERRORS, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = SESSION_ERRORS[code];
  return err;
}

export class SessionStore {
  private readonly sessions = new Map<string, ChatSession>();
  private counter = 0;

  /** Key is systemId + sessionId: identical session ids never collide. */
  private static key(systemId: string, sessionId: string): string {
    return `${systemId}:${sessionId}`;
  }

  create(
    systemId: string,
    workspaceId: string,
    opts?: { title?: string; provider?: string; model?: string; sessionId?: string },
  ): ChatSession {
    if (systemId.length === 0 || systemId.length > 64) {
      throw sessionError("INVALID_ID", "bad systemId");
    }
    let sessionId = opts?.sessionId;
    if (sessionId !== undefined && !ID_RE.test(sessionId)) {
      throw sessionError("INVALID_ID", `bad sessionId ${sessionId}`);
    }
    if (sessionId === undefined) {
      this.counter += 1;
      sessionId = `sess-${this.counter}`;
    }
    const key = SessionStore.key(systemId, sessionId);
    if (this.sessions.has(key)) {
      throw sessionError("LIMIT_EXCEEDED", `session already exists: ${sessionId}`);
    }
    const now = new Date().toISOString();
    const session: ChatSession = {
      sessionId,
      systemId,
      workspaceId,
      title: (opts?.title ?? sessionId).slice(0, 128),
      status: "active",
      ...(opts?.provider ? { provider: opts.provider.slice(0, 64) } : {}),
      ...(opts?.model ? { model: opts.model.slice(0, 64) } : {}),
      entries: [],
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(key, session);
    return { ...session, entries: [] };
  }

  get(systemId: string, sessionId: string): ChatSession | undefined {
    const s = this.sessions.get(SessionStore.key(systemId, sessionId));
    return s ? { ...s, entries: [...s.entries] } : undefined;
  }

  list(systemId: string, workspaceId?: string): ChatSession[] {
    const out: ChatSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.systemId !== systemId) continue;
      if (workspaceId !== undefined && s.workspaceId !== workspaceId) continue;
      out.push({ ...s, entries: [] });
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  append(
    systemId: string,
    sessionId: string,
    raw: Record<string, unknown>,
  ): TimelineEntry {
    const key = SessionStore.key(systemId, sessionId);
    const s = this.sessions.get(key);
    if (!s) throw sessionError("SESSION_NOT_FOUND", `unknown session ${sessionId}`);
    if (s.status === "done" || s.status === "aborted") {
      throw sessionError("SESSION_CLOSED", `session ${sessionId} is closed`);
    }
    if (s.entries.length >= MAX_ENTRIES) {
      throw sessionError("LIMIT_EXCEEDED", `session transcript full (${MAX_ENTRIES})`);
    }
    if (typeof raw.body === "string" && raw.body.length > MAX_BODY) {
      throw sessionError("LIMIT_EXCEEDED", `entry body exceeds ${MAX_BODY} chars`);
    }
    const entry = normalizeTimelineEntry(
      { systemId: s.systemId, workspaceId: s.workspaceId, sessionId: s.sessionId },
      raw,
    );
    s.entries.push(entry);
    s.updatedAt = new Date().toISOString();
    if (entry.role === "agent") s.status = "idle";
    else if (entry.role === "user") s.status = "working";
    return { ...entry };
  }

  history(systemId: string, sessionId: string, limit = 100): TimelineEntry[] {
    const s = this.sessions.get(SessionStore.key(systemId, sessionId));
    if (!s) throw sessionError("SESSION_NOT_FOUND", `unknown session ${sessionId}`);
    const n = Math.max(1, Math.min(limit, MAX_ENTRIES));
    return s.entries.slice(-n).map((e) => ({ ...e }));
  }

  setStatus(systemId: string, sessionId: string, status: SessionStatus): ChatSession {
    const s = this.sessions.get(SessionStore.key(systemId, sessionId));
    if (!s) throw sessionError("SESSION_NOT_FOUND", `unknown session ${sessionId}`);
    s.status = status;
    s.updatedAt = new Date().toISOString();
    return { ...s, entries: [...s.entries] };
  }

  abort(systemId: string, sessionId: string): ChatSession {
    return this.setStatus(systemId, sessionId, "aborted");
  }
}
