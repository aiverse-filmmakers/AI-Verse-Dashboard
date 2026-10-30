import test from "node:test";
import assert from "node:assert/strict";
import {inspectActivity,filterActivityEvents,inspectCanonicalSessions,inspectCanonicalRuns}
 from "../apps/web/src/personal-agent-activity.js";
const scope={systemId:"system-a",workspaceId:"operator"};
const time="2026-10-29T08:00:00.000Z";
const good=()=>({source:"dashboard-local-sessions",systemId:"system-a",
 workspaceId:"operator",retention:"in-memory-only",sessionCount:1,observedAt:time,
 sessions:[{status:"working",entryCount:3,updatedAt:time,
   title:"PRIVATE",sessionId:"secret-id"}],
 events:[{kind:"tool-call",role:"agent",createdAt:time,body:"SECRET"}]});
test("real local session projection contains scoped status without private fields",()=>{
 const view=inspectActivity(good(),scope);
 assert.equal(view.sessionCount,1);
 assert.deepEqual(view.sessions,[{status:"working",entryCount:3,updatedAt:time}]);
 assert.deepEqual(view.events,[{kind:"tool-call",role:"agent",createdAt:time}]);
 assert.doesNotMatch(JSON.stringify(view),/PRIVATE|SECRET|secret-id/);
});
test("rejects cross-system or cross-workspace activity",()=>{
 assert.throws(()=>inspectActivity({...good(),systemId:"other"},scope),/ACTIVITY_SCOPE_MISMATCH/);
 assert.throws(()=>inspectActivity({...good(),workspaceId:"film"},scope),/ACTIVITY_SCOPE_MISMATCH/);
});
test("rejects synthetic source or misrepresented retention",()=>{
 assert.throws(()=>inspectActivity({...good(),source:"mock-preview"},scope),/ACTIVITY_SCOPE_MISMATCH/);
 assert.throws(()=>inspectActivity({...good(),retention:"canonical-disk"},scope),/ACTIVITY_SCOPE_MISMATCH/);
});
test("rejects malformed or unbounded entries and noncanonical enums",()=>{
 const payload=good();payload.events=Array.from({length:13},()=>payload.events[0]);
 assert.throws(()=>inspectActivity(payload,scope),/ACTIVITY_INVALID_SOURCE/);
 assert.throws(()=>inspectActivity({...good(),sessions:[{status:"OWNER",entryCount:1,updatedAt:time}]},scope),/ACTIVITY_INVALID_SOURCE/);
 assert.throws(()=>inspectActivity({...good(),events:[{kind:"arbitrary",role:"agent",createdAt:time}]},scope),/ACTIVITY_INVALID_SOURCE/);
});
test("does not invent local sessions when empty",()=>{
 const v=inspectActivity({...good(),sessionCount:0,sessions:[],events:[]},scope);
 assert.equal(v.sessionCount,0);assert.deepEqual(v.events,[]);
});
test("rejects inconsistent count or forged event timestamp",()=>{
 assert.throws(()=>inspectActivity({...good(),sessionCount:0},scope),/ACTIVITY_INVALID_SOURCE/);
 assert.throws(()=>inspectActivity({...good(),events:[{kind:"message",role:"user",createdAt:"not-a-date"}]},scope),/ACTIVITY_INVALID_SOURCE/);
});

test("local event filters remain data-only and do not manufacture hidden entries",()=>{
 const view=inspectActivity(good(),scope);
 assert.equal(filterActivityEvents(view,"all").length,1);
 assert.deepEqual(filterActivityEvents(view,"tool-call"),view.events);
 assert.deepEqual(filterActivityEvents(view,"error-event"),[]);
});

test("canonical history projection validates workspace and redacts session titles",()=>{
 const data={source:"canonical-gateway",workspaceId:"operator",has_more:true,
   data:[{workspace_id:"operator",session_id:"secret-session-1",
     title:"PRIVATE SCRIPT",status:"active",updated_at:time}]};
 const result=inspectCanonicalSessions(data,"operator");
 assert.equal(result.hasMore,true);
 assert.equal(result.sessions[0].status,"active");
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE SCRIPT/);
 assert.throws(()=>inspectCanonicalSessions({...data,workspaceId:"film"},"operator"),
   /ACTIVITY_SCOPE_MISMATCH/);
});
test("canonical run projection excludes prompts and model outputs",()=>{
 const data={source:"canonical-gateway",workspaceId:"operator",sessionId:"sess-a",
  has_more:false,data:[{session_id:"sess-a",run_id:"run-1",status:"completed",
    created_at:time,user_text:"PRIVATE REQUEST",output:"PRIVATE RESPONSE"}]};
 const rows=inspectCanonicalRuns(data,"operator","sess-a");
 assert.deepEqual(rows,[{status:"completed",createdAt:time}]);
 assert.doesNotMatch(JSON.stringify(rows),/PRIVATE/);
 assert.throws(()=>inspectCanonicalRuns(data,"operator","different"),
   /ACTIVITY_SCOPE_MISMATCH/);
 assert.throws(()=>inspectCanonicalRuns({...data,data:[{...data.data[0],session_id:"other"}]},"operator","sess-a"),
   /ACTIVITY_SCOPE_MISMATCH/);
});


test("G06.2 canonical run states preserve owner waiting and recovery status without granting actions",()=>{
 const valid=["awaiting_approval","resuming","paused_recovery_required",
   "paused_no_progress","budget_limited","parked","no_progress"];
 const data={source:"canonical-gateway",workspaceId:"operator",sessionId:"session-a",
   has_more:false,data:valid.map((status,i)=>({
     session_id:"session-a",run_id:"run-"+i,status,created_at:time,
     pending_approval:{reason:"PRIVATE ACTION"},
   })).slice(0,3)};
 const result=inspectCanonicalRuns(data,"operator","session-a");
 assert.deepEqual(result.map(x=>x.status),valid.slice(0,3));
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE ACTION|pending_approval/);
 for(const status of valid.slice(3)){
   const current=inspectCanonicalRuns({...data,data:[{
     ...data.data[0],status,
   }]},"operator","session-a");
   assert.equal(current[0].status,status);
 }
});
test("G06.2 unknown canonical action status never fabricates approval permission",()=>{
 const data={source:"canonical-gateway",workspaceId:"operator",sessionId:"session-a",
   has_more:false,data:[{session_id:"session-a",run_id:"run-1",
     status:"user_can_approve_anything",created_at:time,
     pending_approval:{grant:true}}]};
 const result=inspectCanonicalRuns(data,"operator","session-a");
 assert.equal(result[0].status,"unknown");
 assert.doesNotMatch(JSON.stringify(result),/grant|approve_anything/);
});
