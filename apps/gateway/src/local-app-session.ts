/**
 * Opt-in trusted local application session. Browser clients never receive
 * the Dashboard bearer or canonical Gateway credentials.
 *
 * A trusted native/launcher host can obtain one ephemeral pairing code from
 * memory. The code is single-use, expires, and may only be redeemed from this
 * exact localhost origin. The resulting token is an HttpOnly host-only cookie.
 * No routes exist unless the privileged launcher explicitly enables this.
 */
import {randomBytes,timingSafeEqual} from "node:crypto";
import {statSync} from "node:fs";
import type {IncomingMessage,ServerResponse} from "node:http";
import type {WebSocket} from "ws";
import type {SystemRegistry} from "../../../packages/registry/src/registry.js";
import {getWorkspace} from "../../../packages/os-read-adapter/src/workspace.js";

const COOKIE="aiverse_local_session";
const MAX_PAIR_ATTEMPTS=5;
const PAIR_TTL=5*60*1000;
const SESSION_TTL=8*60*60*1000;
const ID=/^[a-z0-9][a-z0-9-]{0,63}$/;
const WS=/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;
// New canonical methods never inherit a browser permission by prefix.
// Changes to this list require an owner and threat-boundary review.
const PAIRED_BROWSER_METHODS=new Set([
  "system.get", "workspace.get", "operator.activity",
  "aiverse.gateway.status", "aiverse.gateway.run.create",
  "aiverse.gateway.run.get", "aiverse.gateway.session.list",
  "aiverse.gateway.session.runs",
  "aiverse.canvas.list", "aiverse.canvas.get", "aiverse.canvas.history",
  "aiverse.canvas.create", "aiverse.canvas.rename", "aiverse.canvas.edit",
  "aiverse.canvas.duplicate", "aiverse.canvas.revert", "aiverse.canvas.delete",
]);

function equal(a:string,b:string):boolean{
  const left=Buffer.from(a),right=Buffer.from(b);
  return left.length===right.length&&timingSafeEqual(left,right);
}
function fail(res:ServerResponse,status:number,code:string):void{
  res.writeHead(status,{"content-type":"application/json; charset=utf-8",
    "cache-control":"no-store","x-content-type-options":"nosniff",
    "referrer-policy":"no-referrer","cross-origin-resource-policy":"same-origin"});
  res.end(JSON.stringify({ok:false,error:{code}}));
}
function readCookie(req:IncomingMessage):string|null{
  const raw=req.headers.cookie;
  if(typeof raw!=="string"||raw.length>4096)return null;
  const values=raw.split(";").map(x=>x.trim()).filter(x=>x.startsWith(COOKIE+"="));
  if(values.length!==1)return null;
  const value=values[0].slice(COOKIE.length+1);
  return /^[A-Za-z0-9_-]{32,256}$/.test(value)?value:null;
}

export interface LocalApplicationAssets{
  html:string;
  boot:string;
  css:string;
  chat:string;
}
export interface LocalApplicationScope{
  systemId:string;
  workspaceId:string;
}
export class LocalApplicationSession {
  private port=0;
  private pairing=randomBytes(32).toString("base64url");
  private born=Date.now();
  private sessionToken=randomBytes(32).toString("base64url");
  private readonly ownerRoot?:string;
  private readonly ownerGeneration?:number;
  private workspaceIdentity?:{root:string;dev:number;ino:number};
  private sessionsUntil=0;
  private attempts=0;
  private used=false;
  private readonly sockets=new Set<WebSocket>();
  private expiryTimer?:ReturnType<typeof setTimeout>;
  constructor(private scope:LocalApplicationScope,
    private readonly assets?:LocalApplicationAssets,
    private readonly ownerRegistry?:SystemRegistry){
    if(!ID.test(scope.systemId)||!WS.test(scope.workspaceId))
      throw Error("LOCAL_APP_SCOPE_INVALID");
    // Never retain a caller-owned mutable object as an authorization scope.
    this.scope={systemId:scope.systemId,workspaceId:scope.workspaceId};
    if(ownerRegistry){
      // Only a trusted host can inject the registry. Capture exactly the
      // approved identity/generation; browser requests can never choose it.
      this.ownerRoot=ownerRegistry.resolveRoot(scope.systemId);
      this.ownerGeneration=ownerRegistry.bindingGeneration(scope.systemId);
      this.workspaceIdentity=this.captureWorkspaceIdentity(scope.workspaceId);
    }
  }
  private captureWorkspaceIdentity(workspaceId:string):
    {root:string;dev:number;ino:number}|undefined{
    if(workspaceId==="operator")return undefined;
    if(!this.ownerRegistry)throw Error("LOCAL_APP_HOST_AUTHORITY_REQUIRED");
    const {rootReal}=getWorkspace(this.ownerRegistry,this.scope.systemId,workspaceId);
    const st=statSync(rootReal);
    return {root:rootReal,dev:st.dev,ino:st.ino};
  }
  private ownerStillApproved():boolean{
    if(!this.ownerRegistry)return true; // legacy host mode cannot switch.
    try{
      if(this.ownerRegistry.resolveRoot(this.scope.systemId)!==this.ownerRoot
        ||this.ownerRegistry.bindingGeneration(this.scope.systemId)!==this.ownerGeneration)
        return false;
      const current=this.captureWorkspaceIdentity(this.scope.workspaceId);
      if(!current)return this.scope.workspaceId==="operator";
      return current.root===this.workspaceIdentity?.root
        && current.dev===this.workspaceIdentity?.dev
        && current.ino===this.workspaceIdentity?.ino;
    }catch{return false;}
  }
  /**
   * TRUSTED HOST ONLY. There is no browser RPC/HTTP route for this operation.
   * The launcher selects a workspace from the OS owner, then all existing
   * cookies/sockets are revoked and both one-time secrets are rotated.
   */
  rotateWorkspaceFromHost(workspaceId:string):void{
    if(!this.ownerRegistry)throw Error("LOCAL_APP_HOST_AUTHORITY_REQUIRED");
    if(!WS.test(workspaceId))throw Error("LOCAL_APP_SCOPE_INVALID");
    if(!this.ownerStillApproved())throw Error("LOCAL_APP_OS_BINDING_STALE");
    const nextIdentity=this.captureWorkspaceIdentity(workspaceId);
    // Validate everything before touching the old browser session. Explicit
    // re-pairing is required even if the host reselects the same workspace.
    this.revoke();
    this.scope={systemId:this.scope.systemId,workspaceId};
    this.workspaceIdentity=nextIdentity;
    this.pairing=randomBytes(32).toString("base64url");
    this.sessionToken=randomBytes(32).toString("base64url");
    this.born=Date.now();
    this.attempts=0;
    this.used=false;
  }
  setBoundPort(port:number):void{
    if(this.port!==0||!Number.isInteger(port)||port<=0||port>65535)
      throw Error("LOCAL_APP_PORT_INVALID");
    this.port=port;
  }
  /** Previously paired browser sockets may not survive logout or expiry. */
  trackBrowserSocket(ws:WebSocket):void{
    if(!this.active()){ws.close(1008,"Session inactive");return;}
    this.sockets.add(ws);
    ws.once("close",()=>this.sockets.delete(ws));
  }
  private active():boolean{
    if(!this.ownerStillApproved()){this.revoke();return false;}
    return this.port!==0&&Date.now()<this.sessionsUntil;
  }
  private revoke():void{
    this.sessionsUntil=0;
    if(this.expiryTimer)clearTimeout(this.expiryTimer);
    this.expiryTimer=undefined;
    for(const ws of this.sockets)ws.close(1008,"Session ended");
    this.sockets.clear();
  }
  close():void{this.revoke();}
  /** Reveal only to an approved local launcher/native host, never HTTP. */
  pairingCode():string{
    if(!this.ownerStillApproved())throw Error("LOCAL_APP_OS_BINDING_STALE");
    if(this.used||this.attempts>=MAX_PAIR_ATTEMPTS||Date.now()-this.born>PAIR_TTL)
      throw Error("LOCAL_APP_PAIRING_EXPIRED");
    return this.pairing;
  }
  get origin():string{
    if(!this.port)throw Error("LOCAL_APP_NOT_BOUND");
    return "http://127.0.0.1:"+this.port;
  }
  originIsExact(req:IncomingMessage):boolean{
    return req.headers.host==="127.0.0.1:"+this.port
      && req.headers.origin===this.origin;
  }
  isSession(req:IncomingMessage):boolean{
    const cookie=readCookie(req);
    return this.active() && cookie!==null&&equal(cookie,this.sessionToken);
  }
  /** Cookie auth is valid only for browser requests from the exact app origin. */
  isAuthorizedBrowser(req:IncomingMessage):boolean{
    return this.originIsExact(req)&&this.isSession(req);
  }
  isAllowedSocketSystem(systemId:string):boolean{
    return this.ownerStillApproved()&&systemId===this.scope.systemId;
  }
  /** Recheck a running cookie-authorized stream before forwarding events. */
  isAllowedBrowserStream(workspaceId:string):boolean{
    return workspaceId===this.scope.workspaceId && this.active();
  }
  isAllowedFrame(value:unknown):boolean{
    if(!value||typeof value!=="object"||Array.isArray(value))return false;
    const frame=value as {systemId?:unknown;workspaceId?:unknown;method?:unknown};
    return this.ownerStillApproved()
      && typeof frame.method==="string"
      && PAIRED_BROWSER_METHODS.has(frame.method)
      && frame.systemId===this.scope.systemId
      && frame.workspaceId===this.scope.workspaceId;
  }
  /** Exact allowlisted same-origin assets. No filesystem path comes from HTTP. */
  private serveAsset(res:ServerResponse,body:string,media:string):void{
    res.writeHead(200,{"content-type":media,"cache-control":"no-store",
      "x-content-type-options":"nosniff","referrer-policy":"no-referrer",
      "cross-origin-resource-policy":"same-origin","x-frame-options":"DENY",
      "content-security-policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self' ws://127.0.0.1:"+this.port+"; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    });
    res.end(body);
  }
  /** Session routes and optional source-reviewed local app assets. */
  async handle(req:IncomingMessage,res:ServerResponse):Promise<boolean>{
    const url=new URL(req.url??"/","http://127.0.0.1");
    if(!url.pathname.startsWith("/local-app/"))return false;
    if(req.headers.host!=="127.0.0.1:"+this.port || url.search || url.hash){
      fail(res,403,"LOCAL_APP_ORIGIN_DENIED");return true;
    }
    if(this.assets && req.method==="GET"){
      const asset=url.pathname;
      if(asset==="/local-app/" || asset==="/local-app/index.html"){
        this.serveAsset(res,this.assets.html,"text/html; charset=utf-8");return true;
      }
      if(asset==="/local-app/boot.js"){
        this.serveAsset(res,this.assets.boot,"text/javascript; charset=utf-8");return true;
      }
      if(asset==="/local-app/chat.css"){
        this.serveAsset(res,this.assets.css,"text/css; charset=utf-8");return true;
      }
      if(asset==="/local-app/chat.js"){
        if(!this.isSession(req)){fail(res,401,"LOCAL_APP_UNPAIRED");return true;}
        this.serveAsset(res,this.assets.chat,"text/javascript; charset=utf-8");return true;
      }
    }
    if(url.pathname==="/local-app/session"&&req.method==="GET"){
      // Cross-site reads cannot discover even the permitted system identity.
      if(!this.isSession(req)){fail(res,401,"LOCAL_APP_UNPAIRED");return true;}
      res.writeHead(200,{"content-type":"application/json; charset=utf-8",
        "cache-control":"no-store","x-content-type-options":"nosniff",
        "referrer-policy":"no-referrer","cross-origin-resource-policy":"same-origin"});
      res.end(JSON.stringify({ok:true,scope:this.scope,
        authentication:"host-cookie",privateBearerExported:false}));
      return true;
    }
    if(url.pathname==="/local-app/pair"&&req.method==="POST"){
      if(!this.originIsExact(req)||req.headers["content-type"]!=="application/json"){
        fail(res,403,"LOCAL_APP_ORIGIN_DENIED");return true;
      }
      if(!this.ownerStillApproved()){
        this.revoke();fail(res,403,"LOCAL_APP_OS_BINDING_STALE");return true;
      }
      if(this.used||this.attempts>=MAX_PAIR_ATTEMPTS||Date.now()-this.born>PAIR_TTL){
        fail(res,403,"LOCAL_APP_PAIRING_EXPIRED");return true;
      }
      let size=0,raw="";
      try{
        for await(const chunk of req){
          size+=Buffer.byteLength(chunk);
          if(size>512)throw Error("too large");
          raw+=String(chunk);
        }
      }catch{fail(res,400,"LOCAL_APP_PAIRING_INVALID");return true;}
      let code:unknown;
      try{
        const o=JSON.parse(raw) as {code?:unknown};
        code=o&&typeof o==="object"&&!Array.isArray(o)?o.code:undefined;
      }catch{}
      this.attempts++;
      if(typeof code!=="string"||!equal(code,this.pairing)){
        fail(res,403,"LOCAL_APP_PAIRING_DENIED");return true;
      }
      this.used=true;
      this.sessionsUntil=Date.now()+SESSION_TTL;
      this.expiryTimer=setTimeout(()=>this.revoke(),SESSION_TTL);
      this.expiryTimer.unref();
      res.writeHead(200,{"content-type":"application/json; charset=utf-8",
        "cache-control":"no-store","x-content-type-options":"nosniff",
        "referrer-policy":"no-referrer","cross-origin-resource-policy":"same-origin",
        "set-cookie":COOKIE+"="+this.sessionToken+"; HttpOnly; SameSite=Strict; Path=/; Max-Age="+SESSION_TTL/1000});
      res.end(JSON.stringify({ok:true,scope:this.scope,
        authentication:"host-cookie",privateBearerExported:false}));
      return true;
    }
    if(url.pathname==="/local-app/logout"&&req.method==="POST"){
      if(!this.isAuthorizedBrowser(req)){
        fail(res,403,"LOCAL_APP_ORIGIN_DENIED");return true;
      }
      this.revoke();
      res.writeHead(200,{"content-type":"application/json; charset=utf-8",
        "cache-control":"no-store","set-cookie":COOKIE+"=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"});
      res.end(JSON.stringify({ok:true}));
      return true;
    }
    fail(res,404,"LOCAL_APP_ROUTE_UNKNOWN");return true;
  }
}
