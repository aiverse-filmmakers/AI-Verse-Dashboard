/**
 * Machine-check that GitHub completion is not inflated by task/commit counts.
 * Source-specific CI and owner acceptance remain separate authorities.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const expected=["foundation","chat","canvas","os-authority","providers",
  "controls","film","ux","desktop","audit"];
const allowed=new Set(["formally-accepted","source-and-ci",
  "draft-with-provisional-gaps","source-only","planned"]);
export function validateGithubBrowserProgress(data){
  if(!data||data.schemaVersion!==1||data.totalBudget!==100
    ||!Array.isArray(data.categories)||data.categories.length!==10)
    throw Error("INVALID_PROGRESS_LEDGER");
  if(data.categories.map(x=>x.id).join(",")!==expected.join(","))
    throw Error("PROGRESS_WORKSTREAM_CHANGED_WITHOUT_REBASELINE");
  if(data.categories.some(x=>!Number.isInteger(x.budget)||x.budget<1
    ||!Number.isInteger(x.provisionalEarned)
    ||x.provisionalEarned<0||x.provisionalEarned>x.budget
    ||!allowed.has(x.evidenceStatus)||!x.remaining))
    throw Error("INVALID_CATEGORY_EVIDENCE");
  const budget=data.categories.reduce((n,x)=>n+x.budget,0);
  const earned=data.categories.reduce((n,x)=>n+x.provisionalEarned,0);
  if(budget!==100||earned!==data.provisionalEngineeringEarned)
    throw Error("GITHUB_COMPLETION_TOTAL_MISMATCH");
  if(!data.formalRoadmap||data.formalRoadmap.total!==100||
    !Number.isInteger(data.formalRoadmap.accepted)
    ||data.formalRoadmap.accepted<0||data.formalRoadmap.accepted>100)
    throw Error("INVALID_FORMAL_ACCEPTANCE");
  if(data.localProduction?.numericalScore!==null||
    !Array.isArray(data.localProduction.blockingGates)
    ||data.localProduction.blockingGates.length<1)
    throw Error("DO_NOT_INVENT_LOCAL_READINESS_PERCENT");
  if(data.sourceAuditComplete===true
    &&data.categories.some(x=>x.evidenceStatus==="source-only"
      &&x.provisionalEarned>0))
    throw Error("AUDITED_SCORE_NEEDS_SOURCE_CI");
  return {remote:{earned,total:budget,provisional:!data.sourceAuditComplete},
    formal:{earned:data.formalRoadmap.accepted,total:100},
    local:{numericalScore:null,blockers:data.localProduction.blockingGates.length}};
}
const asEntrypoint=process.argv[1]
 &&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(asEntrypoint){
 const file=path.resolve(process.argv[2]||"docs/github-browser-progress.json");
 const report=validateGithubBrowserProgress(JSON.parse(fs.readFileSync(file,"utf8")));
 console.log(JSON.stringify({source:"github-browser-progress-v1",...report}));
}
