import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {validateGithubBrowserProgress} from "../scripts/verify-github-browser-progress.mjs";
const file=new URL("../docs/github-browser-progress.json",import.meta.url);
const base=()=>JSON.parse(readFileSync(file,"utf8"));
test("GitHub score, formal roadmap and local release are separate",()=>{
 const r=validateGithubBrowserProgress(base());
 assert.deepEqual(r.remote,{earned:44,total:100,provisional:true});
 assert.deepEqual(r.formal,{earned:15,total:100});
 assert.equal(r.local.numericalScore,null);
 assert.ok(r.local.blockers>=5);
});
test("cannot silently inflate GitHub completed points",()=>{
 const d=base();d.categories[3].provisionalEarned=9;
 assert.throws(()=>validateGithubBrowserProgress(d),/GITHUB_COMPLETION_TOTAL_MISMATCH/);
});
test("cannot hide a workstream by changing the denominator",()=>{
 const d=base();d.categories.splice(0,1);
 assert.throws(()=>validateGithubBrowserProgress(d),/INVALID_PROGRESS_LEDGER/);
});
test("cannot claim formally audited when source-only work is unevidenced",()=>{
 const d=base();d.sourceAuditComplete=true;
 assert.throws(()=>validateGithubBrowserProgress(d),/AUDITED_SCORE_NEEDS_SOURCE_CI/);
});
test("cannot claim owner-private Mac production readiness from GitHub evidence",()=>{
 const d=base();d.localProduction.numericalScore=90;
 assert.throws(()=>validateGithubBrowserProgress(d),/DO_NOT_INVENT_LOCAL_READINESS_PERCENT/);
});
test("cannot over-credit any individual engineering workstream",()=>{
 const d=base();d.categories[6].provisionalEarned=6;
 assert.throws(()=>validateGithubBrowserProgress(d),/INVALID_CATEGORY_EVIDENCE/);
});
