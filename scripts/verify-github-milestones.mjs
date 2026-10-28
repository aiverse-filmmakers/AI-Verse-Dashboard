import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const states=new Set(["verified","implemented","planned","blocked"]);
const names=["foundation","chat","canvas","os-authority","providers",
  "controls","film","ux","desktop","audit"];
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const valid=(x)=>typeof x==="string"&&x.trim().length>0;
export function validateMilestoneLedger(ledger,progress,{checkFiles=false}={}){
 if(!ledger||ledger.schemaVersion!==1||ledger.chapterCount!==10
   ||ledger.milestoneCount!==40||ledger.scope!=="personal-first-dashboard-v1"
   ||!Array.isArray(ledger.chapters)||ledger.chapters.length!==10)
   throw Error("INVALID_MILESTONE_LEDGER");
 if(progress?.schemaVersion!==1||!Array.isArray(progress.categories)
   ||progress.categories.length!==10)throw Error("PROGRESS_SOURCE_INVALID");
 const totals={verified:0,implemented:0,planned:0,blocked:0};
 const ids=new Set();
 for(let i=0;i<10;i++){
  const ch=ledger.chapters[i],p=progress.categories[i];
  if(!ch||ch.id!==names[i]||ch.id!==p.id||ch.gbBudget!==p.budget
    ||!valid(ch.title)||!Array.isArray(ch.milestones)||ch.milestones.length!==4)
    throw Error("CHAPTER_SCOPE_REBASELINE_REQUIRED");
  for(let j=0;j<4;j++){
   const m=ch.milestones[j];
   const mid=`G${String(i+1).padStart(2,"0")}.${j+1}`;
   if(!m||m.id!==mid||ids.has(m.id)||!valid(m.title)
     ||!valid(m.acceptance)||!states.has(m.state))
     throw Error("INVALID_MILESTONE");
   if((m.state==="implemented"||m.state==="verified")&&!valid(m.evidenceRef))
     throw Error("MISSING_MILESTONE_EVIDENCE");
   if(m.evidenceRef!==undefined){
    if(typeof m.evidenceRef!=="string"||m.evidenceRef.includes("\\")
      ||m.evidenceRef.startsWith("/")||m.evidenceRef.split("/").includes("..")
      ||m.evidenceRef.includes("\0"))throw Error("UNSAFE_EVIDENCE_REF");
    if(checkFiles&&!fs.existsSync(path.join(root,m.evidenceRef)))
      throw Error("MILESTONE_EVIDENCE_NOT_FOUND");
   }
   ids.add(m.id);totals[m.state]++;
  }
 }
 if(ids.size!==40||ledger.chapters.reduce((n,c)=>n+c.gbBudget,0)!==100)
   throw Error("MILESTONE_TOTAL_MISMATCH");
 // Engineering milestone state is *not* formal acceptance or a progress percentage.
 return {chapterCount:10,milestoneCount:40,states:totals,
   completedMilestones:totals.verified,sourceImplemented:totals.implemented,
   nextUnverified:ledger.chapters.flatMap(c=>c.milestones).find(m=>m.state!=="verified")?.id??null,
   formalAcceptance:progress.formalRoadmap.accepted,
   githubProvisional:progress.provisionalEngineeringEarned,
   localProductionAccepted:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const ledger=JSON.parse(fs.readFileSync(path.join(root,"docs/github-chapters-milestones.json")));
 const progress=JSON.parse(fs.readFileSync(path.join(root,"docs/github-browser-progress.json")));
 console.log(JSON.stringify(validateMilestoneLedger(ledger,progress,{checkFiles:true})));
}
