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
export interface ChatRunView {
  systemId: string;
  workspaceId: string;
  phase: ChatRunPhase;
  runId?: string;
  sessionId?: string;
  output: string;
  errorCode?: string;
  canonicalStatus?: string;
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
  // Dashboard systemId and upstream canonical system_id are distinct. The
  // host bridge verifies the latter against its admitted private mapping.
  return {runId:value.runId,sessionId:value.sessionId,status:value.status,
    ...(typeof value.output==="string"?{output:value.output.slice(0,65_536)}:{})};
}
function phase(status:string):ChatRunPhase {
  switch(status){
    case "completed":return "completed";
    case "failed":return "failed";
    case "canceled":return "canceled";
    case "blocked":case "budget_limited":case "parked":return "blocked";
    case "paused":return "paused";
    case "paused_recovery_required":return "recovery-required";
    default:return "running";
  }
}
const TERMINAL = new Set<ChatRunPhase>(["completed","failed","canceled","blocked"]);
/** Real WebSocket event adapter, connected only to the authenticated local Dashboard host. */
export class DashboardChatEventFeed implements ChatEventFeed {
  private readonly url: string;
  constructor(base: string, private readonly authToken: string,
    private readonly socketFactory: ChatWebSocketFactory =
      (url,protocols)=>new WebSocket(url,protocols)) {
    let uri: URL;
    try{uri=new URL(base);}catch{fail("CHAT_HOST_ORIGIN_INVALID");}
    if(uri.protocol!=="http:" || !["localhost","127.0.0.1","[::1]"].includes(uri.hostname)
      || uri.username || uri.password || uri.search || uri.hash || uri.pathname!=="/")
      fail("CHAT_HOST_ORIGIN_INVALID");
    this.url=uri.origin.replace(/^http:/,"ws:");
    dashboardWsAuthProtocol(authToken); // enforce host-session format before connecting
  }
  subscribe(scope: Required<ClientScope>, runId: string,
    callbacks:{event(event:ChatRunEvent):void;interrupted(code:string):void}):()=>void {
    if(!SAFE_ID.test(runId))fail("CHAT_RUN_ID_INVALID");
    const socket=this.socketFactory(this.url+"/ws?systemId="+encodeURIComponent(scope.systemId),
      [DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol(this.authToken)]);
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
  private unsubscribe?:()=>void;
  private seen=new Set<string>();
  private lastSeq=0;
  private activeRequest?:{text:string;key:string;sessionId?:string};
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
    this.unsubscribe?.();this.unsubscribe=undefined;
    this.seen.clear();this.lastSeq=0;this.activeRequest=undefined;
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
    this.show({phase:"idle",runId:undefined,sessionId:undefined,output:"",errorCode:undefined});
  }
  private valid(epoch:number,scope:Required<ClientScope>,selection:number):boolean{
    return epoch===this.epoch && current(scope,this.client.getScope())
      && this.client.selectionVersion()===selection;
  }
  /** Stable idempotency key supplied by caller; never regenerated on network retry. */
  async send(text:string,idempotencyKey:string,sessionId?:string):Promise<ChatRunView> {
    if(!text.trim() || text.length>32_768)fail("CHAT_MESSAGE_INVALID");
    if(!SAFE_ID.test(idempotencyKey) || (sessionId && !SAFE_ID.test(sessionId)))
      fail("CHAT_REQUEST_ID_INVALID");
    if(["submitting","running"].includes(this.view.phase))fail("CHAT_RUN_ALREADY_ACTIVE");
    const scope=requiredScope(this.client.getScope());
    const epoch=this.reset(scope),selection=this.client.selectionVersion();
    this.activeRequest={text,key:idempotencyKey,...(sessionId?{sessionId}:{})};
    this.show({phase:"submitting"});
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
        messages:[{role:"user",content:request.text}],idempotencyKey:request.key,
        ...(request.sessionId?{sessionId:request.sessionId}:{}),
      });
      if(!this.valid(epoch,scope,selection))return this.snapshot();
      const run=asRun(response.result,scope);
      this.show({runId:run.runId,sessionId:run.sessionId,
        phase:phase(run.status),canonicalStatus:run.status,output:run.output??""});
      if(!TERMINAL.has(this.view.phase))this.subscribe(epoch,scope,selection,run.runId);
    }catch(error){
      if(this.valid(epoch,scope,selection))
        this.show({phase:"interrupted",errorCode:
          typeof (error as {code?:unknown})?.code==="string"
            ? (error as {code:string}).code:"CHAT_SUBMISSION_UNCERTAIN"});
    }
    return this.snapshot();
  }
  private subscribe(epoch:number,scope:Required<ClientScope>,selection:number,runId:string):void {
    this.unsubscribe?.();
    this.seen.clear();this.lastSeq=0;
    this.unsubscribe=this.feed.subscribe(scope,runId,{
      event:event=>{
        if(!this.valid(epoch,scope,selection) || this.view.runId!==runId)return;
        if(event.systemId!==scope.systemId || event.workspaceId!==scope.workspaceId
          || event.runId!==runId || event.seq<=this.lastSeq
          || this.seen.has(event.eventId))return;
        this.lastSeq=event.seq;
        if(this.seen.size>=512){this.seen.clear();}
        this.seen.add(event.eventId);
        if(event.kind==="assistant.delta" && typeof event.text==="string"){
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
        if(this.valid(epoch,scope,selection) && this.view.runId===runId
          && !TERMINAL.has(this.view.phase)){
          this.unsubscribe=undefined;
          this.show({phase:"interrupted",errorCode:code});
        }
      },
    });
  }
  private async reconcile(epoch:number,scope:Required<ClientScope>,
    selection:number,runId:string):Promise<void> {
    this.unsubscribe?.();this.unsubscribe=undefined;
    try{
      const response=await this.client.getGatewayRun(runId);
      if(!this.valid(epoch,scope,selection) || this.view.runId!==runId)return;
      const run=asRun(response.result,scope,runId);
      this.show({phase:phase(run.status),canonicalStatus:run.status,
        sessionId:run.sessionId,
        ...(run.output!==undefined?{output:run.output}:{}),errorCode:undefined});
    }catch(error){
      if(this.valid(epoch,scope,selection) && this.view.runId===runId)
        this.show({phase:"interrupted",
          errorCode:typeof (error as {code?:unknown})?.code==="string"
            ? (error as {code:string}).code:"CHAT_RECONCILE_FAILED"});
    }
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
      this.show({runId:run.runId,sessionId:run.sessionId,
        phase:phase(run.status),canonicalStatus:run.status,output:run.output??""});
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
