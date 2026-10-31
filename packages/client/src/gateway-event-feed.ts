import {dashboardWsAuthProtocol,DASHBOARD_WS_PROTOCOL} from "../../protocol/src/index.js";
import type {ClientScope} from "./client.js";

/** Typed browser projection of host-only Gateway run events. Native Gateway
 * bearer, root and authority must never be exposed through this adapter. */
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


function fail(code:string):never {
  throw Object.assign(new Error(code),{code});
}
const SAFE_ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

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
    if(!/^[a-z0-9][a-z0-9-]{0,63}$/.test(scope.systemId)
      ||!/^(operator|[a-z0-9][a-z0-9-]{0,127})$/.test(scope.workspaceId))
      fail("CHAT_SCOPE_REQUIRED");
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
        const raw=String(packet.data);
        if(raw.length>131072)fail("CHAT_INVALID_STREAM");
        const obj=JSON.parse(raw) as unknown;
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

