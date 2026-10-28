import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {createGatewayStoreCanvasRunVerifier,
  type CanvasAdmittedActorGrant} from "../apps/gateway/src/index.js";

const roots:string[]=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
function setup(){
  const root=mkdtempSync(join(tmpdir(),"agent-gateway-run-"));roots.push(root);
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"test");
  for(const dir of ["operator","workspaces","system"])mkdirSync(join(root,dir));
  mkdirSync(join(root,"workspaces","film"));
  writeFileSync(join(root,"workspaces","film","WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
  const registry=new SystemRegistry(),dashboardSystemId=registry.register(root).systemId;
  const run:Record<string,unknown>={
    run_id:"run-real-1",session_id:"sess-real-1",system_id:"canon-os-1",
    workspace_id:"operator",principal:"operator",status:"running",
    deadline_at:new Date(Date.now()+120_000).toISOString(),pending_approval:null,
  };
  const session:Record<string,unknown>={
    session_id:"sess-real-1",system_id:"canon-os-1",workspace_id:"operator",
    principal:"operator",status:"active",active_run_id:"run-real-1",
  };
  let grantEnabled=true,epoch="grant-1",rebindOnGrant=false,reads=0;
  const store={
    async getRun(){reads++;return {...run}},
    async getSession(){reads++;return {...session}},
  };
  const verify=createGatewayStoreCanvasRunVerifier(registry,{
    dashboardSystemId,canonicalSystemId:"canon-os-1",approvedPrincipal:"operator",
    store,
    resolveAdmittedActor:facts=>{
      if(rebindOnGrant)run.status="canceled";
      if(!grantEnabled)return null;
      const grant:CanvasAdmittedActorGrant={
        actorKind:"bot",actorId:"bot-1",leaseEpoch:epoch,
        runId:facts.runId,sessionId:facts.sessionId,
        principal:facts.principal,workspaceId:facts.workspaceId,
      };
      return grant;
    },
  });
  return {root,registry,dashboardSystemId,verify,run,session,
    disableGrant:()=>{grantEnabled=false},setEpoch:(v:string)=>{epoch=v},
    rebindDuringGrant:()=>{rebindOnGrant=true},
    reads:()=>reads};
}
describe("actual Gateway Store-backed agent authority",()=>{
  it("uses canonical run + session and approved bot lease without inventing actor",async()=>{
    const a=setup();
    const claim=await a.verify.verifyRun("run-real-1");
    assert.equal(claim?.actorId,"bot-1");
    assert.equal(claim?.systemId,a.dashboardSystemId);
    assert.equal(claim?.leaseEpoch,"grant-1");
    assert.ok(a.reads()>=4,"run/session must be rechecked after grant");
    a.setEpoch("grant-2");
    assert.equal((await a.verify.verifyRun("run-real-1"))?.leaseEpoch,"grant-2");
  });
  it("rejects stopped runs, missing owner grants and session reassignments",async()=>{
    const a=setup();
    a.disableGrant();
    assert.equal(await a.verify.verifyRun("run-real-1"),null);
    const b=setup();b.run.status="paused";
    assert.equal(await b.verify.verifyRun("run-real-1"),null);
    const c=setup();c.session.active_run_id="run-new";
    assert.equal(await c.verify.verifyRun("run-real-1"),null);
    const d=setup();d.rebindDuringGrant();
    assert.equal(await d.verify.verifyRun("run-real-1"),null);
  });
  it("rejects actor-principal substitution, foreign Gateway system and approval waits",async()=>{
    const a=setup();a.run.principal="other";
    assert.equal(await a.verify.verifyRun("run-real-1"),null);
    const b=setup();b.run.system_id="other-system";
    assert.equal(await b.verify.verifyRun("run-real-1"),null);
    const c=setup();c.run.pending_approval={tool_call_id:"tool-1"};
    assert.equal(await c.verify.verifyRun("run-real-1"),null);
    const d=setup();d.run.deadline_at=new Date(Date.now()-1000).toISOString();
    assert.equal(await d.verify.verifyRun("run-real-1"),null);
  });
  it("checks Data workspace manifest and registered OS root identity",async()=>{
    const a=setup();a.run.workspace_id="film";a.session.workspace_id="film";
    assert.equal((await a.verify.verifyRun("run-real-1"))?.workspaceId,"film");
    writeFileSync(join(a.root,"workspaces","film","WORKSPACE.yaml"),
      'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "paused"\n');
    assert.equal(await a.verify.verifyRun("run-real-1"),null);
    const b=setup();b.registry.unregister(b.dashboardSystemId);
    assert.equal(await b.verify.verifyRun("run-real-1"),null);
  });
  it("does not turn a user/operator chat run into bot authority without OS grant",async()=>{
    const a=setup();a.disableGrant();
    assert.equal(await a.verify.verifyRun("run-real-1"),null);
  });
});
