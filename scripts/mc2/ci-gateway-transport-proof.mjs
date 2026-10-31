/**
 * MC2 real-Gateway composition proof. Disposable CI ONLY.
 * Starts canonical Gateway source pinned by the workflow, not a stubbed HTTP
 * fixture. No provider, OS owner or personal credential is accessed.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {WebSocket} from "ws";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";
import {CanonicalGatewayBridge,QueryRouter,SubscriptionHub,startGateway} from "../../dist/apps/gateway/src/index.js";
import {dashboardWsAuthProtocol,DASHBOARD_WS_PROTOCOL} from "../../dist/packages/protocol/src/index.js";
import {DashboardClient} from "../../dist/packages/client/src/index.js";

// Exact reviewed upstream owner SHA; changes require deliberate source review.
const GATEWAY_REVISION="9748dd0d5473b65ad95ef92df62fe0a13575e378";
const pinRoot=resolve(process.env.AIVERSE_MC2_GATEWAY_SOURCE||"gateway-source");
const pin=execFileSync("git",["-C",pinRoot,"rev-parse","HEAD"],{encoding:"utf8"}).trim();
assert.equal(pin,GATEWAY_REVISION,"must not use an unreviewed Gateway source revision");
assert.equal(process.env.CI,"true","CI only; never act on owner installations");
assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined,"no member Gateway token in CI");

const importer=async(name)=>import(pathToFileURL(join(pinRoot,"src",name)).href);
const {installComponent,setupComponent}=await importer("lifecycle.mjs");
const {loadConfig}=await importer("config.mjs");
const {startServer}=await importer("server.mjs");

const temp=await mkdtemp(join(tmpdir(),"aiverse-mc2-disposable-"));
const osRoot=join(temp,"synthetic-system");
const home=join(temp,"gateway");
const hostFile=join(temp,"test-host.json");
let canonical,local,ws;
let token="";
function frame(method,systemId,params){
  return {type:"req",v:"1.0",id:"proof-"+method,method,
    systemId,workspaceId:"operator",...(params?{params}:{})};
}
async function rpc(port,auth,body) {
  const res=await fetch("http://127.0.0.1:"+port+"/rpc",{
    method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+auth},
    body:JSON.stringify(body),signal:AbortSignal.timeout(8000),redirect:"error"
  });
  assert.equal(res.status,200);
  return res.json();
}
const pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
let primaryError;
try {
  await mkdir(osRoot);
  for(const dir of ["operator","workspaces","system"])await mkdir(join(osRoot,dir));
  // A second real disposable OS workspace for owner-approved browser selection.
  // It must never be used as a fabricated Gateway provider runtime.
  await mkdir(join(osRoot,"workspaces","film"));
  await writeFile(join(osRoot,"workspaces","film","WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film Workspace"\nstatus: "active"\n');
  await writeFile(join(osRoot,"AI-VERSE.yaml"),'schema_version: "2.0"\narchitecture: unified-workspace\n');
  await writeFile(join(osRoot,"AGENTS.md"),"# disposable system\n");
  await writeFile(hostFile,JSON.stringify({
    transport:"json-subprocess",
    command:[process.execPath,join(pinRoot,"fixtures","fake-host.mjs")],
    timeout_seconds:10,max_output_bytes:1048576,
    max_stderr_bytes:65536,env_names:[],cwd:osRoot
  }));
  await installComponent({home});
  const setup=await setupComponent({home,system_root:osRoot,
    host_config:hostFile,runtime:"deterministic",system_id:"ci-mc2",
    workspace:"operator",port:0});
  token=setup.api_token;
  assert.ok(typeof token==="string"&&token.startsWith("avg_"));
  canonical=await startServer(await loadConfig(home),home,{port:0});
  const canonicalOrigin="http://127.0.0.1:"+canonical.port;
  const registry=new SystemRegistry();
  const systemId=registry.register(osRoot).systemId;
  const bridge=new CanonicalGatewayBridge(registry,[{
    dashboardSystemId:systemId,canonicalSystemId:"ci-mc2",
    origin:canonicalOrigin,resolveBearer:()=>token,
    // CI only: isolated test operator explicitly grants checkpoint controls.
    // This does not modify the user host or any provider configuration.
    allowRunPauseResume:true,
  }]);
  local=await startGateway(new QueryRouter(registry,new DisposableCache()),
    new SubscriptionHub(),{port:0,canonicalBridge:bridge});
  const denied=await fetch(canonicalOrigin+"/status",{redirect:"error"});
  assert.equal(denied.status,401,"canonical Gateway remains authenticated");

  const status=await rpc(local.port,local.authToken,frame("aiverse.gateway.status",systemId));
  assert.equal(status.ok,true,JSON.stringify(status.error??{}));
  assert.equal(status.result.model,"aiverse");
  assert.equal(status.result.systemId,"ci-mc2");
  assert.equal(status.result.workspaceId,"operator");
  assert.equal(status.result.source,"canonical-gateway");
  assert.equal(status.result.runPauseResumeSupported,true);
  assert.equal(status.result.runCancelSupported,false);
  const models=await rpc(local.port,local.authToken,frame("aiverse.gateway.models",systemId));
  assert.equal(models.ok,true,JSON.stringify(models.error??{}));
  assert.equal(models.result.source,"canonical-gateway");
  assert.equal(models.result.workspaceId,"operator");
  assert.deepEqual(models.result.models,[
    {id:"aiverse",label:"AI-Verse Gateway",kind:"gateway-virtual"},
  ]);
  assert.equal(models.result.modelSelectionSupported,false);
  assert.equal(models.result.providerSelectionSupported,false);
  assert.equal(models.result.inferenceVerified,false);
  assert.doesNotMatch(JSON.stringify(models),/Bearer |actual-host-gateway-token|private_data/);

  const marker="mc2-ci-runtime-"+Date.now();
  const payload={messages:[{role:"user",content:marker}],idempotencyKey:"mc2-proof-run-1"};
  const created=await rpc(local.port,local.authToken,frame("aiverse.gateway.run.create",systemId,payload));
  assert.equal(created.ok,true,JSON.stringify(created.error??{}));
  assert.equal(created.result.systemId,"ci-mc2");
  assert.equal(created.result.workspaceId,"operator");
  const runId=created.result.runId;
  assert.ok(typeof runId==="string"&&runId.length>=3);
  assert.doesNotMatch(JSON.stringify(created),/Bearer |avg_|private_data/);

  // Idempotency has to replay the exact canonical run, never queue a second run.
  const again=await rpc(local.port,local.authToken,frame("aiverse.gateway.run.create",systemId,payload));
  assert.equal(again.result?.runId,runId,"same idempotency key must replay the same canonical run");

  let done;
  for(let attempt=0;attempt<60;attempt++){
    const result=await rpc(local.port,local.authToken,
      frame("aiverse.gateway.run.get",systemId,{runId}));
    assert.equal(result.ok,true,JSON.stringify(result.error??{}));
    if(["completed","failed","canceled","blocked","budget_limited","parked"].includes(result.result.status)){
      done=result.result;break;
    }
    await pause(200);
  }
  assert.ok(done,"real deterministic Gateway run must reach terminal status");
  assert.equal(done.status,"completed","run should finish, not just be accepted");
  assert.ok(String(done.output??"").includes(marker),"actual deterministic runtime output must contain submitted unique marker");
  const storedReceipt=await canonical.store.getRun(runId);
  assert.deepEqual(done.usage,{
    inputTokens:storedReceipt.usage.input_tokens,
    outputTokens:storedReceipt.usage.output_tokens,
    actions:storedReceipt.usage.actions,
  },"Dashboard must project actual persisted canonical Gateway usage, never calculated UI numbers");
  assert.equal(done.runtimeKind,"deterministic");
  assert.equal(done.createdAt,storedReceipt.created_at);
  assert.equal(done.completedAt,storedReceipt.completed_at);
  assert.equal("cost" in done,false,
    "raw Gateway cost is not Token-verified billing and must not be projected");
  assert.equal("runtime" in done,false,"full runtime config is never browser-visible");
  assert.equal("messages" in done,false,"raw canonical internal message transcript is private");


  // An admitted Dashboard client is not automatically an owner grant for
  // destructive or paid actions. Canonical token is never exposed to browser.
  const cancelDenied=await rpc(local.port,local.authToken,
    frame("aiverse.gateway.run.cancel",systemId,{runId,sessionId:done.sessionId,
      operationId:"ci-deny-default-cancel"}));
  assert.equal(cancelDenied.ok,false);
  assert.equal(cancelDenied.error.code,"RUN_CONTROL_NOT_AUTHORIZED");
  const pauseDenied=await rpc(local.port,local.authToken,
    frame("aiverse.gateway.run.pause",systemId,{runId,sessionId:done.sessionId,
      operationId:"ci-deny-completed-pause"}));
  assert.equal(pauseDenied.ok,false);
  assert.equal(pauseDenied.error.code,"RUN_NOT_PAUSABLE");
  const wrongSystem=await rpc(local.port,local.authToken,
    frame("aiverse.gateway.run.get","not-approved",{runId}));
  assert.equal(wrongSystem.ok,false);
  assert.equal(wrongSystem.error.code,"GATEWAY_NOT_CONFIGURED");
  const wrongWorkspace={...frame("aiverse.gateway.run.get",systemId,{runId}),workspaceId:"film"};
  const foreign=await rpc(local.port,local.authToken,wrongWorkspace);
  assert.equal(foreign.ok,false);
  assert.equal(foreign.error.code,"RUN_BINDING_MISMATCH");
  const unauthenticated=await fetch("http://127.0.0.1:"+local.port+"/rpc",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify(frame("aiverse.gateway.status",systemId)),redirect:"error"
  });
  assert.equal(unauthenticated.status,401);
  const browserClient=new DashboardClient("http://127.0.0.1:"+local.port,
    {systemId,workspaceId:"operator"},local.authToken);
  const browserStatus=await browserClient.gatewayStatus();
  assert.equal(browserStatus.result.model,"aiverse");
  const browserRun=await browserClient.getGatewayRun(runId);
  assert.equal(browserRun.result.output,done.output);
  assert.equal(browserClient.cacheStats().entries,0);
  const url="ws://127.0.0.1:"+local.port+"/ws?systemId="+systemId;
  ws=new WebSocket(url,[DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol(local.authToken)]);
  await new Promise((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject)});
  const received=[];
  ws.on("message",d=>received.push(JSON.parse(String(d))));
  ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"operator",runId}));
  let terminalEvent;
  for(let i=0;i<80;i++){
    terminalEvent=received.find(x=>x.type==="event"&&x.payload?.kind==="run.completed");
    if(terminalEvent)break;
    const bad=received.find(x=>x.id==="gateway-run-subscribe"&&x.ok===false);
    if(bad)throw new Error("run event subscription failed: "+bad.error?.code);
    await pause(100);
  }
  assert.ok(terminalEvent,"real Gateway SSE must reach the authenticated Dashboard WebSocket");
  assert.equal(terminalEvent.systemId,systemId);
  assert.equal(terminalEvent.workspaceId,"operator");
  assert.ok(received.some(x=>x.type==="event"&&x.payload?.kind==="assistant.delta"));
  assert.doesNotMatch(JSON.stringify(received),/avg_|Bearer |private_data/);
  console.log(JSON.stringify({ok:true,kind:"mc2-real-gateway-transport",
    canonical_gateway_revision:GATEWAY_REVISION,
    actual_gateway_server:true,deterministic_no_external_provider:true,
    actual_run_completed:true,stored_run_verified:true,
    idempotent_run_replay:true,authenticated_ws_replay:true,
    browser_scoped_rpc:true,unauthenticated_http_denied:true,
    default_cancel_denied:true,completed_pause_denied:true,
    foreign_system_and_workspace_denied:true,owner_mac_verified:false,
    paid_provider_used:false},null,2));
} catch(e) {
  primaryError=e;
  throw e;
} finally {
  if(ws){try{ws.terminate();}catch{}}
  if(local){try{await local.close()}catch(e){if(!primaryError)throw e}}
  if(canonical){try{await canonical.close()}catch(e){if(!primaryError)throw e}}
  await rm(temp,{recursive:true,force:true,maxRetries:10,retryDelay:200});
}
