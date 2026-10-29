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
