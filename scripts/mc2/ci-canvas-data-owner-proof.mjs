/**
 * Disposable CI-only Dashboard -> approved host -> REAL Data Canvas owner.
 * Runs unprivileged real Data SQLite (not a fake data callback).
 * No owner Mac, no private OS path, no credential, no provider permission.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {existsSync} from "node:fs";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway,CanvasOwnerBridge,createAdmittedCanvasDataOwner,CanvasAgentActions,createGatewayStoreCanvasRunVerifier,createCanvasOwnerPreflight}
  from "../../dist/apps/gateway/src/index.js";

const pin="d1a135a490547890e7ba54d43cf77a71f67f67b1";
const osPin="0dc744057199970a34a60c11dff192e407ad64ed";
const gatewayPin="9748dd0d5473b65ad95ef92df62fe0a13575e378";
assert.equal(process.env.CI,"true","never operate on owner machine");
assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined);
const source=resolve(process.env.AIVERSE_MC2_DATA_SOURCE||"data-source");
assert.equal(execFileSync("git",["-C",source,"rev-parse","HEAD"],{
 encoding:"utf8"}).trim(),pin);
const imp=async path=>import(pathToFileURL(join(source,"dist","src",path)).href);
const {CanvasDocuments}=await imp("canvas/index.js");
const {DataRecords}=await imp("records/index.js");
const {TrustedDataRoot,createStandaloneDataScope,createWorkspaceDataScope,
 openScopedDataDatabase,inspectScopedDataDatabase}=await imp("scope/index.js");
const {SqliteStorageDriver}=await imp("storage/index.js");
const osSource=resolve(process.env.AIVERSE_MC2_OS_SOURCE||"os-source");
assert.equal(execFileSync("git",["-C",osSource,"rev-parse","HEAD"],{
 encoding:"utf8"}).trim(),osPin);
const {evaluateActionPermission}=await import(pathToFileURL(join(osSource,"scripts","action-permission.mjs")).href);
const gatewaySource=resolve(process.env.AIVERSE_MC2_GATEWAY_SOURCE||"gateway-source");
assert.equal(execFileSync("git",["-C",gatewaySource,"rev-parse","HEAD"],{
 encoding:"utf8"}).trim(),gatewayPin);
const {GatewayStore}=await import(pathToFileURL(join(gatewaySource,"src","store.mjs")).href);
const root=await mkdtemp(join(tmpdir(),"aiverse-canvas-host-data-"));
let host,second;
const actor={kind:"human",id:"local-operator"};
async function rpc(srv,frame){
 const r=await fetch("http://127.0.0.1:"+srv.port+"/rpc",{
  method:"POST",headers:{"content-type":"application/json",
    authorization:"Bearer "+srv.authToken},body:JSON.stringify(frame),
 });
 assert.equal(r.status,200);
 return r.json();
}
const make=(systemId,workspaceId,method,params={})=>({
 type:"req",v:"1.0",id:"canvas-ci-"+method,systemId,workspaceId,method,params,
});
try{
 for(const folder of ["operator","workspaces","system",
   "workspaces/film","workspaces/film/data",".ai-verse-data"])
   await mkdir(join(root,folder),{recursive:true});
 await writeFile(join(root,"AI-VERSE.yaml"),
   'schema_version: "2.0"\narchitecture: unified-workspace\n');
 await writeFile(join(root,"AGENTS.md"),"# disposable CI OS\n");
 await writeFile(join(root,"workspaces/film","WORKSPACE.yaml"),
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
 const registry=new SystemRegistry();
 const systemId=registry.register(root).systemId;
 // The exact pinned canonical GatewayStore owns these persistent run records.
 const gatewayStore=new GatewayStore(join(root,"gateway-state"));
 await gatewayStore.init();
 const canonicalSystemId="canonical-ci-1";
 const gatewaySession=await gatewayStore.createSession({
   session_id:"ci-agent-session-1",system_id:canonicalSystemId,
   workspace_id:"operator",principal:"operator",
 });
 await gatewayStore.createRun({
   run_id:"ci-agent-run-1",session_id:gatewaySession.session_id,
   system_id:canonicalSystemId,workspace_id:"operator",principal:"operator",
   runtime:{kind:"deterministic",model:"aiverse"},
   messages:[{role:"user",content:"Move a Canvas note"}],
   budget:{max_tokens:1000,max_cost:0,max_actions:20},
   deadline_at:new Date(Date.now()+600_000).toISOString(),
 });
 gatewaySession.active_run_id="ci-agent-run-1";
 await gatewayStore.saveSession(gatewaySession);
 await gatewayStore.mutateRun("ci-agent-run-1",run=>{
   run.status="running";return run;
 });
 let osChecks=0,actorAdmits=0,operatorGrant=true,actorGrant=true;
 let agentGrant=true,agentChecks=0;
 let agentActions;
 // Pre-existing canonical Data scopes are provisioned by the Data owner.
 // A Dashboard RPC must NEVER create a new Data database implicitly.
 const native={CanvasDocuments,TrustedDataRoot,createStandaloneDataScope,
   createWorkspaceDataScope,openScopedDataDatabase,inspectScopedDataDatabase,
   SqliteStorageDriver};
 const preflight=createCanvasOwnerPreflight(registry,systemId,native);
 assert.deepEqual(preflight.inspect("operator").reason,"database-missing");
 assert.deepEqual(preflight.inspect("film").reason,"database-missing");
 assert.equal(existsSync(join(root,".ai-verse-data","data.sqlite")),false);
 assert.equal(existsSync(join(root,"workspaces","film","data","ai-verse-data.sqlite")),false);
 const trustedRoot=TrustedDataRoot.fromExistingDirectory(root);
 // Only the DISPOSABLE HOST itself provisions its canonical Data scopes.
 // Neither browser nor Dashboard Canvas RPC can do this in production.
 for(const scope of [
   createStandaloneDataScope(trustedRoot,"local"),
   createWorkspaceDataScope(trustedRoot,"film"),
 ]){
   const opened=openScopedDataDatabase(new SqliteStorageDriver(),scope,
     {mode:"create-or-open"});
   opened.database.close();
 }
 assert.equal(preflight.inspect("operator").reason,"ready");
 assert.equal(preflight.inspect("film").reason,"ready");
 await writeFile(join(root,"workspaces/film","WORKSPACE.yaml"),
   'schema_version: "2.0"\\nid: "film"\\nname: "Film"\\nstatus: "paused"\\n');
 assert.equal(preflight.inspect("film").reason,"scope-inactive");
 await writeFile(join(root,"workspaces/film","WORKSPACE.yaml"),
   'schema_version: "2.0"\\nid: "film"\\nname: "Film"\\nstatus: "active"\\n');
 function createBridge(){
  const owner=createAdmittedCanvasDataOwner(registry,{
    dashboardSystemId:systemId,native,
    // Only CI's disposable host installs this grant source. Production
    // requires an admitted native operator/OS identity authority.
    admittedActor:facts=>{
      actorAdmits++;
      return facts.principal==="verified-agent"
        ?agentGrant?{kind:"bot",id:"ci-canvas-bot"}:null
        :actorGrant?actor:null;
    },
    osPolicy:{
      operatorAdmitted:()=>operatorGrant,
      agentAdmitted:facts=>agentGrant&&facts.agent?.runId==="ci-agent-run-1",
      evaluate:input=>{osChecks++;return evaluateActionPermission(input);},
    },
  });
  const actualVerifier=createGatewayStoreCanvasRunVerifier(registry,{
    dashboardSystemId:systemId,canonicalSystemId,
    approvedPrincipal:"operator",store:gatewayStore,
    resolveAdmittedActor:facts=>agentGrant
      ?{actorKind:"bot",actorId:"ci-canvas-bot",leaseEpoch:"ci-grant-1",
        runId:facts.runId,sessionId:facts.sessionId,
        principal:facts.principal,workspaceId:facts.workspaceId}:null,
  });
  agentActions=new CanvasAgentActions(registry,owner,{
    verifyRun:async runId=>{
      agentChecks++;return actualVerifier.verifyRun(runId);
    },
  });
  return new CanvasOwnerBridge(registry,[owner]);
 }
 const start=()=>startGateway(new QueryRouter(registry,new DisposableCache()),
  new SubscriptionHub(),{port:0,canvasBridge:createBridge()});
 host=await start();
 const create=make(systemId,"operator","aiverse.canvas.create",{
  title:"Personal Canvas",idempotencyKey:"ci-create-001"});
 const first=await rpc(host,create);
 assert.equal(first.ok,true,JSON.stringify(first.error));
 const original=first.result.document;
 assert.ok(original.id.startsWith("rec_"));
 assert.equal(original.version,1);
 const retry=await rpc(host,create);
 assert.deepEqual(retry.result.document,original);
 const note=await rpc(host,make(systemId,"operator","aiverse.canvas.edit",{
  id:original.id,expectedVersion:1,idempotencyKey:"ci-edit-1",
  edit:{type:"note.add",id:"note-1",text:"Scene planning",x:40,y:50},
 }));
 assert.equal(note.ok,true,JSON.stringify(note.error));
 assert.equal(note.result.document.version,2);
 const agentResult=await agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-note-1",
   method:"aiverse.canvas.edit",params:{id:original.id,expectedVersion:2,
     edit:{type:"note.text",id:"note-1",text:"Agent updated shot"}},
 });
 assert.equal(agentResult.document.version,3);
 // Data-owned atomic duplicate is a SINGLE owner effect, not a sequence
 // of provisional note/edge writes from a browser.
 const atomic=make(systemId,"operator","aiverse.canvas.duplicate",{
   id:original.id,expectedVersion:3,title:"Shot copy",
   idempotencyKey:"ci-atomic-clone-001",
 });
 const cloned=await rpc(host,atomic);
 assert.equal(cloned.ok,true,JSON.stringify(cloned.error));
 assert.equal(cloned.result.document.title,"Shot copy");
 assert.equal(cloned.result.document.version,1);
 assert.notEqual(cloned.result.document.id,original.id);
 assert.deepEqual(cloned.result.document.board,agentResult.document.board);
 const replayClone=await rpc(host,atomic);
 assert.deepEqual(replayClone.result.document,cloned.result.document);
 const staleClone=await rpc(host,make(systemId,"operator","aiverse.canvas.duplicate",{
   id:original.id,expectedVersion:2,idempotencyKey:"ci-atomic-stale-002",
 }));
 assert.equal(staleClone.ok,false);
 assert.equal(staleClone.error.code,"RECORD_VERSION_CONFLICT");

 assert.equal(agentResult.workspaceId,"operator");
 const scoped=openScopedDataDatabase(new SqliteStorageDriver(),
   createStandaloneDataScope(trustedRoot,"local"),{mode:"open-existing"});
 try{
   const snapshot=new DataRecords(scoped.database).get({
     spaceId:"creative-canvas",entity:"documents",recordId:original.id});
   assert.equal(snapshot.updatedBy.kind,"bot");
   assert.equal(snapshot.updatedBy.id,"ci-canvas-bot");
 }finally{scoped.database.close();}
 const versions=await rpc(host,make(systemId,"operator","aiverse.canvas.history",{
  id:original.id,limit:20,
 }));
 assert.equal(versions.ok,true,JSON.stringify(versions.error));
 assert.deepEqual(versions.result.document.map(x=>x.version),[3,2,1]);
 const historyPage=await rpc(host,make(systemId,"operator","aiverse.canvas.history",{
   id:original.id,limit:1,beforeVersion:3,
 }));
 assert.equal(historyPage.ok,true,JSON.stringify(historyPage.error));
 assert.deepEqual(historyPage.result.document.map(x=>x.version),[2]);
 const historyPageNext=await rpc(host,make(systemId,"operator","aiverse.canvas.history",{
   id:original.id,limit:1,beforeVersion:2,
 }));
 assert.equal(historyPageNext.ok,true,JSON.stringify(historyPageNext.error));
 assert.deepEqual(historyPageNext.result.document.map(x=>x.version),[1]);
 const foreignCursor=await rpc(host,make(systemId,"operator","aiverse.canvas.history",{
   id:original.id,limit:20,beforeVersion:1,
 }));
 assert.equal(foreignCursor.ok,false);
 assert.equal(foreignCursor.error.code,"INVALID_ENVELOPE");
 const forgedCursor=await rpc(host,make(systemId,"operator","aiverse.canvas.history",{
   id:original.id,limit:20,beforeVersion:3,actor:{kind:"bot",id:"root"},
 }));
 assert.equal(forgedCursor.ok,false);
 assert.equal(forgedCursor.error.code,"INVALID_ENVELOPE");

 assert.equal(versions.result.document[1].board.nodes[0].text,"Scene planning");
 const agentHistory=await agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-history-1",
   method:"aiverse.canvas.history",params:{id:original.id,limit:5},
 });
 assert.equal(agentHistory.document.length,3);
 await assert.rejects(()=>agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-revert-forbidden",
   method:"aiverse.canvas.revert",
   params:{id:original.id,expectedVersion:3,toVersion:2},
 }),/CANVAS_AGENT_ACTION_INVALID/);
 const revert=make(systemId,"operator","aiverse.canvas.revert",{
   id:original.id,expectedVersion:3,toVersion:2,
   idempotencyKey:"ci-revert-3-to-2",
 });
 const restored=await rpc(host,revert);
 assert.equal(restored.ok,true,JSON.stringify(restored.error));
 assert.equal(restored.result.document.version,4);
 assert.equal(restored.result.document.board.nodes[0].text,"Scene planning");
 assert.deepEqual((await rpc(host,revert)).result.document,restored.result.document,
   "same Data undo idempotency key must replay one new version");
 const staleUndo=await rpc(host,make(systemId,"operator","aiverse.canvas.revert",{
   id:original.id,expectedVersion:3,toVersion:1,
   idempotencyKey:"ci-revert-stale",
 }));
 assert.equal(staleUndo.ok,false);
 assert.equal(staleUndo.error.code,"RECORD_VERSION_CONFLICT");
 const noSpoof=await rpc(host,make(systemId,"operator","aiverse.canvas.revert",{
   id:original.id,expectedVersion:4,toVersion:1,
   idempotencyKey:"ci-revert-forged-board",
   board:{nodes:[],edges:[]},
 }));
 assert.equal(noSpoof.ok,false);
 assert.equal(noSpoof.error.code,"INVALID_ENVELOPE");
 const finalHistory=await rpc(host,make(systemId,"operator","aiverse.canvas.history",{
   id:original.id,limit:20,
 }));
 assert.deepEqual(finalHistory.result.document.map(x=>x.version),[4,3,2,1]);
 await assert.rejects(()=>agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-forged-1",
   method:"aiverse.canvas.edit",params:{id:original.id,expectedVersion:3,
     actor:"forged",edit:{type:"note.text",id:"note-1",text:"forged"}},
 }),/CANVAS_AGENT_ACTION_INVALID/);
 await assert.rejects(()=>agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-delete-1",
   method:"aiverse.canvas.delete",params:{id:original.id,expectedVersion:3},
 }),/CANVAS_AGENT_ACTION_INVALID/);
 agentGrant=false;
 await assert.rejects(()=>agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-grant-denied-1",
   method:"aiverse.canvas.edit",params:{id:original.id,expectedVersion:3,
     edit:{type:"note.text",id:"note-1",text:"unauthorized"}},
 }),/CANVAS_AGENT_ACCESS_DENIED/);
 agentGrant=true;
 await gatewayStore.mutateRun("ci-agent-run-1",run=>{
   run.status="canceled";return run;
 });
 await assert.rejects(()=>agentActions.invoke({
   runId:"ci-agent-run-1",operationId:"ci-agent-run-stopped-1",
   method:"aiverse.canvas.edit",params:{id:original.id,expectedVersion:3,
     edit:{type:"note.text",id:"note-1",text:"finished"}},
 }),/CANVAS_AGENT_ACCESS_DENIED/);
 const stale=await rpc(host,make(systemId,"operator","aiverse.canvas.edit",{
  id:original.id,expectedVersion:1,idempotencyKey:"ci-edit-stale",
  edit:{type:"note.move",id:"note-1",x:70,y:90},
 }));
 assert.equal(stale.ok,false);
 assert.equal(stale.error.code,"RECORD_VERSION_CONFLICT");
 const unauthorized=await rpc(host,make(systemId,"operator","aiverse.canvas.delete",{
  id:original.id,expectedVersion:2,idempotencyKey:"ci-delete-deny",
 }));
 assert.equal(unauthorized.ok,false);
 assert.equal(unauthorized.error.code,"CANVAS_ACCESS_DENIED",
   "OS default destructive action requires confirmation, not auto-approval");
 const film=await rpc(host,make(systemId,"film","aiverse.canvas.list",{limit:20}));
 assert.equal(film.ok,true);
 assert.deepEqual(film.result.document,[]);
 await writeFile(join(root,"workspaces","film","WORKSPACE.yaml"),
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "paused"\n');
 const paused=await rpc(host,make(systemId,"film","aiverse.canvas.list",{limit:20}));
 assert.equal(paused.ok,false);
 assert.equal(paused.error.code,"CANVAS_ACCESS_DENIED");
 await writeFile(join(root,"workspaces","film","WORKSPACE.yaml"),
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
 // A declared workspace without a provisioned Data SQLite must fail closed.
 await mkdir(join(root,"workspaces","empty"),{recursive:true});
 await writeFile(join(root,"workspaces","empty","WORKSPACE.yaml"),
   'schema_version: "2.0"\nid: "empty"\nname: "Empty"\nstatus: "active"\n');
 const unprovisioned=await rpc(host,make(systemId,"empty","aiverse.canvas.list",{limit:10}));
 assert.equal(unprovisioned.ok,false);
 assert.equal(unprovisioned.error.code,"CANVAS_OWNER_UNAVAILABLE");
 const cross=await rpc(host,make(systemId,"film","aiverse.canvas.get",{id:original.id}));
 assert.equal(cross.ok,false);
 assert.equal(cross.error.code,"RECORD_NOT_FOUND");
 assert.equal(JSON.stringify(first).includes(root),false);
 await host.close();host=undefined;
 second=await start();
 const resumed=await rpc(second,make(systemId,"operator","aiverse.canvas.get",{
  id:original.id,
 }));
 assert.equal(resumed.ok,true,JSON.stringify(resumed.error));
 assert.equal(resumed.result.document.id,original.id);
 assert.equal(resumed.result.document.version,4);
 assert.deepEqual(resumed.result.document.board.nodes,[{
  id:"note-1",kind:"note",text:"Scene planning",x:40,y:50,
 }]);
 assert.ok(actorAdmits>10,"live actor grants must be independently checked");
 assert.ok(agentChecks>3,"trusted agent run must be freshly verified");
 assert.ok(osChecks>10,"actual OS evaluator must guard host read and final write edge");
 operatorGrant=false;
 const revoked=await rpc(second,make(systemId,"operator","aiverse.canvas.get",{id:original.id}));
 assert.equal(revoked.ok,false);
 assert.equal(revoked.error.code,"CANVAS_ACCESS_DENIED");
 operatorGrant=true;
 actorGrant=false;
 const actorRevoked=await rpc(second,make(systemId,"operator","aiverse.canvas.get",{
   id:original.id,
 }));
 assert.equal(actorRevoked.ok,false);
 assert.equal(actorRevoked.error.code,"CANVAS_ACCESS_DENIED");
 actorGrant=true;
 console.log(JSON.stringify({
  ok:true,kind:"canvas-real-data-owner-ci",
  real_scoped_data_sqlite:true,personal_canvas_persisted_across_host_restart:true,
  two_workspace_scope_isolated:true,stale_version_rejected:true,
  idempotent_create:true,explicit_write_authorization_enforced:true,
  real_os_permission_evaluator_at_effect_edge:true,
  os_paused_workspace_denied:true,os_destructive_confirmation_denied:true,
  revoked_operator_grant_denied:true,revoked_actor_grant_denied:true,
  existing_data_database_required:true,
  real_data_readonly_preflight_no_auto_provision:true,
  scoped_preflight_active_manifest_required:true,
  atomic_duplicate_one_data_effect:true,duplicate_source_version_guard:true,
  canonical_revision_history:true,versioned_undo_persists_across_restart:true,
  indexed_history_keyset_pages:true,invalid_cursor_and_forged_actor_denied:true,
  stale_undo_denied:true,agent_can_read_but_cannot_revert:true,
  agent_write_via_same_data_owner:true,verified_agent_bot_provenance:true,
  real_gateway_store_run_and_session_admission:true,
  revoked_agent_run_denied:true,agent_delete_without_approval_denied:true,
  upstream_credentials_in_browser:false,private_owner_mac_verified:false,
 },null,2));
}finally{
 if(host)await host.close();
 if(second)await second.close();
 await rm(root,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
