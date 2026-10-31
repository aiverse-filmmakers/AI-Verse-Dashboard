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
    // Actual Chromium requires the native fetch call to keep its receiver.
    private readonly fetchFn: FetchFn = (url,init)=>fetch(url,init),
  ) {
    if(typeof authToken==="string")assertDashboardAuthToken(authToken);
    else if(authToken?.mode!=="host-cookie")
      throw Object.assign(new Error("Unsupported native host authentication"),
        {code:"LOCAL_APP_AUTH_MODE_INVALID"});
    else {
      const uri=new URL(gatewayBase);
      if(uri.protocol!=="http:"||!["127.0.0.1","localhost","[::1]"].includes(uri.hostname)
        ||uri.username||uri.password||uri.search||uri.hash||uri.pathname!=="/")
        throw Object.assign(new Error("Cookie mode requires trusted loopback origin"),
          {code:"LOCAL_APP_HOST_ORIGIN_INVALID"});
    }
    this.scope = { ...scope };
  }

  getScope(): ClientScope {
    return { ...this.scope };
  }

  /** Selection epoch prevents A→B→A late responses from reviving stale work. */
  selectionVersion():number{return this.selectionEpoch;}

  /** Explicit user action retargets the client; never silent. */
  retarget(scope: ClientScope): void {
    this.scope = { ...scope };
    this.selectionEpoch++;
  }

  cacheStats(): { entries: number } {
    return { entries: this.cache.size };
  }

  clearCache(): void {
    this.cache.clear();
  }

  /** Browser facade: all canonical calls go to authenticated Dashboard /rpc,
   * not directly to the upstream Gateway or any provider endpoint. */
  private requireGatewayScope():void{
    if(!this.scope.workspaceId)throw Object.assign(
      new Error("Select a workspace or operator scope"),{code:"WORKSPACE_REQUIRED"});
  }
  gatewayStatus(){this.requireGatewayScope();
    return this.query("aiverse.gateway.status",{noCache:true});}
  gatewayModels(){this.requireGatewayScope();
    return this.query("aiverse.gateway.models",{noCache:true});}
  createGatewayRun(args:{messages:Array<{
    role:"system"|"user"|"assistant"|"tool";content:string|null;
  }>;idempotencyKey:string;sessionId?:string}){
    this.requireGatewayScope();
    return this.query("aiverse.gateway.run.create",{noCache:true,params:args});
  }
  getGatewayRun(runId:string){
    this.requireGatewayScope();
    return this.query("aiverse.gateway.run.get",{noCache:true,params:{runId}});
  }
  cancelGatewayRun(runId:string,sessionId:string,operationId:string){
    this.requireGatewayScope();
    return this.query("aiverse.gateway.run.cancel",{noCache:true,
      params:{runId,sessionId,operationId}});
  }
  pauseGatewayRun(runId:string,sessionId:string,operationId:string){
    this.requireGatewayScope();
    return this.query("aiverse.gateway.run.pause",{noCache:true,
      params:{runId,sessionId,operationId}});
  }
  resumeGatewayRun(runId:string,sessionId:string,operationId:string){
    this.requireGatewayScope();
    return this.query("aiverse.gateway.run.resume",{noCache:true,
      params:{runId,sessionId,operationId}});
  }

  /** Native Gateway owns all persistent session/run history. An unavailable
   * owner must return a real error, never a fabricated Dashboard library. */
  listGatewaySessions(limit=20,offset=0){
    this.requireGatewayScope();
    if(!Number.isSafeInteger(limit)||limit<1||limit>25
      ||!Number.isSafeInteger(offset)||offset<0||offset>10000)
      throw Object.assign(new Error("Invalid session catalog page"),
        {code:"INVALID_HISTORY_QUERY"});
    return this.query("aiverse.gateway.session.list",{
      noCache:true,params:{limit,offset},
    });
  }

  /** Gateway-owned history only. Older pinned Gateway owners may return a
   * genuine unsupported/404 response; never manufacture previous turns. */
  listGatewaySessionRuns(sessionId:string,limit=25,offset=0){
    this.requireGatewayScope();
    if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(sessionId)
      ||!Number.isSafeInteger(limit)||limit<1||limit>25
      ||!Number.isSafeInteger(offset)||offset<0||offset>10000)
      throw Object.assign(new Error("Invalid session history scope"),
        {code:"INVALID_HISTORY_QUERY"});
    return this.query("aiverse.gateway.session.runs",{noCache:true,
      params:{sessionId,limit,offset}});
  }

  /** Canonical owner diagnostics are run/session-bound and never cost truth. */
  getGatewayRunDiagnostics(runId:string,sessionId:string){
    this.requireGatewayScope();
    const id=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
    if(!id.test(runId)||!id.test(sessionId))
      throw Object.assign(new Error("Invalid run diagnostics scope"),
        {code:"DIAGNOSTICS_INVALID"});
    return this.query("aiverse.gateway.run.diagnostics",{noCache:true,
      params:{runId,sessionId}});
  }
  /** Canvas can be read only if the separate canonical Data owner is installed;
   * the Dashboard host must return CANVAS_OWNER_UNAVAILABLE otherwise. */
  canvasList(limit=50){
    this.requireGatewayScope();
    if(!Number.isSafeInteger(limit)||limit<1||limit>50)
      throw Object.assign(new Error("Invalid Canvas listing limit"),
        {code:"CANVAS_QUERY_INVALID"});
    return this.query("aiverse.canvas.list",{noCache:true,params:{limit}});
  }

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

  /** Approval is never a browser-owned grant: host must freshly admit the
   * exact decision through its trusted native callback. Default denied. */
  decideGatewayRunApproval(runId:string,sessionId:string,operationId:string,
    decision:"approve"|"deny"){
    this.requireGatewayScope();
    return this.query("aiverse.gateway.run.approval",{noCache:true,
      params:{runId,sessionId,operationId,decision}});
  }

  /** Query Dashboard /rpc. Canonical commands still require a native host opt-in. */
  async query(
    method: DashboardMethod,
    opts?: QueryOptions,
  ): Promise<{ result: unknown; systemId?: string; observedAt: string }> {
    this.counter += 1;
    const epoch=this.selectionEpoch;
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
        ...(typeof this.authToken==="string"?{authorization:`Bearer ${this.authToken}`}:{ }),
      },
      body: JSON.stringify(frame),
      ...(typeof this.authToken==="string"?{}:{credentials:"same-origin" as const}),
    });
    const out = (await res.json()) as {
      ok: boolean;
      result?: unknown;
      error?: { code: string; message: string };
      systemId?: string;
      observedAt: string;
    };
    if(epoch!==this.selectionEpoch){
      throw Object.assign(new Error("Selection changed during request"),
        {code:"STALE_SELECTION"});
    }
    if(out.systemId!==undefined&&out.systemId!==frame.systemId){
      throw Object.assign(new Error("System scope mismatch in response"),
        {code:"SYSTEM_MISMATCH"});
    }
    if (!out.ok) {
      throw Object.assign(new Error(out.error?.message ?? "query failed"), {
        code: out.error?.code ?? "UNKNOWN",
      });
    }
    const value = { result: out.result, systemId: out.systemId, observedAt: out.observedAt };
    if(opts?.noCache!==true)
      this.cache.set(key, { value, atMs: Date.now(), ttlMs: opts?.ttlMs ?? 30_000 });
    return value;
  }
}
