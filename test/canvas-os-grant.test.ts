import {describe,it,afterEach} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {SystemRegistry} from "../packages/registry/src/index.js";
import {createOsNativeCanvasGrantResolvers} from "../apps/gateway/src/index.js";

const roots:string[]=[];
afterEach(()=>roots.splice(0).forEach(r=>rmSync(r,{recursive:true,force:true})));
function fixture(){
 const root=realpathSync(mkdtempSync(join(tmpdir(),"os-canvas-grants-")));roots.push(root);
 for(const d of ["operator","workspaces","system"])mkdirSync(join(root,d));
 writeFileSync(join(root,"AI-VERSE.yaml"),
  'schema_version: "2.0"\narchitecture: unified-workspace\n');
 writeFileSync(join(root,"AGENTS.md"),"# grant test");
 const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
 let human=true,bot=true,grant=true,actor="native-human",reads=0;
 const native={verifyInstalledCanvasGrant:({osRoot,facts}:any)=>{
  reads++;
  if(!grant||osRoot!==root)return null;
  const humanGrant=facts.actorKind==="human";
  return {
   source:"ai-verse-os/canvas-actor-grants-v1",
   actorKind:facts.actorKind,actorId:humanGrant?actor:"native-bot",
   leaseEpoch:"gen-1:lease-1",systemId:facts.systemId,
   workspaceId:facts.workspaceId,method:facts.method,
   principal:facts.principal,
   ...(humanGrant?{}:{runId:facts.runId,sessionId:facts.sessionId}),
  };
 }};
 const resolver=createOsNativeCanvasGrantResolvers(registry,{
  dashboardSystemId:systemId,native,
  authenticateHuman:async()=>human?{principal:"os-operator-session"}:null,
  authenticateBot:async()=>bot?{principal:"gateway-operator",
   runId:"run-1",sessionId:"session-1",actorId:"native-bot"}:null,
 });
 const request={method:"aiverse.canvas.edit",params:{
  id:"rec_1",expectedVersion:1,idempotencyKey:"edit-1",
 }};
 const person={systemId,workspaceId:"operator",root,principal:"local-operator" as const,
  access:"write" as const,assertLease:()=>{}};
 const agent={...person,principal:"verified-agent" as const,
  agent:{runId:"run-1",actorId:"native-bot"}};
 const facts={runId:"run-1",sessionId:"session-1",canonicalSystemId:"canonical-1",
  dashboardSystemId:systemId,workspaceId:"operator",principal:"gateway-operator"};
 return {root,registry,systemId,resolver,person,agent,request,facts,
  setHuman:(v:boolean)=>{human=v},setBot:(v:boolean)=>{bot=v},
  setGrant:(v:boolean)=>{grant=v},setActor:(v:string)=>{actor=v},
  calls:()=>reads};
}
describe("OS-owned Canvas grant adapter",()=>{
 it("denies operator browser label unless independently authenticated by native OS",async()=>{
  const h=fixture();h.setHuman(false);
  assert.equal(await h.resolver.admittedActor(h.person,h.request),null);
  assert.equal(await h.resolver.operatorAdmitted(h.person,h.request),false);
  assert.equal(h.calls(),0,"no OS grant read without native session identity");
 });
 it("only returns the native actor, never an actor from HTTP or model params",async()=>{
  const h=fixture();
  assert.deepEqual(await h.resolver.admittedActor(h.person,h.request),
   {kind:"human",id:"native-human"});
  assert.equal(await h.resolver.operatorAdmitted(h.person,h.request),true);
  assert.equal(await h.resolver.agentAdmitted(h.person,h.request),false);
  h.setGrant(false);
  assert.equal(await h.resolver.admittedActor(h.person,h.request),null);
  h.setGrant(true);h.setActor("new-native-actor");
  assert.deepEqual(await h.resolver.admittedActor(h.person,h.request),
   {kind:"human",id:"new-native-actor"});
 });
 it("bot requires an independent running canonical session and exact actor binding",async()=>{
  const h=fixture();
  assert.deepEqual(await h.resolver.admittedActor(h.agent,h.request),
   {kind:"bot",id:"native-bot"});
  assert.equal(await h.resolver.agentAdmitted(h.agent,h.request),true);
  h.setBot(false);
  assert.equal(await h.resolver.admittedActor(h.agent,h.request),null);
  h.setBot(true);
  assert.equal(await h.resolver.admittedActor({...h.agent,
   agent:{runId:"run-1",actorId:"spoof-bot"}},h.request),null);
 });
 it("running Gateway claim is not enough without OS grant for at least Canvas get",async()=>{
  const h=fixture();
  assert.deepEqual(await h.resolver.resolveAdmittedActor(h.facts),{
   actorKind:"bot",actorId:"native-bot",leaseEpoch:"gen-1:lease-1",
   runId:"run-1",sessionId:"session-1",
   workspaceId:"operator",principal:"gateway-operator",
  });
  h.setGrant(false);
  assert.equal(await h.resolver.resolveAdmittedActor(h.facts),null);
  assert.equal(await h.resolver.resolveAdmittedActor({...h.facts,
   dashboardSystemId:"other-system"}),null);
 });
 it("revokes stale registered root lease and invalid actor projection",async()=>{
  const h=fixture();h.registry.unregister(h.systemId);
  assert.equal(await h.resolver.admittedActor(h.person,h.request),null);
  assert.equal(await h.resolver.resolveAdmittedActor(h.facts),null);
 });
 it("does not admit missing native OS grant even after authenticated sessions",async()=>{
  const h=fixture();h.setGrant(false);
  assert.equal(await h.resolver.operatorAdmitted(h.person,h.request),false);
  assert.equal(await h.resolver.agentAdmitted(h.agent,h.request),false);
  assert.equal(await h.resolver.admittedActor(h.agent,h.request),null);
 });
});
