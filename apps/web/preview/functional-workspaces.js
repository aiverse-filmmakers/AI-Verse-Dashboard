/* Realistic functional workspace DESIGN PREVIEW for the existing AI-Verse Dashboard.
 * Illustrative, isolated records ONLY. No owner API calls, no credentials, no billing.
 * Each surface is a standalone UI shape chosen for its existing owner contract.
 */
(() => {
"use strict";
const NAV=[
["attention","Needs attention","Operations"],["activity","Activity","Operations"],["team","AI team","Operations"],
["goals","Goals","Operations"],["schedule","Scheduled work","Operations"],
["chat","Conversations","Workspace"],["skills","Skills","Workspace"],["memory","Knowledge","Workspace"],
["data","Project data","Workspace"],["results","Outputs","Workspace"],
["usage","Usage & cost","System"],["health","System health","System"],["connections","Connections","System"]];
const seed={
approvals:[
{id:"AP-204",name:"Send final edit to the client",agent:"Editor",workspace:"Film studio",risk:"External delivery",status:"Pending",at:"12:30",why:"Final review export is ready. Client delivery crosses the workspace boundary."},
{id:"AP-203",name:"Connect the production calendar",agent:"Producer",workspace:"Film studio",risk:"New permission",status:"Pending",at:"11:55",why:"The assistant requests read access to shoot dates and permission to create calendar events."},
{id:"AP-202",name:"Apply improved subtitle-checking Skill",agent:"AI-Verse",workspace:"Personal",risk:"Learning proposal",status:"Pending",at:"10:08",why:"The current approved Skill stays active until this revision is reviewed."},
{id:"AP-201",name:"Share this week's call sheet",agent:"Planner",workspace:"Film studio",risk:"External delivery",status:"Approved",at:"Yesterday",why:"An example of a previously approved action."}],
runs:[
{id:"R-46",name:"Build production shot list",agent:"Producer",workspace:"Film studio",status:"Running",pct:68,at:"12:35",events:["Scope checked","Read scene notes","Prepared camera groupings","Validating shot order"]},
{id:"R-45",name:"Review Hindi captions",agent:"Editor",workspace:"India campaign",status:"Review",pct:100,at:"11:54",events:["Compared four transcripts","Constrained subtitles to two lines","Awaiting language review"]},
{id:"R-44",name:"Research filming locations",agent:"Researcher",workspace:"Film studio",status:"Done",pct:100,at:"10:28",events:["Reviewed location candidates","Checked accessibility","Produced a reference document"]},
{id:"R-43",name:"Publish the content calendar",agent:"Content assistant",workspace:"AI-Verse",status:"Blocked",pct:35,at:"09:20",events:["Drafted planned posts","Detected expired permission","External action never executed"]}],
agents:[
{id:"B-1",name:"Producer",role:"Production coordinator",status:"Working",work:"Build production shot list",tasks:4,team:"Film studio"},
{id:"B-2",name:"Researcher",role:"Research and reference sourcing",status:"Available",work:"Last: location research",tasks:2,team:"Film studio"},
{id:"B-3",name:"Editor",role:"Caption QC and finishing",status:"Needs review",work:"Hindi captions",tasks:3,team:"Film studio"},
{id:"B-4",name:"Content assistant",role:"Social media workflows",status:"Blocked",work:"Publishing permission",tasks:1,team:"AI-Verse"},
{id:"B-5",name:"Planner",role:"Scheduling and priorities",status:"Available",work:"Next: production calendar",tasks:1,team:"Personal"}],
goals:[
{id:"G-1",name:"Deliver the autumn campaign film",workspace:"Film studio",status:"Active",steps:[["Storyboard approved",true],["Editing completed",true],["Client approval",false],["Delivery confirmed",false]]},
{id:"G-2",name:"Use AI-Verse as a real desktop OS",workspace:"AI-Verse",status:"Active",steps:[["Design current shell",true],["Real Gateway chat",false],["Local launcher",false],["Whole-system acceptance",false]]},
{id:"G-3",name:"Plan November filming",workspace:"Personal",status:"Paused",steps:[["Get crew availability",true],["Confirm dates",false],["Prepare call sheets",false]]}],
schedules:[
{id:"A-1",name:"Morning project briefing",at:"08:30",day:1,freq:"Weekdays",target:"Brain review",status:"Enabled",last:"Yesterday · Completed"},
{id:"A-2",name:"Weekly content report",at:"10:00",day:5,freq:"Weekly",target:"Content assistant",status:"Enabled",last:"Friday · Completed"},
{id:"A-3",name:"Check unresolved approvals",at:"18:00",day:3,freq:"Daily",target:"AI-Verse",status:"Paused",last:"Monday · Paused"},
{id:"A-4",name:"Collect film project feedback",at:"14:00",day:4,freq:"Weekly",target:"Producer",status:"Enabled",last:"Last week · Completed"}],
skills:[
{id:"S-1",name:"Video Editor",category:"Filmmaking",status:"Ready",version:"1.4",uses:36,about:"Captions, pacing, B-roll planning, EDLs and delivery review."},
{id:"S-2",name:"Interface Designer",category:"Design",status:"Ready",version:"1.2",uses:23,about:"Accessible application interfaces, layouts and visual QA."},
{id:"S-3",name:"Production Research",category:"Research",status:"Ready",version:"0.9",uses:14,about:"Location options, references and source verification."},
{id:"S-4",name:"Client Delivery QA",category:"Filmmaking",status:"Review",version:"0.4",uses:6,about:"Review release-ready assets against a client brief."},
{id:"S-5",name:"Social Publishing",category:"Marketing",status:"Unavailable",version:"0.8",uses:9,about:"Prepare posts for approved social channels."}],
proposals:[{id:"P-13",name:"Bilingual subtitle timing improvement",source:"Editor",status:"Pending"},{id:"P-12",name:"Camera shot-list checking",source:"Producer",status:"Pending"}],
memories:[
{id:"M-1",name:"Preferred cinematic treatment",category:"Preferences",scope:"Personal",source:"Production notes · Oct 25",text:"Organic film grain, natural textures, realistic lighting and restrained color."},
{id:"M-2",name:"India campaign subtitles",category:"Decisions",scope:"India campaign",source:"Client brief · Oct 23",text:"Keep captions within two lines, cross-checking four candidate transcripts."},
{id:"M-3",name:"Calm dashboard requirement",category:"Preferences",scope:"AI-Verse",source:"Design review · Oct 27",text:"Keep everyday chat simple while real work and controls remain discoverable."},
{id:"M-4",name:"Client deliveries need approval",category:"Lessons",scope:"Film studio",source:"Workflow review · Oct 21",text:"Sending outside the workspace requires an explicit permission decision."}],
shots:[
{id:"01A",scene:"01",description:"Wide exterior establishing",type:"Wide",camera:"Static",owner:"Producer",status:"Ready",length:"00:15"},
{id:"01B",scene:"01",description:"Follow subject into location",type:"Medium",camera:"Gimbal",owner:"Operator",status:"Ready",length:"00:12"},
{id:"02A",scene:"02",description:"Overhead reveal",type:"Wide",camera:"Drone",owner:"Producer",status:"Planning",length:"00:08"},
{id:"02B",scene:"02",description:"Detail at desk",type:"Close-up",camera:"Handheld",owner:"Director",status:"Review",length:"00:06"},
{id:"03A",scene:"03",description:"Moving chase perspective",type:"Action",camera:"FPV",owner:"Operator",status:"Planning",length:"00:10"},
{id:"03B",scene:"03",description:"Closing reaction",type:"Close-up",camera:"Gimbal",owner:"Director",status:"Ready",length:"00:07"}],
outputs:[
{id:"O-1",name:"Autumn campaign shot list",type:"Table",project:"Film studio",status:"Draft",version:"v4",detail:"Production breakdown with camera methods, scenes and readiness."},
{id:"O-2",name:"Filming location research",type:"Document",project:"Film studio",status:"Verified",version:"v2",detail:"Research notes on locations, accessibility and permit options."},
{id:"O-3",name:"Caption comparison",type:"Document",project:"India campaign",status:"Review",version:"v3",detail:"Four transcript candidates and subtitle timing decisions."},
{id:"O-4",name:"Storyboard reference",type:"Image",project:"Film studio",status:"Draft",version:"v1",detail:"An example image reference. Asset bytes require an authorized source."},
{id:"O-5",name:"Weekly content report",type:"Report",project:"AI-Verse",status:"Verified",version:"v1",detail:"Content activity and results summary."}],
connections:[
{id:"C-1",name:"GitHub",type:"Repository integration",status:"Verified",permission:"Read repository / scoped writes",detail:"Read repositories; explicit approval for write actions."},
{id:"C-2",name:"Google Drive",type:"Cloud files",status:"Needs review",permission:"Workspace files only",detail:"Proposed file access needs verification and approval."},
{id:"C-3",name:"Telegram",type:"Messaging channel",status:"Disconnected",permission:"None",detail:"No channel credentials attached in the preview."},
{id:"C-4",name:"OpenRouter",type:"Model provider",status:"Disconnected",permission:"None",detail:"No model subscription or credit access is represented here."}]
};
const copy=()=>JSON.parse(JSON.stringify(seed));
let data=copy(),root=null,page="attention",active=null,mode="all",term="",period="7",flash="";
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
const add=(p,...xs)=>{xs.forEach(x=>x&&p.append(x));return p};
const b=(txt,fn,cls="os-btn")=>{const e=h("button",cls,txt);e.type="button";e.addEventListener("click",fn);return e};
const tag=(txt)=>h("span","os-status os-"+String(txt).toLowerCase().replace(/[^a-z0-9]/g,"-"),txt);
const meta=(text)=>h("span","os-meta",text);
const row=(label,value)=>add(h("div","os-property"),h("span","",label),h("strong","",String(value)));
const sec=(title,sub)=>add(h("div","os-sec"),h("h3","",title),sub?meta(sub):null);
const card=(title)=>add(h("section","os-card"),h("h3","",title));
const line=(n)=>{const out=h("div","os-progress");const fill=h("div","os-progress-fill");fill.style.width=Math.max(0,Math.min(100,n))+"%";out.append(fill);return out};
const stats=(items)=>add(h("div","os-stats"),...items.map(([value,label])=>add(h("div","os-stat"),h("strong","",String(value)),h("small","",label))));
function tell(message){flash=message;const p=root?.querySelector(".os-toast");if(p){p.textContent=message;p.hidden=false;}}
function change(fn,message){fn();render();tell(message||"Example data updated. Your OS was not changed.");}
function tabs(items){const x=h("div","os-tabs");items.forEach(([id,name])=>{const v=b(name,()=>{mode=id;active=null;render()},"os-tab"+(mode===id?" selected":""));v.setAttribute("aria-pressed",String(mode===id));x.append(v)});return x}
function search(label,ph){const inp=h("input","os-search");inp.type="search";inp.setAttribute("aria-label",label);inp.placeholder=ph;inp.value=term;inp.addEventListener("input",()=>{term=inp.value;render();const next=root.querySelector(".os-search");if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length)}});return inp}
function grid(heads,lines){const wrap=h("div","os-table-wrap"),tbl=h("table","os-table"),the=h("thead"),thr=h("tr");heads.forEach(name=>thr.append(h("th","",name)));the.append(thr);tbl.append(the);const tb=h("tbody");lines.forEach(cells=>{const tr=h("tr");cells.forEach(x=>add(tr,add(h("td"),x instanceof Node?x:h("span","",String(x??"")))));tb.append(tr)});tbl.append(tb);wrap.append(tbl);return wrap}
function split(left,right){return add(h("div","os-split"),left,right)}
function form(title,fields,accept){const modal=h("dialog","os-dialog"),f=h("form","os-dialog-form");f.method="dialog";f.append(h("h2","",title));const nodes=[];fields.forEach(field=>{const label=h("label","os-field",field.label),v=field.options?h("select","os-select"):h("input","os-search");if(field.options)field.options.forEach(s=>add(v,h("option","",s)));else{v.type="text";v.placeholder=field.placeholder||"";v.maxLength=160;}v.value=field.value||field.options?.[0]||"";label.append(v);nodes.push(v);f.append(label)});const acts=h("div","os-actions");acts.append(b("Cancel",()=>modal.close()),b("Save in preview",()=>{const v=nodes.map(x=>x.value.trim());if(v.some(x=>!x)){tell("Complete each field.");return;}accept(v);modal.close();render();},"os-btn primary"));f.append(acts);modal.append(f);document.body.append(modal);modal.addEventListener("close",()=>modal.remove());modal.showModal();nodes[0]?.focus()}
function chosen(arr){return arr.find(x=>x.id===active)||arr[0]}
function setActive(id){active=id;render()}
function controls(actions){const x=h("div","os-actions");actions.forEach(([name,fn,cls])=>x.append(b(name,fn,cls||"os-btn")));return x}
function inspector(title,content){return add(card(title),...content)}
function attention(main){
 main.append(stats([[data.approvals.filter(x=>x.status==="Pending").length,"Awaiting decision"],[data.approvals.filter(x=>x.status==="Approved").length,"Approved"],[data.approvals.filter(x=>x.status==="Declined").length,"Declined"]]),tabs([["all","All"],["Pending","Pending"],["Approved","Approved"],["Declined","Declined"]]));
 const visible=data.approvals.filter(x=>mode==="all"||x.status===mode),left=h("div"),current=chosen(visible),right=card("Decision details");
 left.append(sec("Approval inbox","High-priority decisions appear first"));
 visible.forEach(x=>{const item=b("",()=>setActive(x.id),"os-queue"+(current?.id===x.id?" selected":""));item.append(add(h("div","os-queue-title"),h("strong","",x.name),tag(x.status)),meta(x.agent+" · "+x.workspace+" · "+x.at),h("div","os-queue-risk",x.risk));left.append(item)});
 if(!visible.length)left.append(h("p","os-empty","No requests match this filter."));
 if(current){right.append(h("h4","os-detail-title",current.name),h("p","os-copy",current.why),row("Agent",current.agent),row("Scope",current.workspace),row("Action type",current.risk),row("State",current.status));
 if(current.status==="Pending")right.append(controls([["Decline",()=>change(()=>{current.status="Declined";mode="all"},"Example request declined.")],["Approve",()=>change(()=>{current.status="Approved";mode="all"},"Example request approved."),"os-btn primary"]]));}
 right.append(meta("Decisions only affect example records."));main.append(split(left,right));
}
function activity(main){
 main.append(stats([[data.runs.filter(x=>x.status==="Running").length,"Active"],[data.runs.filter(x=>x.status==="Review").length,"Review"],[data.runs.filter(x=>x.status==="Done").length,"Completed"],[data.runs.filter(x=>x.status==="Blocked").length,"Blocked"]]),tabs([["all","All runs"],["Running","Running"],["Review","Review"],["Done","Completed"],["Blocked","Blocked"],["board","Task board"]]));
 if(mode==="board"){taskBoard(main);return;}
 const visible=data.runs.filter(x=>mode==="all"||x.status===mode),left=h("div"),cur=chosen(visible),right=card("Run inspector");
 left.append(sec("Execution timeline","Gateway runs, Tasks and owner receipts"));
 visible.forEach(x=>{const v=b("",()=>setActive(x.id),"os-run"+(cur?.id===x.id?" selected":""));v.append(add(h("div","os-row-top"),h("strong","",x.name),tag(x.status)),meta(x.agent+" · "+x.workspace+" · "+x.at),line(x.pct));left.append(v)});
 if(cur){right.append(h("h4","os-detail-title",cur.name),row("Owner",cur.agent),row("Workspace",cur.workspace),row("Progress",cur.pct+"%"),sec("Recent events"));const log=h("div","os-log");cur.events.forEach(e=>log.append(add(h("div","os-event"),h("span","os-event-dot",""),h("span","",e))));right.append(log);
 if(cur.status==="Running")right.append(b("Pause example run",()=>change(()=>cur.status="Paused","Sample run paused."),"os-btn wide"));
 if(cur.status==="Paused")right.append(b("Resume example run",()=>change(()=>cur.status="Running","Sample run resumed."),"os-btn wide"));
 if(cur.status==="Blocked")right.append(b("Retry example run",()=>change(()=>{cur.status="Running";cur.pct=8;cur.events.push("Manual retry requested")}, "Sample retry queued."),"os-btn wide"));}
 main.append(split(left,right));
}
function taskBoard(main){
 main.append(add(h("div","os-toolbar"),sec("Task board","Move sample work between stages to explore the workflow"),meta("Drag cards or use the status menu")));
 const columns=[["Queued","Queued"],["Running","In progress"],["Review","Awaiting review"],["Done","Completed"],["Blocked","Blocked"]];
 const board=h("div","os-kanban");
 columns.forEach(([state,name])=>{
   const matches=data.runs.filter(x=>x.status===state);
   const col=h("section","os-kanban-column");col.dataset.status=state;
   col.append(add(h("div","os-kanban-head"),h("h3","",name),tag(String(matches.length))));
   col.addEventListener("dragover",event=>{event.preventDefault();col.classList.add("drag-over")});
   col.addEventListener("dragleave",event=>{if(!col.contains(event.relatedTarget))col.classList.remove("drag-over")});
   col.addEventListener("drop",event=>{
     event.preventDefault();col.classList.remove("drag-over");
     const id=event.dataTransfer?.getData("text/plain");
     const run=data.runs.find(x=>x.id===id);if(!run)return;
     change(()=>{run.status=state;run.events.push("Moved to "+name+" in sample board")},"Sample task moved to "+name+".");
   });
   matches.forEach(x=>{
     const card=h("article","os-kanban-card");
     card.setAttribute("aria-label","Task "+x.id+" · "+x.name);
     card.draggable=true;
     card.addEventListener("dragstart",event=>{event.dataTransfer?.setData("text/plain",x.id);event.dataTransfer.effectAllowed="move"});
     card.append(add(h("div","os-kanban-card-head"),meta(x.id),tag(x.status)),h("strong","",x.name),meta(x.agent+" · "+x.workspace),line(x.pct),b("View task details",()=>setActive(x.id),"os-task-detail-button"));
     const sel=h("select","os-select os-kanban-move");
     ["Queued","Running","Review","Done","Blocked"].forEach(v=>add(sel,h("option","",v)));
     sel.value=x.status;
     sel.setAttribute("aria-label","Move task "+x.id+" to stage");
     sel.addEventListener("click",e=>e.stopPropagation());
     sel.addEventListener("change",event=>{event.stopPropagation();change(()=>{x.status=sel.value;x.events.push("Moved to "+sel.value+" from board")}, "Example task moved.")});
     card.append(add(h("div","os-kanban-control"),meta("Move to"),sel));
     col.append(card);
   });
   if(!matches.length)col.append(h("p","os-kanban-empty","No tasks"));
   board.append(col);
 });
 main.append(board);
 const current=data.runs.find(x=>x.id===active);
 if(current)main.append(add(card("Task details"),h("h4","os-detail-title",current.name),row("Owner",current.agent),row("Current stage",current.status),row("Workspace",current.workspace),sec("Latest activity"),...current.events.map(e=>add(h("div","os-event"),h("span","os-event-dot",""),h("span","",e)))));
}
function team(main){
 main.append(stats([[data.agents.length,"Coworkers"],[data.agents.filter(x=>x.status==="Working").length,"Working"],[data.agents.filter(x=>x.status==="Blocked"||x.status==="Needs review").length,"Need attention"]]));
 main.append(add(h("div","os-toolbar"),search("Search agents","Find a teammate…"),b("+ Plan teammate",()=>form("Plan a new assistant",[{label:"Name",placeholder:"Sound designer"},{label:"Role",placeholder:"What they will do"}],([name,role])=>data.agents.push({id:"B-"+Date.now(),name,role,status:"Available",work:"Not assigned",tasks:0,team:"Personal"})))));
 const cards=h("div","os-agent-grid");data.agents.filter(x=>(x.name+" "+x.role+" "+x.team).toLowerCase().includes(term.toLowerCase())).forEach(a=>{const v=b("",()=>setActive(a.id),"os-agent");v.append(add(h("div","os-agent-head"),h("span","os-avatar",a.name.slice(0,1)),tag(a.status)),h("strong","",a.name),meta(a.role),h("p","",a.work),add(h("div","os-agent-footer"),meta(a.team),meta(a.tasks+" tasks")));cards.append(v)});main.append(cards);
 const c=data.agents.find(x=>x.id===active);if(c)main.append(add(card("Assistant · "+c.name),row("Specialty",c.role),row("Latest task",c.work),row("Team",c.team),controls([["Mark available",()=>change(()=>c.status="Available")],["Mark busy",()=>change(()=>c.status="Working")]])));
 main.append(add(card("Tasks across the team"),grid(["Work","Assistant","Status"],data.runs.map(x=>[x.name,x.agent,tag(x.status)]))));
}
function goals(main){
 main.append(stats([[data.goals.filter(x=>x.status==="Active").length,"Active"],[data.goals.filter(x=>x.status==="Paused").length,"Paused"],[data.goals.reduce((n,g)=>n+g.steps.filter(t=>t[1]).length,0),"Checklist items completed"]]));
 main.append(add(h("div","os-toolbar"),sec("Goals and focus","A goal is complete only with sufficient evidence"),b("+ New goal",()=>form("New goal",[{label:"Outcome",placeholder:"Deliver the next film"},{label:"Workspace",value:"Personal"}],([name,workspace])=>data.goals.push({id:"G-"+Date.now(),name,workspace,status:"Active",steps:[["Define acceptance criteria",false]]})))));
 const c=chosen(data.goals),left=h("div"),right=card("Goal evidence");data.goals.forEach(g=>{const done=g.steps.filter(t=>t[1]).length,p=Math.round(100*done/g.steps.length);const v=b("",()=>setActive(g.id),"os-goal"+(c?.id===g.id?" selected":""));v.append(add(h("div","os-row-top"),h("strong","",g.name),tag(g.status)),meta(g.workspace+" · "+done+"/"+g.steps.length+" milestones"),line(p));left.append(v)});
 if(c){right.append(h("h4","os-detail-title",c.name),sec("Milestones","Check off an example milestone"));c.steps.forEach((t,i)=>{const lab=h("label","os-check"),box=h("input");box.type="checkbox";box.checked=t[1];box.addEventListener("change",()=>change(()=>c.steps[i][1]=box.checked,"Example milestone updated."));lab.append(box,h("span","",t[0]));right.append(lab)});right.append(controls([[c.status==="Active"?"Pause goal":"Resume goal",()=>change(()=>c.status=c.status==="Active"?"Paused":"Active")]]));}
 main.append(split(left,right));
}
function schedule(main){
 main.append(stats([[data.schedules.filter(x=>x.status==="Enabled").length,"Enabled schedules"],[data.schedules.filter(x=>x.status==="Paused").length,"Paused"],["Mac/server","Needed for wakes"]]));
 main.append(add(h("div","os-toolbar"),sec("This week","Schedules with upcoming example wake times"),b("+ New recurring task",()=>form("New recurring task",[{label:"Name",placeholder:"Friday report"},{label:"Time",value:"09:00"},{label:"Frequency",options:["Daily","Weekdays","Weekly"]}],([name,at,freq])=>data.schedules.push({id:"A-"+Date.now(),name,at,freq,day:4,target:"Brain review",status:"Paused",last:"Not yet run"})))));
 const week=h("div","os-calendar");["MON","TUE","WED","THU","FRI","SAT","SUN"].forEach((name,i)=>{const col=add(h("div","os-day"),h("h4","",name));data.schedules.filter(s=>s.day===i+1&&s.status==="Enabled").forEach(s=>col.append(b(s.at+" "+s.name,()=>setActive(s.id),"os-calendar-event")));week.append(col)});main.append(week);
 main.append(grid(["Schedule","Trigger","Last receipt","Status","Control"],data.schedules.map(x=>[add(h("div","os-cell-name"),h("strong","",x.name),meta(x.target)),x.freq+" · "+x.at,x.last,tag(x.status),b(x.status==="Enabled"?"Pause":"Enable",()=>change(()=>x.status=x.status==="Enabled"?"Paused":"Enabled"),"os-small-btn")])));
 const c=data.schedules.find(x=>x.id===active);if(c)main.append(add(card(c.name+" · wake receipts"),row("Target",c.target),row("Last wake",c.last),row("Cadence",c.freq),b("Simulate run now",()=>change(()=>c.last="Just now · Example completed","Only the sample receipt changed."),"os-btn wide")));
 main.append(meta("Automations only wakes a running service. Mac sleep or shutdown can delay scheduled work."));
}
function chat(main){
 const sessions=[["Personal · Main conversation","Open","Today 12:38"],["Film studio / Producer","Open","Today 11:54"],["India campaign","Paused","Yesterday"]];
 const left=card("Sessions"),right=card("Conversation inspector");
 sessions.forEach((s,i)=>left.append(b(s[0]+"   ·   "+s[2],()=>setActive(String(i)),"os-session"+(active===String(i)?" selected":""))));
 right.append(h("h4","os-detail-title",sessions[Number(active)||0][0]),row("Runtime","Gateway / authenticated host"),row("Run lifecycle","Stream, stop, approve, recover"),row("Active workspace","Bound to selected system"));
 const transcript=h("div","os-transcript");transcript.append(add(h("div","os-bubble user"),meta("YOU"),h("p","","Prepare a shot list from these scene notes.")),add(h("div","os-bubble"),meta("AI-VERSE · EXAMPLE"),h("p","","I would read the permitted notes, produce a shot breakdown and request approval before any external delivery.")));right.append(transcript,meta("This is an example transcript. Your existing Chat pane remains alongside these pages."));
 main.append(split(left,right));
}
function skills(main){
 main.append(tabs([["all","All skills"],["Ready","Ready"],["Review","Review"],["proposals","Learning proposals"]]));
 if(mode==="proposals"){main.append(sec("Improvement proposals","No changes to the real installed Skill generation"));data.proposals.forEach(p=>{const c=card(p.name);c.append(row("Suggested by",p.source),row("State",p.status));if(p.status==="Pending")c.append(controls([["Reject",()=>change(()=>p.status="Rejected")],["Approve example",()=>change(()=>p.status="Accepted"),"os-btn primary"]]));main.append(c)});return}
 main.append(search("Find skills","Search reusable capabilities…"));
 const visible=data.skills.filter(x=>(mode==="all"||mode===x.status)&&(x.name+" "+x.category).toLowerCase().includes(term.toLowerCase())),left=h("div"),c=chosen(visible),right=card("Skill inspector");
 visible.forEach(x=>left.append(b("",()=>setActive(x.id),"os-skill-item")));left.querySelectorAll(".os-skill-item").forEach((node,i)=>{const x=visible[i];node.append(h("span","os-skill-icon","✧"),add(h("span","os-skill-copy"),h("strong","",x.name),meta(x.category+" · v"+x.version+" · "+x.uses+" runs")),tag(x.status))});
 if(c)right.append(h("h4","os-detail-title",c.name),h("p","os-copy",c.about),row("Generation","v"+c.version),row("Readiness",c.status),row("Use count",c.uses),meta("Installation does not imply permission to execute."));
 main.append(split(left,right));
}
function memory(main){
 main.append(search("Search memory","Find past decisions, preferences or evidence…"),tabs([["all","All"],["Preferences","Preferences"],["Decisions","Decisions"],["Lessons","Lessons"]]));
 const visible=data.memories.filter(x=>(mode==="all"||x.category===mode)&&(x.name+" "+x.text+" "+x.scope).toLowerCase().includes(term.toLowerCase())),left=h("div"),c=chosen(visible),right=card("Source details");
 left.append(sec("Relevant knowledge",visible.length+" matching records"));visible.forEach(x=>left.append(add(b("",()=>setActive(x.id),"os-memory-item"),add(h("div","os-row-top"),h("strong","",x.name),tag(x.category)),h("p","",x.text),meta(x.scope))));
 if(c)right.append(h("h4","os-detail-title",c.name),h("p","os-copy",c.text),row("Scope",c.scope),row("Category",c.category),row("Evidence source",c.source),b("Copy evidence reference",()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(c.source).then(()=>tell("Copied example reference."),()=>tell("Clipboard unavailable."));else tell("Clipboard unavailable.")},"os-btn wide"));
 main.append(split(left,right));
}
function dataPage(main){
 main.append(stats([[data.shots.length,"Total shots"],[data.shots.filter(x=>x.status==="Ready").length,"Ready"],[data.shots.filter(x=>x.status==="Review").length,"For review"]]));
 main.append(add(h("div","os-toolbar"),sec("Production shot list","Editable sample records. Changes stay in this browser view."),b("+ Add shot",()=>form("Add production shot",[{label:"Shot ID",placeholder:"04A"},{label:"Description",placeholder:"Camera action"},{label:"Camera",options:["Static","Gimbal","Drone","Handheld","FPV"]}],([id,description,camera])=>data.shots.push({id,scene:id.slice(0,2),description,type:"Medium",camera,status:"Planning",owner:"Operator",length:"00:10"})))));
 main.append(add(h("div","os-toolbar"),search("Filter shot list","Search scenes, shots, owners…"),tabs([["all","All"],["Ready","Ready"],["Planning","Planning"],["Review","Review"]])));
 const visible=data.shots.filter(x=>(mode==="all"||x.status===mode)&&(x.id+" "+x.description+" "+x.camera+" "+x.owner).toLowerCase().includes(term.toLowerCase()));
 main.append(grid(["Scene","Shot","Description","Framing","Movement","Status","Owner","Duration"],visible.map(x=>[
 x.scene,b(x.id,()=>setActive(x.id),"os-table-link"),x.description,x.type,x.camera,selectStatus(x),x.owner,x.length
 ])));
 const current=data.shots.find(x=>x.id===active);if(current)main.append(add(card("Edit shot · "+current.id),row("Scene",current.scene),row("Movement",current.camera),row("Owner",current.owner),controls([["Edit",()=>form("Edit shot",[{label:"Description",value:current.description},{label:"Camera",options:["Static","Gimbal","Drone","Handheld","FPV"],value:current.camera},{label:"Owner",value:current.owner}],([description,camera,owner])=>Object.assign(current,{description,camera,owner}))],["Remove",()=>change(()=>{data.shots=data.shots.filter(x=>x.id!==current.id);active=null})]])));
}
function selectStatus(x){const s=h("select","os-select");["Planning","Ready","Review"].forEach(v=>add(s,h("option","",v)));s.value=x.status;s.setAttribute("aria-label","Shot "+x.id+" status");s.addEventListener("change",()=>change(()=>x.status=s.value));return s}
function results(main){
 main.append(tabs([["all","All files"],["Document","Documents"],["Table","Tables"],["Image","Images"],["Report","Reports"]]));
 const visible=data.outputs.filter(x=>mode==="all"||x.type===mode),cards=h("div","os-file-grid");
 visible.forEach(o=>{const el=b("",()=>setActive(o.id),"os-file-card");el.append(h("div","os-file-icon",o.type==="Image"?"▧":o.type==="Table"?"▦":"▤"),h("strong","",o.name),meta(o.project+" · "+o.version),add(h("div","os-file-bottom"),tag(o.type),tag(o.status)));cards.append(el)});main.append(cards);
 const c=data.outputs.find(x=>x.id===active)||visible[0];if(c)main.append(add(card("Selected output"),h("h4","os-detail-title",c.name),h("div","os-file-preview",c.type==="Image"?"Asset preview requires a file source":c.type+" · Example preview"),h("p","os-copy",c.detail),row("Workspace",c.project),row("Status",c.status),row("Version",c.version),meta("Real content/download requires an authorized artifact route.")));
}
function usage(main){
 main.append(add(h("div","os-toolbar"),sec("Usage history","Cost truth belongs to Token"),add(h("div","os-tabs"),b("7 days",()=>{period="7";render()},"os-tab"+(period==="7"?" selected":"")),b("30 days",()=>{period="30";render()},"os-tab"+(period==="30"?" selected":"")))));
 const series=period==="7"?[["Mon",18,3.8],["Tue",25,5.2],["Wed",32,7.6],["Thu",14,2.8],["Fri",39,9.4],["Sat",18,4.2],["Sun",29,6.0]]:[["W1",117,26.4],["W2",138,34.8],["W3",164,41.1],["W4",124,30.9]];
 const count=series.reduce((a,x)=>a+x[1],0),cost=series.reduce((a,x)=>a+x[2],0);
 main.append(stats([[(count*1000).toLocaleString("en-GB"),"Tokens · example"],["£"+cost.toFixed(2),"Illustrative spend"],["3","Runtime sources"],["UNKNOWN","Unpriced evidence"]]));
 const plot=card("Token usage"),bars=h("div","os-bars"),max=Math.max(...series.map(x=>x[1]));
 series.forEach(x=>{const track=h("div","os-bar-track"),fill=h("div","os-bar-fill");fill.style.height=Math.round(100*x[1]/max)+"%";fill.title=x[0]+": "+(x[1]*1000).toLocaleString("en-GB")+" tokens";track.append(fill);bars.append(add(h("div","os-bar-col"),track,meta(x[0])))});plot.append(bars);
 const detail=card("Attribution");detail.append(grid(["Source","Usage","Cost evidence"],[["Codex","48%","Calculated"],["Claude Code","32%","Actual"],["Local AI","20%","Unknown"]]),meta("UNKNOWN is not zero; unpriced costs are never silently counted as free."));
 main.append(split(plot,detail));main.append(add(card("Execution costs"),grid(["Run","Workspace","Cost confidence"],data.runs.map(x=>[x.name,x.workspace,tag(x.status==="Running"?"Unknown":"Calculated")]))));
}
function health(main){
 const services=[["OS Core","Ready","Workspace structure and permissions"],["Gateway","Needs connection","No private runtime on this public page"],["Brain","Configured","Goal and cognition owner"],["Automations","Offline","Scheduler process must be running"],["Multiple Bots","Available","Work and approvals owner"],["Token","Not attached","Usage projections need local authority"],["Skills","Installed","Runtime readiness is separate"]];
 main.append(stats([[services.length,"Component checks"],["0","Live private checks"],["Local host","Required"]]));
 const left=card("Service status");services.forEach(s=>left.append(add(b("",()=>setActive(s[0]),"os-health-row"+(active===s[0]?" selected":"")),add(h("span"),h("strong","",s[0]),meta(s[2])),tag(s[1]))));
 const s=services.find(s=>s[0]===active)||services[0],right=card("Doctor details");right.append(h("h4","os-detail-title",s[0]),h("p","os-copy",s[2]),row("Preview status",s[1]),row("Source","Example readiness model"),row("Action","Owner doctor via local host"),b("Explain checks",()=>tell("No live check was run. This page will use the existing owner's status/doctor when connected."),"os-btn wide"));main.append(split(left,right));
}
function connections(main){
 const left=card("External tools and channels");data.connections.forEach(c=>left.append(add(b("",()=>setActive(c.id),"os-connection-row"+(active===c.id?" selected":"")),h("span","os-connection-mark",c.name.slice(0,1)),add(h("span","os-connection-copy"),h("strong","",c.name),meta(c.type)),tag(c.status))));
 const c=data.connections.find(x=>x.id===active)||data.connections[0],right=card("Connection and permissions");right.append(h("h4","os-detail-title",c.name),h("p","os-copy",c.detail),row("Example status",c.status),row("Authority",c.permission),sec("Security boundary"),meta("A configured connection does not imply that the current assistant may read, write or execute. Grants stay with Connections and the relevant owner."),b("Inspect authorization rules",()=>tell("This is a sample security page. No permission was granted."),"os-btn wide"));main.append(split(left,right));
}
const views={attention,activity,team,goals,schedule,chat,skills,memory,data:dataPage,results,usage,health,connections};
const descriptions={attention:"Approvals and actions requiring your decision",activity:"Real executions, results and recovery",team:"Your working AI assistants and Tasks",goals:"Priorities, milestones and verified progress",schedule:"Calendar, automation triggers and heartbeat",chat:"Gateway sessions and run controls",skills:"Reusable capabilities and learning review",memory:"Evidence-backed historical knowledge",data:"A real table-shaped production workspace",results:"Files, deliverables and receipts",usage:"Cost analytics and model attribution",health:"OS service status and diagnosis",connections:"Providers, tools and permissions"};
function render(){
 if(!root)return;root.replaceChildren();const shell=h("div","os-real-shell"),sidebar=h("aside","os-real-sidebar");sidebar.append(h("div","os-sidebar-heading","YOUR WORKSPACE"));
 let last="";NAV.forEach(([id,name,group])=>{if(group!==last){last=group;sidebar.append(h("div","os-nav-group",group.toUpperCase()))}const button=b("",()=>{page=id;active=null;mode="all";term="";render()},"feature-nav-item os-nav-item"+(page===id?" current":""));button.setAttribute("aria-current",page===id?"page":"false");button.setAttribute("aria-label","Open "+name+" page");button.append(h("span","os-nav-indicator",""),h("strong","",name));sidebar.append(button)});
 const content=h("section","os-real-content"),top=h("div","os-real-header"),name=NAV.find(x=>x[0]===page)?.[1]||"Personal";top.append(add(h("div"),meta("PERSONAL  /  "+name.toUpperCase()),h("h2","",name),h("p","",descriptions[page])),add(h("div","os-header-actions"),b("Reset sample",()=>{data=copy();active=null;mode="all";render();tell("Sample records restored. No real OS changes.")}),tag("Design preview")));content.append(top);
 content.append(add(h("div","os-source"),h("span","os-source-dot",""),h("span","","Functional sample workspace · Data is illustrative · Your OS is not connected")));
 const toast=h("div","os-toast",flash);toast.hidden=true;content.append(toast);flash="";
 const body=h("div","os-page");views[page](body);content.append(body);shell.append(sidebar,content);root.append(shell);
}
function mount(node){root=node;page="attention";active=null;mode="all";term="";render()}
window.AIVerseFunctionalWorkspace={mount,features:NAV.map(x=>({id:x[0],name:x[1]})),page:()=>page};
})();