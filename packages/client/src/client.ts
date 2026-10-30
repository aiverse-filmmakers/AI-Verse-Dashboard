import {
  PROTOCOL_VERSION,
  assertDashboardAuthToken,
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
  init: { method: string; headers: Record<string, string>; body: string; credentials?: "same-origin" },
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
  private selectionEpoch = 0;

  constructor(
    private readonly gatewayBase: string,
    scope: ClientScope,
    private readonly authToken: string | {mode:"host-cookie"},
    private readonly fetchFn: FetchFn = (url,init) => globalThis.fetch(url,init),
  ) {
    if(typeof authToken==="string")assertDashboardAuthToken(authToken);
    else if(authToken?.mode!=="host-cookie")throw Error("Unsupported local app authentication");
    this.scope = { ...scope };
  }

  getScope(): ClientScope {
    return { ...this.scope };
  }

  /** Client-local monotonic scope epoch, including A→B→A selection changes. */
  selectionVersion(): number {
    return this.selectionEpoch;
  }

  /** Explicit user action retargets the client; never silent. */
  retarget(scope: ClientScope): void {
    this.scope = { ...scope };
    this.selectionEpoch += 1; // even A→B→A invalidates A's old in-flight result
  }

  cacheStats(): { entries: number } {
    return { entries: this.cache.size };
  }

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Canonical AI-Verse projections through the existing authenticated Dashboard
   * /rpc host, NEVER directly to the upstream Gateway. No provider bearer
   * leaves the host; the trusted host must explicitly opt in to the bridge.
   */
  async gatewayStatus():Promise<{result:unknown;systemId?:string;observedAt:string}> {
    if(!this.scope.workspaceId)throw new Error("Select a workspace or operator scope first");
    return this.query("aiverse.gateway.status",{noCache:true});
  }

  async gatewayModels():Promise<{result:unknown;systemId?:string;observedAt:string}>{
    if(!this.scope.workspaceId)throw new Error("Select a workspace first");
    return this.query("aiverse.gateway.models",{noCache:true});
  }

  async createGatewayRun(args:{
    messages:Array<{role:"system"|"user"|"assistant"|"tool";content:string|null}>;
    idempotencyKey:string;
    sessionId?:string;
  }):Promise<{result:unknown;systemId?:string;observedAt:string}> {
    if(!this.scope.workspaceId)throw new Error("Select a workspace or operator scope first");
    return this.query("aiverse.gateway.run.create",{noCache:true,params:args});
  }

  /** Explicitly host-approved cancel of a known canonical run and session. */
  async cancelGatewayRun(runId:string,sessionId:string,operationId:string):
    Promise<{result:unknown;systemId?:string;observedAt:string}> {
    if(!this.scope.workspaceId)throw new Error("Select a workspace first");
    return this.query("aiverse.gateway.run.cancel",{
      noCache:true,params:{runId,sessionId,operationId},
    });
  }

  async getGatewayRun(runId:string):Promise<{result:unknown;systemId?:string;observedAt:string}> {
    if(!this.scope.workspaceId)throw new Error("Select a workspace or operator scope first");
    return this.query("aiverse.gateway.run.get",{noCache:true,params:{runId}});
  }

  async listGatewaySessions(limit=20,offset=0):Promise<{result:unknown;systemId?:string;observedAt:string}>{
    if(!this.scope.workspaceId)throw new Error("Select a workspace first");
    return this.query("aiverse.gateway.session.list",{noCache:true,params:{limit,offset}});
  }
  async listGatewaySessionRuns(sessionId:string,limit=20,offset=0):
    Promise<{result:unknown;systemId?:string;observedAt:string}>{
    if(!this.scope.workspaceId)throw new Error("Select a workspace first");
    return this.query("aiverse.gateway.session.runs",{
      noCache:true,params:{sessionId,limit,offset},
    });
  }
  /** Canonical Canvas actions always use authenticated Dashboard-host RPC. */
  async canvasList(limit=50){return this.query("aiverse.canvas.list",{
    noCache:true,params:{limit},
  });}
  async canvasGet(id:string){return this.query("aiverse.canvas.get",{
    noCache:true,params:{id},
  });}
  async canvasHistory(id:string,limit=20,beforeVersion?:number){return this.query("aiverse.canvas.history",{
    noCache:true,params:{id,limit,...(beforeVersion===undefined?{}:{beforeVersion})},
  });}
  async canvasCreate(title:string,idempotencyKey:string){
    return this.query("aiverse.canvas.create",{noCache:true,params:{title,idempotencyKey}});
  }
  async canvasRename(id:string,title:string,expectedVersion:number,idempotencyKey:string){
    return this.query("aiverse.canvas.rename",{noCache:true,
      params:{id,title,expectedVersion,idempotencyKey}});
  }
  async canvasEdit(id:string,edit:Record<string,unknown>,
    expectedVersion:number,idempotencyKey:string){
    return this.query("aiverse.canvas.edit",{noCache:true,
      params:{id,edit,expectedVersion,idempotencyKey}});
  }
  async canvasDuplicate(id:string,expectedVersion:number,idempotencyKey:string,title?:string){
    return this.query("aiverse.canvas.duplicate",{noCache:true,
      params:{id,expectedVersion,idempotencyKey,...(title===undefined?{}:{title})}});
  }
  async canvasRevert(id:string,toVersion:number,expectedVersion:number,idempotencyKey:string){
    return this.query("aiverse.canvas.revert",{noCache:true,
      params:{id,toVersion,expectedVersion,idempotencyKey}});
  }
  async canvasDelete(id:string,expectedVersion:number,idempotencyKey:string){
    return this.query("aiverse.canvas.delete",{noCache:true,
      params:{id,expectedVersion,idempotencyKey}});
  }
  /** Query the Gateway. Read-only methods only in Phase 1. */
  async query(
    method: DashboardMethod,
    opts?: QueryOptions,
  ): Promise<{ result: unknown; systemId?: string; observedAt: string }> {
    this.counter += 1;
    const selectedEpoch = this.selectionEpoch;
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
      headers: {
        "content-type": "application/json",
        ...(typeof this.authToken==="string" ? {authorization:`Bearer ${this.authToken}`} : {}),
      },
      body: JSON.stringify(frame),
      ...(typeof this.authToken==="string" ? {} : {credentials:"same-origin" as const}),
    });
    const out = (await res.json()) as {
      ok: boolean;
      result?: unknown;
      error?: { code: string; message: string };
      systemId?: string;
      observedAt: string;
    };
    if (selectedEpoch !== this.selectionEpoch) {
      throw Object.assign(new Error("Selection changed during request"), { code: "STALE_SELECTION" });
    }
    if (out.systemId !== undefined && out.systemId !== frame.systemId) {
      throw Object.assign(new Error("Response system does not match selection"), { code: "SYSTEM_MISMATCH" });
    }
    if (!out.ok) {
      throw Object.assign(new Error(out.error?.message ?? "query failed"), {
        code: out.error?.code ?? "UNKNOWN",
      });
    }
    const value = { result: out.result, systemId: out.systemId, observedAt: out.observedAt };
    if(opts?.noCache !== true) this.cache.set(key, { value, atMs: Date.now(), ttlMs: opts?.ttlMs ?? 30_000 });
    return value;
  }
}
