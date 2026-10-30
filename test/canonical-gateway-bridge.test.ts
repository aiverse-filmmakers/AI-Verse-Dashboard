import { describe,it,afterEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdirSync,mkdtempSync,rmSync,writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol,eventSchema } from "../packages/protocol/src/index.js";
import { SystemRegistry } from "../packages/registry/src/index.js";
import { DisposableCache } from "../packages/os-read-adapter/src/index.js";
import { QueryRouter,SubscriptionHub,startGateway,CanonicalGatewayBridge } from "../apps/gateway/src/index.js";

const manifest='schema_version: "2.0"\narchitecture: unified-workspace\n';
function makeRoot(reg:SystemRegistry,label:string){
 const root=mkdtempSync(join(tmpdir(),"dashboard-mc2-host-"));
 writeFileSync(join(root,"AI-VERSE.yaml"),manifest);
 writeFileSync(join(root,"AGENTS.md"),"# Test OS\n");
 for(const dir of ["operator","workspaces","system"])mkdirSync(join(root,dir));
 const w=join(root,"workspaces","film");
 mkdirSync(w);writeFileSync(join(w,"WORKSPACE.yaml"),
   'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
 const {systemId}=reg.register(root,{label});
 return {root,systemId};
}
async function listen(server:Server):Promise<number>{
 await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
 const address=server.address();if(!address || typeof address==="string")throw Error("Missing port");
 return address.port;
}
function gatewayFixture(options:{slowEvents?:boolean}={}){
 const received:{method:string;path:string;auth:string;key:string;body:unknown}[]=[];
 const server=createServer(async(req,res)=>{
   const chunks:Buffer[]=[];for await(const b of req)chunks.push(b as Buffer);
   let body:unknown;try{body=JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{body=null;}
   received.push({method:req.method??"",path:req.url??"",auth:String(req.headers.authorization??""),
     key:String(req.headers["idempotency-key"]??""),body});
   const send=(status:number,obj:unknown)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(obj));};
   if(req.headers.authorization!=="Bearer actual-host-gateway-token")return send(401,{error:{code:"UNAUTHENTICATED",message:"secret!!"}});
   if(req.method==="GET"&&req.url==="/status")return send(200,{
     component:"ai-verse-gateway",system_id:"canonical-a",state:"ready",runtime:"deterministic",
     at:"2026-10-27T16:00:00Z"});
   if(req.method==="GET"&&req.url==="/v1/models")return send(200,{
     object:"list",data:[{id:"aiverse"}]});
   const run={run_id:"run-a",session_id:"session-a",system_id:"canonical-a",workspace_id:"film",
     status:"running",principal:"local-operator-secret",messages:[{content:"sensitive"}],
     output:{content:"Test result"},private_data:"do-not-show"};
   if(req.method==="GET"&&req.url==="/v1/runs/run-a/events"){
     res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-store"});
     const send=(n:string,type:string,data:Record<string,unknown>)=>{
       if(res.destroyed||res.writableEnded)return;
       res.write("event: "+type+"\n"+"data: "+JSON.stringify({
         event_id:n,run_id:"run-a",type,at:"2026-10-27T16:00:00Z",data,
       })+"\n\n");
     };
     send("evt-1","run.started",{});
     const finish=()=>{
       send("evt-2","assistant.delta",{text:"Real progress from synthetic Gateway"});
       send("evt-3","run.completed",{});
       if(!res.writableEnded)res.end();
     };
     if(options.slowEvents){
       const timer=setTimeout(finish,450);
       res.once("close",()=>clearTimeout(timer));
     } else finish();
     return;
   }
   if(req.method==="POST"&&req.url==="/v1/runs/run-a/cancel"){
     run.status="canceled";return send(200,run);
   }
   if(req.method==="POST"&&req.url==="/v1/runs")return send(202,run);
   if(req.method==="GET"&&req.url==="/v1/runs/run-a")return send(200,run);
   return send(404,{error:{code:"NOT_FOUND"}});
 });
 return {server,received};
}
async function rpc(port:number,token:string,frame:unknown,origin?:string){
 const res=await fetch("http://127.0.0.1:"+port+"/rpc",{
   method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token,
     ...(origin?{origin}:{})},body:JSON.stringify(frame),
 });
 return {status:res.status,data:await res.json() as Record<string,unknown>};
}
const frame=(method:string,systemId:string,workspaceId="film",params?:unknown)=>({
 type:"req",v:"1.0",id:"client-1",method,systemId,workspaceId,...(params===undefined?{}:{params}),
});
describe("MC2.2 authenticated host bridge, local synthetic Gateway",()=>{
 const closing:(()=>Promise<void>)[]=[];
 const roots:string[]=[];
 afterEach(async()=>{
   for(const fn of closing.splice(0).reverse())await fn();
   for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});
 });
 it("authenticates twice, binds root+workspace and preserves legacy /rpc",async()=>{
   const reg=new SystemRegistry();
   const a=makeRoot(reg,"A");roots.push(a.root);
   const upstream=gatewayFixture();
   const port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",origin:"http://127.0.0.1:"+port,
     resolveBearer:()=> "actual-host-gateway-token",
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),new SubscriptionHub(),
     {port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   const unauth=await rpc(dash.port,"wrong-auth-token-0123456789",
     frame("aiverse.gateway.status",a.systemId));
   assert.equal(unauth.status,401);
   assert.equal(upstream.received.length,0);
   const badOrigin=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.status",a.systemId),
     "https://evil.example");
   assert.equal(badOrigin.status,403);
   assert.equal(upstream.received.length,0);
   const legacy=await rpc(dash.port,dash.authToken,{type:"req",v:"1.0",id:"legacy",method:"system.list"});
   assert.equal(legacy.data.ok,true);
   const status=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.status",a.systemId));
   assert.equal(status.data.ok,true);
   const projection=status.data.result as Record<string,unknown>;
   assert.equal(projection.model,"aiverse");
   assert.deepEqual(projection.runtimeSource,{id:"aiverse",owner:"canonical-gateway",
     model:"aiverse",runtimeKind:"deterministic",
     readinessEvidence:"authenticated-status-and-models",inferenceVerified:false});
   assert.deepEqual(projection.capabilities,{
     runCreate:true,runGet:true,events:true,controls:false,
     conversationLibrary:true,providerSelection:false,
   });
   assert.equal(upstream.received.length,2);
   const models=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.models",a.systemId));
   assert.equal(models.data.ok,true);
   const advertised=models.data.result as Record<string,unknown>;
   assert.equal(advertised.source,"canonical-gateway");
   assert.equal(advertised.workspaceId,"film");
   assert.deepEqual(advertised.models,[{id:"aiverse",label:"AI-Verse Gateway",kind:"gateway-virtual"}]);
   assert.equal(advertised.runtimeKind,"deterministic");
   assert.equal(advertised.modelSelectionSupported,false);
   assert.equal(advertised.providerSelectionSupported,false);
   assert.equal(advertised.inferenceVerified,false);
   assert.doesNotMatch(JSON.stringify(models.data),/actual-host-gateway-token|private_data|principal/);
   const injected=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.models",a.systemId,"film",{provider:"evil",origin:"http://elsewhere"}));
   assert.equal(injected.data.ok,false);
   assert.equal((injected.data.error as {code:string}).code,"INVALID_ENVELOPE");
   assert.ok(upstream.received.every(r=>r.auth==="Bearer actual-host-gateway-token"));
   assert.doesNotMatch(JSON.stringify(status.data),/actual-host-gateway-token/);
   const created=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.run.create",a.systemId,"film",{
     messages:[{role:"user",content:"Plan this shot"}],idempotencyKey:"req-1",
   }));
   assert.equal(created.data.ok,true);
   assert.equal((created.data.result as Record<string,unknown>).runId,"run-a");
   assert.equal((created.data.result as Record<string,unknown>).output,"Test result");
   assert.doesNotMatch(JSON.stringify(created.data),/local-operator-secret|do-not-show|sensitive/);
   const post=upstream.received.find(r=>r.method==="POST");
   assert.equal(post?.key,"req-1");
   assert.deepEqual(post?.body,{
     model:"aiverse",messages:[{role:"user",content:"Plan this shot"}],
     metadata:{workspace_id:"film"},
   });
   const found=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.run.get",a.systemId,"film",{
     runId:"run-a",
   }));
   assert.equal(found.data.ok,true);
   assert.equal((found.data.result as Record<string,unknown>).sessionId,"session-a");
   assert.doesNotMatch(JSON.stringify(found.data),/messages|private_data|principal/);
 });
 it("Stop defaults denied without trusted host opt-in and does not touch upstream",async()=>{
   const reg=new SystemRegistry(),a=makeRoot(reg,"A");roots.push(a.root);
   const upstream=gatewayFixture(),port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",
     origin:"http://127.0.0.1:"+port,resolveBearer:()=>"actual-host-gateway-token",
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),
     new SubscriptionHub(),{port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   const status=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.status",a.systemId));
   assert.equal((status.data.result as Record<string,unknown>).runCancelSupported,false);
   const before=upstream.received.length;
   const denied=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.run.cancel",a.systemId,"film",{
       runId:"run-a",sessionId:"session-a",operationId:"op-1",
     }));
   assert.equal(denied.data.ok,false);
   assert.equal((denied.data.error as {code:string}).code,"RUN_CONTROL_NOT_AUTHORIZED");
   assert.equal(upstream.received.length,before,"unapproved Stop cannot probe the upstream run");
 });
 it("explicit host-enabled Stop checks session, scope, terminal state and parameters",async()=>{
   const reg=new SystemRegistry(),a=makeRoot(reg,"A");roots.push(a.root);
   const upstream=gatewayFixture(),port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",
     origin:"http://127.0.0.1:"+port,resolveBearer:()=>"actual-host-gateway-token",
     allowRunCancel:true,
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),
     new SubscriptionHub(),{port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   const status=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.status",a.systemId));
   assert.equal((status.data.result as Record<string,unknown>).runCancelSupported,true);
   const invalid=[
     {runId:"run-a",sessionId:"session-a",operationId:"op-1",decision:"approve"},
     {runId:"../../private",sessionId:"session-a",operationId:"op-1"},
     {runId:"run-a",sessionId:"session-a",operationId:"../../private"},
   ];
   const before=upstream.received.length;
   for(const params of invalid){
     const res=await rpc(dash.port,dash.authToken,
       frame("aiverse.gateway.run.cancel",a.systemId,"film",params));
     assert.equal(res.data.ok,false);
     assert.equal((res.data.error as {code:string}).code,"INVALID_ENVELOPE");
   }
   assert.equal(upstream.received.length,before);
   const mismatched=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.run.cancel",a.systemId,"film",{
       runId:"run-a",sessionId:"session-foreign",operationId:"op-2",
     }));
   assert.equal((mismatched.data.error as {code:string}).code,"SESSION_BINDING_MISMATCH");
   assert.equal(upstream.received.filter(x=>x.method==="POST").length,0);
   const stopped=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.run.cancel",a.systemId,"film",{
       runId:"run-a",sessionId:"session-a",operationId:"op-3",
     }));
   assert.equal(stopped.data.ok,true);
   const data=stopped.data.result as Record<string,unknown>;
   assert.equal(data.status,"canceled");
   assert.equal(data.source,"canonical-gateway");
   assert.doesNotMatch(JSON.stringify(data),/principal|private_data|sensitive/);
   const post=upstream.received.find(x=>x.path==="/v1/runs/run-a/cancel");
   assert.equal(post?.method,"POST");
   assert.deepEqual(post?.body,{operation_id:"op-3",reason:"dashboard_operator_stop"});
   assert.equal(post?.auth,"Bearer actual-host-gateway-token");
   const repeated=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.run.cancel",a.systemId,"film",{
       runId:"run-a",sessionId:"session-a",operationId:"op-4",
     }));
   assert.equal((repeated.data.error as {code:string}).code,"RUN_NOT_CANCELABLE");
   assert.equal(upstream.received.filter(x=>x.path==="/v1/runs/run-a/cancel").length,1);
   const wrong=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.run.cancel",a.systemId,"operator",{
       runId:"run-a",sessionId:"session-a",operationId:"op-5",
     }));
   assert.equal((wrong.data.error as {code:string}).code,"RUN_BINDING_MISMATCH");
   assert.equal(upstream.received.filter(x=>x.path==="/v1/runs/run-a/cancel").length,1);
 });
 it("fails closed for wrong system, absent workspace, unconfigured host and invalid params",async()=>{
   const reg=new SystemRegistry();
   const a=makeRoot(reg,"A"),b=makeRoot(reg,"B");roots.push(a.root,b.root);
   const upstream=gatewayFixture();
   const port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",origin:"http://127.0.0.1:"+port,
     resolveBearer:()=> "actual-host-gateway-token",
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),new SubscriptionHub(),
     {port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   for(const [f,code] of [
     [frame("aiverse.gateway.status",b.systemId),"GATEWAY_NOT_CONFIGURED"],
     [frame("aiverse.gateway.run.get",a.systemId,"unknown",{runId:"run-a"}),"GATEWAY_UNAVAILABLE"],
     [frame("aiverse.gateway.run.create",a.systemId,"film",{
       messages:[{role:"user",content:"hello"}],idempotencyKey:"1",origin:"http://wrong.example",
     }),"INVALID_ENVELOPE"],
     [frame("aiverse.gateway.run.get",a.systemId,"film",{runId:"../../other"}),"INVALID_ENVELOPE"],
   ] as const){
     const reply=await rpc(dash.port,dash.authToken,f);
     assert.equal(reply.data.ok,false);
     assert.equal((reply.data.error as {code:string}).code,code);
   }
   assert.equal(upstream.received.length,0);
   const missing=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.unknown",a.systemId));
   assert.equal((missing.data.error as {code:string}).code,"UNKNOWN_METHOD");
   assert.equal(upstream.received.length,0);
 });
 it("streams bounded canonical events across authenticated Dashboard WS and rejects wrong scopes",async()=>{
   const reg=new SystemRegistry(),a=makeRoot(reg,"A");roots.push(a.root);
   const upstream=gatewayFixture(),port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",origin:"http://127.0.0.1:"+port,
     resolveBearer:()=> "actual-host-gateway-token",
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),new SubscriptionHub(),
     {port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   const ws=new WebSocket("ws://127.0.0.1:"+dash.port+"/ws?systemId="+a.systemId,
     [DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol(dash.authToken)]);
   await new Promise<void>((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject);});
   closing.push(async()=>{if(ws.readyState!==WebSocket.CLOSED){
     await new Promise<void>(resolve=>{ws.once("close",resolve);ws.terminate();});
   }});
   const messages:Record<string,unknown>[]=[];
   ws.on("message",x=>messages.push(JSON.parse(String(x)) as Record<string,unknown>));
   const wait=async(predicate:()=>boolean)=>{
     const deadline=Date.now()+2300;
     while(!predicate()){if(Date.now()>deadline)throw Error("Timed out waiting for Gateway stream");await new Promise(r=>setTimeout(r,10));}
   };
   ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"operator",runId:"run-a"}));
   await wait(()=>messages.some(m=>m.id==="gateway-run-subscribe"&&m.ok===false));
   assert.equal((messages.find(m=>m.id==="gateway-run-subscribe")?.error as {code:string}).code,"RUN_BINDING_MISMATCH");
   assert.equal(messages.filter(m=>m.event==="aiverse.gateway.run.event").length,0);
   ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a",systemId:"canonical-b"}));
   await wait(()=>messages.filter(m=>m.id==="gateway-run-subscribe"&&m.ok===false).length===2);
   assert.equal((messages.filter(m=>m.id==="gateway-run-subscribe")[1].error as {code:string}).code,"INVALID_SUBSCRIPTION");
   ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a"}));
   await wait(()=>messages.filter(m=>m.event==="aiverse.gateway.run.event").length===3);
   const events=messages.filter(m=>m.event==="aiverse.gateway.run.event");
   for(const e of events){
     assert.equal(eventSchema.safeParse(e).success,true);
     assert.equal(e.systemId,a.systemId);
     assert.equal(e.workspaceId,"film");
   }
   assert.deepEqual(events.map(e=>e.seq),[1,2,3]);
   const delta=events[1].payload as Record<string,unknown>;
   assert.equal(delta.kind,"assistant.delta");
   assert.equal(delta.text,"Real progress from synthetic Gateway");
   assert.doesNotMatch(JSON.stringify(events),/actual-host-gateway-token|local-operator-secret|do-not-show/);
   ws.send(JSON.stringify({type:"gateway-run-unsubscribe"}));
   await wait(()=>messages.some(m=>m.id==="gateway-run-unsubscribe"&&m.ok===true));
   assert.equal(upstream.received.some(x=>x.path==="/v1/runs/run-a/events"),true);
 });
 it("refuses a previously approved Gateway lease after same-root OS rebind",async()=>{
   const reg=new SystemRegistry(),a=makeRoot(reg,"A");roots.push(a.root);
   const upstream=gatewayFixture(),port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",
     origin:"http://127.0.0.1:"+port,resolveBearer:()=>"actual-host-gateway-token",
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),
     new SubscriptionHub(),{port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   const first=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.status",a.systemId));
   assert.equal(first.data.ok,true);
   const observed=upstream.received.length;
   reg.rebind(a.systemId,a.root);
   const next=await rpc(dash.port,dash.authToken,
     frame("aiverse.gateway.status",a.systemId));
   assert.equal(next.data.ok,false);
   assert.equal((next.data.error as {code:string}).code,"GATEWAY_MAPPING_STALE");
   assert.equal(upstream.received.length,observed,"stale lease must never touch canonical Gateway");
 });
 it("drops late canonical events after switching the same socket from film to film2",async()=>{
   const reg=new SystemRegistry(),a=makeRoot(reg,"A");roots.push(a.root);
   const other=join(a.root,"workspaces","film2");mkdirSync(other);
   writeFileSync(join(other,"WORKSPACE.yaml"),
     'schema_version: "2.0"\\nid: "film2"\\nname: "Film 2"\\nstatus: "active"\\n');
   const upstream=gatewayFixture({slowEvents:true}),port=await listen(upstream.server);
   closing.push(()=>new Promise<void>((resolve,reject)=>upstream.server.close(e=>e?reject(e):resolve())));
   const bridge=new CanonicalGatewayBridge(reg,[{
     dashboardSystemId:a.systemId,canonicalSystemId:"canonical-a",
     origin:"http://127.0.0.1:"+port,
     resolveBearer:()=>"actual-host-gateway-token",
   }]);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),
     new SubscriptionHub(),{port:0,canonicalBridge:bridge});
   closing.push(()=>dash.close());
   const ws=new WebSocket("ws://127.0.0.1:"+dash.port+"/ws?systemId="+a.systemId,
     [DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol(dash.authToken)]);
   await new Promise<void>((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject)});
   closing.push(async()=>{if(ws.readyState!==WebSocket.CLOSED){
     await new Promise<void>(resolve=>{ws.once("close",resolve);ws.terminate()});
   }});
   const messages:Record<string,unknown>[]=[];
   ws.on("message",x=>messages.push(JSON.parse(String(x)) as Record<string,unknown>));
   const wait=async(predicate:()=>boolean)=>{
     for(let i=0;i<170;i++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}
     throw Error("Timed out waiting for event or scope acknowledgement");
   };
   ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a"}));
   await wait(()=>messages.some(x=>x.event==="aiverse.gateway.run.event"
     &&(x.payload as {kind?:string})?.kind==="run.started"));
   ws.send(JSON.stringify({type:"subscribe",workspaceId:"film2"}));
   await wait(()=>messages.some(x=>x.id==="subscribe"&&x.ok===true));
   await new Promise(resolve=>setTimeout(resolve,630));
   const stale=messages.filter(x=>x.event==="aiverse.gateway.run.event"
     &&(x.payload as {kind?:string})?.kind!=="run.started");
   assert.equal(stale.length,0,"old film stream must not report progress or success after scope switch");
 });
 it("keeps the original host disabled when no approved canonical mapping is injected",async()=>{
   const reg=new SystemRegistry(),a=makeRoot(reg,"A");roots.push(a.root);
   const dash=await startGateway(new QueryRouter(reg,new DisposableCache()),new SubscriptionHub(),{port:0});
   closing.push(()=>dash.close());
   const result=await rpc(dash.port,dash.authToken,frame("aiverse.gateway.status",a.systemId));
   assert.equal(result.data.ok,false);
   assert.equal((result.data.error as {code:string}).code,"GATEWAY_NOT_CONFIGURED");
 });
});
