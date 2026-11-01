import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {DisposableCache} from "../packages/os-read-adapter/src/index.js";
import {CanonicalGatewayBridge,QueryRouter,SubscriptionHub,startGateway}
  from "../apps/gateway/src/index.js";
import {LocalApplicationSession} from "../apps/gateway/src/local-app-session.js";

function fixture(){
  const reg=new SystemRegistry();
  const root=mkdtempSync(join(tmpdir(),"mc2-host-http-"));
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"# Test");
  for(const dir of ["operator","system","workspaces"])mkdirSync(join(root,dir));
  const film=join(root,"workspaces","film");mkdirSync(film);
  writeFileSync(join(film,"WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
  const systemId=reg.register(root,{label:"host"}).systemId;
  const calls:{method:string;path:string;auth:string}[]=[];
  const fetchFn:typeof fetch=async(url,init={})=>{
    const path=new URL(String(url)).pathname;
    calls.push({path,method:String(init.method),
      auth:String((init.headers as Record<string,string>)?.authorization)});
    const run={run_id:"run-1",session_id:"session-1",
      system_id:"canonical-a",workspace_id:"operator",status:"running",
      principal:"hidden-principal",messages:[{role:"system",content:"hidden-prompt"}],
      raw_secret:"hidden-credential",output:{content:"actual host response"}};
    const value=path==="/status"?{
      component:"ai-verse-gateway",system_id:"canonical-a",
      state:"ready",runtime:"deterministic",at:"2026-10-31T00:00:00Z",
    }:path==="/v1/models"?{data:[{id:"aiverse"}]}
      :path==="/v1/runs"?run:{error:{code:"NOT_FOUND"}};
    return new Response(JSON.stringify(value),{
      status:path==="/v1/runs"||path==="/status"||path==="/v1/models"?200:404,
      headers:{"content-type":"application/json"}});
  };
  const bridge=new CanonicalGatewayBridge(reg,[{
    dashboardSystemId:systemId,canonicalSystemId:"canonical-a",
    origin:"http://127.0.0.1:10001",resolveBearer:()=>"hidden-bearer",
  }],{fetchFn});
  const frame=(method:string,params?:unknown)=>({
    type:"req",v:"1.0",id:"req-1",method,systemId,workspaceId:"operator",
    ...(params!==undefined?{params}:{})
  });
  const router=new QueryRouter(reg,new DisposableCache());
  const hub=new SubscriptionHub();
  return {reg,root,systemId,calls,bridge,frame,router,hub,
    cleanup:()=>rmSync(root,{recursive:true,force:true})};
}

async function post(port:number,token:string,frame:unknown,origin?:string){
  const res=await fetch("http://127.0.0.1:"+port+"/rpc",{
    method:"POST",headers:{"content-type":"application/json",
      authorization:"Bearer "+token,...(origin?{origin}:{})},
    body:JSON.stringify(frame),
  });
  return {status:res.status,value:await res.json() as Record<string,unknown>};
}
describe("MC2.2 authenticated native HTTP Gateway bridge",()=>{
  it("requires local bearer before contacting the canonical owner",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0,canonicalBridge:f.bridge});
    try{
      const unauthorized=await post(server.port,"bad",f.frame("aiverse.gateway.status"));
      assert.equal(unauthorized.status,401);
      assert.equal(f.calls.length,0);
      const wrongOrigin=await post(server.port,server.authToken,
        f.frame("aiverse.gateway.status"),"https://attacker.test");
      assert.equal(wrongOrigin.status,403);
      assert.equal(f.calls.length,0);
      const good=await post(server.port,server.authToken,f.frame("aiverse.gateway.status"));
      assert.equal(good.value.ok,true);
      assert.equal(f.calls.length,2);
      assert.ok(f.calls.every(x=>x.auth==="Bearer hidden-bearer"));
      assert.doesNotMatch(JSON.stringify(good.value),/hidden-bearer/);
    }finally{await server.close();f.cleanup();}
  });
  it("does not enable canonical calls without an installed native mapping",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0});
    try{
      const response=await post(server.port,server.authToken,
        f.frame("aiverse.gateway.status"));
      assert.equal(response.value.ok,false);
      assert.equal(f.calls.length,0);
    }finally{await server.close();f.cleanup();}
  });
  it("projects actual scoped run result but never upstream secrets",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0,canonicalBridge:f.bridge});
    try{
      const result=await post(server.port,server.authToken,
        f.frame("aiverse.gateway.run.create",{
          messages:[{role:"user",content:"Say hello"}],
          idempotencyKey:"create-1",
        }));
      assert.equal(result.value.ok,true);
      assert.match(JSON.stringify(result.value),/actual host response/);
      assert.doesNotMatch(JSON.stringify(result.value),
        /hidden-credential|hidden-principal|hidden-prompt|hidden-bearer/);
      assert.equal(f.calls.filter(x=>x.path==="/v1/runs").length,1);
    }finally{await server.close();f.cleanup();}
  });
  it("cancels an already-admitted browser run on logout or trusted workspace rotation",async()=>{
    for(const action of ["logout","workspace"] as const){
      const f=fixture();
      let entered!:()=>void,release!:()=>void;
      const started=new Promise<void>(resolve=>entered=resolve);
      const unblock=new Promise<void>(resolve=>release=resolve);
      const forwarded:string[]=[];
      const fetchFn:typeof fetch=async(url)=>{
        const path=new URL(String(url)).pathname;
        forwarded.push(path);
        if(path==="/status"){entered();await unblock;}
        const value=path==="/status"
          ?{component:"ai-verse-gateway",system_id:"canonical-a",
            state:"ready",runtime:"deterministic"}
          :path==="/v1/models"?{data:[{id:"aiverse"}]}
          :{run_id:"unsafe-run",session_id:"unsafe-session",system_id:"canonical-a",
            workspace_id:"operator",status:"running"};
        return new Response(JSON.stringify(value),{
          headers:{"content-type":"application/json"}});
      };
      const bridge=new CanonicalGatewayBridge(f.reg,[{
        dashboardSystemId:f.systemId,canonicalSystemId:"canonical-a",
        origin:"http://127.0.0.1:10001",resolveBearer:()=>"host-private-bearer",
      }],{fetchFn,timeoutMs:3000});
      const app=new LocalApplicationSession({
        systemId:f.systemId,workspaceId:"operator"},undefined,f.reg);
      const server=await startGateway(f.router,f.hub,{
        port:0,canonicalBridge:bridge,localApp:app});
      try{
        const origin="http://127.0.0.1:"+server.port;
        const paired=await fetch(origin+"/local-app/pair",{
          method:"POST",headers:{origin,"content-type":"application/json"},
          body:JSON.stringify({code:app.pairingCode()})});
        assert.equal(paired.status,200);
        const cookie=(paired.headers.get("set-cookie")??"").split(";")[0];
        const pending=fetch(origin+"/rpc",{
          method:"POST",headers:{origin,cookie,"content-type":"application/json"},
          body:JSON.stringify(f.frame("aiverse.gateway.run.create",{
            messages:[{role:"user",content:"Do not dispatch after session revoke"}],
            idempotencyKey:"browser-stale-lease-"+action,
          })),
        }).then(r=>r.json() as Promise<{ok:boolean;error?:{code:string}}>);
        await started;
        if(action==="workspace")app.rotateWorkspaceFromHost("film");
        else{
          const logout=await fetch(origin+"/local-app/logout",{
            method:"POST",headers:{origin,cookie}});
          assert.equal(logout.status,200);
        }
        release();
        const response=await pending;
        assert.equal(response.ok,false,
          "revoked browser must never launch an old-scope Gateway run");
        assert.equal(response.error?.code,"STALE_BINDING");
        assert.deepEqual(forwarded,["/status"],
          "preflight in flight may finish, but no model/read/run may follow");
        const stale=await fetch(origin+"/local-app/session",{headers:{cookie}});
        assert.equal(stale.status,401);
      }finally{
        release();
        await server.close();
        f.cleanup();
      }
    }
  });
  it("refuses a stale approved host binding after same-root rebind",async()=>{
    const f=fixture();
    const server=await startGateway(f.router,f.hub,{port:0,canonicalBridge:f.bridge});
    try{
      const first=await post(server.port,server.authToken,
        f.frame("aiverse.gateway.status"));
      assert.equal(first.value.ok,true);
      const previous=f.calls.length;
      f.reg.rebind(f.systemId,f.root);
      const second=await post(server.port,server.authToken,
        f.frame("aiverse.gateway.status"));
      assert.equal(second.value.ok,false);
      assert.equal((second.value.error as {code:string}).code,
        "GATEWAY_MAPPING_STALE");
      assert.equal(f.calls.length,previous);
    }finally{await server.close();f.cleanup();}
  });
});
