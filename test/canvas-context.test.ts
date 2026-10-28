import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync}
 from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {CanvasContextReader,CanvasAgentActions,type ApprovedCanvasOwner,type CanvasHostFacts}
 from "../apps/gateway/src/index.js";
const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(r=>rmSync(r,{recursive:true,force:true})));
const projection=()=>({
 id:"rec_1",title:"Scene",version:4,
 createdAt:"2026-10-28T12:00:00Z",updatedAt:"2026-10-28T12:05:00Z",
 root:"/secret/private",token:"sensitive-do-not-project",
 board:{
  nodes:[
   {id:"note-a",kind:"note",text:"Selected camera angle",x:20,y:50},
   {id:"note-b",kind:"note",text:"Unselected PRIVATE note",x:10,y:80},
  ],
  edges:[{id:"edge-ab",from:"note-a",to:"note-b"}],
 },
});
function fixture(){
 const root=realpathSync(mkdtempSync(join(tmpdir(),"canvas-context-")));roots.push(root);
 for(const dir of ["operator","workspaces","system","workspaces/film"])
  mkdirSync(join(root,dir),{recursive:true});
 writeFileSync(join(root,"AI-VERSE.yaml"),
  'schema_version: "2.0"\narchitecture: unified-workspace\n');
 writeFileSync(join(root,"AGENTS.md"),"test fixture");
 const manifest=join(root,"workspaces/film/WORKSPACE.yaml");
 writeFileSync(manifest,
  'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
 const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
 let allow=true,execCount=0,authCount=0,doc:any=projection(),leaseOk=true;
 let onAuthorize:()=>void|Promise<void>=()=>{};
 let onExecute:()=>void|Promise<void>=()=>{};
 let lastMethod="";
 const owner:ApprovedCanvasOwner={
  dashboardSystemId:systemId,
  async authorize(facts,request){
   authCount++;assert.equal(request.method,"aiverse.canvas.get");
   assert.deepEqual(request.params,{id:"rec_1"});
   await onAuthorize();return allow;
  },
  async execute(facts,request){
   execCount++;lastMethod=request.method;await onExecute();return doc;
  },
 };
 const ctx=new CanvasContextReader(registry,owner);
 const human:CanvasHostFacts={systemId,workspaceId:"operator",root,
  principal:"local-operator",access:"read",
  assertLease:()=>{if(!leaseOk)throw Error("revoked");}};
 const bot:CanvasHostFacts={...human,principal:"verified-agent",
  agent:{runId:"run-1",actorId:"bot-1"}};
 const req=(more:Record<string,unknown>={})=>({
  documentId:"rec_1",selectedNodeIds:["note-a"],...more,
 });
 return {ctx,owner,root,systemId,registry,manifest,human,bot,req,
  setAllow:(v:boolean)=>{allow=v},
  setDoc:(v:any)=>{doc=v},
  setLease:(v:boolean)=>{leaseOk=v},
  duringAuth:(fn:()=>void|Promise<void>)=>{onAuthorize=fn},
  duringExecute:(fn:()=>void|Promise<void>)=>{onExecute=fn},
  counts:()=>({authCount,execCount,lastMethod}),
 };
}
describe("owner-backed selected Canvas context",()=>{
 it("includes only selected note contents and current canonical revision",async()=>{
  const f=fixture(),v=await f.ctx.capture(f.human,f.req());
  assert.equal(v.source,"canonical-data/canvas-selection");
  assert.equal(v.documentVersion,4);
  assert.equal(v.documentId,"rec_1");
  assert.equal(v.noteCount,2);
  assert.equal(v.selectedNodes[0].text,"Selected camera angle");
  assert.equal(v.selectedNodes[0].trust,"untrusted-canvas-text");
  assert.equal(v.workspaceId,"operator");
  assert.ok(!JSON.stringify(v).includes("Unselected PRIVATE"));
  assert.ok(!JSON.stringify(v).includes("sensitive-do-not-project"));
  assert.ok(!JSON.stringify(v).includes("/secret/private"));
 });
 it("never mutates Data for context capture",async()=>{
  const f=fixture();await f.ctx.capture(f.human,f.req());
  assert.deepEqual(f.counts(),{authCount:1,execCount:1,lastMethod:"aiverse.canvas.get"});
 });
 it("rejects absent independently admitted owner authorization",async()=>{
  const f=fixture();f.setAllow(false);
  await assert.rejects(f.ctx.capture(f.human,f.req()),/CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().execCount,0);
 });
 it("rejects forged system identity before hitting owner",async()=>{
  const f=fixture();await assert.rejects(f.ctx.capture(
   {...f.human,systemId:"another-system"},f.req()),/CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().authCount,0);
 });
 it("rejects forged OS filesystem root before owner",async()=>{
  const f=fixture();await assert.rejects(f.ctx.capture(
   {...f.human,root:"/private/tmp"},f.req()),/CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().authCount,0);
 });
 it("rejects browser-supplied extra identity fields in selection",async()=>{
  const f=fixture();
  for(const injected of [
   {principal:"admin"},{root:"/etc"},{workspaceId:"film"},
   {systemId:"other"},{approval:{approved:true}},{token:"yes"}]){
   await assert.rejects(f.ctx.capture(f.human,f.req(injected)),
    /CANVAS_CONTEXT_DENIED/);
  }
  assert.equal(f.counts().execCount,0);
 });
 it("rejects unauthorized browser-claimed agent without run and actor ID",async()=>{
  const f=fixture();
  await assert.rejects(f.ctx.capture(
   {...f.bot,agent:undefined},f.req()),/CANVAS_CONTEXT_DENIED/);
  await assert.rejects(f.ctx.capture(
   {...f.bot,agent:{runId:"",actorId:"bot"}},f.req()),/CANVAS_CONTEXT_DENIED/);
 });
 it("operator identity must not carry a bot run",async()=>{
  const f=fixture();await assert.rejects(f.ctx.capture(
   {...f.human,agent:{runId:"run-1",actorId:"bot-1"}},f.req()),
   /CANVAS_CONTEXT_DENIED/);
 });
 it("agent context uses exact same owner authorization and no agent-provided grant",async()=>{
  const f=fixture(),v=await f.ctx.capture(f.bot,f.req());
  assert.equal(v.systemId,f.systemId);
  assert.equal(v.selectedNodes[0].text,"Selected camera angle");
  assert.equal(f.counts().authCount,1);
 });
 it("denies paused workspaces at OS manifest boundary",async()=>{
  const f=fixture();
  writeFileSync(f.manifest,
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "paused"\n');
  await assert.rejects(f.ctx.capture({...f.human,workspaceId:"film"},f.req()),
   /CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().authCount,0);
 });
 it("allows active workspace but never cross-projects another workspace",async()=>{
  const f=fixture(),v=await f.ctx.capture({...f.human,workspaceId:"film"},f.req());
  assert.equal(v.workspaceId,"film");
  assert.equal(v.systemId,f.systemId);
 });
 it("refuses stale document versions before exposing any selected text",async()=>{
  const f=fixture();
  await assert.rejects(f.ctx.capture(f.human,f.req({expectedVersion:3})),
   /CANVAS_CONTEXT_DENIED/);
 });
 it("accepts matching optimistic version",async()=>{
  const f=fixture(),v=await f.ctx.capture(f.human,f.req({expectedVersion:4}));
  assert.equal(v.documentVersion,4);
 });
 it("refuses selection IDs removed from current canonical board",async()=>{
  const f=fixture();
  await assert.rejects(f.ctx.capture(f.human,f.req({selectedNodeIds:["gone"]})),
   /CANVAS_CONTEXT_DENIED/);
 });
 it("refuses edge IDs removed from current canonical board",async()=>{
  const f=fixture();
  await assert.rejects(f.ctx.capture(f.human,f.req({selectedEdgeIds:["gone"]})),
   /CANVAS_CONTEXT_DENIED/);
 });
 it("captures only explicitly selected edge and its references",async()=>{
  const f=fixture(),v=await f.ctx.capture(f.human,
   f.req({selectedNodeIds:[],selectedEdgeIds:["edge-ab"]}));
  assert.deepEqual(v.selectedEdges,[{id:"edge-ab",from:"note-a",to:"note-b"}]);
  assert.equal(v.selectedNodes.length,0);
  assert.ok(!JSON.stringify(v).includes("Unselected PRIVATE"));
 });
 it("rejects duplicate selections rather than ambiguous context",async()=>{
  const f=fixture();
  await assert.rejects(f.ctx.capture(f.human,f.req({
   selectedNodeIds:["note-a","note-a"]})),/CANVAS_CONTEXT_DENIED/);
 });
 it("caps selection lists to 16 IDs each",async()=>{
  const f=fixture();
  await assert.rejects(f.ctx.capture(f.human,f.req({
   selectedNodeIds:Array.from({length:17},(_,i)=>"n-"+i)})),
   /CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().authCount,0);
 });
 it("rejects unsupported document IDs and fake version numbers",async()=>{
  const f=fixture();
  for(const more of [{documentId:"../another"},{expectedVersion:0},
   {expectedVersion:1.2},{expectedVersion:Infinity},{expectedVersion:NaN}]){
   await assert.rejects(f.ctx.capture(f.human,f.req(more)),/CANVAS_CONTEXT_DENIED/);
  }
  assert.equal(f.counts().execCount,0);
 });
 it("caps untrusted selected text at 1000 chars with explicit provenance",async()=>{
  const f=fixture(),d=projection();d.board.nodes[0].text="x".repeat(3000);
  f.setDoc(d);
  const v=await f.ctx.capture(f.human,f.req());
  assert.equal(v.selectedNodes[0].text.length,1000);
  assert.equal(v.selectedNodes[0].truncated,true);
  assert.equal(v.selectedNodes[0].trust,"untrusted-canvas-text");
 });
 it("returns immutable snapshots to avoid later UI/model mutation",async()=>{
  const f=fixture(),v=await f.ctx.capture(f.human,f.req());
  assert.equal(Object.isFrozen(v),true);
  assert.equal(Object.isFrozen(v.selectedNodes),true);
  assert.equal(Object.isFrozen(v.selectedNodes[0]),true);
 });
 it("rejects canonical owner returning a different document ID",async()=>{
  const f=fixture();f.setDoc({...projection(),id:"rec_2"});
  await assert.rejects(f.ctx.capture(f.human,f.req()),/CANVAS_CONTEXT_DENIED/);
 });
 it("rejects owner projection without board instead of inventing context",async()=>{
  const f=fixture();const doc=projection();delete (doc as any).board;f.setDoc(doc);
  await assert.rejects(f.ctx.capture(f.human,f.req()),/CANVAS_CONTEXT_DENIED/);
 });
 it("rejects raw owner-injected non-note board records",async()=>{
  const f=fixture();const doc=projection();doc.board.nodes[0].kind="instruction" as any;
  f.setDoc(doc);
  await assert.rejects(f.ctx.capture(f.human,f.req()),/CANVAS_CONTEXT_DENIED/);
 });
 it("cancellation before admission never calls owner",async()=>{
  const f=fixture(),controller=new AbortController();controller.abort();
  await assert.rejects(f.ctx.capture(f.human,f.req(),controller.signal),
   /CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().authCount,0);
 });
 it("cancellation while owner authorizes prevents owner read",async()=>{
  const f=fixture(),c=new AbortController();f.duringAuth(()=>c.abort());
  await assert.rejects(f.ctx.capture(f.human,f.req(),c.signal),
   /CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().execCount,0);
 });
 it("cancellation while owner reads discards returned context",async()=>{
  const f=fixture(),c=new AbortController();f.duringExecute(()=>c.abort());
  await assert.rejects(f.ctx.capture(f.human,f.req(),c.signal),
   /CANVAS_CONTEXT_DENIED/);
 });
 it("workspace pause during slow authorization prevents owner read",async()=>{
  const f=fixture();f.duringAuth(()=>writeFileSync(f.manifest,
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "paused"\n'));
  await assert.rejects(f.ctx.capture({...f.human,workspaceId:"film"},f.req()),
   /CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().execCount,0);
 });
 it("root rebind during asynchronous authorization denies",async()=>{
  const f=fixture();f.duringAuth(()=>{f.registry.unregister(f.systemId);});
  await assert.rejects(f.ctx.capture(f.human,f.req()),/CANVAS_CONTEXT_DENIED/);
  assert.equal(f.counts().execCount,0);
 });
 it("owner identity lease revoked during read discards context",async()=>{
  const f=fixture();f.duringExecute(()=>f.setLease(false));
  await assert.rejects(f.ctx.capture(f.human,f.req()),/CANVAS_CONTEXT_DENIED/);
 });
});

describe("selected host Canvas snapshot to verified agent write",()=>{
 const agent=f=>new CanvasAgentActions(f.registry,f.owner,{
  verifyRun:async runId=>({
   source:"canonical-gateway" as const,state:"running" as const,runId,
   systemId:f.systemId,workspaceId:"operator",actorId:"bot-1",leaseEpoch:"lease-1",
  }),
 });
 it("edits selected note through the same Data owner and canonical run verifier",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  const r=await agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"edit-selected-1",context:s,
   noteId:"note-a",text:"New selected text",
  });
  assert.equal(r.source,"canonical-data");
  assert.equal(r.agentRunId,"run-1");
  assert.equal(f.counts().lastMethod,"aiverse.canvas.edit");
  assert.ok(f.counts().authCount>=3);
 });
 it("rejects JSON round-trip of host snapshot: model cannot mint permission",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"json-forgery",context:JSON.parse(JSON.stringify(s)),
   noteId:"note-a",text:"forgery",
  }),/CANVAS_AGENT_ACTION_INVALID/);
  assert.equal(f.counts().execCount,1);
 });
 it("refuses edits to unselected notes even if they exist on the board",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"unselected-write",context:s,
   noteId:"note-b",text:"must not happen",
  }),/CANVAS_AGENT_ACTION_INVALID/);
  assert.equal(f.counts().execCount,1);
 });
 it("rejects scope mismatch between minted context and active Gateway run",async()=>{
  const f=fixture(),s=await f.ctx.capture({...f.human,workspaceId:"film"},f.req());
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"wrong-workspace",context:s,
   noteId:"note-a",text:"wrong target",
  }),/CANVAS_AGENT_ACCESS_DENIED/);
  assert.equal(f.counts().execCount,1);
 });
 it("rejects overlong paid/model generated note text before reaching owner",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"oversize",context:s,
   noteId:"note-a",text:"x".repeat(5001),
  }),/CANVAS_AGENT_ACTION_INVALID/);
  assert.equal(f.counts().execCount,1);
 });
 it("does not accept forged action root or owner fields",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"injection",context:s,noteId:"note-a",
   text:"test",root:"/etc",
  } as any),/CANVAS_AGENT_ACTION_INVALID/);
  assert.equal(f.counts().execCount,1);
 });
 it("aborted selected-note action never reaches Data write",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  const ac=new AbortController();ac.abort();
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"aborted",context:s,noteId:"note-a",text:"new",
  },ac.signal),/CANVAS_AGENT_ACCESS_DENIED/);
  assert.equal(f.counts().execCount,1);
 });
 it("system unregistration invalidates previously minted selected context",async()=>{
  const f=fixture(),s=await f.ctx.capture(f.human,f.req());
  f.registry.unregister(f.systemId);
  await assert.rejects(agent(f).invokeSelectedNoteEdit({
   runId:"run-1",operationId:"unregistered",context:s,noteId:"note-a",text:"new",
  }),/CANVAS_AGENT_ACCESS_DENIED/);
  assert.equal(f.counts().execCount,1);
 });
});
