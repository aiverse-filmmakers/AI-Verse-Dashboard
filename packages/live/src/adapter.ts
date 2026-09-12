import { SessionStore, type ChatSession } from "./sessions.js";

/**
 * Runtime adapter interface (Phase 2 Task 1, Blueprint §10).
 * Narrow local adapter: capabilities, session list/get, send, abort,
 * subscribe. The Gateway owns isolation; adapters never see raw roots.
 * Provider credentials may be shared when authorized, but conversation
 * ids and continuation state stay per-system inside the SessionStore.
 */

export interface RuntimeCapabilities {
  streaming: boolean;
  abort: boolean;
  tools: boolean;
  maxEntries: number;
}

export interface CommandAck {
  accepted: boolean;
  sessionId: string;
  entryId: string;
}

export interface RuntimeAdapter {
  capabilities(systemId: string): Promise<RuntimeCapabilities>;
  listSessions(systemId: string, workspaceId: string): Promise<ChatSession[]>;
  getSession(systemId: string, sessionId: string): Promise<ChatSession | undefined>;
  send(
    systemId: string,
    sessionId: string,
    message: string,
    opts?: { kind?: string },
  ): Promise<CommandAck>;
  abort(systemId: string, sessionId: string): Promise<void>;
}

/** In-memory echo adapter: agent replies receipt the user message. */
export class LocalEchoAdapter implements RuntimeAdapter {
  constructor(
    private readonly sessions: SessionStore,
    private readonly onEvent?: (event: {
      event: string;
      systemId: string;
      workspaceId: string;
      payload: unknown;
    }) => void,
  ) {}

  async capabilities(_systemId: string): Promise<RuntimeCapabilities> {
    void _systemId;
    return { streaming: false, abort: true, tools: false, maxEntries: 500 };
  }

  async listSessions(systemId: string, workspaceId: string): Promise<ChatSession[]> {
    return this.sessions.list(systemId, workspaceId);
  }

  async getSession(systemId: string, sessionId: string): Promise<ChatSession | undefined> {
    return this.sessions.get(systemId, sessionId);
  }

  async send(
    systemId: string,
    sessionId: string,
    message: string,
    opts?: { kind?: string },
  ): Promise<CommandAck> {
    if (typeof message !== "string" || message.length === 0 || message.length > 8192) {
      throw Object.assign(new Error("message must be 1-8192 chars"), { code: "INVALID_MESSAGE" });
    }
    const session = this.sessions.get(systemId, sessionId);
    if (!session) {
      throw Object.assign(new Error(`unknown session ${sessionId}`), {
        code: "SESSION_NOT_FOUND",
      });
    }
    const userEntry = this.sessions.append(systemId, sessionId, {
      id: `u-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      kind: opts?.kind ?? "message",
      role: "user",
      body: message,
    });
    const reply = this.sessions.append(systemId, sessionId, {
      id: `a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      kind: "message",
      role: "agent",
      body: `receipt: ${message.slice(0, 512)}`,
    });
    this.onEvent?.({
      event: "chat.message",
      systemId,
      workspaceId: session.workspaceId,
      payload: { sessionId, entryId: reply.id },
    });
    void userEntry;
    return { accepted: true, sessionId, entryId: reply.id };
  }

  async abort(systemId: string, sessionId: string): Promise<void> {
    this.sessions.abort(systemId, sessionId);
    const session = this.sessions.get(systemId, sessionId);
    this.onEvent?.({
      event: "chat.aborted",
      systemId,
      workspaceId: session?.workspaceId ?? "",
      payload: { sessionId },
    });
  }
}
