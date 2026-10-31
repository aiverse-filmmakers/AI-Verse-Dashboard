import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {CanonicalGatewayBridge,type ApprovedCanonicalGateway}
  from "../apps/gateway/src/canonical-gateway-bridge.js";

type Facts=Parameters<NonNullable<ApprovedCanonicalGateway["admitRunApproval"]>>[0];
function fixture(args:{admit?:(facts:Facts)=>boolean|Promise<boolean>;
  status?:string; pending?:unknown}={}){
  const registry=new SystemRegistry();
  const root=mkdtempSync(join(tmpdir(),"mc2-owner-approval-"));
  writeFileSync(join(root,"AI-VERSE.yaml"),
    'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"# Disposable OS");
  for(const d of ["operator","system","workspaces"])mkdirSync(join(root,d));
  const systemId=registry.register(root,{label:"approval-test"}).systemId;
  const calls:Array<{path:string;method:string;body:unknown}>=[];
  let checked=0;
  let requestedFacts:Facts|undefined;
  const run=(status=args.status??"awaiting_approval")=>({
    run_id:"run-1",session_id:"session-1",system_id:"canonical-owner",
    workspace_id:"operator",status,
    pending_approval:args.pending===undefined?{tool_call_id:"tool-1",
      authorization:{approval_required:true},request:{secret:"not-for-ui"}}:args.pending,
    principal:"privileged-principal",messages:[{role:"system",content:"secret"}],
  });
  const fetchFn:typeof fetch=async(url,init={})=>{
    const path=new URL(String(url)).pathname;
    const method=String(init.method);
    const body=init.body?JSON.parse(String(init.body)) as unknown:null;
    calls.push({path,method,body});
    return new Response(JSON.stringify(method==="POST"?run("resuming"):run()),
      {status:200,headers:{"content-type":"application/json"}});
  };
  const bridge=new CanonicalGatewayBridge(registry,[{
    dashboardSystemId:systemId,canonicalSystemId:"canonical-owner",
    origin:"http://127.0.0.1:8787",resolveBearer:()=>"host-private-token",
    ...(args.admit?{admitRunApproval:async facts=>{
      checked++;requestedFacts=facts;
      return args.admit!(facts);
    }}:{}),
  }],{fetchFn,timeoutMs:1000});
  const frame=(decision:unknown="approve",overrides:Record<string,unknown>={})=>({
    type:"req",v:"1.0",id:"approve-1",method:"aiverse.gateway.run.approval",
    systemId,workspaceId:"operator",params:{
      runId:"run-1",sessionId:"session-1",
      operationId:"decision-1",decision,...overrides},
  });
  const cleanup=()=>rmSync(root,{force:true,recursive:true});
  return {registry,systemId,root,bridge,calls,frame,cleanup,
    getChecks:()=>checked,getFacts:()=>requestedFacts};
}
describe("MC2.2 canonical Gateway approval owner boundary",()=>{
  it("denies approval and denial when no native admission is injected, without upstream call",async()=>{
    const f=fixture();
    try{
      for(const decision of ["approve","deny"]){
        const out=await f.bridge.handle(f.frame(decision));
        assert.equal(out.ok,false);
        assert.equal(out.error?.code,"RUN_APPROVAL_NOT_AUTHORIZED");
      }
      assert.equal(f.calls.length,0);
    }finally{f.cleanup();}
  });
  it("blocks invalid decision before any native owner invocation",async()=>{
    const f=fixture({admit:()=>true});
    try{
      for(const decision of ["maybe",true,null,{approve:true}]){
        const out=await f.bridge.handle(f.frame(decision));
        assert.equal(out.ok,false);
        assert.equal(out.error?.code,"INVALID_ENVELOPE");
      }
      assert.equal(f.getChecks(),0);
      assert.equal(f.calls.length,0);
    }finally{f.cleanup();}
  });
  it("denies wrong session before owner admission and control effect",async()=>{
    const f=fixture({admit:()=>true});
    try{
      const out=await f.bridge.handle(f.frame("approve",{sessionId:"other"}));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"SESSION_BINDING_MISMATCH");
      assert.equal(f.getChecks(),0);
      assert.deepEqual(f.calls.map(x=>x.method),["GET"]);
    }finally{f.cleanup();}
  });
  it("denies already running/expired approval before invoking owner",async()=>{
    const f=fixture({admit:()=>true,status:"completed"});
    try{
      const out=await f.bridge.handle(f.frame());
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"APPROVAL_NOT_PENDING");
      assert.equal(f.getChecks(),0);
      assert.deepEqual(f.calls.map(x=>x.method),["GET"]);
    }finally{f.cleanup();}
  });
  it("requires native owner to return literal true on the exact run and tool",async()=>{
    const f=fixture({admit:()=>false});
    try{
      const out=await f.bridge.handle(f.frame("approve"));
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"RUN_APPROVAL_NOT_AUTHORIZED");
      assert.equal(f.getChecks(),1);
      assert.deepEqual(f.calls.map(x=>x.method),["GET"]);
      assert.deepEqual(f.getFacts(),{
        dashboardSystemId:f.systemId,canonicalSystemId:"canonical-owner",
        workspaceId:"operator",runId:"run-1",sessionId:"session-1",
        operationId:"decision-1",decision:"approve",pendingToolCallId:"tool-1",
      });
      assert.doesNotMatch(JSON.stringify(out),/not-for-ui|privileged-principal|secret/);
    }finally{f.cleanup();}
  });
  it("forwards the exact decision only after fresh native admission",async()=>{
    const f=fixture({admit:facts=>facts.pendingToolCallId==="tool-1"});
    try{
      const out=await f.bridge.handle(f.frame("deny"));
      assert.equal(out.ok,true);
      assert.equal((out.result as {status:string}).status,"resuming");
      assert.deepEqual(f.calls.map(x=>x.method),["GET","POST"]);
      assert.equal(f.calls[1].path,"/v1/runs/run-1/approval");
      assert.deepEqual(f.calls[1].body,{operation_id:"decision-1",decision:"deny"});
      assert.doesNotMatch(JSON.stringify(out),/not-for-ui|privileged-principal|secret|host-private-token/);
    }finally{f.cleanup();}
  });
  it("revoking the OS binding while native approval is being checked blocks the POST",async()=>{
    let release:()=>void=()=>{};
    let entered:()=>void=()=>{};
    const nativeEntered=new Promise<void>(resolve=>entered=resolve);
    const nativePermit=new Promise<void>(resolve=>release=resolve);
    const f=fixture({admit:async()=>{entered();await nativePermit;return true;}});
    try{
      const pending=f.bridge.handle(f.frame());
      await nativeEntered;
      f.registry.rebind(f.systemId,f.root);
      release();
      const out=await pending;
      assert.equal(out.ok,false);
      assert.equal(out.error?.code,"GATEWAY_MAPPING_STALE");
      assert.deepEqual(f.calls.map(x=>x.method),["GET"]);
    }finally{release();f.cleanup();}
  });
});
