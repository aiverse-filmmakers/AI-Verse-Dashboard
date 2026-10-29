import test from "node:test";
import assert from "node:assert/strict";
import {inspectActivity,filterActivityEvents} from "../apps/web/src/personal-agent-activity.js";
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
