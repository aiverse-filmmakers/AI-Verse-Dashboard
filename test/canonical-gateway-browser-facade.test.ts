import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {DashboardClient,type FetchFn} from "../packages/client/src/index.js";

const auth="dashboard-auth-test-token-0123456789";
const valid=(systemId="aiverse-01")=>({
  ok:true,systemId,observedAt:"2026-10-31T00:00:00Z",
  result:{source:"canonical-gateway",status:"running"},
});
const make=(fetchFn:FetchFn,workspaceId="operator")=>
  new DashboardClient("http://127.0.0.1:3100",
    {systemId:"aiverse-01",workspaceId},auth,fetchFn);
describe("MC2.2 browser facade for owner-authenticated canonical Gateway RPC",()=>{
  it("uses only Dashboard /rpc, stable idempotency and no cached run effects",async()=>{
    const calls:Array<{url:string;method:string;body:Record<string,unknown>;auth:string}>=[];
    const transport:FetchFn=async(url,init)=>{
      calls.push({url,method:init.method,
        body:JSON.parse(init.body) as Record<string,unknown>,
        auth:init.headers.authorization});
      return {json:async()=>valid()};
    };
    const client=make(transport);
    const messages=[{role:"user" as const,content:"Camera action"}];
    await client.gatewayStatus();
    await client.gatewayModels();
    await client.createGatewayRun({messages,idempotencyKey:"submit-1"});
    await client.createGatewayRun({messages,idempotencyKey:"submit-1"});
    await client.getGatewayRun("run-1");
    await client.cancelGatewayRun("run-1","session-1","cancel-1");
    await client.pauseGatewayRun("run-1","session-1","pause-1");
    await client.resumeGatewayRun("run-1","session-1","resume-1");
    await client.decideGatewayRunApproval("run-1","session-1","approval-1","deny");
    assert.deepEqual(calls.map(x=>x.body.method),[
      "aiverse.gateway.status","aiverse.gateway.models",
      "aiverse.gateway.run.create","aiverse.gateway.run.create",
      "aiverse.gateway.run.get","aiverse.gateway.run.cancel",
      "aiverse.gateway.run.pause","aiverse.gateway.run.resume",
      "aiverse.gateway.run.approval",
    ]);
    assert.ok(calls.every(x=>x.url==="http://127.0.0.1:3100/rpc"
      &&x.method==="POST"&&x.auth==="Bearer "+auth
      &&x.body.systemId==="aiverse-01"&&x.body.workspaceId==="operator"));
    assert.deepEqual(calls[2].body.params,{
      messages,idempotencyKey:"submit-1",
    });
    assert.deepEqual(calls[5].body.params,{
      runId:"run-1",sessionId:"session-1",operationId:"cancel-1",
    });
    assert.deepEqual(calls[8].body.params,{
      runId:"run-1",sessionId:"session-1",operationId:"approval-1",decision:"deny",
    });
    assert.equal(client.cacheStats().entries,0);
  });
  it("fences late A→B→A run results across scope epoch changes",async()=>{
    const pending:Array<(value:{json():Promise<unknown>})=>void>=[];
    const client=make(async()=>new Promise(resolve=>pending.push(resolve)));
    const original=client.getGatewayRun("run-a");
    client.retarget({systemId:"aiverse-01",workspaceId:"film"});
    client.retarget({systemId:"aiverse-01",workspaceId:"operator"});
    assert.equal(client.selectionVersion(),2);
    pending[0]({json:async()=>valid()});
    await assert.rejects(original,(e:unknown)=>
      (e as {code?:string}).code==="STALE_SELECTION");
    assert.equal(client.cacheStats().entries,0);
  });
  it("rejects response with wrong returned system before caching",async()=>{
    const client=make(async()=>({json:async()=>valid("aiverse-02")}));
    await assert.rejects(client.getGatewayRun("run-a"),(e:unknown)=>
      (e as {code?:string}).code==="SYSTEM_MISMATCH");
    assert.equal(client.cacheStats().entries,0);
  });
  it("does not dispatch any canonical run without selected operator/workspace",async()=>{
    let calls=0;
    const client=make(async()=>{calls++;return {json:async()=>valid()};},"");
    assert.throws(()=>client.gatewayStatus(),(e:unknown)=>
      (e as {code?:string}).code==="WORKSPACE_REQUIRED");
    assert.throws(()=>client.createGatewayRun({
      messages:[{role:"user",content:"hello"}],idempotencyKey:"x",
    }),(e:unknown)=>(e as {code?:string}).code==="WORKSPACE_REQUIRED");
    assert.equal(calls,0);
  });
});
