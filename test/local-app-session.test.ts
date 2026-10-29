import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {WebSocket} from "ws";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {DisposableCache} from "../packages/os-read-adapter/src/index.js";
import {QueryRouter,SubscriptionHub,startGateway} from "../apps/gateway/src/index.js";
import {LocalApplicationSession} from "../apps/gateway/src/local-app-session.js";
import {DASHBOARD_WS_PROTOCOL} from "../packages/protocol/src/index.js";
import {SessionStore} from "../packages/live/src/index.js";

function fixture(){
  const root=mkdtempSync(join(tmpdir(),"dash-local-session-"));
  writeFileSync(join(root,"AI-VERSE.yaml"),'schema_version: "2.0"\narchitecture: unified-workspace\n');
  writeFileSync(join(root,"AGENTS.md"),"# fixture\n");
  for(const path of ["operator","workspaces","system"])mkdirSync(join(root,path));
  const dir=join(root,"workspaces","film");mkdirSync(dir);
  writeFileSync(join(dir,"WORKSPACE.yaml"),
    'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
  const reg=new SystemRegistry(),systemId=reg.register(root,{label:"Test OS"}).systemId;
  return {reg,systemId,root};
}
function makeFrame(systemId:string,workspaceId="operator"){
  return {type:"req",v:"1.0",id:"local-session-test",method:"aiverse.gateway.status",
    systemId,workspaceId};
}
function json(body:unknown){return JSON.stringify(body);}
function secureHeaders(port:number,code?:string,cookie?:string){
  return {"content-type":"application/json",origin:"http://127.0.0.1:"+port,
    ...(cookie?{cookie}:{}),...(code?{"x-debug-code-length":String(code.length)}:{})};
}
async function rpc(port:number,body:unknown,headers:Record<string,string>={}){
  return fetch("http://127.0.0.1:"+port+"/rpc",{
    method:"POST",headers:{"content-type":"application/json",...headers},body:json(body),
  });
}
async function expectWsStatus(url:string,code:number,headers:Record<string,string>){
  await new Promise<void>((resolve,reject)=>{
    const ws=new WebSocket(url,[DASHBOARD_WS_PROTOCOL],{headers});
    ws.on("unexpected-response",(_req,res)=>{
      try{assert.equal(res.statusCode,code);res.resume();resolve();}
      catch(e){reject(e);}
    });
    ws.on("open",()=>{ws.terminate();reject(Error("unexpected cookie WebSocket"));});
    ws.on("error",()=>{});
  });
}
describe("MC2 trusted local application pairing and HttpOnly session boundary",()=>{
  const roots:string[]=[];
  const closers:Array<()=>Promise<void>>=[];
  afterEach(async()=>{
    for(const close of closers.splice(0).reverse())await close();
    for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});
  });
  it("is opt-in, single-use, strict-origin and does not reveal bearer",async()=>{
    const {reg,root,systemId}=fixture();roots.push(root);
    const plain=await startGateway(new QueryRouter(reg,new DisposableCache()),new SubscriptionHub(),{port:0});
    closers.push(()=>plain.close());
    const absent=await fetch("http://127.0.0.1:"+plain.port+"/local-app/session");
    assert.equal(absent.status,401);
    assert.equal((await absent.json() as {error:{code:string}}).error.code,"UNAUTHENTICATED");
    const scope={systemId,workspaceId:"operator"};
    const pairing=new LocalApplicationSession(scope);
    const server=await startGateway(new QueryRouter(reg,new DisposableCache()),new SubscriptionHub(),{
      port:0,localApp:pairing,
    });
    closers.push(()=>server.close());
    const code=pairing.pairingCode();
    assert.ok(code.length>=40);
    const base="http://127.0.0.1:"+server.port;
    const unpaired=await fetch(base+"/local-app/session");
    assert.equal(unpaired.status,401);
    assert.doesNotMatch(JSON.stringify(await unpaired.json()),new RegExp(code));
    const wrongHost=await fetch(base+"/local-app/pair",{
      method:"POST",headers:{"content-type":"application/json",origin:"https://attacker.example"},
      body:json({code}),
    });
    assert.equal(wrongHost.status,403);
    const noOrigin=await fetch(base+"/local-app/pair",{
      method:"POST",headers:{"content-type":"application/json"},body:json({code}),
    });
    assert.equal(noOrigin.status,403);
    const wrongContent=await fetch(base+"/local-app/pair",{
      method:"POST",headers:{"content-type":"text/plain",origin:base},body:json({code}),
    });
    assert.equal(wrongContent.status,403);
    const wrongCode=await fetch(base+"/local-app/pair",{
      method:"POST",headers:secureHeaders(server.port),body:json({code:"no"}),
    });
    assert.equal(wrongCode.status,403);
    const paired=await fetch(base+"/local-app/pair",{
      method:"POST",headers:secureHeaders(server.port),body:json({code}),
    });
    assert.equal(paired.status,200);
    const reply=(await paired.json()) as Record<string,unknown>;
    assert.deepEqual(reply.scope,scope);
    assert.equal(reply.privateBearerExported,false);
    const setCookie=paired.headers.get("set-cookie")??"";
    assert.match(setCookie,/HttpOnly; SameSite=Strict; Path=\//);
    assert.doesNotMatch(JSON.stringify(reply),new RegExp(server.authToken+"|"+code));
    const cookie=setCookie.split(";")[0];
    assert.ok(cookie.startsWith("aiverse_local_session="));
    assert.throws(()=>pairing.pairingCode(),/EXPIRED/);
    const replay=await fetch(base+"/local-app/pair",{
      method:"POST",headers:secureHeaders(server.port),body:json({code}),
    });
    assert.equal(replay.status,403);
    const state=await fetch(base+"/local-app/session",{headers:{cookie}});
    assert.equal(state.status,200);
    assert.equal((await state.json() as {authentication:string}).authentication,"host-cookie");
    const missing=await rpc(server.port,makeFrame(systemId),{origin:base});
    assert.equal(missing.status,401);
    const wrongOrigin=await rpc(server.port,makeFrame(systemId),{
      cookie,origin:"http://localhost:"+server.port,
    });
    assert.equal(wrongOrigin.status,401);
    const wrongWorkspace=await rpc(server.port,makeFrame(systemId,"film"),{
      cookie,origin:base,
    });
    assert.equal(wrongWorkspace.status,403);
    const wrongSystem=await rpc(server.port,makeFrame("other-system"),{
      cookie,origin:base,
    });
    assert.equal(wrongSystem.status,403);
    const otherMethod=await rpc(server.port,{
      type:"req",v:"1.0",id:"unsafe",method:"system.list",systemId,workspaceId:"operator",
    },{cookie,origin:base});
    assert.equal(otherMethod.status,403);
    const osInfo=await rpc(server.port,{
      type:"req",v:"1.0",id:"native-os-projection",method:"system.get",
      systemId,workspaceId:"operator",
    },{cookie,origin:base});
    assert.equal(osInfo.status,200);
    const osInfoBody=(await osInfo.json()) as {ok:boolean;result?:{
      system?:Record<string,unknown>}};
    assert.equal(osInfoBody.ok,true);
    assert.equal(osInfoBody.result?.system?.systemId,systemId);
    assert.equal(osInfoBody.result?.system?.authorized,true);
    assert.equal(osInfoBody.result?.system?.label,"Test OS");
    assert.equal("root" in (osInfoBody.result?.system??{}),false,
      "public paired registry projection must never reveal OS filesystem root");
    assert.equal("rootIdentity" in (osInfoBody.result?.system??{}),false);
    const otherPublic=await rpc(server.port,{
      type:"req",v:"1.0",id:"native-os-other-system",method:"system.get",
      systemId:"another-system",workspaceId:"operator",
    },{cookie,origin:base});
    assert.equal(otherPublic.status,403);
    const wrongWorkspacePublic=await rpc(server.port,{
      type:"req",v:"1.0",id:"native-os-other-workspace",method:"system.get",
      systemId,workspaceId:"film",
    },{cookie,origin:base});
    assert.equal(wrongWorkspacePublic.status,403);
    const cannotQueryOtherSystem=await rpc(server.port,{
      type:"req",v:"1.0",id:"native-os-system-list",method:"system.list",
      systemId,workspaceId:"operator",
    },{cookie,origin:base});
    assert.equal(cannotQueryOtherSystem.status,403);
    const cannotInspectWorkspace=await rpc(server.port,{
      type:"req",v:"1.0",id:"native-workspace-direct",method:"workspace.list",
      systemId,workspaceId:"operator",
    },{cookie,origin:base});
    assert.equal(cannotInspectWorkspace.status,403);
    const allowed=await rpc(server.port,makeFrame(systemId),{cookie,origin:base});
    assert.equal(allowed.status,200);
    const response=(await allowed.json()) as {error?:{code:string}};
    assert.equal(response.error?.code,"GATEWAY_NOT_CONFIGURED",
      "valid cookie has limited access; it cannot create an unconfigured canonical Gateway");
    const missingActivity=await rpc(server.port,{
      type:"req",v:"1.0",id:"local-activity-unavailable",method:"operator.activity",
      systemId,workspaceId:"operator",
    },{cookie,origin:base});
    assert.equal(missingActivity.status,200);
    const activityUnavailable=await missingActivity.json() as {
      ok:boolean;error?:{code:string}};
    assert.equal(activityUnavailable.ok,false);
    assert.equal(activityUnavailable.error?.code,"SESSIONS_UNAVAILABLE",
      "missing local session owner must not be turned into a fabricated empty activity list");
    const wurl="ws://127.0.0.1:"+server.port+"/ws?systemId="+systemId;
    await expectWsStatus(wurl,401,{origin:"https://attacker.example",cookie});
    await expectWsStatus("ws://127.0.0.1:"+server.port+"/ws?systemId=other-system",
      403,{origin:base,cookie});
    const ws=new WebSocket(wurl,[DASHBOARD_WS_PROTOCOL],{headers:{origin:base,cookie}});
    await new Promise<void>((resolve,reject)=>{
      ws.once("open",resolve);ws.once("error",reject);
    });
    assert.equal(ws.protocol,DASHBOARD_WS_PROTOCOL);
    const revoked=new Promise<void>(resolve=>ws.once("close",()=>resolve()));
    const logout=await fetch(base+"/local-app/logout",{
      method:"POST",headers:{origin:base,cookie},
    });
    assert.equal(logout.status,200);
    await revoked;
    assert.equal(ws.readyState,WebSocket.CLOSED,"logout revokes existing event sockets");
    assert.match(logout.headers.get("set-cookie")??"",/Max-Age=0/);
    const expired=await rpc(server.port,makeFrame(systemId),{cookie,origin:base});
    assert.equal(expired.status,401);
  });
  it("admits only the current workspace manifest and rejects future wildcard methods",async()=>{
    const {reg,root,systemId}=fixture();roots.push(root);
    const pairing=new LocalApplicationSession({systemId,workspaceId:"film"});
    const router=new QueryRouter(reg,new DisposableCache());
    const memory=new SessionStore();
    const own=memory.create(systemId,"film",{title:"PRIVATE SCENE SECRET",sessionId:"film-session"});
    memory.append(systemId,own.sessionId,{id:"entry-film",role:"agent",kind:"tool-call",
      body:"PRIVATE PROMPT /tmp/member/secret.docx"});
    const other=memory.create(systemId,"operator",{title:"PRIVATE OTHER",sessionId:"op-session"});
    memory.append(systemId,other.sessionId,{id:"entry-other",role:"user",kind:"message",
      body:"CROSS WORKSPACE SECRET"});
    router.attachSessions(memory);
    const server=await startGateway(router,
      new SubscriptionHub(),{port:0,localApp:pairing});
    closers.push(()=>server.close());
    const base="http://127.0.0.1:"+server.port;
    const paired=await fetch(base+"/local-app/pair",{
      method:"POST",headers:secureHeaders(server.port),
      body:json({code:pairing.pairingCode()}),
    });
    assert.equal(paired.status,200);
    const cookie=(paired.headers.get("set-cookie")??"").split(";")[0];
    const ask=(method:string,workspaceId:string,sys=systemId)=>rpc(server.port,{
      type:"req",v:"1.0",id:"workspace-manifest-security",method,
      systemId:sys,workspaceId,
    },{cookie,origin:base});
    const workspaceInfo=await ask("workspace.get","film");
    assert.equal(workspaceInfo.status,200);
    const body=await workspaceInfo.json() as {ok:boolean;result?:{workspace?:Record<string,unknown>}};
    assert.equal(body.ok,true);
    assert.deepEqual(body.result?.workspace,{id:"film",name:"Film",status:"active"});
    assert.equal("root" in (body.result?.workspace??{}),false);
    assert.equal((await ask("workspace.get","operator")).status,403);
    assert.equal((await ask("workspace.get","film","other-system")).status,403);
    assert.equal((await ask("workspace.list","film")).status,403);
    assert.equal((await ask("system.info","film")).status,403);
    assert.equal((await ask("aiverse.gateway.future.privileged","film")).status,403);
    assert.equal((await ask("aiverse.canvas.future.privileged","film")).status,403);
    assert.equal((await ask("source.preview","film")).status,403);
    const activity=await ask("operator.activity","film");
    assert.equal(activity.status,200);
    const activityBody=await activity.json() as {ok:boolean;result?:{
      source:string;workspaceId:string;retention:string;sessionCount:number;
      sessions:Array<{status:string;entryCount:number}>;
      events:Array<{kind:string;role:string}>}};
    assert.equal(activityBody.ok,true);
    assert.equal(activityBody.result?.source,"dashboard-local-sessions");
    assert.equal(activityBody.result?.sessionCount,1);
    assert.deepEqual(activityBody.result?.events.map(x=>x.kind),["tool-call"]);
    assert.equal(activityBody.result?.retention,"in-memory-only");
    assert.doesNotMatch(JSON.stringify(activityBody),/PRIVATE|CROSS WORKSPACE|film-session|entry-film|op-session|secret/);
    assert.equal((await ask("operator.activity","operator")).status,403);
    assert.equal((await ask("operator.activity","film","another-system")).status,403);
  });
  it("trusted host changes real OS workspace, revokes browser cookies and sockets, and requires fresh pairing",async()=>{
    const {reg,root,systemId}=fixture();roots.push(root);
    const session=new LocalApplicationSession({systemId,workspaceId:"operator"},undefined,reg);
    const server=await startGateway(new QueryRouter(reg,new DisposableCache()),
      new SubscriptionHub(),{port:0,localApp:session});
    closers.push(()=>server.close());
    const base="http://127.0.0.1:"+server.port;
    const firstCode=session.pairingCode();
    const login=async(code:string)=>fetch(base+"/local-app/pair",{
      method:"POST",headers:secureHeaders(server.port),body:json({code}),
    });
    const first=await login(firstCode);
    assert.equal(first.status,200);
    const oldCookie=(first.headers.get("set-cookie")??"").split(";")[0];
    const scope=async(cookie:string)=>fetch(base+"/local-app/session",{
      headers:{cookie}});
    assert.equal((await scope(oldCookie)).status,200);
    const ws=new WebSocket("ws://127.0.0.1:"+server.port+
      "/ws?systemId="+systemId,[DASHBOARD_WS_PROTOCOL],{
      headers:{origin:base,cookie:oldCookie},
    });
    await new Promise<void>((resolve,reject)=>{
      ws.once("open",resolve);ws.once("error",reject);
    });
    const closed=new Promise<void>(resolve=>ws.once("close",()=>resolve()));
    assert.throws(()=>session.rotateWorkspaceFromHost("../escape"),/LOCAL_APP_SCOPE_INVALID/);
    assert.throws(()=>session.rotateWorkspaceFromHost("missing"),/ADAPTER_/);
    assert.equal((await scope(oldCookie)).status,200,
      "invalid owner selection must not revoke the current browser");
    assert.equal((await rpc(server.port,{
      type:"req",v:"1.0",id:"browser-cannot-switch",method:"workspace.list",
      systemId,workspaceId:"operator",
    },{cookie:oldCookie,origin:base})).status,403);
    const fakeSwitch=await fetch(base+"/local-app/switch",{
      method:"POST",headers:secureHeaders(server.port,undefined,oldCookie),
      body:json({workspaceId:"film"}),
    });
    assert.equal(fakeSwitch.status,404);
    session.rotateWorkspaceFromHost("film");
    await closed;
    assert.equal(ws.readyState,WebSocket.CLOSED);
    const freshCode=session.pairingCode();
    assert.notEqual(freshCode,firstCode);
    assert.equal((await scope(oldCookie)).status,401);
    assert.equal((await login(firstCode)).status,403,
      "used operator pairing code cannot authenticate the film workspace");
    assert.equal((await rpc(server.port,{type:"req",v:"1.0",id:"stale-cookie",
      method:"workspace.get",systemId,workspaceId:"film"},
      {cookie:oldCookie,origin:base})).status,401);
    const second=await login(freshCode);
    assert.equal(second.status,200);
    const next=(await second.json()) as {scope:{systemId:string;workspaceId:string}};
    assert.deepEqual(next.scope,{systemId,workspaceId:"film"});
    const newCookie=(second.headers.get("set-cookie")??"").split(";")[0];
    assert.notEqual(newCookie,oldCookie);
    const film=await rpc(server.port,{type:"req",v:"1.0",id:"film-only",
      method:"workspace.get",systemId,workspaceId:"film"},
      {cookie:newCookie,origin:base});
    assert.equal((await film.json() as {ok:boolean}).ok,true);
    assert.equal((await rpc(server.port,{type:"req",v:"1.0",id:"blocked-operator",
      method:"system.get",systemId,workspaceId:"operator"},
      {cookie:newCookie,origin:base})).status,403);
    assert.equal((await scope(oldCookie)).status,401);
    // Switching back requires a third pairing; no cookie spans workspaces.
    session.rotateWorkspaceFromHost("operator");
    assert.equal((await scope(newCookie)).status,401);
    const third=await login(session.pairingCode());
    assert.equal(third.status,200);
    assert.equal(((await third.json()) as {scope:{workspaceId:string}}).scope.workspaceId,"operator");
  });
  it("old owner-root grants cannot survive registry rebind or identity changes",async()=>{
    const {reg,root,systemId}=fixture();roots.push(root);
    const session=new LocalApplicationSession({systemId,workspaceId:"operator"},undefined,reg);
    const server=await startGateway(new QueryRouter(reg,new DisposableCache()),
      new SubscriptionHub(),{port:0,localApp:session});
    closers.push(()=>server.close());
    const base="http://127.0.0.1:"+server.port;
    const p=await fetch(base+"/local-app/pair",{method:"POST",
      headers:secureHeaders(server.port),body:json({code:session.pairingCode()})});
    assert.equal(p.status,200);
    const cookie=(p.headers.get("set-cookie")??"").split(";")[0];
    reg.rebind(systemId,root);
    assert.equal((await fetch(base+"/local-app/session",{headers:{cookie}})).status,401);
    assert.throws(()=>session.rotateWorkspaceFromHost("film"),/LOCAL_APP_OS_BINDING_STALE/);
    assert.throws(()=>session.pairingCode(),/LOCAL_APP_OS_BINDING_STALE/);
    const denied=await rpc(server.port,{type:"req",v:"1.0",id:"stale-owner",
      method:"workspace.get",systemId,workspaceId:"operator"},
      {cookie,origin:base});
    assert.equal(denied.status,401);
  });
  it("unbound host cannot rotate scope without an explicit OS owner",async()=>{
    const {reg,root,systemId}=fixture();roots.push(root);
    const legacy=new LocalApplicationSession({systemId,workspaceId:"operator"});
    assert.throws(()=>legacy.rotateWorkspaceFromHost("film"),/LOCAL_APP_HOST_AUTHORITY_REQUIRED/);
  });
  it("locks pairing after five incorrect attempts without accepting the correct code",async()=>{
    const {reg,root,systemId}=fixture();roots.push(root);
    const session=new LocalApplicationSession({systemId,workspaceId:"operator"});
    const srv=await startGateway(new QueryRouter(reg,new DisposableCache()),
      new SubscriptionHub(),{port:0,localApp:session});
    closers.push(()=>srv.close());
    const code=session.pairingCode();
    for(let i=0;i<5;i++){
      const reply=await fetch("http://127.0.0.1:"+srv.port+"/local-app/pair",{
        method:"POST",headers:secureHeaders(srv.port),body:json({code:"incorrect-"+i}),
      });
      assert.equal(reply.status,403);
    }
    assert.throws(()=>session.pairingCode(),/EXPIRED/);
    const attempt=await fetch("http://127.0.0.1:"+srv.port+"/local-app/pair",{
      method:"POST",headers:secureHeaders(srv.port),body:json({code}),
    });
    assert.equal(attempt.status,403);
  });
});
