import test,{afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {CanvasAgentActions,CanvasContextReader,CanvasAgentToolCoordinator,
  type ApprovedCanvasOwner,type CanvasHostFacts}
  from "../apps/gateway/src/index.js";
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(r=>rmSync(r,{force:true,recursive:true})));
const stamp="2026-10-29T01:00:00.000Z";
const initial=()=>({id:"canvas-1",title:"Scene details",version:3,
 createdAt:stamp,updatedAt:stamp,
 board:{nodes:[
 {id:"note-a",kind:"note",text:"Select exact angle",x:10,y:20},
 {id:"note-b",kind:"note",text:"PRIVATE unselected note",x:45,y:50},
 {id:"note-c",kind:"note",text:"Another note",x:100,y:150}],
 edges:[{id:"edge-ab",from:"note-a",to:"note-b"}],
 groups:[{id:"group-main",label:"Camera pair",nodeIds:["note-a","note-b"]}]},
 ownerSecret:"SHOULD-NEVER-APPEAR"});
function fixture(){
 const root=realpathSync(mkdtempSync(join(tmpdir(),"canvas-tool-coordinator-")));
 roots.push(root);
 for(const p of ["operator","workspaces","workspaces/film","system"])
  mkdirSync(join(root,p),{recursive:true});
 writeFileSync(join(root,"AI-VERSE.yaml"),
  'schema_version: "2.0"\narchitecture: unified-workspace\n');
 writeFileSync(join(root,"AGENTS.md"),"# test");
 const manifest=join(root,"workspaces/film/WORKSPACE.yaml");
 const status=(x:string)=>writeFileSync(manifest,
  'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "'+x+'"\n');
 status("active");
 const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
 let doc:any=initial(),grant=true,runState="running",actorId="agent-a",
   leaseEpoch="epoch-1",runWorkspace="operator",humanLease=true,reads=0,
   writes=0,auth=0,runChecks=0,delay:()=>void|Promise<void>=()=>{};
 const owner:ApprovedCanvasOwner={
  dashboardSystemId:systemId,
  async authorize(_facts,request){auth++;return grant&&
    ["aiverse.canvas.get","aiverse.canvas.edit"].includes(request.method);},
  async execute(_facts,request){
   await delay();
   if(request.method==="aiverse.canvas.get"){reads++;return doc;}
   if(request.method!=="aiverse.canvas.edit")throw Error("unexpected method");
   const p=request.params as any;
   if(p.expectedVersion!==doc.version)throw Object.assign(
     Error("RECORD_VERSION_CONFLICT"),{code:"RECORD_VERSION_CONFLICT"});
   if(p.edit?.type==="note.text"){
     const n=doc.board.nodes.find(x=>x.id===p.edit.id);
     if(!n)throw Error("missing");
     doc={...doc,version:doc.version+1,
      board:{...doc.board,nodes:doc.board.nodes.map(x=>
        x.id===n.id?{...x,text:p.edit.text}:x)}};
   }else if(p.edit?.type==="group.rename"){
     const g=doc.board.groups.find(x=>x.id===p.edit.id);
     if(!g)throw Error("missing group");
     doc={...doc,version:doc.version+1,board:{...doc.board,
       groups:doc.board.groups.map(x=>x.id===g.id?
         {...x,label:p.edit.label}:x)}};
   }else if(p.edit?.type==="group.move"){
     const g=doc.board.groups.find(x=>x.id===p.edit.id);
     if(!g)throw Error("missing group");
     doc={...doc,version:doc.version+1,board:{...doc.board,
       nodes:doc.board.nodes.map(x=>g.nodeIds.includes(x.id)?
         {...x,x:x.x+p.edit.dx,y:x.y+p.edit.dy}:x)}};
   }else throw Error("unexpected edit");
   writes++;return doc;
  },
 };
 const reader=new CanvasContextReader(registry,owner);
 const actions=new CanvasAgentActions(registry,owner,{
  async verifyRun(runId){
   runChecks++;
   return runState==="running"?{
    source:"canonical-gateway" as const,state:"running" as const,
    runId,actorId,leaseEpoch,systemId,workspaceId:runWorkspace,
   }:null;
  },
 });
 const coordinator=new CanvasAgentToolCoordinator(reader,actions);
 const facts:CanvasHostFacts={systemId,workspaceId:"operator",root,
  principal:"local-operator",access:"read",assertLease(){
   if(!humanLease)throw Error("revoked");}};
 const input=(changes:Record<string,unknown>={})=>({
  runId:"run-a",hostFacts:facts,selection:{
   documentId:"canvas-1",selectedNodeIds:["note-a"],
   selectedEdgeIds:["edge-ab"],selectedGroupIds:["group-main"],expectedVersion:3},...changes,
 });
 const proposal=(changes:Record<string,unknown>={}):any=>({
  kind:"selected-note.replace-text",operationId:"change-1",noteId:"note-a",
  text:"Camera moves to right",...changes,
 });
 return {root,registry,systemId,manifest,status,reader,actions,coordinator,
  facts,input,proposal,doc:()=>doc,counts:()=>({reads,writes,auth,runChecks}),
  setDoc:(v:any)=>{doc=v},setGrant:(v:boolean)=>{grant=v},
  setRun:(v:string)=>{runState=v},setActor:(v:string)=>{actorId=v},
  setEpoch:(v:string)=>{leaseEpoch=v},setRunWorkspace:(v:string)=>{runWorkspace=v},
  setHumanLease:(v:boolean)=>{humanLease=v},
  duringRead:(fn:()=>void|Promise<void>)=>{delay=fn},
 };
}
async function open(f:ReturnType<typeof fixture>){
 return f.coordinator.open(f.input());
}
async function denied(p:Promise<unknown>,code="CANVAS_TOOL_DENIED"){
 await assert.rejects(p,new RegExp(code));
}
test("host coordinator opens selection after two separate owner and bot reads",async()=>{
 const f=fixture();const h=await open(f);
 assert.equal(f.coordinator.describe(h).document.version,3);
 assert.equal(f.counts().reads,2);
});
test("model view marks Canvas text untrusted",async()=>{
 const f=fixture();const h=await open(f);
 assert.equal(f.coordinator.describe(h).trust,"canvas-text-is-untrusted-data");
 assert.equal(f.coordinator.describe(h).selection.notes[0].trust,"untrusted-canvas-text");
});
test("model view contains only chosen note text, not another note",async()=>{
 const f=fixture();const h=await open(f);
 const v=JSON.stringify(f.coordinator.describe(h));
 assert.ok(v.includes("Select exact angle"));
 assert.ok(!v.includes("PRIVATE unselected note"));
});
test("model view strips Data owner secret",async()=>{
 const f=fixture();const h=await open(f);
 assert.ok(!JSON.stringify(f.coordinator.describe(h)).includes("SHOULD-NEVER-APPEAR"));
});
test("model view strips root and native credentials",async()=>{
 const f=fixture();const h=await open(f);
 assert.ok(!JSON.stringify(f.coordinator.describe(h)).includes(f.root));
});
test("model view includes only selected edges",async()=>{
 const f=fixture(),h=await open(f);
 assert.deepEqual(f.coordinator.describe(h).selection.edges,[
  {id:"edge-ab",from:"note-a",to:"note-b"}]);
});
test("model view is deeply frozen at the public boundary",async()=>{
 const f=fixture(),h=await open(f),v=f.coordinator.describe(h);
 assert.ok(Object.isFrozen(v)&&Object.isFrozen(v.document)&&Object.isFrozen(v.selection));
});
test("handle is not portable through JSON serialization",async()=>{
 const f=fixture(),h=await open(f);
 const clone=JSON.parse(JSON.stringify(h));
 await denied(f.coordinator.execute(clone,f.proposal()));
});
test("a constructor-shaped forged handle is denied",async()=>{
 const f=fixture();
 await denied(f.coordinator.execute({kind:"native-canvas-tool-handle"},f.proposal()));
});
test("null handle cannot access any selected note",async()=>{
 const f=fixture();
 await denied(f.coordinator.execute(null as any,f.proposal()));
});
test("closed handle loses access immediately",async()=>{
 const f=fixture(),h=await open(f);
 f.coordinator.close(h);
 await denied(f.coordinator.execute(h,f.proposal()));
});
test("double close denies instead of granting a new capability",async()=>{
 const f=fixture(),h=await open(f);f.coordinator.close(h);
 assert.throws(()=>f.coordinator.close(h),/CANVAS_TOOL_DENIED/);
});
test("post-close describe is denied",async()=>{
 const f=fixture(),h=await open(f);f.coordinator.close(h);
 assert.throws(()=>f.coordinator.describe(h),/CANVAS_TOOL_DENIED/);
});
test("a valid proposal invokes real agent Canvas action path",async()=>{
 const f=fixture(),h=await open(f);
 const result=await f.coordinator.execute(h,f.proposal());
 assert.equal(result.document&&typeof result.document==="object"?
   (result.document as any).version:0,4);
 assert.equal(f.doc().board.nodes[0].text,"Camera moves to right");
 assert.equal(f.counts().writes,1);
});
test("proposal cannot edit unselected notes",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({noteId:"note-b"})),"CANVAS_TOOL_INVALID");
 assert.equal(f.counts().writes,0);
});
test("proposal cannot change the document ID",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({documentId:"other"})),"CANVAS_TOOL_INVALID");
});
test("proposal cannot submit an OS filesystem path",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({root:"/tmp/owner"})),"CANVAS_TOOL_INVALID");
});
test("proposal cannot supply owner approval or a new actor",async()=>{
 const f=fixture(),h=await open(f);
 for(const x of [{approval:true},{actor:"owner"},{principal:"admin"}]){
  await denied(f.coordinator.execute(h,f.proposal(x)),"CANVAS_TOOL_INVALID");
 }
});
test("proposal cannot choose a new system or workspace",async()=>{
 const f=fixture(),h=await open(f);
 for(const x of [{systemId:"other"},{workspaceId:"other"}]){
  await denied(f.coordinator.execute(h,f.proposal(x)),"CANVAS_TOOL_INVALID");
 }
});
test("proposal cannot inject idempotency key",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({idempotencyKey:"override"})),"CANVAS_TOOL_INVALID");
});
test("proposal rejects an unsupported action kind",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({kind:"delete-all"})),"CANVAS_TOOL_INVALID");
});
test("proposal rejects unbounded note text",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({text:"x".repeat(5001)})),"CANVAS_TOOL_INVALID");
});
test("proposal rejects malformed note IDs",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({noteId:"../unsafe"})),"CANVAS_TOOL_INVALID");
});
test("proposal rejects malformed operation IDs",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({operationId:"bad/path"})),"CANVAS_TOOL_INVALID");
});
test("proposal rejects absent operation IDs",async()=>{
 const f=fixture(),h=await open(f);
 const p=f.proposal();delete (p as any).operationId;
 await denied(f.coordinator.execute(h,p as any),"CANVAS_TOOL_INVALID");
});
test("proposal rejects object disguised as text",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,f.proposal({text:{body:"fake"}})),"CANVAS_TOOL_INVALID");
});
test("proposal rejects array payloads",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,[f.proposal()] as any),"CANVAS_TOOL_INVALID");
});
test("proposal rejects a revoked agent run at execution",async()=>{
 const f=fixture(),h=await open(f);f.setRun("canceled");
 await assert.rejects(f.coordinator.execute(h,f.proposal()),/CANVAS_AGENT_ACCESS_DENIED/);
 assert.equal(f.counts().writes,0);
});
test("proposal rejects a changed run actor at execution",async()=>{
 const f=fixture(),h=await open(f);f.setActor("");
 await assert.rejects(f.coordinator.execute(h,f.proposal()),/CANVAS_AGENT_ACCESS_DENIED/);
});
test("proposal rejects a now-revoked Data/OS grant",async()=>{
 const f=fixture(),h=await open(f);f.setGrant(false);
 await assert.rejects(f.coordinator.execute(h,f.proposal()),/CANVAS_AGENT_ACCESS_DENIED/);
 assert.equal(f.counts().writes,0);
});
test("proposal rejects stale canonical document version",async()=>{
 const f=fixture(),h=await open(f),old=f.doc();
 f.setDoc({...old,version:4});
 await assert.rejects(f.coordinator.execute(h,f.proposal()),/RECORD_VERSION_CONFLICT/);
 assert.equal(f.counts().writes,0);
});
test("scope change between opening and execution is rejected",async()=>{
 const f=fixture(),h=await open(f);f.setRunWorkspace("film");
 await assert.rejects(f.coordinator.execute(h,f.proposal()),/CANVAS_AGENT_ACCESS_DENIED/);
});
test("aborted controller prevents opening before any owner read",async()=>{
 const f=fixture(),ac=new AbortController();ac.abort();
 await assert.rejects(f.coordinator.open(f.input(),ac.signal),/CANVAS_AGENT_ACCESS_DENIED/);
 assert.equal(f.counts().reads,0);
});
test("aborted controller prevents execution and Data write",async()=>{
 const f=fixture(),h=await open(f),ac=new AbortController();ac.abort();
 await assert.rejects(f.coordinator.execute(h,f.proposal(),ac.signal),/CANVAS_AGENT_ACCESS_DENIED/);
 assert.equal(f.counts().writes,0);
});
test("open rejects arbitrary browser-selected principal",async()=>{
 const f=fixture();
 await denied(f.coordinator.open(f.input({principal:"root"})),"CANVAS_TOOL_INVALID");
});
test("open rejects an arbitrary browser-selected secret",async()=>{
 const f=fixture();
 await denied(f.coordinator.open(f.input({token:"secret"})),"CANVAS_TOOL_INVALID");
});
test("open rejects nonexistent selection target",async()=>{
 const f=fixture();
 await assert.rejects(f.coordinator.open(f.input({
  selection:{documentId:"missing",selectedNodeIds:["note-a"]},
 })),/CANVAS_CONTEXT_DENIED|CANVAS_TOOL_DENIED/);
});
test("open rejects stale selected revision",async()=>{
 const f=fixture();
 await assert.rejects(f.coordinator.open(f.input({
  selection:{documentId:"canvas-1",expectedVersion:2,selectedNodeIds:["note-a"]},
 })),/CANVAS_CONTEXT_DENIED|CANVAS_TOOL_DENIED/);
});
test("open refuses running bot bound to another workspace",async()=>{
 const f=fixture();f.setRunWorkspace("film");
 await denied(f.coordinator.open(f.input()));
});
test("open refuses running bot with no OS grant",async()=>{
 const f=fixture();f.setGrant(false);
 await assert.rejects(f.coordinator.open(f.input()),/CANVAS_AGENT_ACCESS_DENIED/);
});
test("open rejects expired human operator lease after Gateway verification",async()=>{
 const f=fixture();f.setHumanLease(false);
 await assert.rejects(f.coordinator.open(f.input()),/CANVAS_CONTEXT_DENIED/);
});
test("open refuses paused workspace",async()=>{
 const f=fixture();f.setRunWorkspace("film");f.status("paused");
 await assert.rejects(f.coordinator.open(f.input({
  hostFacts:{...f.facts,workspaceId:"film"},
 })),/CANVAS_AGENT_ACCESS_DENIED|CANVAS_TOOL_DENIED/);
});
test("open refuses mismatched human and running bot workspace scopes",async()=>{
 const f=fixture();await denied(f.coordinator.open(f.input({
  hostFacts:{...f.facts,workspaceId:"film"},
 })));
});
test("open refuses invalid shape even if other fields look plausible",async()=>{
 const f=fixture();await denied(f.coordinator.open(null as any),"CANVAS_TOOL_INVALID");
});
test("open rejects missing run ID",async()=>{
 const f=fixture();await denied(f.coordinator.open(f.input({runId:""})),"CANVAS_TOOL_INVALID");
});
test("open rejects invalid run ID",async()=>{
 const f=fixture();await denied(f.coordinator.open(f.input({runId:"../run"})),"CANVAS_TOOL_INVALID");
});
test("unregistering native OS before proposal fails closed",async()=>{
 const f=fixture(),h=await open(f);f.registry.unregister(f.systemId);
 await assert.rejects(f.coordinator.execute(h,f.proposal()),/CANVAS_AGENT_ACCESS_DENIED/);
});
test("read-only describe never invokes an additional OS grant or Data read",async()=>{
 const f=fixture(),h=await open(f),before=f.counts();
 f.coordinator.describe(h);f.coordinator.describe(h);
 assert.deepEqual(f.counts(),before);
});
test("multiple independent handles cannot be recreated from their public views",async()=>{
 const f=fixture(),h=await open(f);
 const view=f.coordinator.describe(h);
 await denied(f.coordinator.execute(view as any,f.proposal()));
});

test("model context exposes explicitly selected group label and node IDs",async()=>{
 const f=fixture(),h=await open(f),g=f.coordinator.describe(h).selection.groups[0];
 assert.equal(g.label,"Camera pair");
 assert.deepEqual(g.nodeIds,["note-a","note-b"]);
 assert.equal(g.trust,"untrusted-canvas-label");
});
test("model context reports canonical group counts",async()=>{
 const f=fixture(),h=await open(f),v=f.coordinator.describe(h);
 assert.equal(v.selection.groupCount,1);
 assert.equal(v.selection.groups.length,1);
});
test("unselected groups cannot be proposed by the model",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.rename",operationId:"other",
   groupId:"other-group",label:"forged"}),"CANVAS_TOOL_INVALID");
});
test("selected group rename reaches owner after verified run",async()=>{
 const f=fixture(),h=await open(f);
 const r=await f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"Dolly study"});
 assert.equal((r.document as any).version,4);
 assert.equal(f.doc().board.groups[0].label,"Dolly study");
});
test("selected group move shifts all and only grouped notes",async()=>{
 const f=fixture(),h=await open(f);
 const r=await f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:15,dy:-5});
 assert.deepEqual((r.document as any).board.nodes.map((n:any)=>[n.id,n.x,n.y]),[
  ["note-a",25,15],["note-b",60,45],["note-c",100,150]]);
});
test("selected group rename rejects a blank label",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"    "}),"CANVAS_TOOL_INVALID");
});
test("selected group rename rejects oversized label",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"x".repeat(81)}),"CANVAS_TOOL_INVALID");
});
test("selected group rename rejects principal injection",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"A",principal:"root"} as any),
   "CANVAS_TOOL_INVALID");
});
test("selected group rename rejects arbitrary system ID",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"A",systemId:"another"} as any),
   "CANVAS_TOOL_INVALID");
});
test("selected group move rejects nonfinite deltas",async()=>{
 const f=fixture(),h=await open(f);
 for(const x of [NaN,Infinity,-Infinity]){
  await denied(f.coordinator.execute(h,{kind:"selected-group.move",
    operationId:"move-1",groupId:"group-main",dx:x,dy:0}),"CANVAS_TOOL_INVALID");
 }
});
test("selected group move rejects extreme displacements",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:100001,dy:0}),"CANVAS_TOOL_INVALID");
});
test("selected group move rejects model-supplied approval",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:1,dy:0,approval:true} as any),
   "CANVAS_TOOL_INVALID");
});
test("selected group move rejects unknown actor ID",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:1,dy:0,actor:"owner"} as any),
   "CANVAS_TOOL_INVALID");
});
test("selected group move rejects an arbitrary document selection",async()=>{
 const f=fixture(),h=await open(f);
 await denied(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:1,dy:0,
   documentId:"another"} as any),"CANVAS_TOOL_INVALID");
});
test("selected group rename denies revoked bot run before write",async()=>{
 const f=fixture(),h=await open(f);f.setRun("stopped");
 await assert.rejects(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"X"}),/CANVAS_AGENT_ACCESS_DENIED/);
 assert.equal(f.counts().writes,0);
});
test("selected group move denies revoked grant before write",async()=>{
 const f=fixture(),h=await open(f);f.setGrant(false);
 await assert.rejects(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:10,dy:0}),/CANVAS_AGENT_ACCESS_DENIED/);
 assert.equal(f.counts().writes,0);
});
test("selected group move denies changed run workspace before write",async()=>{
 const f=fixture(),h=await open(f);f.setRunWorkspace("film");
 await assert.rejects(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:10,dy:0}),/CANVAS_AGENT_ACCESS_DENIED/);
});
test("selected group rename rejects stale version when document has advanced",async()=>{
 const f=fixture(),h=await open(f),d=f.doc();f.setDoc({...d,version:4});
 await assert.rejects(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"rename-1",groupId:"group-main",label:"New"}),/RECORD_VERSION_CONFLICT/);
});
test("selected group move rejects closed host selection capability",async()=>{
 const f=fixture(),h=await open(f);f.coordinator.close(h);
 await denied(f.coordinator.execute(h,{kind:"selected-group.move",
   operationId:"move-1",groupId:"group-main",dx:1,dy:1}));
});
test("selected group context request rejects nonexistent group ID",async()=>{
 const f=fixture();await assert.rejects(f.coordinator.open(f.input({
   selection:{documentId:"canvas-1",selectedGroupIds:["missing"]},
 })),/CANVAS_CONTEXT_DENIED/);
});
test("selected group context cannot be inferred from unselected groups",async()=>{
 const f=fixture(),h=await f.coordinator.open(f.input({
   selection:{documentId:"canvas-1",selectedNodeIds:["note-a"]},
 }));
 assert.equal(f.coordinator.describe(h).selection.groups.length,0);
 await denied(f.coordinator.execute(h,{kind:"selected-group.rename",
   operationId:"unselected",groupId:"group-main",label:"Unauthorized"}),
   "CANVAS_TOOL_INVALID");
});
test("selected group IDs are returned frozen from a host context",async()=>{
 const f=fixture(),h=await open(f),g=f.coordinator.describe(h).selection.groups[0];
 assert.equal(Object.isFrozen(g),true);
 assert.equal(Object.isFrozen(g.nodeIds),true);
});
