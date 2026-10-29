import test from "node:test";
import assert from "node:assert/strict";
import {inspectGateway,inspectCanvas,inspectHistory}
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
