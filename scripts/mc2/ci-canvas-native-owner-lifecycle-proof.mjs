/**
 * Native OS owner grant lifecycle integrated with the actual GatewayStore
 * run/session and the Dashboard trusted native OS grant adapter.
 *
 * CI-only deterministic human approval callback. No HTTP issue route,
 * Mac account, real token, operator approval bypass or production grant.
 */
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {mkdir,writeFile,rm,mkdtemp} from "node:fs/promises";
import {join,resolve} from "node:path";
import {tmpdir} from "node:os";
import {pathToFileURL} from "node:url";
import {SystemRegistry} from "../../dist/packages/registry/src/index.js";
import {createOsNativeCanvasGrantResolvers} from "../../dist/apps/gateway/src/index.js";
const PIN="__OS_PIN__";
const GATEWAY_PIN="9748dd0d5473b65ad95ef92df62fe0a13575e378";
assert.equal(process.env.CI,"true");
assert.equal(process.env.AIVERSE_GATEWAY_TOKEN,undefined);
const osSource=resolve(process.env.AIVERSE_MC2_OS_SOURCE||"os-source");
const gatewaySource=resolve(process.env.AIVERSE_MC2_GATEWAY_SOURCE||"gateway-source");
assert.equal(execFileSync("git",["-C",osSource,"rev-parse","HEAD"],
 {encoding:"utf8"}).trim(),PIN);
assert.equal(execFileSync("git",["-C",gatewaySource,"rev-parse","HEAD"],
 {encoding:"utf8"}).trim(),GATEWAY_PIN);
const load=async(p)=>import(pathToFileURL(join(osSource,"scripts",p)).href);
const {verifyInstalledCanvasGrant}=await load("canvas-actor-grant.mjs");
const {createCanvasGrantOwnerLifecycle,CANVAS_GRANT_OWNER_SOURCE}
 =await load("canvas-grant-owner-lifecycle.mjs");
const {GatewayStore}=await import(pathToFileURL(join(gatewaySource,
 "src","store.mjs")).href);
const root=await mkdtemp(join(tmpdir(),"native-canvas-owner-ci-"));
const result={};
try{
 for(const sub of ["operator","workspaces","workspaces/film",
  ".aiverse",".aiverse/os"])await mkdir(join(root,sub),{recursive:true});
 await writeFile(join(root,"AI-VERSE.yaml"),
  'schema_version: "2.0"\narchitecture: unified-workspace\n');
 await writeFile(join(root,"AGENTS.md"),"# Native owner CI");
 await writeFile(join(root,"workspaces","film","WORKSPACE.yaml"),
  'schema_version: "2.0"\nid: "film"\nname: "Film"\nstatus: "active"\n');
 const registry=new SystemRegistry(),systemId=registry.register(root).systemId;
 const canonicalId="canonical-native-ci-1";
 const store=new GatewayStore(join(root,"gateway-store"));await store.init();
 const sess=await store.createSession({
  session_id:"ci-native-session-1",system_id:canonicalId,
  workspace_id:"film",principal:"operator",
 });
 await store.createRun({
  run_id:"ci-native-run-1",session_id:sess.session_id,
  system_id:canonicalId,workspace_id:"film",principal:"operator",
  runtime:{kind:"deterministic",model:"aiverse"},
  messages:[{role:"user",content:"Edit native Canvas"}],
  budget:{max_tokens:1000,max_cost:0,max_actions:20},
  deadline_at:new Date(Date.now()+600_000).toISOString(),
 });
 sess.active_run_id="ci-native-run-1";await store.saveSession(sess);
 await store.mutateRun("ci-native-run-1",x=>{x.status="running";return x});
 let approvalEnabled=false,ownerChanges=0,runChecks=0;
 const runActive=async facts=>{
  runChecks++;
  const run=await store.getRun(facts.runId);
  const session=await store.getSession(facts.sessionId);
  return !!(run&&session&&run.status==="running"&&
   run.session_id===facts.sessionId&&run.system_id===canonicalId&&
   run.workspace_id===facts.workspaceId&&run.principal===facts.principal&&
   run.run_id===facts.runId&&session.session_id===facts.sessionId&&
   session.status==="active"&&session.active_run_id===facts.runId&&
   session.workspace_id===facts.workspaceId);
 };
 const owner=createCanvasGrantOwnerLifecycle({
  osRoot:root,verifyCanonicalBotRun:runActive,
  approveNativeOwnerChange:async info=>{
   ownerChanges++;
   assert.equal(info.source,CANVAS_GRANT_OWNER_SOURCE);
   assert.equal(info.osRoot,root);
   assert.ok(info.permissionChange?.reason);
   assert.ok(info.permissionChange?.operation);
   return approvalEnabled?{
    source:CANVAS_GRANT_OWNER_SOURCE,approved:true,
    requestFingerprint:info.requestFingerprint,
    ownerId:"disposable-owner",sessionId:"disposable-owner-session",
    expiresAt:new Date(Date.now()+30_000).toISOString(),
   }:null;
  },
 });
 let op=0;
 const req=(operation,more={})=>({
  operation,expectedGeneration:owner.list().generation,
  requestId:"native-ci-request-"+(++op),
  reason:"explicit disposable owner verification",...more,
 });
 const human={
  grant_id:"native-human-ci-1",actor_kind:"human",actor_id:"human-owner",
  scope:"operator",system_id:systemId,principal:"native-local-session",
  lease_epoch:"epoch-human-1",expires_at:new Date(Date.now()+500_000).toISOString(),
  methods:["aiverse.canvas.get","aiverse.canvas.create"],
 };
 const bot={
  grant_id:"native-bot-ci-1",actor_kind:"bot",actor_id:"ci-native-bot",
  scope:"film",system_id:systemId,principal:"operator",
  run_id:"ci-native-run-1",session_id:"ci-native-session-1",
  lease_epoch:"epoch-bot-1",expires_at:new Date(Date.now()+500_000).toISOString(),
  methods:["aiverse.canvas.get","aiverse.canvas.edit"],
 };
 const initial=owner.list();
 assert.equal(initial.provisioned,false);
 await assert.rejects(owner.apply(req("issue",{grant:human})),
  /CANVAS_NATIVE_OWNER_DENIED/);
 assert.equal(owner.list().provisioned,false);
 const osGrant=createOsNativeCanvasGrantResolvers(registry,{
  dashboardSystemId:systemId,native:{verifyInstalledCanvasGrant},
  authenticateHuman:async()=>({principal:"native-local-session"}),
  authenticateBot:async facts=>{
   if(!facts.agent)return null;
   const running=await runActive({
    runId:facts.agent.runId,sessionId:"ci-native-session-1",
    workspaceId:facts.workspaceId,principal:"operator",
   });
   return running?{
    principal:"operator",runId:facts.agent.runId,
    sessionId:"ci-native-session-1",actorId:facts.agent.actorId,
   }:null;
  },
 });
 const humanFacts={systemId,workspaceId:"operator",root,
  principal:"local-operator",access:"read",assertLease:()=>{}};
 const botFacts={systemId,workspaceId:"film",root,
  principal:"verified-agent",access:"write",
  agent:{runId:"ci-native-run-1",actorId:"ci-native-bot"},
  assertLease:()=>{}};
 const read={method:"aiverse.canvas.get",params:{id:"rec_ci"}};
 const edit={method:"aiverse.canvas.edit",params:{
  id:"rec_ci",expectedVersion:1,idempotencyKey:"owner-test-edit",
  edit:{type:"note.text",id:"note-1",text:"Verified"},
 }};
 assert.equal(await osGrant.admittedActor(humanFacts,read),null);
 assert.equal(await osGrant.admittedActor(botFacts,edit),null);
 approvalEnabled=true;
 const issuedHuman=await owner.apply(req("issue",{grant:human}));
 assert.equal(issuedHuman.grantCount,1);
 assert.deepEqual(await osGrant.admittedActor(humanFacts,read),
  {kind:"human",id:"human-owner"});
 assert.equal(await osGrant.admittedActor(botFacts,edit),null);
 const issuedBot=await owner.apply(req("issue",{grant:bot}));
 assert.equal(issuedBot.grantCount,2);
 assert.deepEqual(await osGrant.admittedActor(botFacts,edit),
  {kind:"bot",id:"ci-native-bot"});
 assert.equal((await osGrant.resolveAdmittedActor({
  dashboardSystemId:systemId,canonicalSystemId:canonicalId,
  workspaceId:"film",principal:"operator",
  runId:"ci-native-run-1",sessionId:"ci-native-session-1",
 }))?.actorId,"ci-native-bot");
 assert.equal(await osGrant.admittedActor(botFacts,{
  method:"aiverse.canvas.duplicate",params:{id:"rec_ci"},
 }),null);
 const revokedHuman=await owner.apply(req("revoke",{grantId:human.grant_id}));
 assert.equal(revokedHuman.grantCount,1);
 assert.equal(await osGrant.admittedActor(humanFacts,read),null);
 assert.deepEqual(await osGrant.admittedActor(botFacts,edit),
  {kind:"bot",id:"ci-native-bot"});
 await store.mutateRun("ci-native-run-1",x=>{x.status="canceled";return x});
 assert.equal(await osGrant.admittedActor(botFacts,edit),null,
  "live Gateway run canceled must deny despite OS file");
 const cleared=await owner.apply(req("revoke-all"));
 assert.equal(cleared.grantCount,0);
 assert.equal(await osGrant.admittedActor(botFacts,edit),null);
 Object.assign(result,{
  disposable_native_os_owner_issue_revoke:true,
  no_grants_without_explicit_human_approval:true,
  real_canonical_gateway_session_revalidated:true,
  native_os_grant_read_after_owner_atomic_write:true,
  stale_grant_denies_after_revoke:true,
  revoked_human_does_not_revoke_other_scope:true,
  method_specific_bot_denial:true,
  stopped_gateway_run_denial:true,
  ownerChanges,runChecks,
 });
}finally{await rm(root,{recursive:true,force:true});}
console.log(JSON.stringify({source:"native-canvas-owner-composed-ci",...result}));
