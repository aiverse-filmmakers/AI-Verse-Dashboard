import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {validateMilestoneLedger} from "../scripts/verify-github-milestones.mjs";
const load=name=>JSON.parse(readFileSync(new URL("../docs/"+name,import.meta.url),"utf8"));
const fixture=()=>[load("github-chapters-milestones.json"),load("github-browser-progress.json")];
test("keeps 10 known chapters and exactly 40 finite milestones",()=>{
 const [c,p]=fixture(),r=validateMilestoneLedger(c,p,{checkFiles:true});
 assert.equal(r.chapterCount,10);assert.equal(r.milestoneCount,40);
 assert.equal(r.completedMilestones,4);
 assert.equal(r.githubProvisional,47);
 assert.equal(r.formalAcceptance,15);
 assert.equal(r.localProductionAccepted,false);
});
test("missing chapter cannot disappear silently",()=>{
 const [c,p]=fixture();c.chapters.pop();
 assert.throws(()=>validateMilestoneLedger(c,p),/INVALID_MILESTONE_LEDGER/);
});
test("changing a chapter's fixed GB budget forces explicit rebasing",()=>{
 const [c,p]=fixture();c.chapters[2].gbBudget=27;
 assert.throws(()=>validateMilestoneLedger(c,p),/CHAPTER_SCOPE_REBASELINE_REQUIRED/);
});
test("cannot redefine a chapter's owner or meaning by reordering",()=>{
 const [c,p]=fixture();c.chapters.reverse();
 assert.throws(()=>validateMilestoneLedger(c,p),/CHAPTER_SCOPE_REBASELINE_REQUIRED/);
});
test("must have all four named outcomes in each chapter",()=>{
 const [c,p]=fixture();c.chapters[0].milestones.pop();
 assert.throws(()=>validateMilestoneLedger(c,p),/CHAPTER_SCOPE_REBASELINE_REQUIRED/);
});
test("milestone identifiers are immutable",()=>{
 const [c,p]=fixture();c.chapters[3].milestones[1].id="G04.55";
 assert.throws(()=>validateMilestoneLedger(c,p),/INVALID_MILESTONE/);
});
test("verified milestones need an evidence pointer",()=>{
 const [c,p]=fixture();delete c.chapters[0].milestones[0].evidenceRef;
 assert.throws(()=>validateMilestoneLedger(c,p),/MISSING_MILESTONE_EVIDENCE/);
});
test("implemented-but-not-verified work must still link to its source",()=>{
 const [c,p]=fixture();delete c.chapters[2].milestones[0].evidenceRef;
 assert.throws(()=>validateMilestoneLedger(c,p),/MISSING_MILESTONE_EVIDENCE/);
});
test("milestones without clear acceptance cannot qualify",()=>{
 const [c,p]=fixture();c.chapters[4].milestones[0].acceptance="";
 assert.throws(()=>validateMilestoneLedger(c,p),/INVALID_MILESTONE/);
});
test("source references reject parent traversal",()=>{
 const [c,p]=fixture();c.chapters[0].milestones[0].evidenceRef="../../private";
 assert.throws(()=>validateMilestoneLedger(c,p),/UNSAFE_EVIDENCE_REF/);
});
test("source references reject absolute paths",()=>{
 const [c,p]=fixture();c.chapters[0].milestones[0].evidenceRef="/etc/passwd";
 assert.throws(()=>validateMilestoneLedger(c,p),/UNSAFE_EVIDENCE_REF/);
});
test("missing evidence source is never credited as verified",()=>{
 const [c,p]=fixture();c.chapters[0].milestones[0].evidenceRef="docs/definitely-missing-milestone-evidence";
 assert.throws(()=>validateMilestoneLedger(c,p,{checkFiles:true}),/MILESTONE_EVIDENCE_NOT_FOUND/);
});
test("unrecognized completed state does not accidentally count",()=>{
 const [c,p]=fixture();c.chapters[0].milestones[0].state="probably-finished";
 assert.throws(()=>validateMilestoneLedger(c,p),/INVALID_MILESTONE/);
});
test("scope identity cannot mutate without published rebaseline",()=>{
 const [c,p]=fixture();c.scope="full-filmmaking-3d-suite";
 assert.throws(()=>validateMilestoneLedger(c,p),/INVALID_MILESTONE_LEDGER/);
});
test("Canvas, diagnostics, models and responsive chat remain partial rather than accepted",()=>{
 const [c,p]=fixture(),r=validateMilestoneLedger(c,p);
 assert.equal(r.states["in-progress"],5);
 assert.equal(r.states.verified,4);
 assert.equal(r.states.implemented,8);
 assert.equal(r.states.planned,23);
 assert.equal(r.formalAcceptance,15);
});
test("40 milestones do not turn into 40 accepted roadmap points",()=>{
 const [c,p]=fixture(),r=validateMilestoneLedger(c,p);
 assert.equal(r.formalAcceptance,15);
 assert.equal(r.githubProvisional,47);
 assert.equal(r.states.verified+r.states.implemented+r.states['in-progress']+r.states.planned+r.states.blocked,40);
});

test("real model inventory does not mark physical model selection as complete",()=>{
 const [c,p]=fixture(),r=validateMilestoneLedger(c,p,{checkFiles:true});
 const model=c.chapters[1].milestones[2];
 assert.equal(model.id,"G02.3");
 assert.equal(model.state,"in-progress");
 assert.match(model.partialEvidence,/NOT implemented|NOT implemented|not complete|not implemented/i);
 assert.equal(r.formalAcceptance,15);
});
