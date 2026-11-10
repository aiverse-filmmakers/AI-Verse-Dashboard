/**
 * 3A.28: exact first-party interactive TTY -> pinned real Codex, CI only.
 * NOT installed, NOT a recorder, NOT authorization, NO user chat/turns.
 * The binary is mounted inside Docker --network none, the Gateway is fake,
 * and all Codex messages are transiently parsed then discarded.
 */
import {spawn,type ChildProcessWithoutNullStreams} from "node:child_process";
import {realpathSync,statSync,mkdirSync,mkdtempSync,rmSync} from "node:fs";
import {join} from "node:path";
import {getWorkspace} from "../../packages/os-read-adapter/src/index.js";
import type {SystemRegistry} from "../../packages/registry/src/index.js";
import type {LocalApplicationSession} from "../../apps/gateway/src/local-app-session.js";

const PROOF_BIN="/test/codex";
const SCRATCH="/scratch";
const MAX_FRAME=65536,MAX_TOTAL=262144,MAX_NOTICES=8;
const DENIED="NATIVE_CODEX_REAL_TTY_PROOF_DENIED";
function deny():never{throw Error(DENIED)}
function guardEnvironment():void{
  if(process.platform!=="linux"||process.env.CI!=="true"
    ||process.env.AIVERSE_PERSISTENT_CHATS_REAL_CODEX_TTY_CI!=="1"
    ||!process.stdin.isTTY||!process.stderr.isTTY
    ||realpathSync(PROOF_BIN)!==PROOF_BIN
    ||realpathSync(SCRATCH)!==SCRATCH)deny();
  const file=statSync(PROOF_BIN);
  if(!file.isFile()||!(file.mode&0o100))deny();
  // The running parent and its child have no user/provider credentials.
  for(const key of ["OPENAI_API_KEY","CODEX_API_KEY","GITHUB_TOKEN"]){
    if(process.env[key])deny();
  }
}
function approvedWorkspace(host:LocalApplicationSession,registry:SystemRegistry){
  const current=host.prospectiveRecordingIntentForHost();
  if(!current.requested||!current.scopeReviewAcknowledged||!current.scope
    ||current.captureAuthorized!==false
    ||current.hostOriginAttested!==false
    ||current.userRecordingConsentVerified!==false
    ||current.historyImportAuthorized!==false)deny();
  const {systemId,workspaceId}=current.scope;
  const path=workspaceId==="operator"
    ?join(registry.resolveRoot(systemId),"operator")
    :getWorkspace(registry,systemId,workspaceId).rootReal;
  if(realpathSync(path)!==path)deny();
  const stat=statSync(path);
  if(!stat.isDirectory()||stat.uid!==process.getuid?.()
    ||Boolean(stat.mode&0o022))deny();
  return {path,dev:stat.dev,ino:stat.ino,systemId,workspaceId,
    generation:current.intentGeneration};
}

type Expected={
  id:number;
  resolve:(result:unknown)=>void;
  reject:(reason:Error)=>void;
  timeout:ReturnType<typeof setTimeout>;
};

export async function probeRealCodexFromNativeTTY(
  host:LocalApplicationSession,registry:SystemRegistry,
):Promise<void>{
  guardEnvironment();
  const initial=approvedWorkspace(host,registry);
  // Each separately spawned Codex child gets an entirely fresh home.
  const home=mkdtempSync(join(SCRATCH,"native-codex-readonly-"));
  mkdirSync(join(home,".codex"),{mode:0o700});
  const child=spawn(PROOF_BIN,["app-server","--listen","stdio://"],{
    cwd:initial.path,shell:false,
    stdio:["pipe","pipe","ignore"],windowsHide:true,
    env:{
      PATH:"/usr/local/bin:/usr/bin:/bin",
      HOME:home,CODEX_HOME:join(home,".codex"),
      XDG_CONFIG_HOME:join(home,".config"),
      XDG_CACHE_HOME:join(home,".cache"),
      NO_COLOR:"1",RUST_LOG:"off",
    },
  });
  if(!Number.isInteger(child.pid)||!child.pid||child.pid<=0
    ||!child.stdin||!child.stdout) {
    child.kill("SIGKILL");deny();
  }
  let total=0,frames=0,notices=0;
  let buffer=Buffer.alloc(0);
  let current:Expected|undefined,closed=false,failed=false;
  function owned():void{
    if(closed||failed||child.exitCode!==null||child.signalCode!==null)deny();
    const active=approvedWorkspace(host,registry);
    const physical=statSync("/proc/"+child.pid+"/cwd");
    if(active.generation!==initial.generation
      ||active.systemId!==initial.systemId
      ||active.workspaceId!==initial.workspaceId
      ||active.dev!==initial.dev||active.ino!==initial.ino
      ||physical.dev!==initial.dev||physical.ino!==initial.ino)deny();
  }
  function rejectCurrent():void{
    if(current){
      clearTimeout(current.timeout);
      const reject=current.reject;current=undefined;
      reject(Error(DENIED));
    }
  }
  function drop():void{
    failed=true;closed=true;
    buffer=Buffer.alloc(0);
    rejectCurrent();
  }
  function onData(bytes:Buffer):void{
    try{
      owned();
      if(!Buffer.isBuffer(bytes)||bytes.length>MAX_FRAME
        ||total+bytes.length>MAX_TOTAL)deny();
      total+=bytes.length;
      buffer=Buffer.concat([buffer,bytes]);
      if(buffer.length>MAX_FRAME)deny();
      while(buffer.includes(10)){
        owned();
        const n=buffer.indexOf(10);
        if(n<1||n>MAX_FRAME)deny();
        const row=JSON.parse(buffer.subarray(0,n).toString("utf8")) as Record<string,unknown>;
        buffer=buffer.subarray(n+1);
        if(++frames>16||!row||typeof row!=="object"
          ||Array.isArray(row))deny();
        if(Object.hasOwn(row,"method")){
          // Non-chat startup notices may occur during initialization.
          // Reject all thread, turn, item, tool and approval notifications.
          if(typeof row.method!=="string"||row.method.length>96
            ||["thread/","turn/","item/","serverRequest/"].some(
              prefix=>(row.method as string).startsWith(prefix))
            ||Object.hasOwn(row,"result")||Object.hasOwn(row,"error")
            ||!row.params||typeof row.params!=="object"
            ||Array.isArray(row.params)||++notices>MAX_NOTICES)deny();
          continue;
        }
        if(!current||row.id!==current.id
          ||!Object.hasOwn(row,"result")||Object.hasOwn(row,"error"))deny();
        owned();
        const resolve=current.resolve;
        clearTimeout(current.timeout);current=undefined;
        resolve(row.result);
      }
    }catch{drop();}
  }
  child.stdout.on("data",onData);
  child.once("error",drop);
  child.once("close",drop);
  function request(id:number,method:"initialize"|"config/read",params:object){
    owned();
    if(current||frames>=16)deny();
    const line=JSON.stringify({id,method,params})+"\n";
    if(Buffer.byteLength(line)>4096)deny();
    const result=new Promise<unknown>((resolve,reject)=>{
      const timeout=setTimeout(()=>{drop();reject(Error(DENIED));},7000);
      current={id,resolve,reject,timeout};
    });
    if(!child.stdin.write(line)){ /* backpressure not expected; bounded request */ }
    return result;
  }
  try{
    const initialized=await request(1,"initialize",{
      clientInfo:{name:"aiverse_native_tty_offline_ci",
        title:"AI-Verse disposable native Codex proof",version:"0.0.0-test"},
    });
    if(!initialized||typeof initialized!=="object")deny();
    owned();
    child.stdin.write('{"method":"initialized"}\n');
    const config=await request(2,"config/read",{includeLayers:false});
    if(!config||typeof config!=="object"
      ||!("config" in config)||!("origins" in config))deny();
    owned();
    // Never store, hash, log, forward or archive the protocol payload.
  }finally{
    closed=true;
    rejectCurrent();
    child.stdout.off("data",onData);
    child.stdin.end();
    if(child.exitCode===null&&child.signalCode===null)child.kill("SIGTERM");
    await Promise.race([
      new Promise<void>(resolve=>child.once("close",()=>resolve())),
      new Promise<void>(resolve=>setTimeout(()=>{
        if(child.exitCode===null&&child.signalCode===null)child.kill("SIGKILL");
        resolve();
      },1500)),
    ]);
    buffer=Buffer.alloc(0);
    rmSync(home,{recursive:true,force:true,maxRetries:3,retryDelay:100});
  }
}
