import { spawn } from "node:child_process";
import { SessionStore } from "./sessions.js";
import type { ChatSession } from "./sessions.js";
import type { CommandAck, RuntimeAdapter, RuntimeCapabilities } from "./adapter.js";

/**
 * Runtime adapter contract + working adapters (Phase 2 Task 5).
 * The Gateway owns isolation; adapters never see raw roots. Every adapter
 * implements RuntimeAdapter so Claude/Codex/ACP can slot in later without
 * changing callers. This slice ships the contract plus ONE working
 * subprocess adapter (cli-jsonl) next to the local echo adapter.
 */

export type AdapterKind = "local-echo" | "cli-jsonl" | "claude-code" | "codex" | "acp";

export interface AdapterDescriptor {
  name: string;
  kind: AdapterKind;
  command?: string[];
  timeoutMs?: number;
  maxOutputBytes?: number;
}

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const ADAPTER_TIMEOUT_DEFAULT_MS = 5000;
export const ADAPTER_TIMEOUT_MAX_MS = 60000;
export const ADAPTER_OUTPUT_MAX_BYTES = 64 * 1024;

export function validateAdapterDescriptor(raw: Record<string, unknown>): AdapterDescriptor {
  const name = raw.name;
  const kind = raw.kind;
  if (typeof name !== "string" || !NAME_RE.test(name)) {
    throw Object.assign(new Error(`ADAPTER_INVALID: bad adapter name ${String(name)}`), {
      code: "ADAPTER_INVALID",
    });
  }
  const kinds: AdapterKind[] = ["local-echo", "cli-jsonl", "claude-code", "codex", "acp"];
  if (typeof kind !== "string" || !(kinds as string[]).includes(kind)) {
    throw Object.assign(new Error(`ADAPTER_INVALID: bad adapter kind ${String(kind)}`), {
      code: "ADAPTER_INVALID",
    });
  }
  const out: AdapterDescriptor = { name, kind: kind as AdapterKind };
  if (raw.command !== undefined) {
    if (
      !Array.isArray(raw.command) ||
      raw.command.length === 0 ||
      raw.command.length > 16 ||
      !raw.command.every((c) => typeof c === "string" && c.length > 0 && c.length <= 512)
    ) {
      throw Object.assign(new Error("ADAPTER_INVALID: command must be 1-16 non-empty strings"), {
        code: "ADAPTER_INVALID",
      });
    }
    out.command = [...(raw.command as string[])];
  }
  if (raw.timeoutMs !== undefined) {
    if (
      typeof raw.timeoutMs !== "number" ||
      !Number.isInteger(raw.timeoutMs) ||
      raw.timeoutMs < 100 ||
      raw.timeoutMs > ADAPTER_TIMEOUT_MAX_MS
    ) {
      throw Object.assign(new Error("ADAPTER_INVALID: timeoutMs must be 100-60000"), {
        code: "ADAPTER_INVALID",
      });
    }
    out.timeoutMs = raw.timeoutMs;
  }
  if (raw.maxOutputBytes !== undefined) {
    if (
      typeof raw.maxOutputBytes !== "number" ||
      !Number.isInteger(raw.maxOutputBytes) ||
      raw.maxOutputBytes < 1024 ||
      raw.maxOutputBytes > ADAPTER_OUTPUT_MAX_BYTES
    ) {
      throw Object.assign(new Error("ADAPTER_INVALID: maxOutputBytes must be 1024-65536"), {
        code: "ADAPTER_INVALID",
      });
    }
    out.maxOutputBytes = raw.maxOutputBytes;
  }
  if (out.kind === "cli-jsonl" && !out.command) {
    throw Object.assign(new Error("ADAPTER_INVALID: cli-jsonl needs command"), {
      code: "ADAPTER_INVALID",
    });
  }
  return out;
}

/**
 * CLI-JSONL working adapter: spawns `command` per send (no shell), writes
 * {message, sessionId, systemId} as one JSON line on stdin, reads stdout,
 * parses the last non-empty line as {reply: string}. Timeout kills the
 * child; oversized/malformed output becomes an error-event entry, never a
 * silent empty reply. Sessions stay per-system in the shared store.
 */
export class CliJsonlAdapter implements RuntimeAdapter {
  private readonly command: string[];
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;

  constructor(
    private readonly sessions: SessionStore,
    descriptor: AdapterDescriptor,
    private readonly onEvent?: (event: {
      event: string;
      systemId: string;
      workspaceId: string;
      payload: unknown;
    }) => void,
  ) {
    const valid = validateAdapterDescriptor(descriptor as unknown as Record<string, unknown>);
    if (valid.kind !== "cli-jsonl" || !valid.command) {
      throw Object.assign(new Error("ADAPTER_INVALID: CliJsonlAdapter needs kind cli-jsonl + command"), {
        code: "ADAPTER_INVALID",
      });
    }
    this.command = valid.command;
    this.timeoutMs = valid.timeoutMs ?? ADAPTER_TIMEOUT_DEFAULT_MS;
    this.maxOutputBytes = valid.maxOutputBytes ?? ADAPTER_OUTPUT_MAX_BYTES;
  }

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

  async send(systemId: string, sessionId: string, message: string): Promise<CommandAck> {
    if (typeof message !== "string" || message.length === 0 || message.length > 8192) {
      throw Object.assign(new Error("INVALID_MESSAGE: message must be 1-8192 chars"), {
        code: "INVALID_MESSAGE",
      });
    }
    const session = this.sessions.get(systemId, sessionId);
    if (!session) {
      throw Object.assign(new Error(`SESSION_NOT_FOUND: unknown session ${sessionId}`), {
        code: "SESSION_NOT_FOUND",
      });
    }
    const userEntry = this.sessions.append(systemId, sessionId, {
      id: `u-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      kind: "message",
      role: "user",
      body: message,
    });
    void userEntry;
    let replyText: string;
    try {
      replyText = await this.runChild(systemId, sessionId, message);
    } catch (err) {
      const entry = this.sessions.append(systemId, sessionId, {
        id: `e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        kind: "error-event",
        role: "system",
        body: `adapter failed: ${String((err as Error).message).slice(0, 300)}`,
      });
      this.onEvent?.({
        event: "error-event",
        systemId,
        workspaceId: session.workspaceId,
        payload: { sessionId, entryId: entry.id },
      });
      throw err;
    }
    const reply = this.sessions.append(systemId, sessionId, {
      id: `a-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      kind: "message",
      role: "agent",
      body: replyText.slice(0, 8192),
    });
    this.onEvent?.({
      event: "chat.message",
      systemId,
      workspaceId: session.workspaceId,
      payload: { sessionId, entryId: reply.id },
    });
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

  private runChild(systemId: string, sessionId: string, message: string): Promise<string> {
    const [bin, ...args] = this.command;
    return new Promise<string>((resolve, reject) => {
      let child;
      try {
        child = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
      } catch (err) {
        reject(err);
        return;
      }
      let stdout = "";
      let stderr = "";
      let done = false;
      const finish = (err?: Error): void => {
        if (done) return;
        done = true;
        try {
          child.kill("SIGKILL");
        } catch { /* ignore */ }
        if (err) reject(err);
      };
      const timer = setTimeout(() => {
        finish(
          Object.assign(new Error(`ADAPTER_TIMEOUT: adapter exceeded ${this.timeoutMs}ms`), {
            code: "ADAPTER_TIMEOUT",
          }),
        );
      }, this.timeoutMs);
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf8");
        if (Buffer.byteLength(stdout, "utf8") > this.maxOutputBytes) {
          clearTimeout(timer);
          finish(
            Object.assign(new Error("ADAPTER_OUTPUT_TOO_LARGE: child output exceeded bound"), {
              code: "ADAPTER_OUTPUT_TOO_LARGE",
            }),
          );
        }
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf8").slice(0, 2000);
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        finish(
          Object.assign(new Error(`ADAPTER_SPAWN_FAILED: ${String(err.message).slice(0, 200)}`), {
            code: "ADAPTER_SPAWN_FAILED",
          }),
        );
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (done) return;
        done = true;
        if (code !== 0) {
          reject(
            Object.assign(
              new Error(`ADAPTER_EXIT_${code}: child exited ${code}: ${stderr.slice(0, 200)}`),
              { code: "ADAPTER_EXIT_NONZERO" },
            ),
          );
          return;
        }
        const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        if (lines.length === 0) {
          reject(
            Object.assign(new Error("ADAPTER_EMPTY_REPLY: child produced no output"), {
              code: "ADAPTER_EMPTY_REPLY",
            }),
          );
          return;
        }
        try {
          const parsed = JSON.parse(lines[lines.length - 1]) as { reply?: unknown };
          if (typeof parsed.reply !== "string" || parsed.reply.length === 0) {
            reject(
              Object.assign(new Error("ADAPTER_BAD_REPLY: last line needs {reply: string}"), {
                code: "ADAPTER_BAD_REPLY",
              }),
            );
            return;
          }
          resolve(parsed.reply);
        } catch {
          reject(
            Object.assign(new Error("ADAPTER_BAD_REPLY: child output is not JSON"), {
              code: "ADAPTER_BAD_REPLY",
            }),
          );
        }
      });
      try {
        child.stdin?.write(`${JSON.stringify({ message, sessionId, systemId })}\n`);
        child.stdin?.end();
      } catch (err) {
        clearTimeout(timer);
        finish(err as Error);
      }
    });
  }
}

/**
 * Per-system adapter registry: one or more named adapters per system.
 * Unknown systems fail closed; adapters never leak across systems.
 */
export class AdapterRegistry {
  private readonly bySystem = new Map<string, Map<string, RuntimeAdapter>>();

  register(systemId: string, name: string, adapter: RuntimeAdapter): void {
    if (!NAME_RE.test(name)) {
      throw Object.assign(new Error(`ADAPTER_INVALID: bad adapter name ${name}`), {
        code: "ADAPTER_INVALID",
      });
    }
    let inner = this.bySystem.get(systemId);
    if (!inner) {
      inner = new Map();
      this.bySystem.set(systemId, inner);
    }
    if (inner.has(name)) {
      throw Object.assign(new Error(`ADAPTER_DUPLICATE: ${name} already registered for ${systemId}`), {
        code: "ADAPTER_DUPLICATE",
      });
    }
    inner.set(name, adapter);
  }

  get(systemId: string, name?: string): RuntimeAdapter {
    const inner = this.bySystem.get(systemId);
    if (!inner || inner.size === 0) {
      throw Object.assign(new Error(`ADAPTER_NOT_FOUND: no adapter for ${systemId}`), {
        code: "ADAPTER_NOT_FOUND",
      });
    }
    if (name !== undefined) {
      const found = inner.get(name);
      if (!found) {
        throw Object.assign(new Error(`ADAPTER_NOT_FOUND: ${name} not registered for ${systemId}`), {
          code: "ADAPTER_NOT_FOUND",
        });
      }
      return found;
    }
    const first = [...inner.values()][0];
    if (!first) {
      throw Object.assign(new Error(`ADAPTER_NOT_FOUND: no adapter for ${systemId}`), {
        code: "ADAPTER_NOT_FOUND",
      });
    }
    return first;
  }

  names(systemId: string): string[] {
    return [...(this.bySystem.get(systemId)?.keys() ?? [])];
  }
}
