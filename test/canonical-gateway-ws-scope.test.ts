import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {WebSocket} from "ws";
import {DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol}
  from "../packages/protocol/src/index.js";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {DisposableCache} from "../packages/os-read-adapter/src/index.js";
import {CanonicalGatewayBridge,QueryRouter,SubscriptionHub,startGateway}
  from "../apps/gateway/src/index.js";

function fixture(){
  const registry=new SystemRegistry();
  const root=mkdtempSync(join(tmpdir(),"aiverse-mc2-ws-"));
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"# Temporary test OS");
  for(const dir of ["operator","system","workspaces","workspaces/film",
    "workspaces/film2"])mkdirSync(join(root,dir));
  for(const w of ["film","film2"]){
    writeFileSync(join(root,"workspaces",w,"WORKSPACE.yaml"),
      'schema_version: "2.0"\nid: "'+w+'"\nname: "'+w+'"\nstatus: "active"\n');
  }
  const systemId=registry.register(root,{label:"Test"}).systemId;
  let cancellations=0;
  const calls:string[]=[];
  const wire=(id:string,type:string,data:Record<string,unknown>)=>
    "event: "+type+"\ndata: "+JSON.stringify({event_id:id,run_id:"run-a",
      type,at:"2026-10-31T00:00:00Z",data})+"\n\n";
  const fetchFn:typeof fetch=async(url,init={})=>{
    const p=new URL(String(url)).pathname;
    calls.push(p);
    if(p==="/v1/runs/run-a")return new Response(JSON.stringify({
      run_id:"run-a",session_id:"session-a",system_id:"canonical-a",
      workspace_id:"film",status:"running",private_secret:"not-for-browser",
    }),{headers:{"content-type":"application/json"}});
    if(p==="/v1/runs/run-a/events"){
      let timer:ReturnType<typeof setTimeout>|undefined;
      let cancelled=false;
      return new Response(new ReadableStream<Uint8Array>({
        start(controller){
          controller.enqueue(new TextEncoder().encode(wire("ev-1","run.started",{})));
          timer=setTimeout(()=>{
            if(cancelled)return;
            controller.enqueue(new TextEncoder().encode(
              wire("ev-2","assistant.delta",{text:"Scoped actual progress",secret:"private"})));
            controller.close();
          },160);
        },
        cancel(){cancelled=true;cancellations++;if(timer)clearTimeout(timer);}
      }),{headers:{"content-type":"text/event-stream"}});
    }
    return new Response(JSON.stringify({error:{code:"NOT_FOUND"}}),{status:404,
      headers:{"content-type":"application/json"}});
  };
  const bridge=new CanonicalGatewayBridge(registry,[{
    dashboardSystemId:systemId,canonicalSystemId:"canonical-a",
    origin:"http://127.0.0.1:10001",resolveBearer:()=>"native-secret",
  }],{fetchFn,timeoutMs:1200});
  const router=new QueryRouter(registry,new DisposableCache());
  return {registry,root,systemId,bridge,router,
    hub:new SubscriptionHub(),calls,getCancels:()=>cancellations,
    cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
async function connect(port:number,systemId:string,token:string){
  const ws=new WebSocket("ws://127.0.0.1:"+port+"/ws?systemId="+systemId,
    [DASHBOARD_WS_PROTOCOL,dashboardWsAuthProtocol(token)]);
  await new Promise<void>((resolve,reject)=>{
    ws.once("open",()=>resolve());ws.once("error",reject);
  });
  const seen:Record<string,unknown>[]=[];
  ws.on("message",x=>seen.push(JSON.parse(String(x)) as Record<string,unknown>));
  const wait=async(predicate:()=>boolean)=>{
    for(let i=0;i<200;i++){
      if(predicate())return;
      await new Promise(r=>setTimeout(r,10));
    }
    throw new Error("Timed out awaiting admitted scoped WebSocket event");
  };
  const close=async()=>{
    if(ws.readyState===WebSocket.CLOSED)return;
    await new Promise<void>(resolve=>{ws.once("close",()=>resolve());ws.terminate();});
  };
  return {ws,seen,wait,close};
}

describe("MC2.2 canonical run SSE over authenticated Dashboard websocket",()=>{
  it("relays only scoped event projections without model/owner secrets",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0,canonicalBridge:f.bridge});
    const client=await connect(server.port,f.systemId,server.authToken);
    try{
      client.ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a"}));
      await client.wait(()=>client.seen.some(x=>x.event==="aiverse.gateway.run.event"
        &&(x.payload as {kind?:string})?.kind==="assistant.delta"));
      const stream=client.seen.filter(x=>x.event==="aiverse.gateway.run.event");
      assert.deepEqual(stream.map(x=>(x.payload as {kind:string}).kind),
        ["run.started","assistant.delta"]);
      assert.match(JSON.stringify(stream),/Scoped actual progress/);
      assert.doesNotMatch(JSON.stringify(stream),/native-secret|not-for-browser|private/);
      assert.ok(f.calls.includes("/v1/runs/run-a/events"));
      client.ws.send(JSON.stringify({type:"gateway-run-unsubscribe"}));
      await client.wait(()=>client.seen.some(x=>x.id==="gateway-run-unsubscribe"));
    }finally{await client.close();await server.close();f.cleanup();}
  });
  it("cancels old workspace progress when socket subscription changes workspace",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0,canonicalBridge:f.bridge});
    const client=await connect(server.port,f.systemId,server.authToken);
    try{
      client.ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a"}));
      await client.wait(()=>client.seen.some(x=>x.event==="aiverse.gateway.run.event"));
      client.ws.send(JSON.stringify({type:"subscribe",workspaceId:"film2"}));
      await client.wait(()=>client.seen.some(x=>x.id==="subscribe"&&x.ok===true));
      await new Promise(r=>setTimeout(r,260));
      assert.equal(client.seen.filter(x=>x.event==="aiverse.gateway.run.event"
        &&(x.payload as {kind?:string})?.kind==="assistant.delta").length,0);
      assert.ok(f.getCancels()>=1);
    }finally{await client.close();await server.close();f.cleanup();}
  });
  it("denies canonical stream admission if native mapping was never installed",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0});
    const client=await connect(server.port,f.systemId,server.authToken);
    try{
      client.ws.send(JSON.stringify({type:"gateway-run-subscribe",workspaceId:"film",runId:"run-a"}));
      await client.wait(()=>client.seen.some(x=>x.id==="gateway-run-subscribe"));
      const out=client.seen.find(x=>x.id==="gateway-run-subscribe")!;
      assert.equal(out.ok,false);
      assert.equal((out.error as {code:string}).code,"GATEWAY_NOT_CONFIGURED");
      assert.equal(f.calls.length,0);
    }finally{await client.close();await server.close();f.cleanup();}
  });
});
