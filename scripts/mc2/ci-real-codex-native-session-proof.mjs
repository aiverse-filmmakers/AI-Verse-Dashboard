/**
 * 3A.25: real pinned Codex process controlled by an ACTUAL Dashboard
 * LocalApplicationSession in a hermetic, credential-free CI container.
 *
 * No real recording consent, no user threads, no model turns, no history
 * import, no archive writes, no agent output or credential access.
 * This file is never imported by production Dashboard or native launcher.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {
  mkdtempSync,mkdirSync,writeFileSync,rmSync,statSync,realpathSync,
} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {setTimeout as sleep} from "node:timers/promises";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";
import {
  QueryRouter,SubscriptionHub,startGateway,
} from "../../dist/apps/gateway/src/index.js";
import {
  LocalApplicationSession,
} from "../../dist/apps/gateway/src/local-app-session.js";

const BINARY="/test/codex";
const TEST_ROOT="/scratch";
const MAX_WIRE=65536;
const MAX_FRAMES=16;
function deny(){throw Error("REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED");}
function sameFile(a,b){return a.dev===b.dev&&a.ino===b.ino;}
function assertEnv(){
  assert.equal(process.platform,"linux");
  assert.equal(process.env.AIVERSE_CODEX_NATIVE_HOST_CI,"1");
  assert.equal(process.env.CI,"true");
  assert.equal(process.env.OPENAI_API_KEY,undefined);
  assert.equal(process.env.CODEX_API_KEY,undefined);
  assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined);
  assert.equal(process.env.GITHUB_TOKEN,undefined);
  assert.equal(realpathSync(TEST_ROOT),TEST_ROOT);
  assert.equal(realpathSync(BINARY),BINARY);
}
function fixture(){
  const root=mkdtempSync(join(TEST_ROOT,"dashboard-codex-host-"));
  const operator=join(root,"operator");
  const film=join(root,"workspaces","film");
  mkdirSync(operator,{mode:0o700});
  mkdirSync(join(root,"workspaces"),{mode:0o700});
  mkdirSync(film,{mode:0o700});
  mkdirSync(join(root,"system"),{mode:0o700});
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n',
    {mode:0o600});
  writeFileSync(join(root,"AGENTS.md"),"# synthetic empty fixture\n",{mode:0o600});
  writeFileSync(join(film,"WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n',
    {mode:0o600});
  const registry=new SystemRegistry();
  const systemId=registry.register(root,{label:"Disposable no-user OS"}).systemId;
  return {root,operator,film,registry,systemId};
}
async function pair(port,owner){
  const base="http://127.0.0.1:"+port;
  const result=await fetch(base+"/local-app/pair",{
    method:"POST",
    headers:{"content-type":"application/json",origin:base},
    body:JSON.stringify({code:owner.pairingCode()}),
    redirect:"error",
  });
  assert.equal(result.status,200,"trusted local session pairing must complete");
  return (result.headers.get("set-cookie")??"").split(";")[0];
}
async function shutdown(child){
  if(!child)return;
  if(child.exitCode===null&&child.signalCode===null)child.kill("SIGTERM");
  await Promise.race([
    once(child,"close").catch(()=>{}),
    sleep(3000).then(()=>{if(child.exitCode===null&&child.signalCode===null)
      child.kill("SIGKILL");}),
  ]);
  for(const stream of [child.stdin,child.stdout]){
    try{stream?.destroy();}catch{}
  }
}
function childBoundToHost(owner,child,workspace,epoch){
  const current=owner.prospectiveRecordingIntentForHost();
  if(!current.requested
      || current.intentGeneration!==epoch
      || current.scope?.workspaceId!==workspace.id
      || current.scope?.systemId!==workspace.systemId
      || child.exitCode!==null || child.signalCode!==null
      || !Number.isInteger(child.pid) || child.pid<=0
      || !child.stdin || !child.stdout
      || !sameFile(statSync("/proc/"+child.pid+"/cwd"),workspace.stat)
      || !sameFile(statSync(workspace.path),workspace.stat)
      || current.captureAuthorized!==false
      || current.hostOriginAttested!==false
      || current.userRecordingConsentVerified!==false
      || current.historyImportAuthorized!==false)deny();
  // An actual Codex child pipe is owned by the one parent. Never accept
  // a PID/threadId supplied in the JSON-RPC envelope as evidence instead.
}
function openServer(binary,workspace){
  const home=join(TEST_ROOT,"codex-home-"+workspace.id);
  mkdirSync(home,{mode:0o700});
  mkdirSync(join(home,".codex"),{mode:0o700});
  const child=spawn(binary,["app-server","--listen","stdio://"],{
    cwd:workspace.path,shell:false,detached:false,windowsHide:true,
    stdio:["pipe","pipe","ignore"],
    env:{
      PATH:"/usr/local/bin:/usr/bin:/bin",
      HOME:home,CODEX_HOME:join(home,".codex"),
      XDG_CONFIG_HOME:join(home,".config"),
      XDG_CACHE_HOME:join(home,".cache"),
      NO_COLOR:"1",RUST_LOG:"off",
    },
  });
  if(!Number.isInteger(child.pid)||!child.stdout||!child.stdin)deny();
  return child;
}
class OwnedNoContentReader {
  constructor(owner,child,workspace,epoch){
    this.child=child;
    this.require=()=>childBoundToHost(owner,child,workspace,epoch);
    this.buffer=Buffer.alloc(0);
    this.waiting=new Map();
    this.frames=0;
    this.closed=false;
    this.onChunk=(chunk)=>{
      // Before *every* byte is interpreted, recheck current live host epoch,
      // current original child process and exact physical workspace.
      try{
        this.require();
        if(!Buffer.isBuffer(chunk)
            || this.buffer.length+chunk.length>MAX_WIRE*2)deny();
        this.buffer=Buffer.concat([this.buffer,chunk]);
        while(this.buffer.includes(10)){
          this.require();
          const eol=this.buffer.indexOf(10);
          if(eol===0||eol>MAX_WIRE)deny();
          const line=this.buffer.subarray(0,eol);
          this.buffer=this.buffer.subarray(eol+1);
          this.frames++;
          if(this.frames>MAX_FRAMES)deny();
          // No frame payload is ever logged, stored or forwarded to Memory.
          const row=JSON.parse(line.toString("utf8"));
          if(!row||typeof row!=="object"||Array.isArray(row))deny();
          if(row.method) {
            // No model, command, history, user or item notifications accepted.
            // Only handle the narrow initialize/config/read response path.
            deny();
          }
          if(!Number.isInteger(row.id)||!this.waiting.has(row.id))deny();
          const entry=this.waiting.get(row.id);
          this.waiting.delete(row.id);
          if(!Object.hasOwn(row,"result")||Object.hasOwn(row,"error"))deny();
          entry.resolve(row.result);
        }
      }catch{
        this.closed=true;
        this.buffer=Buffer.alloc(0);
        for(const [,pending] of this.waiting)pending.reject(
          Error("REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED"));
        this.waiting.clear();
      }
    };
    child.stdout.on("data",this.onChunk);
  }
  request(id,method,params){
    this.require();
    if(this.closed||this.waiting.size>0||this.frames>=MAX_FRAMES)deny();
    const line=JSON.stringify({id,method,params})+"\n";
    if(Buffer.byteLength(line)>4096)deny();
    const response=new Promise((resolve,reject)=>
      this.waiting.set(id,{resolve,reject}));
    this.child.stdin.write(line);
    return response;
  }
  notify(method){
    this.require();
    if(method!=="initialized")deny();
    this.child.stdin.write(JSON.stringify({method})+"\n");
  }
  revoke(){
    this.closed=true;
    this.buffer=Buffer.alloc(0);
    this.child.stdout.off("data",this.onChunk);
    for(const [,pending] of this.waiting)pending.reject(
      Error("REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED"));
    this.waiting.clear();
  }
}
async function verify(host,workspace,id){
  const status=host.prospectiveRecordingIntentForHost();
  assert.equal(status.requested,true);
  assert.equal(status.captureAuthorized,false);
  const child=openServer(BINARY,workspace);
  const reader=new OwnedNoContentReader(host,child,workspace,status.intentGeneration);
  try{
    const init=await reader.request(id,"initialize",{
      clientInfo:{name:"aiverse_dashboard_offline_host_ci",
        title:"Isolated Dashboard-owned Codex process proof",
        version:"0.0.0-test"},
    });
    assert.ok(init&&typeof init==="object");
    reader.notify("initialized");
    const result=await reader.request(id+1,"config/read",{includeLayers:false});
    assert.ok(result&&typeof result.config==="object"
      &&typeof result.origins==="object");
    return {child,reader};
  }catch(e){reader.revoke();await shutdown(child);throw e;}
}
async function main(){
  assertEnv();
  const {root,operator,film,registry,systemId}=fixture();
  const scope={systemId,workspaceId:"operator"};
  const owner=new LocalApplicationSession(scope,undefined,registry);
  const gateway=await startGateway(new QueryRouter(registry,new DisposableCache()),
    new SubscriptionHub(),{port:0,localApp:owner});
  let first,second;
  try{
    await pair(gateway.port,owner);
    owner.setProspectiveRecordingIntentFromHost(true);
    const original={
      id:"operator",systemId,path:operator,stat:statSync(operator),
    };
    first=await verify(owner,original,1);
    // A still-running pinned Codex process cannot inherit a new host epoch.
    const pending=first.reader.request(3,"config/read",{includeLayers:false});
    owner.setProspectiveRecordingIntentFromHost(false);
    first.reader.revoke();
    await assert.rejects(pending,/REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED/);
    owner.setProspectiveRecordingIntentFromHost(true);
    assert.throws(()=>first.reader.require(),
      /REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED/);
    owner.rotateWorkspaceFromHost("film");
    assert.throws(()=>first.reader.require(),
      /REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED/);
    await shutdown(first.child);
    first=undefined;
    await pair(gateway.port,owner);
    owner.setProspectiveRecordingIntentFromHost(true);
    const next={id:"film",systemId,path:film,stat:statSync(film)};
    second=await verify(owner,next,11);
    owner.setProspectiveRecordingIntentFromHost(false);
    second.reader.revoke();
    assert.throws(()=>second.reader.require(),
      /REAL_CODEX_DASHBOARD_OWNER_PROOF_REFUSED/);
    console.log("PASS: real pinned Codex app-server owned by actual Dashboard host session; distinct physical workspaces, revoked old child epoch and read-only RPCs");
    console.log("BLOCKED: any real user consent, turn/start, prompt, chat, archive, production capture or Memory access");
  }finally{
    owner.close();
    if(first){first.reader.revoke();await shutdown(first.child);}
    if(second){second.reader.revoke();await shutdown(second.child);}
    await gateway.close();
    rmSync(root,{force:true,recursive:true});
  }
}
await main();
