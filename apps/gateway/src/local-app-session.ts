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
import type {IncomingMessage,ServerResponse} from "node:http";

const COOKIE="aiverse_local_session";
const MAX_PAIR_ATTEMPTS=5;
const PAIR_TTL=5*60*1000;
const SESSION_TTL=8*60*60*1000;
const ID=/^[a-z0-9][a-z0-9-]{0,63}$/;
const WS=/^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;

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

export interface LocalApplicationScope{
  systemId:string;
  workspaceId:string;
}
export class LocalApplicationSession {
  private port=0;
  private readonly pairing=randomBytes(32).toString("base64url");
  private readonly born=Date.now();
  private readonly sessionToken=randomBytes(32).toString("base64url");
  private sessionsUntil=0;
  private attempts=0;
  private used=false;
  constructor(private readonly scope:LocalApplicationScope){
    if(!ID.test(scope.systemId)||!WS.test(scope.workspaceId))
      throw Error("LOCAL_APP_SCOPE_INVALID");
  }
  setBoundPort(port:number):void{
    if(this.port!==0||!Number.isInteger(port)||port<=0||port>65535)
      throw Error("LOCAL_APP_PORT_INVALID");
    this.port=port;
  }
  /** Reveal only to an approved local launcher/native host, never HTTP. */
  pairingCode():string{
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
    return this.port!==0&&Date.now()<this.sessionsUntil
      && cookie!==null&&equal(cookie,this.sessionToken);
  }
  /** Cookie auth is valid only for browser requests from the exact app origin. */
  isAuthorizedBrowser(req:IncomingMessage):boolean{
    return this.originIsExact(req)&&this.isSession(req);
  }
  isAllowedFrame(value:unknown):boolean{
    if(!value||typeof value!=="object"||Array.isArray(value))return false;
    const frame=value as {systemId?:unknown;workspaceId?:unknown;method?:unknown};
    return typeof frame.method==="string"&&frame.method.startsWith("aiverse.gateway.")
      && frame.systemId===this.scope.systemId
      && frame.workspaceId===this.scope.workspaceId;
  }
  /** Routes are intentionally limited; UI document/assets are a later seam. */
  async handle(req:IncomingMessage,res:ServerResponse):Promise<boolean>{
    const url=new URL(req.url??"/","http://127.0.0.1");
    if(!url.pathname.startsWith("/local-app/"))return false;
    if(req.headers.host!=="127.0.0.1:"+this.port || url.search || url.hash){
      fail(res,403,"LOCAL_APP_ORIGIN_DENIED");return true;
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
      this.sessionsUntil=0;
      res.writeHead(200,{"content-type":"application/json; charset=utf-8",
        "cache-control":"no-store","set-cookie":COOKIE+"=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0"});
      res.end(JSON.stringify({ok:true}));
      return true;
    }
    fail(res,404,"LOCAL_APP_ROUTE_UNKNOWN");return true;
  }
}
