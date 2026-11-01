import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {CanonicalGatewayBridge} from "../apps/gateway/src/canonical-gateway-bridge.js";

/** Scope-only host tests. These do NOT attach the bridge to public /rpc. */
function fixture(allowRunCancel=false,
  onRequest?:(path:string)=>void,onCredential?:()=>void,
  history:"unavailable"|"available"|"wrong-scope"="unavailable"){
  const reg=new SystemRegistry();
  const root=mkdtempSync(join(tmpdir(),"aiverse-mc2-bridge-"));
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"# Source-only test");
  for(const dir of ["operator","system","workspaces"])mkdirSync(join(root,dir));
  const system=reg.register(root,{label:"test"}).systemId;
  const calls:{path:string;method:string;auth:string}[]=[];
  const run={run_id:"run-a",session_id:"session-a",system_id:"canonical-a",
    workspace_id:"operator",status:"running",
    principal:"private-owner-id",messages:[{role:"system",content:"secret"}],
    provider_token:"private-provider-token",
    usage:{input_tokens:1,output_tokens:2,actions:3,cost:987},
    output:{content:"Visible answer"}};
  const fetchFn:typeof fetch=async(url,init={})=>{
    const path=new URL(String(url)).pathname;
    calls.push({path,method:String(init.method),auth:String((init.headers as Record<string,string>)?.authorization)});
    onRequest?.(path);
    const body=path==="/status"
      ?{component:"ai-verse-gateway",system_id:"canonical-a",state:"ready",
        runtime:"deterministic",at:"2026-10-31T00:00:00Z"}
      :path==="/v1/models"?{object:"list",data:[{id:"aiverse"}]}
      :path==="/v1/sessions"&&history!=="unavailable"?
        {object:"list",has_more:false,next_offset:null,
          data:history==="wrong-scope"?[{
            session_id:"session-outside",system_id:"canonical-a",
            workspace_id:"film",status:"active",
          }]:[]}
      :path==="/v1/runs"||path==="/v1/runs/run-a"?run
      :{error:{code:"NOT_FOUND"}};
    return new Response(JSON.stringify(body),{status:200,
      headers:{"content-type":"application/json"}});
  };
  const bridge=new CanonicalGatewayBridge(reg,[{
    dashboardSystemId:system,canonicalSystemId:"canonical-a",
    origin:"http://127.0.0.1:8080",resolveBearer:()=>{
      onCredential?.();
      return "native-bearer";
    },
    allowRunCancel,
  }],{fetchFn,timeoutMs:800});
  const frame=(method:string,params:Record<string,unknown>={})=>({
    type:"req",v:"1.0",id:"req-1",method,systemId:system,
    workspaceId:"operator",params,
  });
  return {reg,root,system,bridge,frame,calls,cleanup:()=>rmSync(root,{force:true,recursive:true})};
}

describe("MC2.2 trusted canonical Gateway scope bridge",()=>{
  it("preflights real Gateway identity, never exposes native bearer or runtime secret",async()=>{
    const f=fixture();
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(out.ok,true);
      const body=JSON.stringify(out);
      assert.match(body,/canonical-gateway/);
      assert.doesNotMatch(body,/native-bearer|private-owner-id|private-provider-token/);
      assert.equal(f.calls.length,3);
      assert.deepEqual(f.calls.map(x=>x.path),["/status","/v1/models","/v1/sessions"]);
      assert.equal((out.result as {capabilities:{conversationLibrary:boolean}})
        .capabilities.conversationLibrary,false,
        "reachable Gateway cannot invent an unsupported conversation library");
      assert.ok(f.calls.every(x=>x.auth==="Bearer native-bearer"));
    }finally{f.cleanup();}
  });
  it("advertises owner conversation history only after a real scoped list validates",async()=>{
    const f=fixture(false,undefined,undefined,"available");
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(out.ok,true);
      assert.equal((out.result as {capabilities:{conversationLibrary:boolean}})
        .capabilities.conversationLibrary,true);
      assert.deepEqual(f.calls.map(x=>x.path),["/status","/v1/models","/v1/sessions"]);
    }finally{f.cleanup();}
  });
  it("fails closed if the owner history probe returns another workspace",async()=>{
    const f=fixture(false,undefined,undefined,"wrong-scope");
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"HISTORY_BINDING_MISMATCH");
      assert.deepEqual(f.calls.map(x=>x.path),["/status","/v1/models","/v1/sessions"]);
    }finally{f.cleanup();}
  });
  it("refuses a green runtime if its owner changes during the history capability read",async()=>{
    const f=fixture(false,path=>{
      if(path==="/v1/sessions")f.reg.rebind(f.system,f.root);
    },undefined,"available");
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"GATEWAY_MAPPING_STALE");
      assert.deepEqual(f.calls.map(x=>x.path),["/status","/v1/models","/v1/sessions"]);
    }finally{f.cleanup();}
  });
  it("projects only allowed run fields and refuses owner-less cancel",async()=>{
    const f=fixture();
    try{
      const read=await f.bridge.handle(f.frame("aiverse.gateway.run.get",{runId:"run-a"}));
      assert.equal(read.ok,true);
      const body=JSON.stringify(read);
      assert.match(body,/Visible answer/);
      assert.doesNotMatch(body,/private-provider-token|private-owner-id|secret|987/);
      const before=f.calls.length;
      const denied=await f.bridge.handle(f.frame("aiverse.gateway.run.cancel",{
        runId:"run-a",sessionId:"session-a",operationId:"op-1",
      }));
      assert.equal(denied.ok,false);
      assert.equal(denied.error?.code,"RUN_CONTROL_NOT_AUTHORIZED");
      assert.equal(f.calls.length,before,"denied action must not access upstream");
    }finally{f.cleanup();}
  });
  it("invalidates old root lease before a new owner network request",async()=>{
    const f=fixture();
    try{
      const first=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(first.ok,true);
      const count=f.calls.length;
      f.reg.rebind(f.system,f.root);
      const stale=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(stale.ok,false);
      assert.equal(stale.error?.code,"GATEWAY_MAPPING_STALE");
      assert.equal(f.calls.length,count);
    }finally{f.cleanup();}
  });
  it("does not dispatch a run if the OS owner rebinds during Gateway preflight",async()=>{
    // A real request may finish two upstream readiness reads after the OS
    // binding is revoked. An old client must not start billable work afterward.
    const f=fixture(false,path=>{
      if(path==="/v1/models")f.reg.rebind(f.system,f.root);
    });
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.run.create",{
        messages:[{role:"user",content:"Never send after owner rotation"}],
        idempotencyKey:"owner-rotated-during-preflight",
      }));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"GATEWAY_MAPPING_STALE");
      assert.deepEqual(f.calls.map(x=>x.path),["/status","/v1/models"]);
      assert.equal(f.calls.some(x=>x.path==="/v1/runs"),false);
    }finally{f.cleanup();}
  });
  it("does not dispatch a run if the owner changes during final credential resolution",async()=>{
    let reads=0;
    const f=fixture(false,undefined,()=>{
      reads++;
      if(reads===3)f.reg.rebind(f.system,f.root);
    });
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.run.create",{
        messages:[{role:"user",content:"No old owner run"}],
        idempotencyKey:"owner-rotated-before-dispatch",
      }));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"GATEWAY_MAPPING_STALE");
      assert.equal(reads,3);
      assert.deepEqual(f.calls.map(x=>x.path),["/status","/v1/models"]);
    }finally{f.cleanup();}
  });
  it("revokes Stop after a valid scoped GET but before control dispatch",async()=>{
    let resolutions=0;
    const f=fixture(true,undefined,()=>{
      resolutions++;
      if(resolutions===2)f.reg.rebind(f.system,f.root);
    });
    try{
      const out=await f.bridge.handle(f.frame("aiverse.gateway.run.cancel",{
        runId:"run-a",sessionId:"session-a",operationId:"owner-rotated-stop",
      }));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"GATEWAY_MAPPING_STALE");
      assert.equal(resolutions,2);
      assert.deepEqual(f.calls.map(x=>x.path),["/v1/runs/run-a"]);
      assert.equal(f.calls.some(x=>x.method==="POST"),false);
    }finally{f.cleanup();}
  });
  it("requires the precise canonical run session before any owner-control POST",async()=>{
    const f=fixture(true);
    try{
      const denied=await f.bridge.handle(f.frame("aiverse.gateway.run.cancel",{
        runId:"run-a",sessionId:"wrong-session",operationId:"op-1",
      }));
      assert.equal(denied.ok,false);
      assert.equal(denied.error?.code,"SESSION_BINDING_MISMATCH");
      assert.equal(f.calls.some(x=>x.method==="POST"),false);
    }finally{f.cleanup();}
  });
  it("rejects resurrected credentials after unregister and same-id same-root registration",async()=>{
    const f=fixture();
    try{
      const first=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(first.ok,true);
      const count=f.calls.length;
      const previous=f.reg.bindingGeneration(f.system);
      assert.equal(f.reg.unregister(f.system),true);
      f.reg.register(f.root,{systemId:f.system,label:"reinstalled"});
      assert.notEqual(f.reg.bindingGeneration(f.system),previous,
        "re-registration must never reuse an earlier live lease epoch");
      const stale=await f.bridge.handle(f.frame("aiverse.gateway.status"));
      assert.equal(stale.ok,false);
      assert.equal(stale.error?.code,"GATEWAY_MAPPING_STALE");
      assert.equal(f.calls.length,count,"old bearer must never be dispatched");
    }finally{f.cleanup();}
  });
});
