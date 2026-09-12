import {
  PROTOCOL_VERSION,
  requestSchema,
  scopeKey,
  type DashboardMethod,
} from "../../protocol/src/index.js";

/**
 * Typed Gateway client (Task 5, shell §2.3).
 * Panels consume this client — never files, SQLite, or runtime processes
 * directly. Every query carries the panel's bound systemId (+ workspaceId
 * when workspace-scoped). Cache is partitioned by systemId so two panels
 * on different systems never share entries.
 */

export interface ClientScope {
  systemId: string;
  workspaceId?: string;
}

export type FetchFn = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ json(): Promise<unknown> }>;

export interface QueryOptions {
  params?: Record<string, unknown>;
  noCache?: boolean;
  ttlMs?: number;
}

interface CacheEntry {
  value: unknown;
  atMs: number;
  ttlMs: number;
}

export class DashboardClient {
  private scope: ClientScope;
  private readonly cache = new Map<string, CacheEntry>();
  private counter = 0;

  constructor(
    private readonly gatewayBase: string,
    scope: ClientScope,
    private readonly fetchFn: FetchFn = fetch as unknown as FetchFn,
  ) {
    this.scope = { ...scope };
  }

  getScope(): ClientScope {
    return { ...this.scope };
  }

  /** Explicit user action retargets the client; never silent. */
  retarget(scope: ClientScope): void {
    this.scope = { ...scope };
  }

  cacheStats(): { entries: number } {
    return { entries: this.cache.size };
  }

  clearCache(): void {
    this.cache.clear();
  }

  /** Query the Gateway. Read-only methods only in Phase 1. */
  async query(
    method: DashboardMethod,
    opts?: QueryOptions,
  ): Promise<{ result: unknown; systemId?: string; observedAt: string }> {
    this.counter += 1;
    const frame: Record<string, unknown> = {
      type: "req",
      v: PROTOCOL_VERSION,
      id: `web-${this.counter}`,
      method,
      systemId: this.scope.systemId,
      ...(this.scope.workspaceId !== undefined ? { workspaceId: this.scope.workspaceId } : {}),
      ...(opts?.params !== undefined ? { params: opts.params } : {}),
    };
    // Fail closed before sending: protocol validates scope + no raw roots.
    requestSchema.parse(frame);

    const key = scopeKey(
      this.scope.systemId,
      method,
      this.scope.workspaceId ?? "-",
      JSON.stringify(opts?.params ?? null),
    );
    if (opts?.noCache !== true) {
      const hit = this.cache.get(key);
      if (hit && Date.now() - hit.atMs <= hit.ttlMs) {
        return hit.value as { result: unknown; systemId?: string; observedAt: string };
      }
    }
    const res = await this.fetchFn(`${this.gatewayBase}/rpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(frame),
    });
    const out = (await res.json()) as {
      ok: boolean;
      result?: unknown;
      error?: { code: string; message: string };
      systemId?: string;
      observedAt: string;
    };
    if (!out.ok) {
      throw Object.assign(new Error(out.error?.message ?? "query failed"), {
        code: out.error?.code ?? "UNKNOWN",
      });
    }
    const value = { result: out.result, systemId: out.systemId, observedAt: out.observedAt };
    this.cache.set(key, { value, atMs: Date.now(), ttlMs: opts?.ttlMs ?? 30_000 });
    return value;
  }
}
