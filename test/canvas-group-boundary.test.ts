import test from "node:test";
import assert from "node:assert/strict";
import {validateCanvasOperation,projectCanvasDocument}
 from "../apps/gateway/src/canvas-owner-bridge.js";
import {CanvasOwnerBridge} from "../apps/gateway/src/index.js";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
const stamp="2026-10-29T00:00:00.000Z";
const base=()=>({id:"rec_group_1",title:"Angles",version:8,
 createdAt:stamp,updatedAt:stamp,
 board:{nodes:[
  {id:"n1",kind:"note",text:"One",x:10,y:20},
  {id:"n2",kind:"note",text:"Two",x:50,y:80},
  {id:"n3",kind:"note",text:"Three",x:90,y:100}],
 edges:[{id:"link-1",from:"n1",to:"n2"}],
 groups:[{id:"g1",label:"Scene One",nodeIds:["n1","n2"]}]},
 privateKey:"must-not-project"});
const parse=(edit:unknown)=>validateCanvasOperation("aiverse.canvas.edit",{
 id:"rec_group_1",expectedVersion:8,idempotencyKey:"op-1",edit});
const create=(over:Record<string,unknown>={})=>({
 type:"group.create",id:"g2",label:"New blocking",nodeIds:["n2","n3"],...over});
test("group.create is a typed write action",()=>{
 const op=parse(create());assert.equal(op?.access,"write");
 assert.deepEqual(op?.params.edit,create());
});
test("group.rename accepts bounded text label",()=>{
 assert.equal(parse({type:"group.rename",id:"g1",label:"Shot B"})?.access,"write");
});
test("group.members accepts exact canonical note IDs",()=>{
 assert.ok(parse({type:"group.members",id:"g1",nodeIds:["n1","n3"]}));
});
test("group.move accepts finite signed displacements",()=>{
 assert.ok(parse({type:"group.move",id:"g1",dx:-150,dy:12.5}));
});
test("group.remove accepts an exact target ID",()=>{
 assert.ok(parse({type:"group.remove",id:"g1"}));
});
test("group.create rejects missing members",()=>{
 assert.equal(parse(create({nodeIds:[]})),null);
});
test("group.create rejects one-member groups",()=>{
 assert.equal(parse(create({nodeIds:["n1"]})),null);
});
test("group.create rejects duplicate member IDs",()=>{
 assert.equal(parse(create({nodeIds:["n1","n1"]})),null);
});
test("group.create rejects unknown principal field",()=>{
 assert.equal(parse(create({principal:"root"})),null);
});
test("group.create rejects arbitrary path input",()=>{
 assert.equal(parse(create({path:"/etc/owner"})),null);
});
test("group.create refuses malformed IDs",()=>{
 assert.equal(parse(create({id:"../other"})),null);
});
test("group.create refuses forged workspace scope",()=>{
 assert.equal(parse(create({workspaceId:"private"})),null);
});
test("group.members rejects empty membership",()=>{
 assert.equal(parse({type:"group.members",id:"g1",nodeIds:[]}),null);
});
test("group.members rejects unbounded membership arrays",()=>{
 assert.equal(parse({type:"group.members",id:"g1",
  nodeIds:Array.from({length:151},(_,i)=>"node-"+i)}),null);
});
test("group.rename rejects whitespace-only title",()=>{
 assert.equal(parse({type:"group.rename",id:"g1",label:"   "}),null);
});
test("group.rename rejects excessively long title",()=>{
 assert.equal(parse({type:"group.rename",id:"g1",label:"x".repeat(81)}),null);
});
test("group.move rejects nan displacements",()=>{
 assert.equal(parse({type:"group.move",id:"g1",dx:NaN,dy:1}),null);
});
test("group.move rejects infinite displacements",()=>{
 assert.equal(parse({type:"group.move",id:"g1",dx:1,dy:Infinity}),null);
});
test("group.move rejects excessive displacement",()=>{
 assert.equal(parse({type:"group.move",id:"g1",dx:100001,dy:0}),null);
});
test("group.move rejects browser-supplied approval",()=>{
 assert.equal(parse({type:"group.move",id:"g1",dx:1,dy:1,
   approval:{approved:true}}),null);
});
test("group.removal rejects unsupported cascade flag",()=>{
 assert.equal(parse({type:"group.remove",id:"g1",deleteNotes:true}),null);
});
test("old ungrouped boards preserve their original projection shape",()=>{
 const d=base();delete (d.board as any).groups;
 const p=projectCanvasDocument(d) as any;
 assert.deepEqual(Object.keys(p.board).sort(),["edges","nodes"]);
});
test("grouped board projects only public graph fields and group labels",()=>{
 const d=base(),p=projectCanvasDocument(d) as any;
 assert.deepEqual(p.board.groups,[{id:"g1",label:"Scene One",
  nodeIds:["n1","n2"]}]);
 assert.equal(JSON.stringify(p).includes("must-not-project"),false);
});
test("invalid group member IDs block projection",()=>{
 const d=base();d.board.groups[0]!.nodeIds=["n1","missing"];
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection denies overlapping group membership",()=>{
 const d=base();d.board.groups.push({id:"g2",label:"Dup",nodeIds:["n2","n3"]});
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection denies duplicate group identifiers",()=>{
 const d=base();d.board.groups.push({id:"g1",label:"Dup",nodeIds:["n3","n1"]});
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection denies group ID collision with note",()=>{
 const d=base();d.board.groups[0]!.id="n1";
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection denies malformed member list",()=>{
 const d=base();(d.board.groups[0] as any).nodeIds=["n1","n1"];
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection refuses unexpected group private field",()=>{
 const d=base();(d.board.groups[0] as any).privateToken="unsafe";
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection denies over 50 groups even if all IDs unique",()=>{
 const d=base();(d.board as any).groups=Array.from({length:51},(_,i)=>({
  id:"g"+i,label:"Group",nodeIds:["n1","n2"]}));
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("projection refuses non-array groups",()=>{
 const d=base();(d.board as any).groups={id:"g1"};
 assert.throws(()=>projectCanvasDocument(d),/CANVAS_PROJECTION_INVALID/);
});
test("grouped projection respects document revision",()=>{
 const p=projectCanvasDocument(base()) as any;
 assert.equal(p.version,8);
 assert.equal(p.board.nodes.length,3);
});
test("Canvas host still rejects group writes without an owner installation",async()=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),"canvas-group-boundary-")));
 try{
  for(const d of ["operator","workspaces","system"])mkdirSync(join(root,d));
  writeFileSync(join(root,"AI-VERSE.yaml"),
   'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"group test");
  const reg=new SystemRegistry(),systemId=reg.register(root).systemId;
  const bridge=new CanvasOwnerBridge(reg,[]);
  const frame={type:"req",v:"1.0",id:"group-1",method:"aiverse.canvas.edit",
   systemId,workspaceId:"operator",params:{
    id:"rec_group_1",expectedVersion:8,idempotencyKey:"group-op-1",
    edit:{type:"group.create",id:"g2",label:"B",nodeIds:["n1","n2"]}}};
  const result=await bridge.handle(frame);
  assert.equal(result.ok,false);
  assert.equal(result.error?.code,"CANVAS_OWNER_UNAVAILABLE");
 }finally{rmSync(root,{recursive:true,force:true});}
});
