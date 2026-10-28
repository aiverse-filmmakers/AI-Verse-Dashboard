/**
 * Disposable CI-only Dashboard -> approved host -> REAL Data Canvas owner.
 * Runs unprivileged real Data SQLite (not a fake data callback).
 * No owner Mac, no private OS path, no credential, no provider permission.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {join,resolve,dirname} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {DisposableCache} from "../../dist/packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway,CanvasOwnerBridge}
  from "../../dist/apps/gateway/src/index.js";

const pin="68f642cee430dc22381033f1338398b635993972";
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
 let allowedWrites=0,executed=0;
 function createBridge(){
  return new CanvasOwnerBridge(registry,[{
    dashboardSystemId:systemId,
    authorize(facts,request){
      facts.assertLease();
      if(facts.principal!=="local-operator")return false;
      if(facts.access==="write")allowedWrites++;
      // Explicit admission from trusted local operator; negative control
      // denies deletes entirely, regardless of Dashboard/browser intent.
      return request.method!=="aiverse.canvas.delete";
    },
    execute(facts,request){
      facts.assertLease();
      executed++;
      const rootAuthority=TrustedDataRoot.fromExistingDirectory(facts.root);
      const scope=facts.workspaceId==="operator"
        ?createStandaloneDataScope(rootAuthority,"local")
        :createWorkspaceDataScope(rootAuthority,facts.workspaceId);
      // Preinstalled disposable CI paths only. Production callers must
      // use Data native initialization and owner authorization.
      const db=openScopedDataDatabase(new SqliteStorageDriver(),scope);
      try{
        const canvas=new CanvasDocuments(db.database),p=request.params;
        const args={id:p.id,expectedVersion:p.expectedVersion,
          idempotencyKey:p.idempotencyKey,actor};
        switch(request.method){
          case "aiverse.canvas.list":return canvas.list(p.limit);
          case "aiverse.canvas.get":return canvas.get(p.id);
          case "aiverse.canvas.create":return canvas.create({
            title:p.title,idempotencyKey:p.idempotencyKey,actor,
          });
          case "aiverse.canvas.rename":return canvas.rename({...args,title:p.title});
          case "aiverse.canvas.edit":return canvas.edit({...args,edit:p.edit});
          case "aiverse.canvas.delete":return canvas.delete(args);
          default:throw Error("invalid Canvas owner action");
        }
      }finally{db.database.close();}
    },
  }]);
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
 assert.equal(unauthorized.error.code,"CANVAS_ACCESS_DENIED");
 const film=await rpc(host,make(systemId,"film","aiverse.canvas.list",{limit:20}));
 assert.equal(film.ok,true);
 assert.deepEqual(film.result.document,[]);
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
 assert.equal(executed>=7,true);
 assert.equal(allowedWrites>=4,true);
 console.log(JSON.stringify({
  ok:true,kind:"canvas-real-data-owner-ci",
  real_scoped_data_sqlite:true,personal_canvas_persisted_across_host_restart:true,
  two_workspace_scope_isolated:true,stale_version_rejected:true,
  idempotent_create:true,explicit_write_authorization_enforced:true,
  upstream_credentials_in_browser:false,private_owner_mac_verified:false,
 },null,2));
}finally{
 if(host)await host.close();
 if(second)await second.close();
 await rm(root,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
