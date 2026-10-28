import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {CanvasAgentActions,withCanvasOsPolicy,
  type ApprovedCanvasOwner,type CanonicalCanvasAgentRun}
  from "../apps/gateway/src/index.js";

const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function fixture(){
  const root=mkdtempSync(join(tmpdir(),"canvas-agent-"));roots.push(root);
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"fixture");
  for(const dir of ["operator","workspaces","system"])mkdirSync(join(root,dir));
  mkdirSync(join(root,"workspaces","film"));
  writeFileSync(join(root,"workspaces","film","WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
  const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
  return {root,registry,systemId};
}
const projection=()=>({
  id:"rec_1234",title:"Scene",version:2,
  createdAt:"2026-10-28T12:00:00Z",updatedAt:"2026-10-28T12:05:00Z",
  board:{nodes:[],edges:[]},token:"never-project",
});
function harness(){
  const {registry,systemId,root}=fixture();
  let executed=0,policyCalls=0,actorCalls=0,verifies=0;
  let admitted=true,running=true,epoch="lease-1",workspaceId="operator";
  let rebindAt=0;
  const underlying:ApprovedCanvasOwner={
    dashboardSystemId:systemId,
    authorize(facts){
      actorCalls++;facts.assertLease();
      return facts.principal==="verified-agent"&&facts.agent?.actorId==="agent-1";
    },
    execute(facts){
      facts.assertLease();executed++;return projection();
    },
  };
  const owner=withCanvasOsPolicy(underlying,{
    operatorAdmitted:()=>true,
    agentAdmitted:facts=>admitted&&facts.principal==="verified-agent",
    evaluate:({request})=>{
      policyCalls++;
      return {decision:"allow",source:"ai-verse-os/action-permission-v1",
        scope:request.scope,action_class:request.action_class,
        request_fingerprint:request.request_fingerprint};
    },
  });
  const verifier={
    verifyRun(runId:string):CanonicalCanvasAgentRun|null{
      verifies++;
      if(!running||runId!=="run-1")return null;
      if(rebindAt && verifies>=rebindAt)epoch="lease-2";
      return {source:"canonical-gateway",state:"running",runId,
        systemId,workspaceId,actorId:"agent-1",leaseEpoch:epoch};
    },
  };
  const actions=new CanvasAgentActions(registry,owner,verifier);
  const command=(method:string,params:Record<string,unknown>={})=>({
    runId:"run-1",operationId:"agent-op-1",method,params,
  });
  return {root,registry,systemId,actions,command,
    values:()=>({executed,policyCalls,actorCalls,verifies}),
    setGrant:(value:boolean)=>{admitted=value},
    setRunning:(value:boolean)=>{running=value},
    setWorkspace:(value:string)=>{workspaceId=value},
    setRebindAt:(n:number)=>{rebindAt=n},
  };
}
describe("host-only Canvas agent action boundary",()=>{
  it("runs through same OS policy and owner, bound to canonical run scope",async()=>{
    const h=harness();
    const result=await h.actions.invoke(h.command("aiverse.canvas.edit",{
      id:"rec_1234",expectedVersion:1,edit:{type:"note.text",id:"note-1",text:"shot"},
    }));
    assert.equal(result.source,"canonical-data");
    assert.equal(result.agentRunId,"run-1");
    assert.equal(result.workspaceId,"operator");
    assert.equal((result.document as {version:number}).version,2);
    assert.equal(JSON.stringify(result).includes("never-project"),false);
    assert.equal(h.values().executed,1);
    assert.ok(h.values().verifies>=3);
    assert.ok(h.values().policyCalls>=2);
    assert.ok(h.values().actorCalls>=2);
  });
  it("rejects model-supplied scope, human actor, raw roots and delete",async()=>{
    const h=harness();
    for(const params of [
      {id:"rec_1234",expectedVersion:1,workspaceId:"film"},
      {id:"rec_1234",expectedVersion:1,actor:{kind:"human",id:"root"}},
      {id:"rec_1234",expectedVersion:1,root:"/etc"},
      {id:"rec_1234",expectedVersion:1,idempotencyKey:"override"},
      {id:"rec_1234",expectedVersion:1,approval:{approved:true}},
    ]){
      await assert.rejects(()=>h.actions.invoke(h.command("aiverse.canvas.rename",{
        ...params,title:"New",
      })),/CANVAS_AGENT_ACTION_INVALID/);
    }
    await assert.rejects(()=>h.actions.invoke(h.command("aiverse.canvas.delete",{
      id:"rec_1234",expectedVersion:1,
    })),/CANVAS_AGENT_ACTION_INVALID/);
    assert.equal(h.values().executed,0);
  });
  it("denies revoked grant, run stopped, workspace rebind and run identity drift",async()=>{
    const h=harness(),action=h.command("aiverse.canvas.get",{id:"rec_1234"});
    h.setGrant(false);
    await assert.rejects(()=>h.actions.invoke(action),/CANVAS_ACCESS_DENIED/);
    h.setGrant(true);h.setRunning(false);
    await assert.rejects(()=>h.actions.invoke(action),/CANVAS_AGENT_ACCESS_DENIED/);
    h.setRunning(true);h.setWorkspace("missing");
    await assert.rejects(()=>h.actions.invoke(action));
    h.setWorkspace("operator");
    h.setRebindAt(h.values().verifies+2);
    await assert.rejects(()=>h.actions.invoke(action),/CANVAS_AGENT_ACCESS_DENIED/);
    assert.equal(h.values().executed,0);
  });
  it("denies absent agent grant even when operator permission is allowed",async()=>{
    const {registry,systemId}=fixture();
    let calls=0;
    const owner=withCanvasOsPolicy({
      dashboardSystemId:systemId,authorize:()=>true,
      execute:()=>{calls++;return projection();},
    },{operatorAdmitted:()=>true,evaluate:({request})=>({
      source:"ai-verse-os/action-permission-v1",decision:"allow",
      scope:request.scope,action_class:request.action_class,
      request_fingerprint:request.request_fingerprint,
    })});
    const a=new CanvasAgentActions(registry,owner,{
      verifyRun:runId=>({source:"canonical-gateway",state:"running",
        runId,systemId,workspaceId:"operator",actorId:"agent-1",leaseEpoch:"lease-1"}),
    });
    await assert.rejects(()=>a.invoke({runId:"run-1",operationId:"test-1",
      method:"aiverse.canvas.get",params:{id:"rec_1234"}}),/CANVAS_ACCESS_DENIED/);
    assert.equal(calls,0);
  });
});
