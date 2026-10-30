import { dashboardWsAuthProtocol, DASHBOARD_WS_PROTOCOL } from "../../protocol/src/index.js";
import { DashboardClient, type ClientScope } from "./client.js";

/**
 * Personal chat runtime projection, not an independent conversation database.
 * All run/session identities and terminal responses come from Gateway.
 * No raw credentials, provider options, roots or fake assistant text are stored.
 */
export type ChatRunPhase =
  | "idle" | "submitting" | "running" | "interrupted" | "completed"
  | "failed" | "canceled" | "blocked" | "paused" | "recovery-required";
/** Only fields explicitly projected by the trusted canonical Gateway bridge.
 * Cost is intentionally excluded until Token verifies cost truth. */
export interface ChatRunReceipt {
  usage?:{inputTokens:number;outputTokens:number;actions:number};
  createdAt?:string;
  completedAt?:string;
  runtimeKind?:string;
}
export interface ChatRunView {
  systemId: string;
  workspaceId: string;
  phase: ChatRunPhase;
  runId?: string;
  sessionId?: string;
  output: string;
  errorCode?: string;
  canonicalStatus?: string;
  /** Canonical session is known but preceding raw turns are unavailable. */
  contextLimited?: boolean;
  receipt?: ChatRunReceipt;
}
export interface ChatRunEvent {
  systemId: string;
  workspaceId: string;
  runId: string;
  eventId: string;
  kind: string;
  text?: string;
  seq: number;
}
export interface ChatEventFeed {
  subscribe(
    scope: Required<ClientScope>,
    runId: string,
    callbacks: {
      event(event: ChatRunEvent): void;
      interrupted(code: string): void;
    },
  ): () => void;
}
export interface ChatWebSocket {
  readyState: number;
  send(message: string): void;
  close(): void;
  addEventListener(type: string, listener: (event: {data?: unknown}) => void): void;
}
export type ChatWebSocketFactory = (url: string, protocols: string[]) => ChatWebSocket;

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function requiredScope(scope: ClientScope): Required<ClientScope> {
  if (!scope.systemId || !scope.workspaceId) fail("CHAT_SCOPE_REQUIRED");
  return {systemId:scope.systemId,workspaceId:scope.workspaceId};
}
function current(scope: Required<ClientScope>, other: ClientScope): boolean {
  return scope.systemId === other.systemId && scope.workspaceId === other.workspaceId;
}
function asRun(result: unknown, expected: Required<ClientScope>, runId?: string): {
  runId: string; sessionId: string; status: string; output?: string;
  receipt:ChatRunReceipt;
} {
  if (!result || typeof result !== "object" || Array.isArray(result))
    fail("INVALID_RUN_PROJECTION");
  const value = result as Record<string,unknown>;
  if (typeof value.runId !== "string" || !SAFE_ID.test(value.runId)
    || typeof value.sessionId !== "string" || !SAFE_ID.test(value.sessionId)
    || typeof value.status !== "string" || !value.status
    || value.workspaceId !== expected.workspaceId
    || (runId !== undefined && value.runId !== runId)
    || typeof value.systemId !== "string" || !value.systemId
    || value.source !== "canonical-gateway"
    || (value.output !== undefined && typeof value.output !== "string"))
    fail("INVALID_RUN_PROJECTION");
  // Exact, bounded fields only. All raw cost is intentionally omitted because
  // the Token owner, not Gateway counters, owns verifiable billed cost truth.
  const receipt:ChatRunReceipt={};
  if(value.usage!==undefined){
    if(!value.usage||typeof value.usage!=="object"||Array.isArray(value.usage))
      fail("INVALID_RUN_RECEIPT");
    const usage=value.usage as Record<string,unknown>;
    const safe=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)
      &&v>=0&&v<=1_000_000_000_000;
    if(!safe(usage.inputTokens)||!safe(usage.outputTokens)||!safe(usage.actions)
      ||Object.keys(usage).some(k=>!["inputTokens","outputTokens","actions"].includes(k)))
      fail("INVALID_RUN_RECEIPT");
    receipt.usage={inputTokens:usage.inputTokens as number,
      outputTokens:usage.outputTokens as number,actions:usage.actions as number};
  }
  for(const key of ["createdAt","completedAt"] as const){
    const stamp=value[key];
    if(stamp===undefined)continue;
    if(typeof stamp!=="string"||stamp.length<20||stamp.length>35
      ||!/^\d{4}-\d{2}-\d{2}T/.test(stamp)
      ||!Number.isFinite(Date.parse(stamp)))fail("INVALID_RUN_RECEIPT");
    receipt[key]=stamp;
  }
  if(value.runtimeKind!==undefined){
    if(typeof value.runtimeKind!=="string"
      ||!/^[a-z][a-z0-9_-]{0,31}$/.test(value.runtimeKind))
      fail("INVALID_RUN_RECEIPT");
    receipt.runtimeKind=value.runtimeKind;
  }
  // Dashboard systemId and upstream canonical system_id are distinct. The
  // host bridge verifies the latter against its admitted private mapping.
  return {runId:value.runId,sessionId:value.sessionId,status:value.status,
    receipt,
    ...(typeof value.output==="string"?{output:value.output.slice(0,65_536)}:{})};
}
function phase(status:string):ChatRunPhase {
  switch(status){
    case "completed":return "completed";
    case "failed":return "failed";
    case "canceled":return "canceled";
    case "blocked":case "budget_limited":case "parked":return "blocked";
    case "paused":case "paused_no_progress":return "paused";
    case "paused_recovery_required":return "recovery-required";
    default:return "running";
  }
}
const TERMINAL = new Set<ChatRunPhase>(["completed","failed","canceled","blocked"]);
/** Real WebSocket event adapter, connected only to the authenticated local Dashboard host. */
export class DashboardChatEventFeed implements ChatEventFeed {
  private readonly url: string;
  constructor(base: string, private readonly authToken: string | {mode:"host-cookie"},
    private readonly socketFactory: ChatWebSocketFactory =
      (url,protocols)=>new WebSocket(url,protocols)) {
    let uri: URL;
    try{uri=new URL(base);}catch{fail("CHAT_HOST_ORIGIN_INVALID");}
    if(uri.protocol!=="http:" || !["localhost","127.0.0.1","[::1]"].includes(uri.hostname)
      || uri.username || uri.password || uri.search || uri.hash || uri.pathname!=="/")
      fail("CHAT_HOST_ORIGIN_INVALID");
    this.url=uri.origin.replace(/^http:/,"ws:");
    if(typeof authToken==="string")dashboardWsAuthProtocol(authToken);
    else if(authToken?.mode!=="host-cookie")fail("CHAT_AUTH_MODE_INVALID");
  }
  subscribe(scope: Required<ClientScope>, runId: string,
    callbacks:{event(event:ChatRunEvent):void;interrupted(code:string):void}):()=>void {
    if(!SAFE_ID.test(runId))fail("CHAT_RUN_ID_INVALID");
    const socket=this.socketFactory(this.url+"/ws?systemId="+encodeURIComponent(scope.systemId),
      typeof this.authToken==="string"
        ?[DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol(this.authToken)]
        :[DASHBOARD_WS_PROTOCOL]);
    let stopped=false, reported=false;
    const interrupted=(code:string)=>{
      if(stopped || reported)return;
      reported=true;
      callbacks.interrupted(code);
      socket.close();
    };
    socket.addEventListener("open",()=>{
      if(!stopped)socket.send(JSON.stringify({
        type:"gateway-run-subscribe",workspaceId:scope.workspaceId,runId,
      }));
    });
    socket.addEventListener("message",packet=>{
      if(stopped || reported)return;
      let value: Record<string,unknown>;
      try {
        const obj=JSON.parse(String(packet.data)) as unknown;
        if(!obj || typeof obj!=="object" || Array.isArray(obj))return;
        value=obj as Record<string,unknown>;
      }catch{interrupted("CHAT_INVALID_STREAM");return;}
      if(value.type==="res" && value.id==="gateway-run-subscribe" && value.ok===false){
        const code=(value.error as {code?:unknown}|undefined)?.code;
        interrupted(typeof code==="string"&&/^[A-Z][A-Z0-9_]{1,60}$/.test(code)
          ? code:"CHAT_SUBSCRIPTION_DENIED");
        return;
      }
      if(value.type!=="event" || value.event!=="aiverse.gateway.run.event")return;
      if(value.systemId!==scope.systemId || value.workspaceId!==scope.workspaceId){
        interrupted("CHAT_SCOPE_MISMATCH");return;
      }
      const payload=value.payload;
      if(!payload || typeof payload!=="object" || Array.isArray(payload)){
        interrupted("CHAT_INVALID_STREAM");return;
      }
      const p=payload as Record<string,unknown>;
      if(p.runId!==runId || typeof p.eventId!=="string" || !p.eventId
        || typeof p.kind!=="string" || !p.kind
        || (p.text!==undefined && typeof p.text!=="string")
        || typeof value.seq!=="number" || !Number.isSafeInteger(value.seq) || value.seq<1){
        interrupted("CHAT_INVALID_STREAM");return;
      }
      callbacks.event({systemId:scope.systemId,workspaceId:scope.workspaceId,
        runId,eventId:p.eventId,kind:p.kind,seq:value.seq,
        ...(typeof p.text==="string"?{text:p.text.slice(0,8192)}:{})});
    });
    socket.addEventListener("close",()=>interrupted("CHAT_STREAM_DISCONNECTED"));
    socket.addEventListener("error",()=>interrupted("CHAT_STREAM_INTERRUPTED"));
    return ()=>{
      stopped=true;
      try{if(socket.readyState===1)socket.send(JSON.stringify({type:"gateway-run-unsubscribe"}));}catch{}
      socket.close();
    };
  }
}

/**
 * One active canonical run per chat view. No history is fabricated on recover:
 * getRun is authoritative; event text is provisional until terminal getRun.
 * A real UI can mount multiple controllers for resizable/split chat panes.
 */
export class PersonalChatRunController {
  private epoch=0;
  private streamEpoch=0;
  /** A resumed SSE stream replays prior canceled/paused attempt deltas. */
  /** Number of canonical run.resumed events required before accepting
   * new partial output; old SSE replay can contain several prior cycles. */
  private resumeMarkersRequired=0;
  private awaitingResumeMarker=false;
  private historicalOlder?:{sessionId:string;offset:number;total:number;seen:Set<string>};
  private unsubscribe?:()=>void;
  private seen=new Set<string>();
  private lastSeq=0;
  private activeRequest?:{
    text:string;key:string;sessionId?:string;
    messages:Array<{role:"user"|"assistant";content:string}>;
  };
  /** Confirmed only by canonical run.get, never by streamed deltas or a UI mock. */
  private confirmedTurns:Array<{role:"user"|"assistant";content:string}>=[];
  private contextLimited=false;
  private confirmedRunId?:string;
  private view: ChatRunView;
  constructor(private readonly client:DashboardClient,
    private readonly feed:ChatEventFeed,
    private readonly changed:(snapshot:ChatRunView)=>void=()=>{}) {
    const scope=requiredScope(client.getScope());
    this.view={...scope,phase:"idle",output:""};
  }
  snapshot():ChatRunView{return {...this.view};}
  private show(patch:Partial<ChatRunView>):void{
    this.view={...this.view,...patch};
    this.changed(this.snapshot());
  }
  private reset(scope:Required<ClientScope>):number{
    this.epoch++;
    this.streamEpoch++;
    this.unsubscribe?.();this.unsubscribe=undefined;
    this.seen.clear();this.lastSeq=0;this.activeRequest=undefined;
    this.resumeMarkersRequired=0;this.awaitingResumeMarker=false;
    this.historicalOlder=undefined;
    this.confirmedTurns=[];this.contextLimited=false;this.confirmedRunId=undefined;
    this.view={...scope,phase:"idle",output:""};
    this.changed(this.snapshot());
    return this.epoch;
  }
  retarget(scope:ClientScope):void {
    const selected=requiredScope(scope);
    this.client.retarget(selected);
    this.reset(selected);
  }
  close():void {
    this.epoch++;
    this.unsubscribe?.();this.unsubscribe=undefined;
    this.seen.clear();this.activeRequest=undefined;
    this.resumeMarkersRequired=0;this.awaitingResumeMarker=false;
    this.historicalOlder=undefined;
    this.confirmedTurns=[];this.contextLimited=false;this.confirmedRunId=undefined;
    this.show({phase:"idle",runId:undefined,sessionId:undefined,
      output:"",errorCode:undefined,contextLimited:false});
  }
  private valid(epoch:number,scope:Required<ClientScope>,selection:number):boolean{
    return epoch===this.epoch && current(scope,this.client.getScope())
      && this.client.selectionVersion()===selection;
  }
  /**
   * Context is bounded, ordered and drawn only from canonical completed replies.
   * Never trim a single turn midway; drop the oldest complete pair if needed.
   * No unverified stream text or model-created history is admitted.
   */
  private boundedHistory():Array<{role:"user"|"assistant";content:string}>{
    const pairs:Array<Array<{role:"user"|"assistant";content:string}>>=[];
    for(let i=0;i+1<this.confirmedTurns.length;i+=2){
      const pair=this.confirmedTurns.slice(i,i+2);
      if(pair[0]?.role==="user"&&pair[1]?.role==="assistant")pairs.push(pair);
    }
    const kept:Array<Array<{role:"user"|"assistant";content:string}>>=[];
    let size=0;
    for(let i=pairs.length-1;i>=0 && kept.length<6;i--){
      const pair=pairs[i],bytes=pair.reduce((sum,x)=>sum+new TextEncoder().encode(x.content).byteLength,0);
      if(bytes>18_000 || size+bytes>18_000)break;
      kept.unshift(pair);size+=bytes;
    }
    return kept.flat().map(x=>({...x}));
  }
  private confirmCanonicalOutput(run:{runId:string;status:string;output?:string}):void{
    if(run.status!=="completed"||run.output===undefined||!this.activeRequest
      ||this.confirmedRunId===run.runId)return;
    // Future messages use only the canonical GET result, never speculative SSE.
    this.confirmedRunId=run.runId;
    const before=this.confirmedTurns.length;
    this.confirmedTurns.push({role:"user",content:this.activeRequest.text},
      {role:"assistant",content:run.output});
    this.confirmedTurns=this.boundedHistory();
    if(this.confirmedTurns.length<before+2)this.contextLimited=true;
  }
  /** New message continues only an authenticated, completed canonical session. */
  async send(text:string,idempotencyKey:string,sessionId?:string):Promise<ChatRunView> {
    if(!text.trim() || text.length>32_768)fail("CHAT_MESSAGE_INVALID");
    if(!SAFE_ID.test(idempotencyKey) || (sessionId && !SAFE_ID.test(sessionId)))
      fail("CHAT_REQUEST_ID_INVALID");
    if(this.view.phase!=="idle" && this.view.phase!=="completed"
      && this.view.phase!=="canceled")
      fail("CHAT_PREVIOUS_RUN_UNRESOLVED");
    const scope=requiredScope(this.client.getScope());
    const confirmed=this.boundedHistory();
    const previousConfirmedRun=this.confirmedRunId;
    // A canceled generation is not a confirmed assistant turn. Reuse the
    // canonical session, but explicitly mark omitted unfinished context.
    const wasCanceled=this.view.phase==="canceled";
    const selectedSession=sessionId ?? ((this.view.phase==="completed"||wasCanceled)
      ?this.view.sessionId:undefined);
    const limited=this.contextLimited || wasCanceled
      || Boolean(sessionId && confirmed.length===0);
    const messages=[...confirmed,{role:"user" as const,content:text}];
    const epoch=this.reset(scope),selection=this.client.selectionVersion();
    this.confirmedTurns=confirmed;
    this.confirmedRunId=previousConfirmedRun;
    this.contextLimited=limited;
    this.activeRequest={text,key:idempotencyKey,messages,
      ...(selectedSession?{sessionId:selectedSession}:{})};
    this.show({phase:"submitting",contextLimited:limited});
    return this.submit(epoch,scope,selection);
  }
  /** Retry an uncertain submission with the SAME canonical idempotency key. */
  async retrySubmission():Promise<ChatRunView> {
    const request=this.activeRequest;
    if(this.view.phase!=="interrupted" || !request || this.view.runId)
      fail("CHAT_NOT_RETRYABLE");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.epoch,selection=this.client.selectionVersion();
    this.show({phase:"submitting",errorCode:undefined});
    return this.submit(epoch,scope,selection);
  }
  private async submit(epoch:number,scope:Required<ClientScope>,selection:number):Promise<ChatRunView> {
    const request=this.activeRequest;
    if(!request)fail("CHAT_REQUEST_MISSING");
    try{
      const response=await this.client.createGatewayRun({
        messages:request.messages,idempotencyKey:request.key,
        ...(request.sessionId?{sessionId:request.sessionId}:{}),
      });
      if(!this.valid(epoch,scope,selection))return this.snapshot();
      const run=asRun(response.result,scope);
      if(request.sessionId && run.sessionId!==request.sessionId)
        fail("CHAT_SESSION_BINDING_MISMATCH");
      this.show({runId:run.runId,sessionId:run.sessionId,receipt:run.receipt,
        phase:run.status==="completed"?"running":phase(run.status),
        canonicalStatus:run.status,output:run.status==="completed"?"":run.output??""});
      if(run.status==="completed")await this.reconcile(epoch,scope,selection,run.runId);
      else if(!TERMINAL.has(this.view.phase))this.subscribe(epoch,scope,selection,run.runId);
    }catch(error){
      if(this.valid(epoch,scope,selection))
        this.show({phase:"interrupted",errorCode:
          typeof (error as {code?:unknown})?.code==="string"
            ? (error as {code:string}).code:"CHAT_SUBMISSION_UNCERTAIN"});
    }
    return this.snapshot();
  }
  /**
   * A dropped event stream has a known canonical run ID. Reconnect only to that
   * run after an authenticated GET; never create a new run or idempotency key.
   * SSE replays from the beginning, so speculative deltas are discarded first.
   */
  async reconnect():Promise<ChatRunView> {
    const runId=this.view.runId;
    if(this.view.phase!=="interrupted" || !runId || !SAFE_ID.test(runId))
      fail("CHAT_RECONNECT_UNAVAILABLE");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.epoch,selection=this.client.selectionVersion();
    this.streamEpoch++;
    this.unsubscribe?.();this.unsubscribe=undefined;
    this.show({phase:"submitting",output:"",errorCode:undefined});
    try{
      const response=await this.client.getGatewayRun(runId);
      if(!this.valid(epoch,scope,selection)||this.view.runId!==runId)return this.snapshot();
      const run=asRun(response.result,scope,runId);
      if(this.activeRequest?.sessionId && run.sessionId!==this.activeRequest.sessionId)
        fail("CHAT_SESSION_BINDING_MISMATCH");
      this.confirmCanonicalOutput(run);
      const nextPhase=phase(run.status);
      this.show({phase:nextPhase,canonicalStatus:run.status,sessionId:run.sessionId,
        receipt:run.receipt,
        output:nextPhase==="completed"?run.output??"":"",
        errorCode:undefined,contextLimited:this.contextLimited});
      if(nextPhase==="running" || nextPhase==="submitting" || nextPhase==="interrupted")
        this.subscribe(epoch,scope,selection,runId);
    }catch(error){
      if(this.valid(epoch,scope,selection) && this.view.runId===runId)
        this.show({phase:"interrupted",errorCode:
          typeof (error as {code?:unknown})?.code==="string"
            ?(error as {code:string}).code:"CHAT_RECONNECT_FAILED"});
    }
    return this.snapshot();
  }
  /**
   * User-requested Stop is an actual canonical cancellation, never merely
   * closing a socket. Unknown network outcomes must be reconciled by run GET.
   * The host must independently opt in to this control; no browser grant.
   */
  async stop(operationId:string):Promise<ChatRunView>{
    if(!SAFE_ID.test(operationId))fail("CHAT_CONTROL_ID_INVALID");
    if(!["running","paused","recovery-required"].includes(this.view.phase)
      ||!this.view.runId || !this.view.sessionId)
      fail("CHAT_STOP_UNAVAILABLE");
    const scope=requiredScope(this.client.getScope());
    const runId=this.view.runId,sessionId=this.view.sessionId;
    const epoch=++this.epoch,selection=this.client.selectionVersion();
    this.streamEpoch++;
    this.unsubscribe?.();this.unsubscribe=undefined;
    this.show({phase:"submitting",output:"",errorCode:undefined});
    try{
      const response=await this.client.cancelGatewayRun(runId,sessionId,operationId);
      if(!this.valid(epoch,scope,selection)||this.view.runId!==runId)return this.snapshot();
      const run=asRun(response.result,scope,runId);
      if(run.sessionId!==sessionId)fail("CHAT_SESSION_BINDING_MISMATCH");
      this.confirmCanonicalOutput(run);
      const next=phase(run.status);
      this.show({phase:next,canonicalStatus:run.status,sessionId:run.sessionId,
        receipt:run.receipt,
        output:next==="completed"?run.output??"":"",
        errorCode:undefined,contextLimited:this.contextLimited});
      if(next==="running")this.subscribe(epoch,scope,selection,runId);
    }catch(error){
      // Stop can race with a run completing naturally. The canonical owner
      // then rejects cancel as terminal. Reconcile the existing run instead
      // of misleading the user that their completed answer is lost.
      if((error as {code?:unknown})?.code==="RUN_NOT_CANCELABLE"){
        try{
          const response=await this.client.getGatewayRun(runId);
          if(!this.valid(epoch,scope,selection)||this.view.runId!==runId)return this.snapshot();
          const run=asRun(response.result,scope,runId);
          if(run.sessionId!==sessionId)fail("CHAT_SESSION_BINDING_MISMATCH");
          this.confirmCanonicalOutput(run);
          const state=phase(run.status);
          this.show({phase:state,canonicalStatus:run.status,receipt:run.receipt,
            output:state==="completed"?run.output??"":"",
            errorCode:undefined,contextLimited:this.contextLimited});
          if(state==="running")this.subscribe(epoch,scope,selection,runId);
          return this.snapshot();
        }catch{ /* leave the known run unresolved for explicit GET reconnect */ }
      }
      if(this.valid(epoch,scope,selection)&&this.view.runId===runId)
        this.show({phase:"interrupted",errorCode:
          typeof (error as {code?:unknown})?.code==="string"
            ?(error as {code:string}).code:"CHAT_STOP_UNCERTAIN"});
    }
    return this.snapshot();
  }

  /** Read the current canonical status without modifying the run or
   * duplicating inference. Also reconciles controls issued by another client.
   */
  async refreshStatus():Promise<ChatRunView>{
    const runId=this.view.runId,sessionId=this.view.sessionId;
    if(!runId||!sessionId||!SAFE_ID.test(runId))fail("CHAT_REFRESH_UNAVAILABLE");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.epoch,selection=this.client.selectionVersion();
    try{
      const response=await this.client.getGatewayRun(runId);
      if(!this.valid(epoch,scope,selection)||this.view.runId!==runId)return this.snapshot();
      const run=asRun(response.result,scope,runId);
      if(run.sessionId!==sessionId)fail("CHAT_SESSION_BINDING_MISMATCH");
      const state=phase(run.status);
      // A delayed GET must not downgrade a locally verified terminal result.
      if(TERMINAL.has(this.view.phase)&&!TERMINAL.has(state))return this.snapshot();
      this.confirmCanonicalOutput(run);
      if(state==="running"&&this.view.phase==="running"){
        this.show({canonicalStatus:run.status,receipt:run.receipt,errorCode:undefined});
        return this.snapshot(); // Keep the existing live subscription and deltas.
      }
      this.streamEpoch++;
      this.unsubscribe?.();this.unsubscribe=undefined;
      if(state==="running"){
        // Remote resume may have an unknown number of earlier resume events.
        // Wait for the canonical final reply rather than project old deltas.
        this.resumeMarkersRequired=Number.MAX_SAFE_INTEGER;
      }
      this.show({phase:state,canonicalStatus:run.status,
        sessionId:run.sessionId,receipt:run.receipt,
        output:state==="completed"?run.output??"":"",
        errorCode:undefined,contextLimited:this.contextLimited});
      if(state==="running")this.subscribe(epoch,scope,selection,runId);
    }catch(error){
      if(this.valid(epoch,scope,selection)&&this.view.runId===runId)
        this.show({errorCode:typeof (error as {code?:unknown})?.code==="string"
          ?(error as {code:string}).code:"CHAT_REFRESH_FAILED"});
    }
    return this.snapshot();
  }

  /** Pause or resume the *same* owner-authorized canonical run.
   * A paused run is not a canceled run; no new run.create can replace it.
   * Every control response remains tied to this scope and OS selection epoch.
   */
  async checkpoint(action:"pause"|"resume",operationId:string):Promise<ChatRunView>{
    if(!SAFE_ID.test(operationId))fail("CHAT_CONTROL_ID_INVALID");
    const canPause=action==="pause"&&this.view.phase==="running";
    const canResume=action==="resume"
      &&(this.view.phase==="paused"||this.view.phase==="recovery-required");
    if(!(canPause||canResume)||!this.view.runId||!this.view.sessionId)
      fail(action==="pause"?"CHAT_PAUSE_UNAVAILABLE":"CHAT_RESUME_UNAVAILABLE");
    const scope=requiredScope(this.client.getScope());
    const runId=this.view.runId,sessionId=this.view.sessionId;
    const epoch=++this.epoch,selection=this.client.selectionVersion();
    this.streamEpoch++;
    this.unsubscribe?.();this.unsubscribe=undefined;
    this.show({phase:"submitting",output:"",errorCode:undefined});
    try{
      const response=action==="pause"
        ?await this.client.pauseGatewayRun(runId,sessionId,operationId)
        :await this.client.resumeGatewayRun(runId,sessionId,operationId);
      if(!this.valid(epoch,scope,selection)||this.view.runId!==runId)return this.snapshot();
      const run=asRun(response.result,scope,runId);
      if(run.sessionId!==sessionId)fail("CHAT_SESSION_BINDING_MISMATCH");
      this.confirmCanonicalOutput(run);
      const state=phase(run.status);
      if(action==="resume"&&state==="running")this.resumeMarkersRequired++;
      this.show({phase:state,canonicalStatus:run.status,sessionId:run.sessionId,
        receipt:run.receipt,output:state==="completed"?run.output??"":"",
        errorCode:undefined,contextLimited:this.contextLimited});
      if(state==="running")this.subscribe(epoch,scope,selection,runId);
    }catch(error){
      // A pause may race with a terminal run, or resume with another owner
      // control. Reconcile without ever reissuing the mutating operation.
      const code=(error as {code?:unknown})?.code;
      if(code==="RUN_NOT_PAUSABLE"||code==="RUN_NOT_RESUMABLE"){
        try{
          const response=await this.client.getGatewayRun(runId);
          if(!this.valid(epoch,scope,selection)||this.view.runId!==runId)return this.snapshot();
          const run=asRun(response.result,scope,runId);
          if(run.sessionId!==sessionId)fail("CHAT_SESSION_BINDING_MISMATCH");
          this.confirmCanonicalOutput(run);
          const state=phase(run.status);
          this.show({phase:state,canonicalStatus:run.status,receipt:run.receipt,
            output:state==="completed"?run.output??"":"",
            errorCode:undefined,contextLimited:this.contextLimited});
          if(state==="running")this.subscribe(epoch,scope,selection,runId);
          return this.snapshot();
        }catch{ /* preserve the known run for explicit GET-only recovery */ }
      }
      if(this.valid(epoch,scope,selection)&&this.view.runId===runId)
        this.show({phase:"interrupted",errorCode:
          typeof code==="string"?code:"CHAT_CONTROL_UNCERTAIN"});
    }
    return this.snapshot();
  }

  private subscribe(epoch:number,scope:Required<ClientScope>,selection:number,runId:string):void {
    this.unsubscribe?.();
    this.seen.clear();this.lastSeq=0;
    this.awaitingResumeMarker=this.resumeMarkersRequired>0;
    let resumeMarkersSeen=0;
    const streamEpoch=++this.streamEpoch;
    this.unsubscribe=this.feed.subscribe(scope,runId,{
      event:event=>{
        if(streamEpoch!==this.streamEpoch || !this.valid(epoch,scope,selection)
          || this.view.runId!==runId || TERMINAL.has(this.view.phase))return;
        if(event.systemId!==scope.systemId || event.workspaceId!==scope.workspaceId
          || event.runId!==runId || event.seq<=this.lastSeq
          || this.seen.has(event.eventId))return;
        this.lastSeq=event.seq;
        if(event.kind==="run.resumed"){
          resumeMarkersSeen++;
          if(resumeMarkersSeen>=this.resumeMarkersRequired)
            this.awaitingResumeMarker=false;
        }
        if(this.seen.size>=512){this.seen.clear();}
        this.seen.add(event.eventId);
        if(event.kind==="assistant.delta" && typeof event.text==="string"
          &&!this.awaitingResumeMarker){
          this.show({output:(this.view.output+event.text).slice(0,65_536)});
        }
        if(event.kind==="run.completed" || event.kind==="run.failed"
          || event.kind==="run.canceled" || event.kind==="run.blocked"
          || event.kind==="run.budget_limited" || event.kind==="run.parked"){
          // A terminal SSE event is a notification, not canonical output.
          // Reconcile through authenticated, scoped GET before claiming success.
          void this.reconcile(epoch,scope,selection,runId);
        }
      },
      interrupted:code=>{
        if(streamEpoch===this.streamEpoch && this.valid(epoch,scope,selection)
          && this.view.runId===runId && !TERMINAL.has(this.view.phase)){
          this.streamEpoch++;
          const dispose=this.unsubscribe;
          this.unsubscribe=undefined;
          dispose?.();
          this.show({phase:"interrupted",errorCode:code});
        }
      },
    });
  }
  private async reconcile(epoch:number,scope:Required<ClientScope>,
    selection:number,runId:string):Promise<void> {
    this.streamEpoch++;
    this.unsubscribe?.();this.unsubscribe=undefined;
    try{
      const response=await this.client.getGatewayRun(runId);
      if(!this.valid(epoch,scope,selection) || this.view.runId!==runId)return;
      const run=asRun(response.result,scope,runId);
      this.confirmCanonicalOutput(run);
      this.show({phase:phase(run.status),canonicalStatus:run.status,
        receipt:run.receipt,sessionId:run.sessionId,
        ...(run.output!==undefined?{output:run.output}:{}),
        errorCode:undefined,contextLimited:this.contextLimited});
    }catch(error){
      if(this.valid(epoch,scope,selection) && this.view.runId===runId)
        this.show({phase:"interrupted",
          errorCode:typeof (error as {code?:unknown})?.code==="string"
            ? (error as {code:string}).code:"CHAT_RECONCILE_FAILED"});
    }
  }
  /**
   * Hydrates only authenticated canonical Gateway history. A fresh browser
   * cannot synthesize missing turns or load another scope's sessions.
   * At most 50 recent runs are read; older turns are explicitly limited.
   */
  async openSession(sessionId:string):Promise<{
    view:ChatRunView;
    turns:Array<{role:"user"|"assistant";content:string}>;
    hasOlder:boolean;
  }>{
    if(!SAFE_ID.test(sessionId))fail("CHAT_SESSION_ID_INVALID");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.reset(scope),selection=this.client.selectionVersion();
    this.show({phase:"submitting"});
    const all:Array<Record<string,unknown>>=[];
    let offset=0,more=false;
    try{
      for(let page=0;page<2;page++){
        const response=await this.client.listGatewaySessionRuns(sessionId,25,offset);
        if(!this.valid(epoch,scope,selection))return {view:this.snapshot(),turns:[],hasOlder:false};
        const data=response.result as Record<string,unknown>;
        if(!data||data.source!=="canonical-gateway"
          ||data.workspaceId!==scope.workspaceId || data.sessionId!==sessionId
          ||!Array.isArray(data.data) || data.data.length>25
          ||typeof data.has_more!=="boolean"
          ||!(data.next_offset===null||(Number.isSafeInteger(data.next_offset)
            && (data.next_offset as number)>=0)))
          fail("CHAT_HISTORY_INVALID");
        for(const entry of data.data){
          if(!entry||typeof entry!=="object"||Array.isArray(entry))
            fail("CHAT_HISTORY_INVALID");
          const row=entry as Record<string,unknown>;
          if(row.session_id!==sessionId
            ||typeof row.run_id!=="string"||!SAFE_ID.test(row.run_id)
            ||typeof row.status!=="string"
            ||!(row.user_text===null||typeof row.user_text==="string")
            ||!(row.output===null||typeof row.output==="string")
            ||typeof row.user_text_truncated!=="boolean"
            ||typeof row.output_truncated!=="boolean")fail("CHAT_HISTORY_INVALID");
          all.push(row);
        }
        more=data.has_more;
        if(!more)break;
        if(typeof data.next_offset!=="number"||data.next_offset<=offset)
          fail("CHAT_HISTORY_INVALID");
        offset=data.next_offset;
      }
      if(!this.valid(epoch,scope,selection))return {view:this.snapshot(),turns:[],hasOlder:false};
      const ordered=all.reverse();
      const turns:Array<{role:"user"|"assistant";content:string}>=[];
      let limited=more;
      const completed:Array<{role:"user"|"assistant";content:string}>=[];
      for(const row of ordered){
        if(row.user_text_truncated || row.output_truncated)limited=true;
        if(typeof row.user_text==="string"&&row.user_text.length)
          turns.push({role:"user",content:row.user_text});
        else limited=true;
        if(row.status==="completed"&&typeof row.output==="string"){
          turns.push({role:"assistant",content:row.output});
          if(typeof row.user_text==="string"&&row.user_text.length
            && !row.user_text_truncated&&!row.output_truncated)
            completed.push({role:"user",content:row.user_text},
              {role:"assistant",content:row.output});
          else limited=true;
        }else limited=true;
      }
      // 'all' was reversed in-place above; its final entry is newest.
      const newest=ordered.at(-1);
      const canContinue=newest?.status==="completed"
        && typeof newest.output==="string";
      const history=completed.slice(-12);
      this.confirmedTurns=history;
      if(completed.length>12)limited=true;
      const seen=new Set(all.map(row=>String(row.run_id)));
      if(seen.size!==all.length)fail("CHAT_HISTORY_DUPLICATE_RUN");
      this.historicalOlder=more?{sessionId,offset,total:all.length,seen}:undefined;
      this.contextLimited=limited;
      this.confirmedRunId=canContinue?String(newest.run_id):undefined;
      this.show({phase:!newest?"idle":canContinue?"completed":"recovery-required",
        sessionId,runId:typeof newest?.run_id==="string"?newest.run_id:undefined,
        output:canContinue?newest.output as string:"",
        canonicalStatus:typeof newest?.status==="string"?newest.status:undefined,
        errorCode:undefined,contextLimited:limited});
      return {view:this.snapshot(),turns,hasOlder:Boolean(this.historicalOlder)};
    }catch(error){
      if(this.valid(epoch,scope,selection)){
        this.show({phase:"interrupted",errorCode:
          typeof (error as {code?:unknown})?.code==="string"
            ?(error as {code:string}).code:"CHAT_HISTORY_UNAVAILABLE"});
      }
      return {view:this.snapshot(),turns:[],hasOlder:false};
    }
  }
  /** Older pages are display-only. They do not silently expand the model's
   * confirmed context. The canonical Gateway remains the sole history owner.
   * Up to 200 runs may be viewed per open session; no browser persistence.
   */
  async loadOlderSessionRuns():Promise<{
    turns:Array<{role:"user"|"assistant";content:string}>;hasOlder:boolean;
    limitedByView:boolean;
  }>{
    const cursor=this.historicalOlder;
    if(!cursor || !this.view.sessionId || cursor.sessionId!==this.view.sessionId)
      fail("CHAT_OLDER_HISTORY_UNAVAILABLE");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.epoch,selection=this.client.selectionVersion();
    const response=await this.client.listGatewaySessionRuns(cursor.sessionId,25,cursor.offset);
    if(!this.valid(epoch,scope,selection)||this.historicalOlder!==cursor)
      return {turns:[],hasOlder:false,limitedByView:false};
    const page=response.result as Record<string,unknown>;
    if(!page||page.source!=="canonical-gateway"||page.workspaceId!==scope.workspaceId
      ||page.sessionId!==cursor.sessionId||!Array.isArray(page.data)
      ||page.data.length>25||typeof page.has_more!=="boolean"
      ||(page.has_more&&page.data.length===0)
      ||(page.has_more
        ?!Number.isSafeInteger(page.next_offset)||(page.next_offset as number)<=cursor.offset
          ||(page.next_offset as number)>10_000
        :page.next_offset!==null))fail("CHAT_HISTORY_INVALID");
    const incoming=new Set<string>();
    const rows:Array<Record<string,unknown>>=[];
    for(const value of page.data){
      if(!value||typeof value!=="object"||Array.isArray(value))fail("CHAT_HISTORY_INVALID");
      const row=value as Record<string,unknown>;
      if(typeof row.run_id!=="string"||!SAFE_ID.test(row.run_id)
        ||row.session_id!==cursor.sessionId
        ||typeof row.status!=="string"
        ||!(row.user_text===null||typeof row.user_text==="string")
        ||!(row.output===null||typeof row.output==="string")
        ||typeof row.user_text_truncated!=="boolean"
        ||typeof row.output_truncated!=="boolean"
        ||cursor.seen.has(row.run_id)||incoming.has(row.run_id))
        fail("CHAT_HISTORY_INVALID");
      incoming.add(row.run_id);rows.push(row);
    }
    const turns:Array<{role:"user"|"assistant";content:string}>=[];
    for(const row of rows.reverse()){
      if(typeof row.user_text==="string"&&row.user_text.length)
        turns.push({role:"user",content:row.user_text});
      if(row.status==="completed"&&typeof row.output==="string")
        turns.push({role:"assistant",content:row.output});
    }
    for(const value of incoming)cursor.seen.add(value);
    cursor.total+=rows.length;
    const hasOlder=page.has_more&&cursor.total<200;
    this.historicalOlder=hasOlder?{...cursor,
      offset:page.next_offset as number}:undefined;
    return {turns,hasOlder,limitedByView:page.has_more&&!hasOlder};
  }
  /** Recovery is by explicit canonical run ID, not a manufactured session list. */
  async recover(runId:string):Promise<ChatRunView>{
    if(!SAFE_ID.test(runId))fail("CHAT_RUN_ID_INVALID");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.reset(scope),selection=this.client.selectionVersion();
    this.show({phase:"submitting"});
    try{
      const response=await this.client.getGatewayRun(runId);
      if(!this.valid(epoch,scope,selection))return this.snapshot();
      const run=asRun(response.result,scope,runId);
      this.contextLimited=true;
      // Recovered resuming runs may have unknown prior pause/resume cycles:
      // show canonical final GET, never project unverified replay as fresh.
      this.resumeMarkersRequired=run.status==="resuming"?Number.MAX_SAFE_INTEGER:0;
      this.show({runId:run.runId,sessionId:run.sessionId,receipt:run.receipt,
        phase:phase(run.status),canonicalStatus:run.status,
        output:run.output??"",contextLimited:true});
      if(!TERMINAL.has(this.view.phase) && this.view.phase!=="recovery-required"
        && this.view.phase!=="paused")this.subscribe(epoch,scope,selection,runId);
    }catch(error){
      if(this.valid(epoch,scope,selection))
        this.show({phase:"interrupted",
          errorCode:typeof (error as {code?:unknown})?.code==="string"
            ? (error as {code:string}).code:"CHAT_RECOVERY_FAILED"});
    }
    return this.snapshot();
  }
}
