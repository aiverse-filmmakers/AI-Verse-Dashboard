/**
 * MC2.2, slice 1: trusted-host-only transport for the canonical AI-Verse Gateway.
 *
 * NOT the existing Dashboard /rpc service, NOT a browser API, and NOT exported
 * through packages/client/src/index.ts. A future authenticated host must create
 * bindings from its canonical registry, resolve the bearer privately and project
 * only authorised data to the UI. This class does not grant that authority.
 */

export type GatewayMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
};
export type GatewayControl = "cancel" | "pause" | "resume" | "approval";
export type GatewayDecision = "approve" | "deny";
export type GatewayEvent = {
  event_id: string;
  run_id: string;
  type: string;
  at: string;
  data: Record<string, unknown>;
};
export type GatewayRun = {
  run_id: string;
  session_id: string;
  system_id: string;
  workspace_id: string;
  status: string;
  output?: { content?: string } | null;
  [key: string]: unknown;
};
export type GatewayPreflight = {
  component: "ai-verse-gateway";
  systemId: string;
  state: "ready";
  runtime: string;
  model: "aiverse";
  observedAt: string;
};
export interface HostGatewayBinding {
  /** Host-derived, approved canonical Gateway system ID, NOT Dashboard's registry ID. */
  canonicalSystemId: string;
  /** Wire workspace ID: "operator" for general chat, or the authorised workspace ID. */
  workspaceId: string;
  /** Host-validated local origin, not a browser-supplied URL. */
  origin: string;
  /** Called only in the trusted host process. Never project tokens to the browser. */
  resolveBearer(): Promise<string> | string;
}
export interface GatewayTransportOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}
export class GatewayTransportError extends Error {
  constructor(public readonly code: string, public readonly status?: number) {
    super("Canonical Gateway request failed: " + code);
    this.name = "GatewayTransportError";
  }
}
const WORKSPACE = /^(operator|[a-z0-9][a-z0-9-]{0,127})$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MAX_JSON_BYTES = 1_048_576;
const MAX_EVENT_BYTES = 65_536;
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new GatewayTransportError("INVALID_RESPONSE");
  return input as Record<string, unknown>;
}
function string(input: unknown): string {
  if (typeof input !== "string" || !input) throw new GatewayTransportError("INVALID_RESPONSE");
  return input;
}
function safeId(id: string): string {
  if (!ID.test(id)) throw new GatewayTransportError("INVALID_ID");
  return encodeURIComponent(id);
}
function validateOrigin(origin: string): string {
  let url: URL;
  try { url = new URL(origin); } catch { throw new GatewayTransportError("INVALID_ORIGIN"); }
  // MC2.2 intentionally supports local hosts only. Never accept credentials,
  // paths or remote SSRF targets from a model, user message or browser request.
  if (url.protocol !== "http:" || !["127.0.0.1","localhost","[::1]"].includes(url.hostname)
    || url.username || url.password || url.search || url.hash || url.pathname !== "/"
    || url.port === "0") throw new GatewayTransportError("UNAPPROVED_GATEWAY_ORIGIN");
  return url.origin;
}
/** Reject oversized Gateway bodies *during* streaming, before Response.text() can
 * buffer an untrusted megabyte-scale payload into the host process. */
async function boundedJsonText(response:Response):Promise<string>{
  const reported=response.headers.get("content-length");
  if(reported!==null&&/^\d+$/.test(reported)&&Number(reported)>MAX_JSON_BYTES)
    throw new GatewayTransportError("RESPONSE_TOO_LARGE");
  if(!response.body)return "";
  const reader=response.body.getReader();
  const decoder=new TextDecoder();
  let received=0,body="";
  try{
    while(true){
      const chunk=await reader.read();
      if(chunk.done)break;
      received+=chunk.value.byteLength;
      if(received>MAX_JSON_BYTES)
        throw new GatewayTransportError("RESPONSE_TOO_LARGE");
      body+=decoder.decode(chunk.value,{stream:true});
    }
    return body+decoder.decode();
  }finally{
    try{await reader.cancel();}catch{}
    reader.releaseLock();
  }
}

function gatewayError(status: number, json?: unknown): GatewayTransportError {
  let code = "HTTP_" + status;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const nested = (json as {error?: unknown}).error;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const candidate = (nested as {code?: unknown}).code;
      if (typeof candidate === "string" && /^[A-Z][A-Z0-9_]{1,80}$/.test(candidate)) code = candidate;
    }
  }
  // Never relay upstream exception text or provider secrets to display clients.
  return new GatewayTransportError(code, status);
}
function validMessages(messages: GatewayMessage[]): boolean {
  return Array.isArray(messages) && messages.length >= 1 && messages.length <= 200
    && messages.every(m => m && ["system","user","assistant","tool"].includes(m.role)
      && (typeof m.content === "string" || m.content === null));
}

/** Creates a per-scope, per-epoch lease. Do not reuse after workspace changes. */
export class CanonicalGatewayClient {
  private readonly origin: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;
  private readonly pending = new Set<AbortController>();
  private invalidated = false;

  constructor(private readonly binding: HostGatewayBinding, options: GatewayTransportOptions = {}) {
    // node:os type import is not a browser runtime guard. Reject browser bundles
    // even when they can import this file through an explicit deep path.
    if (typeof process === "undefined" || !process.versions?.node) throw new GatewayTransportError("HOST_ONLY");
    this.origin = validateOrigin(binding.origin);
    string(binding.canonicalSystemId);
    if (!WORKSPACE.test(binding.workspaceId)) throw new GatewayTransportError("INVALID_WORKSPACE");
    if (typeof binding.resolveBearer !== "function") throw new GatewayTransportError("NO_HOST_CREDENTIAL_RESOLVER");
    this.fetchFn = options.fetchFn ?? fetch;
    this.timeoutMs = Math.max(100, Math.min(30_000, options.timeoutMs ?? 10_000));
  }

  invalidate(): void {
    this.invalidated = true;
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
  }
  private check(): void {
    if (this.invalidated) throw new GatewayTransportError("STALE_BINDING");
  }
  private async bearer(): Promise<string> {
    this.check();
    const key = await this.binding.resolveBearer();
    if (typeof key !== "string" || !key.trim() || /[\r\n]/.test(key)) throw new GatewayTransportError("GATEWAY_CREDENTIAL_UNAVAILABLE");
    this.check();
    return key;
  }
  private signal(upstream?: AbortSignal): {controller: AbortController; finish(): void} {
    this.check();
    const controller = new AbortController();
    const abort = () => controller.abort();
    upstream?.addEventListener("abort", abort, { once: true });
    if (upstream?.aborted) abort();
    this.pending.add(controller);
    return {controller, finish: () => {this.pending.delete(controller);upstream?.removeEventListener("abort",abort);}};
  }
  private async request(
    method: "GET" | "POST", path: string, body?: Record<string, unknown>,
    key?: string, upstream?: AbortSignal, beforeDispatch?:()=>void,
  ): Promise<Record<string, unknown>> {
    const lease = this.signal(upstream);
    const deadline = setTimeout(() => lease.controller.abort(), this.timeoutMs);
    try {
      const bearer = await this.bearer();
      // The deadline may have elapsed while an asynchronous owner resolver
      // was pending. Never dispatch with an already-aborted request lease.
      if(lease.controller.signal.aborted)
        throw new GatewayTransportError(this.invalidated?"STALE_BINDING":"ABORTED");
      // The owner may rebind while preflight or credential resolution is
      // awaiting. Recheck the host-owned lease synchronously at dispatch,
      // with no extra await between this guard and the outbound request.
      beforeDispatch?.();
      this.check();
      const response = await this.fetchFn(this.origin + path, {
        method, headers: { authorization: "Bearer " + bearer,
          ...(body ? { "content-type": "application/json" } : {}),
          ...(key ? { "idempotency-key": key } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: lease.controller.signal,
        redirect: "error",
      });
      const raw = await boundedJsonText(response);
      let obj: unknown;
      try {obj = JSON.parse(raw);} catch {throw new GatewayTransportError("INVALID_RESPONSE");}
      this.check();
      if (!response.ok) throw gatewayError(response.status, obj);
      return record(obj);
    } catch (error) {
      if (error instanceof GatewayTransportError) throw error;
      if (lease.controller.signal.aborted) throw new GatewayTransportError(this.invalidated ? "STALE_BINDING" : "ABORTED");
      throw new GatewayTransportError("TRANSPORT_UNAVAILABLE");
    } finally {clearTimeout(deadline);lease.finish();}
  }
  private run(x: unknown, runId?: string): GatewayRun {
    const r = record(x);
    const run = {
      ...r,
      run_id: string(r.run_id),
      session_id: string(r.session_id),
      system_id: string(r.system_id),
      workspace_id: string(r.workspace_id),
      status: string(r.status),
    } as GatewayRun;
    if (run.system_id !== this.binding.canonicalSystemId
      || run.workspace_id !== this.binding.workspaceId
      || (runId !== undefined && run.run_id !== runId)) {
      throw new GatewayTransportError("RUN_BINDING_MISMATCH");
    }
    return run;
  }
  async preflight(signal?: AbortSignal): Promise<GatewayPreflight> {
    const status = await this.request("GET", "/status", undefined, undefined, signal);
    if (status.component !== "ai-verse-gateway" || status.system_id !== this.binding.canonicalSystemId)
      throw new GatewayTransportError("SYSTEM_BINDING_MISMATCH");
    if (status.state !== "ready") throw new GatewayTransportError("GATEWAY_NOT_READY");
    const models = await this.request("GET", "/v1/models", undefined, undefined, signal);
    if (!Array.isArray(models.data) || !models.data.some((m: unknown) => {
      try { return record(m).id === "aiverse"; } catch { return false; }
    })) throw new GatewayTransportError("MODEL_UNAVAILABLE");
    return {component:"ai-verse-gateway",systemId:this.binding.canonicalSystemId,
      state:"ready",runtime:string(status.runtime),model:"aiverse",
      observedAt:typeof status.at === "string" ? status.at : new Date().toISOString()};
  }
  /** Gateway-owned read-only indices. All identities are scope-validated. */
  async listSessions(args:{limit?:number;offset?:number;signal?:AbortSignal}={}):
    Promise<{data:Array<Record<string,unknown>>;has_more:boolean;next_offset:number|null}>{
    const size=args.limit??20,offset=args.offset??0;
    if(!Number.isSafeInteger(size)||size<1||size>25
      ||!Number.isSafeInteger(offset)||offset<0||offset>10_000)
      throw new GatewayTransportError("INVALID_HISTORY_QUERY");
    const page=await this.request("GET","/v1/sessions?workspace_id="+
      encodeURIComponent(this.binding.workspaceId)+"&limit="+size+"&offset="+offset,
      undefined,undefined,args.signal);
    return this.historyPage(page,"session");
  }
  async listSessionRuns(args:{sessionId:string;limit?:number;offset?:number;signal?:AbortSignal}):
    Promise<{data:Array<Record<string,unknown>>;has_more:boolean;next_offset:number|null}>{
    const sessionId=safeId(args.sessionId);
    const size=args.limit??20,offset=args.offset??0;
    if(!Number.isSafeInteger(size)||size<1||size>25
      ||!Number.isSafeInteger(offset)||offset<0||offset>10_000)
      throw new GatewayTransportError("INVALID_HISTORY_QUERY");
    const page=await this.request("GET","/v1/sessions/"+sessionId+"/runs?workspace_id="+
      encodeURIComponent(this.binding.workspaceId)+"&limit="+size+"&offset="+offset,
      undefined,undefined,args.signal);
    return this.historyPage(page,"run",args.sessionId);
  }
  private historyPage(page:Record<string,unknown>,kind:"session"|"run",sessionId?:string){
    if(page.object!=="list"||!Array.isArray(page.data)||page.data.length>25
      ||typeof page.has_more!=="boolean"
      ||!(page.next_offset===null || (Number.isSafeInteger(page.next_offset)
        && (page.next_offset as number)>=0 && (page.next_offset as number)<=10_000)))
      throw new GatewayTransportError("INVALID_RESPONSE");
    const data=page.data.map(entry=>{
      const item=record(entry);
      const key=kind==="session"?"session_id":"run_id";
      if(typeof item[key]!=="string"||!ID.test(item[key] as string)
        ||typeof item.session_id!=="string"||!ID.test(item.session_id)
        ||(sessionId!==undefined&&item.session_id!==sessionId))
        throw new GatewayTransportError("HISTORY_BINDING_MISMATCH");
      if(kind==="session"){
        if(item.system_id!==this.binding.canonicalSystemId ||
          item.workspace_id!==this.binding.workspaceId)
          throw new GatewayTransportError("HISTORY_BINDING_MISMATCH");
        return {session_id:item.session_id,system_id:item.system_id,
          workspace_id:item.workspace_id,title:typeof item.title==="string"?item.title.slice(0,120):item.session_id,
          status:typeof item.status==="string"?item.status:"unknown",
          updated_at:typeof item.updated_at==="string"?item.updated_at:"",
          created_at:typeof item.created_at==="string"?item.created_at:"",
          active_run_id:typeof item.active_run_id==="string"?item.active_run_id:null};
      }
      if(typeof item.status!=="string"
        ||!(item.user_text===null || typeof item.user_text==="string")
        ||!(item.output===null || typeof item.output==="string")
        ||typeof item.user_text_truncated!=="boolean"
        ||typeof item.output_truncated!=="boolean")
        throw new GatewayTransportError("INVALID_RESPONSE");
      return {run_id:item.run_id,session_id:item.session_id,
        status:item.status,created_at:typeof item.created_at==="string"?item.created_at:"",
        completed_at:typeof item.completed_at==="string"?item.completed_at:null,
        user_text:typeof item.user_text==="string"?item.user_text.slice(0,4096):null,
        output:typeof item.output==="string"?item.output.slice(0,12000):null,
        user_text_truncated:item.user_text_truncated,
        output_truncated:item.output_truncated};
    });
    return {data,has_more:page.has_more,next_offset:page.next_offset as number|null};
  }
  async createRun(args: {
    messages: GatewayMessage[];
    /** Stable client-supplied ID for the *same* submission, retained on retry. */
    idempotencyKey: string;
    sessionId?: string;
    signal?: AbortSignal;
    /** Host-owned synchronous authorization lease check before outbound POST. */
    validateBeforeDispatch?:()=>void;
  }): Promise<GatewayRun> {
    if (!validMessages(args.messages)) throw new GatewayTransportError("MESSAGES_INVALID");
    safeId(args.idempotencyKey);
    if (args.sessionId !== undefined) safeId(args.sessionId);
    const metadata: Record<string, unknown> = { workspace_id: this.binding.workspaceId };
    if (args.sessionId) metadata.session_id = args.sessionId;
    return this.run(await this.request("POST","/v1/runs",{
      model:"aiverse",messages:args.messages,metadata,
    },args.idempotencyKey,args.signal,args.validateBeforeDispatch));
  }
  async getRun(runId: string, signal?: AbortSignal): Promise<GatewayRun> {
    return this.run(await this.request("GET","/v1/runs/" + safeId(runId),undefined,undefined,signal),runId);
  }
  /** Host-only canonical diagnostics; never forward this raw object to UI. */
  async getRunDiagnostics(runId:string,signal?:AbortSignal):Promise<Record<string,unknown>>{
    return this.request("GET","/v1/runs/"+safeId(runId)+"/diagnostics",
      undefined,undefined,signal);
  }
  async controlRun(args: {
    runId: string; action: GatewayControl; operationId: string;
    reason?: string; decision?: GatewayDecision; signal?: AbortSignal;
    /** Trusted-host-only short-lease recheck after the canonical owner GET. */
    validateBeforePost?: (prechecked:GatewayRun)=>void | Promise<void>;
    /** Synchronous host lease guard after resolving the bearer for the effect. */
    validateBeforeDispatch?:()=>void;
  }): Promise<GatewayRun> {
    const id = safeId(args.runId);
    safeId(args.operationId);
    if (!["cancel","pause","resume","approval"].includes(args.action)) throw new GatewayTransportError("CONTROL_INVALID");
    if (args.action === "approval" && !["approve","deny"].includes(args.decision ?? "")) throw new GatewayTransportError("APPROVAL_INVALID");
    // Non-atomic precheck. Host must gate UI controls on an admitted owner
    // lease and separately resolve the documented workspace-rebind race.
    const prechecked=await this.getRun(args.runId,args.signal);
    await args.validateBeforePost?.(prechecked);
    const body: Record<string, unknown> = { operation_id:args.operationId };
    if (args.reason) body.reason = args.reason;
    if (args.action === "approval") body.decision = args.decision;
    return this.run(await this.request("POST","/v1/runs/"+id+"/"+args.action,
      body,undefined,args.signal,args.validateBeforeDispatch),args.runId);
  }
  /**
   * Canonical run SSE, not the OpenAI chat/completions stream.
   * Reconnect is caller-owned and replays from the start; no cursor supported.
   * Caller must deduplicate/rebuild the scoped presentation projection.
   */
  async subscribeRun(runId: string, onEvent: (event: GatewayEvent) => void, signal?: AbortSignal): Promise<void> {
    await this.getRun(runId,signal);
    const lease=this.signal(signal);
    const deadline=setTimeout(()=>lease.controller.abort(),this.timeoutMs);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const bearer=await this.bearer();
      // A slow host credential resolver can outlive the SSE connection
      // deadline. Fail closed even if the injected fetch ignores an already
      // aborted signal, just like the canonical run-control transport.
      if(lease.controller.signal.aborted)
        throw new GatewayTransportError(this.invalidated?"STALE_BINDING":"ABORTED");
      this.check();
      const res=await this.fetchFn(this.origin+"/v1/runs/"+safeId(runId)+"/events",{
        method:"GET",headers:{authorization:"Bearer "+bearer,accept:"text/event-stream"},signal:lease.controller.signal,
        redirect:"error",
      });
      clearTimeout(deadline);
      if (!res.ok) throw gatewayError(res.status);
      if (!res.headers.get("content-type")?.includes("text/event-stream") || !res.body)
        throw new GatewayTransportError("EVENT_STREAM_INVALID");
      reader=res.body.getReader();
      const decoder=new TextDecoder();
      let buffer="";
      const seen=new Set<string>();
      const consume=(frame:string) => {
        const dataLines: string[]=[];
        let eventName="";
        for(const line of frame.split("\n")){
          if(line.startsWith("event:"))eventName=line.slice(6).trim();
          if(line.startsWith("data:"))dataLines.push(line.slice(5).trimStart());
        }
        if(!dataLines.length)return;
        if(eventName==="gateway.replay_overflow")throw new GatewayTransportError("EVENT_REPLAY_OVERFLOW");
        let data:Record<string,unknown>;
        try {data=record(JSON.parse(dataLines.join("\n")));} catch {throw new GatewayTransportError("EVENT_INVALID");}
        const event:GatewayEvent={
          event_id:string(data.event_id),run_id:string(data.run_id),
          type:string(data.type),at:string(data.at),data:record(data.data),
        };
        if(event.run_id!==runId || (eventName && eventName!==event.type))throw new GatewayTransportError("EVENT_BINDING_MISMATCH");
        if(seen.has(event.event_id))return;
        if(seen.size>4096)throw new GatewayTransportError("EVENT_REPLAY_TOO_LARGE");
        seen.add(event.event_id);
        this.check();onEvent(event);
      };
      while(true){
        this.check();
        const next=await reader.read();
        if(next.done)break;
        buffer=(buffer+decoder.decode(next.value,{stream:true})).replace(/\r\n/g,"\n");
        if(buffer.length>MAX_EVENT_BYTES)throw new GatewayTransportError("EVENT_TOO_LARGE");
        let at:number;
        while((at=buffer.indexOf("\n\n"))>=0) {
          const frame=buffer.slice(0,at);buffer=buffer.slice(at+2);
          consume(frame);
        }
      }
      this.check();
      if(buffer.trim())throw new GatewayTransportError("EVENT_INCOMPLETE");
    } catch(error){
      if(error instanceof GatewayTransportError)throw error;
      if(lease.controller.signal.aborted)throw new GatewayTransportError(this.invalidated?"STALE_BINDING":"ABORTED");
      throw new GatewayTransportError("EVENT_STREAM_INTERRUPTED");
    } finally {
      clearTimeout(deadline);
      if(reader) {try{await reader.cancel();}catch{}}
      lease.finish();
    }
  }
}
