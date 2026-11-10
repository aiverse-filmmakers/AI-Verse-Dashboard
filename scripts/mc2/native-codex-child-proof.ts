/**
 * 3A.27: CI-ONLY live native launcher child-ownership proof.
 *
 * Not Codex, not a capture agent, not an issuer or user consent.
 * Its fixed, sterile Node child produces ZERO stdout/stderr, has no stdin,
 * and only demonstrates OS host -> subprocess lifecycle / revocation.
 * Real pinned Codex in a disposable Dashboard host is separately verified
 * by 3A.25 offline CI. NEVER import this module from browser or RPC.
 */
import {spawn,type ChildProcess} from "node:child_process";
import {realpathSync,statSync} from "node:fs";
import {join} from "node:path";
import {getWorkspace} from "../../packages/os-read-adapter/src/index.js";
import type {SystemRegistry} from "../../packages/registry/src/index.js";
import type {
  LocalApplicationSession,ProspectiveRecordingIntentStatus,
} from "../../apps/gateway/src/local-app-session.js";

type Lease={
  child:ChildProcess;
  generation:number;
  systemId:string;
  workspaceId:string;
  path:string;
  dev:number;
  ino:number;
};

function deny():never{throw Error("NATIVE_CODEX_CHILD_PROOF_DENIED");}
function noProd():void{
  if(process.platform!=="linux"||process.env.CI!=="true"
    ||process.env.AIVERSE_PERSISTENT_CHATS_CHILD_PROOF!=="1"
    ||!process.stdin.isTTY||!process.stderr.isTTY)deny();
}
function valid(status:ProspectiveRecordingIntentStatus):boolean{
  return status.requested&&status.scopeReviewAcknowledged
    &&status.scope!==null
    &&status.captureAuthorized===false
    &&status.hostOriginAttested===false
    &&status.userRecordingConsentVerified===false
    &&status.historyImportAuthorized===false;
}

export class NativeNoContentChildProof{
  private lease?:Lease;
  private timer?:ReturnType<typeof setInterval>;
  constructor(
    private readonly host:LocalApplicationSession,
    private readonly registry:SystemRegistry,
  ){}

  /** All identities are resolved by the original native OS registry, never RPC. */
  private currentScope():{
    status:ProspectiveRecordingIntentStatus;
    path:string;dev:number;ino:number;
  }{
    noProd();
    const status=this.host.prospectiveRecordingIntentForHost();
    if(!valid(status)||!status.scope)deny();
    const {systemId,workspaceId}=status.scope;
    let path:string;
    try{
      path=workspaceId==="operator"
        ?join(this.registry.resolveRoot(systemId),"operator")
        :getWorkspace(this.registry,systemId,workspaceId).rootReal;
      if(realpathSync(path)!==path)deny();
      const st=statSync(path);
      if(!st.isDirectory()||st.uid!==process.getuid?.()
        ||Boolean(st.mode & 0o022))deny();
      return {status,path,dev:st.dev,ino:st.ino};
    }catch{deny();}
  }

  start():void{
    noProd();
    if(this.lease)deny();
    const {status,path,dev,ino}=this.currentScope();
    const scope=status.scope!;
    // Fixed synthetic process, no shell and *all* stdio discarded.
    // It cannot receive prompts, read HTTP, or emit conversation frames.
    const child=spawn(process.execPath,["-e",
      "const timer=setInterval(()=>{},1000);process.on('SIGTERM',()=>{clearInterval(timer);process.exit(0)});",
    ],{
      cwd:path,shell:false,windowsHide:true,
      stdio:["ignore","ignore","ignore"],
      env:{PATH:"/usr/local/bin:/usr/bin:/bin",NO_COLOR:"1"},
    });
    if(!Number.isInteger(child.pid)||child.pid!<=0){
      child.kill("SIGKILL");deny();
    }
    this.lease={
      child,generation:status.intentGeneration,
      systemId:scope.systemId,workspaceId:scope.workspaceId,
      path,dev,ino,
    };
    child.once("close",()=>{if(this.lease?.child===child)this.stop();});
    child.once("error",()=>{if(this.lease?.child===child)this.stop();});
    // The process cannot outlive a short diagnostic, even when TTY is idle.
    this.timer=setInterval(()=>{
      if(!this.active())this.stop();
    },80);
    this.timer.unref();
    const killAfter=setTimeout(()=>{
      if(this.lease?.child===child)this.stop();
    },3000);
    killAfter.unref();
  }

  active():boolean{
    if(!this.lease)return false;
    try{
      noProd();
      const bound=this.lease;
      const {status,path,dev,ino}=this.currentScope();
      return status.intentGeneration===bound.generation
        && status.scope?.systemId===bound.systemId
        && status.scope?.workspaceId===bound.workspaceId
        && path===bound.path&&dev===bound.dev&&ino===bound.ino
        && bound.child.pid!==undefined
        && bound.child.exitCode===null
        && bound.child.signalCode===null
        && !bound.child.killed;
    }catch{return false;}
  }

  /** Stop is idempotent and allowed after browser pairing is revoked. */
  stop():void{
    const lease=this.lease;
    this.lease=undefined;
    if(this.timer)clearInterval(this.timer);
    this.timer=undefined;
    if(lease&&lease.child.exitCode===null&&lease.child.signalCode===null){
      lease.child.kill("SIGTERM");
      const fallback=setTimeout(()=>{
        if(lease.child.exitCode===null&&lease.child.signalCode===null)
          lease.child.kill("SIGKILL");
      },1000);
      fallback.unref();
    }
  }
}
