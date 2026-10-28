import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {DisposableCache} from "../packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway,CanvasOwnerBridge,
  type CanvasHostFacts,type CanvasHostRequest} from "../apps/gateway/src/index.js";
import {LocalApplicationSession} from "../apps/gateway/src/local-app-session.js";

const roots:string[]=[];
const closers:Array<()=>Promise<void>>=[];
afterEach(async()=>{
  for(const c of closers.splice(0).reverse())await c();
  for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});
});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"canvas-host-test-"));roots.push(root);
 writeFileSync(join(root,"AI-VERSE.yaml"),'schema_version: "2.0"\narchitecture: unified-workspace\n');
 writeFileSync(join(root,"AGENTS.md"),"test fixture");
 for(const dir of ["operator","workspaces","system"])mkdirSync(join(root,dir));
 mkdirSync(join(root,"workspaces","filmmaking"));
 writeFileSync(join(root,"workspaces","filmmaking","WORKSPACE.yaml"),
  'schema_version: "2.0"\nid: "filmmaking"\nname: "Filmmaking"\nstatus: "active"\n');
 const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
 return {root,registry,systemId};
}
function frame(method:string,systemId:string,workspaceId:string,params:unknown={}){
 return {type:"req",v:"1.0",id:"canvas-req-001",method,systemId,workspaceId,params};
}
async function call(port:number,method:string,frame:unknown,headers:Record<string,string>={}){
 const result=await fetch("http://127.0.0.1:"+port+"/rpc",{
  method,headers:{"content-type":"application/json",...headers},body:JSON.stringify(frame),
 });
 return {status:result.status,body:await result.json() as Record<string,unknown>};
}
function documentProjection(){
 return {id:"rec_1234",title:"Library scene",version:1,createdAt:"2026-10-28T13:00:00Z",
  updatedAt:"2026-10-28T13:00:00Z",board:{nodes:[],edges:[]},
  privateRoot:"/secret/root",bearer:"secret-credential"};
}
describe("Canvas host owner routing, authorization and fail-closed behavior",()=>{
 it("refuses operations by default, including valid privileged local bearer",async()=>{
  const {registry,systemId}=fixture();
  const host=await startGateway(new QueryRouter(registry,new DisposableCache()),
   new SubscriptionHub(),{port:0});
  closers.push(()=>host.close());
  const request=frame("aiverse.canvas.create",systemId,"operator",{
    title:"First",idempotencyKey:"first-key"});
  const missing=await call(host.port,"POST",request,{
   authorization:"Bearer "+host.authToken});
  assert.equal(missing.status,200);
  assert.equal((missing.body.error as {code:string}).code,"CANVAS_OWNER_UNAVAILABLE");
  const unauth=await call(host.port,"POST",request);
  assert.equal(unauth.status,401);
  assert.equal(missing.body.ok,false);
 });
 it("restricts each request to approved system and manifest workspace; filters owner secrets",async()=>{
  const {root,registry,systemId}=fixture();
  let authorized=0,executed=0;
  const bridge=new CanvasOwnerBridge(registry,[{
   dashboardSystemId:systemId,
   authorize(facts:CanvasHostFacts,request:CanvasHostRequest){
    facts.assertLease();authorized++;
    assert.equal(facts.root,realpathSync(root));
    assert.equal(facts.principal,"local-operator");
    assert.ok(["read","write"].includes(facts.access));
    assert.ok(!JSON.stringify(request.params).includes(root));
    return facts.access==="read"||request.method==="aiverse.canvas.create";
   },
   execute(facts:CanvasHostFacts,request:CanvasHostRequest){
    facts.assertLease();executed++;
    assert.equal(facts.systemId,systemId);
    assert.ok(request.params);
    return documentProjection();
   },
  }]);
  const app=new LocalApplicationSession({systemId,workspaceId:"operator"});
  const host=await startGateway(new QueryRouter(registry,new DisposableCache()),
    new SubscriptionHub(),{port:0,canvasBridge:bridge,localApp:app});
  closers.push(()=>host.close());
  const origin="http://127.0.0.1:"+host.port;
  const pairing=await fetch(origin+"/local-app/pair",{
    method:"POST",headers:{origin,"content-type":"application/json"},
    body:JSON.stringify({code:app.pairingCode()}),
  });
  assert.equal(pairing.status,200);
  const cookie=(pairing.headers.get("set-cookie")??"").split(";")[0];
  const headers={cookie,origin};
  const list=await call(host.port,"POST",
    frame("aiverse.canvas.get",systemId,"operator",{id:"rec_1234"}),headers);
  assert.equal(list.status,200);
  assert.equal(list.body.ok,true);
  assert.equal((list.body.result as {source:string}).source,"canonical-data");
  assert.ok(!JSON.stringify(list.body).includes("/secret/root"));
  assert.ok(!JSON.stringify(list.body).includes("secret-credential"));
  const created=await call(host.port,"POST",
    frame("aiverse.canvas.create",systemId,"operator",{title:"First",idempotencyKey:"key-1"}),headers);
  assert.equal(created.body.ok,true);
  const denied=await call(host.port,"POST",
    frame("aiverse.canvas.delete",systemId,"operator",{
     id:"rec_1234",expectedVersion:1,idempotencyKey:"delete-1"}),headers);
  assert.equal((denied.body.error as {code:string}).code,"CANVAS_ACCESS_DENIED");
  const wrongWorkspace=await call(host.port,"POST",
    frame("aiverse.canvas.get",systemId,"filmmaking",{id:"rec_1234"}),headers);
  assert.equal(wrongWorkspace.status,403);
  const wrongSystem=await call(host.port,"POST",
    frame("aiverse.canvas.get","invalid-system","operator",{id:"rec_1234"}),headers);
  assert.equal(wrongSystem.status,403);
  assert.equal(executed,2);
  assert.equal(authorized,3);
 });
 it("rejects forged principal, root, source, invalid edits and absent workspace",async()=>{
  const {registry,systemId}=fixture();
  let executed=0;
  const bridge=new CanvasOwnerBridge(registry,[{
    dashboardSystemId:systemId,authorize:()=>true,
    execute:()=>{executed++;return documentProjection();},
  }]);
  const host=await startGateway(new QueryRouter(registry,new DisposableCache()),
   new SubscriptionHub(),{port:0,canvasBridge:bridge});
  closers.push(()=>host.close());
  const h={authorization:"Bearer "+host.authToken};
  const frames=[
   frame("aiverse.canvas.edit",systemId,"operator",{
     id:"rec_1234",expectedVersion:1,idempotencyKey:"bad-1",
     edit:{type:"note.move",id:"a",x:Infinity,y:0}}),
   frame("aiverse.canvas.create",systemId,"operator",{
     title:"First",idempotencyKey:"bad-2",principal:"forged"}),
   frame("aiverse.canvas.create",systemId,"operator",{
     title:"First",idempotencyKey:"bad-3",root:"/etc"}),
   frame("aiverse.canvas.create",systemId,"operator",{
     title:"First",idempotencyKey:"bad-4",source:"canonical-data"}),
   frame("aiverse.canvas.edit",systemId,"operator",{
     id:"rec_1234",expectedVersion:1,idempotencyKey:"bad-5",
     edit:{type:"tool.run",command:"rm -rf /"}}),
   frame("aiverse.canvas.duplicate",systemId,"operator",{
     id:"rec_1234",expectedVersion:1,idempotencyKey:"forged-clone",
     board:{nodes:[{id:"fake",text:"privileged"}]},
   }),
   frame("aiverse.canvas.duplicate",systemId,"operator",{
     id:"rec_1234",expectedVersion:-1,idempotencyKey:"bad-version",
   }),
   frame("aiverse.canvas.duplicate",systemId,"operator",{
     id:"rec_1234",expectedVersion:1,idempotencyKey:"bad-root",
     root:"/etc/private",
   }),
   frame("aiverse.canvas.unknown",systemId,"operator",{}),
  ];
  for(const input of frames){
   const result=await call(host.port,"POST",input,h);
   assert.equal(result.body.ok,false,JSON.stringify(input));
  }
  const missingWorkspace=await call(host.port,"POST",
   frame("aiverse.canvas.get",systemId,"not-here",{id:"rec_1234"}),h);
  assert.equal(missingWorkspace.body.ok,false);
  assert.equal(executed,0,"no owner effect on invalid or unregistered frames");
 });
});
