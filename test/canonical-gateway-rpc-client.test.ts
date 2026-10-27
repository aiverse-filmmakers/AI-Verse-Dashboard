import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {DashboardClient,type FetchFn} from "../packages/client/src/index.js";

describe("MC2.2 browser-safe canonical RPC facade",()=>{
 it("uses only authenticated /rpc, sends scoped model requests and never caches live run operations",async()=>{
   const seen:{url:string;headers:Record<string,string>;body:Record<string,unknown>}[]=[];
   const fetchFn:FetchFn=async(url,init)=>{
     seen.push({url,headers:init.headers,body:JSON.parse(init.body) as Record<string,unknown>});
     return {json:async()=>({ok:true,result:{status:"running",source:"canonical-gateway"},
       systemId:"aiverse-01",observedAt:"2026-10-27T16:00:00Z"})};
   };
   const client=new DashboardClient("http://127.0.0.1:3100",
     {systemId:"aiverse-01",workspaceId:"operator"},
     "test-dashboard-auth-0011223344556677",fetchFn);
   const message={role:"user" as const,content:"Describe the camera shot"};
   const submission={messages:[message],idempotencyKey:"unique-1"};
   await client.gatewayStatus();
   await client.createGatewayRun(submission);
   await client.createGatewayRun(submission);
   await client.getGatewayRun("run-1");
   assert.equal(seen.length,4,"no implicit cache replay of live status or effects");
   assert.deepEqual(seen.map(s=>s.body.method),[
     "aiverse.gateway.status","aiverse.gateway.run.create",
     "aiverse.gateway.run.create","aiverse.gateway.run.get",
   ]);
   assert.ok(seen.every(s=>s.url==="http://127.0.0.1:3100/rpc"));
   assert.ok(seen.every(s=>s.headers.authorization==="Bearer test-dashboard-auth-0011223344556677"));
   assert.ok(seen.every(s=>s.body.workspaceId==="operator"));
   assert.equal(seen[1].body.params && (seen[1].body.params as {idempotencyKey:string}).idempotencyKey,"unique-1");
   assert.equal(client.cacheStats().entries,0);
   client.retarget({systemId:"aiverse-01",workspaceId:"film"});
   await client.getGatewayRun("run-2");
   assert.equal(seen.at(-1)?.body.workspaceId,"film");
   assert.equal(client.cacheStats().entries,0);
 });
 it("requires an explicit scope and keeps legacy read paths intact",async()=>{
   const seen:string[]=[];
   const fetchFn:FetchFn=async(_url,init)=>{
     const m=JSON.parse(init.body) as {method:string};
     seen.push(m.method);
     return {json:async()=>({ok:true,result:{},observedAt:new Date().toISOString()})};
   };
   const client=new DashboardClient("http://127.0.0.1:3100",{systemId:"aiverse-01"},
     "test-dashboard-auth-0011223344556677",fetchFn);
   await assert.rejects(client.gatewayStatus(),/Select a workspace/);
   await assert.rejects(client.createGatewayRun({messages:[{role:"user",content:"hello"}],idempotencyKey:"k-1"}),/Select a workspace/);
   await assert.rejects(client.getGatewayRun("run-1"),/Select a workspace/);
   assert.equal(seen.length,0);
   await client.query("system.list",{noCache:true});
   assert.deepEqual(seen,["system.list"]);
 });
});
