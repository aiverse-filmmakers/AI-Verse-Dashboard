/**
 * Disposable CI-only Dashboard -> approved host -> REAL Data Canvas owner.
 * Runs unprivileged real Data SQLite (not a fake data callback).
 * No owner Mac, no private OS path, no credential, no provider permission.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway,CanvasOwnerBridge,createAdmittedCanvasDataOwner}
  from "../../dist/apps/gateway/src/index.js";

const pin="68f642cee430dc22381033f1338398b635993972";
const osPin="0dc744057199970a34a60c11dff192e407ad64ed";
assert.equal(process.env.CI,"true","never operate on owner machine");
assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined);
const source=resolve(process.env.AIVERSE_MC2_DATA_SOURCE||"data-source");
assert.equal(execFileSync("git",["-C",source,"rev-parse","HEAD"],{
 encoding:"utf8"}).trim(),pin);
const imp=async path=>import(pathToFileURL(join(source,"dist","src",path)).href);
const {CanvasDocuments}=await imp("canvas/index.js");
const {TrustedDataRoot,createStandaloneDataScope,createWorkspaceDataScope,
 openScopedDataDatabase}=await imp("scope/index.js");
const {SqliteStorageDriver}=await imp("storage/index.js");
const osSource=resolve(process.env.AIVERSE_MC2_OS_SOURCE||"os-source");
assert.equal(execFileSync("git",["-C",osSource,"rev-parse","HEAD"],{
 encoding:"utf8"}).trim(),osPin);
const {evaluateActionPermission}=await import(pathToFileURL(join(osSource,"scripts","action-permission.mjs")).href);
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
 let osChecks=0,actorAdmits=0,operatorGrant=true,actorGrant=true;
 // Pre-existing canonical Data scopes are provisioned by the Data owner.
 // A Dashboard RPC must NEVER create a new Data database implicitly.
 const native={CanvasDocuments,TrustedDataRoot,createStandaloneDataScope,
   createWorkspaceDataScope,openScopedDataDatabase,SqliteStorageDriver};
 const trustedRoot=TrustedDataRoot.fromExistingDirectory(root);
 for(const scope of [
   createStandaloneDataScope(trustedRoot,"local"),
   createWorkspaceDataScope(trustedRoot,"film"),
 ]){
   const opened=openScopedDataDatabase(new SqliteStorageDriver(),scope,
     {mode:"create-or-open"});
   opened.database.close();
 }
 function createBridge(){
  const owner=createAdmittedCanvasDataOwner(registry,{
    dashboardSystemId:systemId,native,
    // Only CI's disposable host installs this grant source. Production
    // requires an admitted native operator/OS identity authority.
    admittedActor:()=>{
      actorAdmits++;
      return actorGrant?actor:null;
    },
    osPolicy:{
      operatorAdmitted:()=>operatorGrant,
      evaluate:input=>{osChecks++;return evaluateActionPermission(input);},
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
 assert.equal(resumed.result.document.version,2);
 assert.deepEqual(resumed.result.document.board.nodes,[{
  id:"note-1",kind:"note",text:"Scene planning",x:40,y:50,
 }]);
 assert.ok(actorAdmits>10,"live actor grants must be independently checked");
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
  upstream_credentials_in_browser:false,private_owner_mac_verified:false,
 },null,2));
}finally{
 if(host)await host.close();
 if(second)await second.close();
 await rm(root,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
