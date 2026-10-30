import test from "node:test";
import assert from "node:assert/strict";
import {inspectGateway,inspectCanvas,inspectHistory,inspectSystem,inspectWorkspace,
  inspectRunDiagnostics,inspectSystems}
 from "../apps/web/src/personal-diagnostics.js";
const gw=()=>({source:"canonical-gateway",workspaceId:"operator",
 capabilities:{runCreate:true,runGet:true,conversationLibrary:true,
  providerSelection:false},runtimeSource:{
  owner:"canonical-gateway",inferenceVerified:false}});
const canvas=()=>({source:"canonical-data",workspaceId:"operator",
 document:[{id:"board-1",title:"Owner scene",version:4}]});
const history=()=>({source:"canonical-gateway",workspaceId:"operator",
 has_more:false,data:[{session_id:"session-1",workspace_id:"operator"}]});
test("canonical Gateway status is live, not inferred inference proof",()=>{
 const v=inspectGateway(gw(),"operator");
 assert.equal(v.state,"available");
 assert.match(v.details,/Inference not verified by status/);
});
test("Gateway status reports actual no-provider-selection state",()=>{
 const v=inspectGateway(gw(),"operator");
 assert.match(v.details,/Provider selection not available/);
});
test("Gateway status does not invent run support when capability missing",()=>{
 const v=gw();v.capabilities.runCreate=false;
 assert.match(inspectGateway(v,"operator").details,/Run controls not confirmed/);
});
test("Gateway without history capability reports unconfirmed",()=>{
 const v=gw();v.capabilities.conversationLibrary=false;
 assert.match(inspectGateway(v,"operator").details,/history not confirmed/);
});
test("Gateway status can mark separately proved inference",()=>{
 const v=gw();v.runtimeSource.inferenceVerified=true;
 assert.match(inspectGateway(v,"operator").details,/Inference verified by owner/);
});
test("rejects synthetic Gateway source",()=>{
 assert.throws(()=>inspectGateway({...gw(),source:"mock-preview"},"operator"),
  /DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("rejects wrong system's workspace in Gateway status",()=>{
 assert.throws(()=>inspectGateway({...gw(),workspaceId:"film"},"operator"),
  /DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("rejects missing Gateway capabilities",()=>{
 const v={...gw(),capabilities:undefined};
 assert.throws(()=>inspectGateway(v,"operator"),/DIAGNOSTICS_INVALID_SOURCE/);
});
test("rejects null Gateway status",()=>{
 assert.throws(()=>inspectGateway(null,"operator"),/DIAGNOSTICS_INVALID_SOURCE/);
});
test("available Canvas owner exposes only count, not titles",()=>{
 const v=inspectCanvas(canvas(),"operator");
 assert.equal(v.state,"available");
 assert.match(v.details,/1 Canvas document/);
 assert.ok(!JSON.stringify(v).includes("Owner scene"));
});
test("empty canonical Canvas is legitimate empty, not fabricated outage",()=>{
 const v=canvas();v.document=[];
 assert.match(inspectCanvas(v,"operator").details,/No Canvas documents returned/);
});
test("Canvas does not represent 25-page count as lifetime total",()=>{
 const v=canvas();v.document=Array.from({length:25},(_,i)=>({
  id:"board-"+i,title:"Board",version:1}));
 assert.match(inspectCanvas(v,"operator").details,/up to 25; not a lifetime total/);
});
test("rejects Canvas owner from a different workspace",()=>{
 assert.throws(()=>inspectCanvas({...canvas(),workspaceId:"film"},"operator"),
  /DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("rejects fabricated canvas response",()=>{
 assert.throws(()=>inspectCanvas({...canvas(),source:"preview-data"},"operator"),
  /DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("rejects unexpected Canvas count larger than requested limit",()=>{
 const v=canvas();v.document=Array.from({length:26},(_,i)=>({
  id:"board-"+i,title:"Board",version:1}));
 assert.throws(()=>inspectCanvas(v,"operator"),/DIAGNOSTICS_INVALID_SOURCE/);
});
test("rejects Canvas entry missing canonical ID",()=>{
 const v={...canvas(),document:[{title:"forged"}]};
 assert.throws(()=>inspectCanvas(v,"operator"),/DIAGNOSTICS_INVALID_SOURCE/);
});
test("rejects non-array Canvas list",()=>{
 assert.throws(()=>inspectCanvas({...canvas(),document:{id:"fake"}},"operator"),
  /DIAGNOSTICS_INVALID_SOURCE/);
});
test("canonical history shows bounded recent session count",()=>{
 const v=inspectHistory(history(),"operator");
 assert.equal(v.state,"available");
 assert.match(v.details,/1 recent session returned/);
});
test("history empty is not automatically a Gateway failure",()=>{
 const v=history();v.data=[];
 assert.match(inspectHistory(v,"operator").details,/No recent sessions returned/);
});
test("history indicates older sessions only when real has_more is true",()=>{
 const v=history();v.has_more=true;
 assert.match(inspectHistory(v,"operator").details,/older sessions available/);
});
test("history output does not include private session identifiers",()=>{
 const v=inspectHistory(history(),"operator");
 assert.ok(!JSON.stringify(v).includes("session-1"));
});
test("history rejects cross-workspace rows",()=>{
 const v=history();v.data=[{session_id:"session-1",workspace_id:"film"}];
 assert.throws(()=>inspectHistory(v,"operator"),/DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("history rejects cross-workspace response envelope",()=>{
 assert.throws(()=>inspectHistory({...history(),workspaceId:"film"},"operator"),
  /DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("history rejects fake session source",()=>{
 assert.throws(()=>inspectHistory({...history(),source:"fake"},"operator"),
  /DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("history rejects missing pagination provenance",()=>{
 assert.throws(()=>inspectHistory({...history(),has_more:undefined},"operator"),
  /DIAGNOSTICS_INVALID_SOURCE/);
});
test("history rejects more than requested recent sessions",()=>{
 const v=history();v.data=Array.from({length:6},(_,i)=>({
  session_id:"s-"+i,workspace_id:"operator"}));
 assert.throws(()=>inspectHistory(v,"operator"),/DIAGNOSTICS_INVALID_SOURCE/);
});
test("history rejects malformed rows without an ID",()=>{
 const v={...history(),data:[{workspace_id:"operator"}]};
 assert.throws(()=>inspectHistory(v,"operator"),/DIAGNOSTICS_SCOPE_MISMATCH/);
});

const os=()=>({system:{systemId:"aiverse-01",label:"Editing OS",
 osType:"ai-verse",osVersion:"2.1",authorized:true,
 registeredAt:"2026-10-29T07:00:00Z",
 root:"/private/should-not-leak"}});
test("scoped public OS connection is a genuine registered-authorization source",()=>{
 const result=inspectSystem(os(),"aiverse-01");
 assert.equal(result.state,"available");
 assert.match(result.details,/Editing OS/);
 assert.match(result.details,/ai-verse/);
});
test("public OS projection does not expose filesystem roots",()=>{
 const result=inspectSystem(os(),"aiverse-01");
 assert.ok(!JSON.stringify(result).includes("/private"));
});
test("unauthorized OS registration cannot display green status",()=>{
 const v=os();v.system.authorized=false;
 assert.equal(inspectSystem(v,"aiverse-01").state,"unavailable");
});
test("public OS projection rejects different system ID",()=>{
 assert.throws(()=>inspectSystem(os(),"another-system"),/DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("public OS projection rejects missing authorization boolean",()=>{
 const v={system:{...os().system,authorized:"true"}};
 assert.throws(()=>inspectSystem(v,"aiverse-01"),/DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("public OS projection rejects wrong response shape",()=>{
 assert.throws(()=>inspectSystem({systems:[os().system]},"aiverse-01"),
  /DIAGNOSTICS_INVALID_SOURCE/);
});
test("public OS projection rejects missing version",()=>{
 const v={system:{...os().system,osVersion:undefined}};
 assert.throws(()=>inspectSystem(v,"aiverse-01"),/DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("public OS projection does not return unbounded labels",()=>{
 const v=os();v.system.label="s".repeat(300);
 assert.ok(inspectSystem(v,"aiverse-01").details.length<120);
});
test("public OS projection rejects empty source",()=>{
 assert.throws(()=>inspectSystem(null,"aiverse-01"),/DIAGNOSTICS_INVALID_SOURCE/);
});

const workspace=()=>({workspace:{id:"film",name:"Film workspace",status:"active",
 root:"/private/owner-root",secrets:{token:"never-export"}}});
test("selected workspace manifest renders genuine OS-owned name and state",()=>{
 const found=inspectWorkspace(workspace(),"film");
 assert.equal(found.state,"available");
 assert.match(found.details,/Film workspace · active/);
});
test("selected workspace never renders private root or unrelated fields",()=>{
 const found=inspectWorkspace(workspace(),"film");
 assert.doesNotMatch(JSON.stringify(found),/private|never-export|token/);
});
test("selected workspace rejects a different manifest id",()=>{
 assert.throws(()=>inspectWorkspace(workspace(),"operator"),/DIAGNOSTICS_SCOPE_MISMATCH/);
});
test("selected workspace rejects missing manifest payload",()=>{
 assert.throws(()=>inspectWorkspace({workspaces:[]},"film"),/DIAGNOSTICS_INVALID_SOURCE/);
});
test("selected workspace rejects non-scalar manifest name or state",()=>{
 assert.throws(()=>inspectWorkspace({workspace:{id:"film",name:{unsafe:1},status:"active"}},"film"),
  /DIAGNOSTICS_INVALID_SOURCE/);
 assert.throws(()=>inspectWorkspace({workspace:{id:"film",name:"Film",status:["active"]}},"film"),
  /DIAGNOSTICS_INVALID_SOURCE/);
});
test("selected workspace handles missing optional values without fake health",()=>{
 const actual=inspectWorkspace({workspace:{id:"film",name:null,status:null}},"film");
 assert.match(actual.details,/Unnamed workspace · Status unspecified/);
 assert.doesNotMatch(actual.details,/healthy/);
});
test("selected workspace bounds long metadata labels",()=>{
 const result=inspectWorkspace({workspace:{id:"film",name:"N".repeat(2000),
  status:"S".repeat(2000)}},"film");
 assert.ok(result.details.length<130);
});


const runDiagnostics=()=>({
 source:"canonical-gateway",workspaceId:"operator",
 runId:"run-1",sessionId:"session-1",status:"completed",
 context:{status:"ready",window_tokens:20000,configured:true},
 retrieval:{source_reads:5,gateway_source_range_reads:3},
 archive:{retrieval_depth:2},
 folds:{valid_cards:4,invalid_cards:1,pendingFoldWork:false},
 safety:{rawContentIncluded:false,promptsIncluded:false,chainOfThoughtIncluded:false},
 extra:{prompt:"secret",deep_retrieval:{token:"never-show"}},
});
test("G06.1 canonical run diagnostics present only finite counts and no raw payloads",()=>{
 const v=inspectRunDiagnostics(runDiagnostics(),"operator","run-1","session-1");
 assert.equal(v.state,"available");
 assert.match(v.details,/Source reads: 5/);
 assert.match(v.details,/Gateway source-range reads: 3/);
 assert.match(v.details,/Validated folds: 4/);
 assert.match(v.details,/Raw prompts and traces excluded/);
 assert.doesNotMatch(JSON.stringify(v),/secret|never-show|prompt:/);
});
test("G06.1 rejects foreign workspace, run, session and fake owner source",()=>{
 for(const item of [
   {...runDiagnostics(),workspaceId:"another"},
   {...runDiagnostics(),runId:"other"},
   {...runDiagnostics(),sessionId:"wrong"},
   {...runDiagnostics(),source:"preview"}]){
   assert.throws(()=>inspectRunDiagnostics(item,"operator","run-1","session-1"),
     /DIAGNOSTICS_SCOPE_MISMATCH/);
 }
});
test("G06.1 diagnostics reject invalid safety flags, forged object shapes or private counters",()=>{
 for(const item of [
   {...runDiagnostics(),safety:{...runDiagnostics().safety,promptsIncluded:true}},
   {...runDiagnostics(),safety:null},
   {...runDiagnostics(),folds:[]},
   {...runDiagnostics(),archive:null},
   {...runDiagnostics(),retrieval:{source_reads:Infinity}},
   {...runDiagnostics(),retrieval:{source_reads:-1}},
   {...runDiagnostics(),retrieval:{source_reads:"7"}},
   {...runDiagnostics(),folds:{valid_cards:1,invalid_cards:0,pendingFoldWork:"yes"}},
 ]){
   assert.throws(()=>inspectRunDiagnostics(item,"operator","run-1","session-1"),
     /DIAGNOSTICS_INVALID_SOURCE/);
 }
});

const systemList=()=>({systems:[
 {systemId:"aiverse-01",authorized:true,label:"Host OS",root:"/secret/private"},
 {systemId:"aiverse-02",authorized:false,label:"Revoked OS",root:"/secret/revoked"},
]});
test("G06.1 OS inventory shows exact count and no path or untrusted system label",()=>{
 const observation=inspectSystems(systemList(),"aiverse-01");
 assert.equal(observation.state,"available");
 assert.match(observation.details,/2 registered · 1 authorized/);
 assert.doesNotMatch(JSON.stringify(observation),/secret|revoked|Host OS/);
});
test("G06.1 system inventory rejects missing, revoked or duplicated selected system",()=>{
 for(const item of [
   {systems:[]},
   {systems:[{systemId:"aiverse-01",authorized:false}]},
   {systems:[{systemId:"aiverse-02",authorized:true}]},
   {systems:[{systemId:"aiverse-01",authorized:true},{systemId:"aiverse-01",authorized:true}]},
   {systems:[{systemId:"aiverse-01",authorized:true},null]},
   {systems:[{systemId:"A/../../",authorized:true}]},
 ])assert.throws(()=>inspectSystems(item,"aiverse-01"),
   /DIAGNOSTICS_SCOPE_MISMATCH|DIAGNOSTICS_INVALID_SOURCE/);
});
test("G06.1 system inventory rejects oversized registry and forged authorization",()=>{
 assert.throws(()=>inspectSystems({systems:Array.from({length:65},(_,i)=>({
   systemId:"sys-"+i,authorized:true,
 }))},"sys-1"),/DIAGNOSTICS_INVALID_SOURCE/);
 assert.throws(()=>inspectSystems({systems:[{
   systemId:"aiverse-01",authorized:"yes",root:"private",
 }]},"aiverse-01"),/DIAGNOSTICS_INVALID_SOURCE/);
});
