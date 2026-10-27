/* Discoverable UI/UX examples of existing AI-Verse capabilities.
   This is a STATIC DESIGN PREVIEW, not a canonical owner adapter or telemetry feed.
   The feature data is intentionally illustrative and has no side-effect controls. */
(() => {
  "use strict";
  const GROUPS=[
    {id:"essential",title:"Everyday essentials",sub:"What you need while working"},
    {id:"intelligent",title:"Your AI at work",sub:"People, knowledge and continuity"},
    {id:"advanced",title:"More when you need it",sub:"Project tools and system visibility"}
  ];
  const FEATURES=[
    {id:"attention",group:"essential",icon:"◎",title:"Needs attention",line:"Your decisions in one place.",owner:"Multiple Bots + Gateway",detail:"Know when work genuinely needs you. Approvals, questions and blocked tasks gather in one quiet inbox rather than interrupting every conversation.",steps:["An assistant asks to publish a finished edit.","Review the requested action and its impact.","Approve, decline or ask for a change."],example:{label:"Approval example",title:"Ready for your review",desc:"Publishing a client's film requires your decision.",rows:[["Request","Publish approved final cut"],["Requested by","Production assistant"],["Decision","Approve or ask to revise"]],action:"Review requested action"}},
    {id:"activity",group:"essential",icon:"◷",title:"Live activity",line:"See what your AI is doing.",owner:"Gateway + Multiple Bots",detail:"Follow current tasks, completed outputs, stopped work and recovery after interruptions. The same run status should appear here and in its chat.",steps:["Ask AI to prepare a scene breakdown.","Watch a real run progress without leaving the workspace.","Open the result, stop the task, or review a failure."],example:{label:"Activity example",title:"Scene breakdown",desc:"One task, with its real progress when connected.",rows:[["Stage","Preparing shot plan"],["Worker","Story assistant"],["Next","Review generated breakdown"]],action:"View task timeline"}},
    {id:"chat",group:"essential",icon:"⌁",title:"Real AI chat",line:"One assistant, across all your work.",owner:"Gateway + OS",detail:"Keep chat available beside your canvas and other apps. Each pane shares the same real execution, model availability, context and stop/approval controls.",steps:["Start a conversation without setting up a workspace first.","Include the active work and permitted references.","See real streaming responses and run controls."],example:{label:"Conversation example",title:"Help me plan this shoot",desc:"All open chats will use the same authenticated AI connection.",rows:[["Context","Current project"],["Response","Streaming from Gateway"],["Controls","Stop, resume, review"]],action:"Inspect chat context"}},
    {id:"team",group:"intelligent",icon:"♙",title:"Your AI team",line:"Specialists working with you.",owner:"Multiple Bots",detail:"See actual persistent assistants, temporary specialists and teams. Know what each is doing, assign supported work and see their results.",steps:["Open your team roster.","See who is free, working or awaiting input.","Inspect tasks and delegate through existing owner permissions."],example:{label:"Team example",title:"Production assistants",desc:"Roster and workload are sourced from Multiple Bots when connected.",rows:[["Researcher","Available for research"],["Planner","Preparing the schedule"],["Editor","Needs input"]],action:"See teammate details"}},
    {id:"goals",group:"intelligent",icon:"◇",title:"Goals & focus",line:"Keep the bigger picture visible.",owner:"Brain",detail:"Track enduring goals, priorities, blockers and what counts as verified progress. AI can help you advance them without declaring success just because a message sounds confident.",steps:["See your most relevant goal.","Open its next action and evidence.","Pause or revise it through Brain's own controls."],example:{label:"Goal example",title:"Finish the short film",desc:"A single clear outcome, rather than a long list of internal metrics.",rows:[["Now","Prepare the first shoot"],["Blocker","Location confirmation"],["Completion","Requires evidence"]],action:"Inspect goal"}},
    {id:"schedule",group:"intelligent",icon:"◴",title:"Scheduled work",line:"A heartbeat for useful tasks.",owner:"Automations + Brain",detail:"Inspect recurring reviews, reminders and autonomous wake-ups, with next/last execution and honest online or missed states. Your consent is required to activate new ongoing work.",steps:["Choose a recurring activity and review its scope.","Approve the schedule when asked.","See last results and pause it whenever needed."],example:{label:"Schedule example",title:"Morning project review",desc:"Automations can wake an authorized Brain or Bot when its service runs.",rows:[["Cadence","Every weekday morning"],["Last wake","Receipt from the scheduler"],["Requirement","Mac or server running"]],action:"View schedule"}},
    {id:"skills",group:"intelligent",icon:"✧",title:"Skills & learning",line:"Reusable ways to get things done.",owner:"Skills",detail:"Find verified Skills ready for your AI to use, such as Interface Designer and Video Editor. Review learning proposals or safely roll back a change when needed.",steps:["Find a Skill from chat or the library.","See whether it is installed, ready and permitted.","Inspect an improvement proposal if a decision is needed."],example:{label:"Skill example",title:"Video Editor",desc:"A reusable capability, not a built-in editing timeline.",rows:[["Purpose","Captions, pacing and edits"],["Availability","Checked on this installation"],["Learning","Changes reviewed by Skills"]],action:"Inspect skill"}},
    {id:"memory",group:"intelligent",icon:"✶",title:"Memory & knowledge",line:"Know what AI remembers and why.",owner:"Memory + OS",detail:"Search relevant historical knowledge, examine its sources and correct outdated records. Current workspace facts and historic memories stay separate.",steps:["Ask what AI remembers about a project.","Review a dated, scoped source reference.","Correct a record through its owner if necessary."],example:{label:"Memory example",title:"What did we decide?",desc:"Historical recall with a verified source, not a second chat database.",rows:[["Question","Previous lens choice"],["Result","Relevant sourced memory"],["Verify","Open original evidence"]],action:"Examine source"}},
    {id:"usage",group:"advanced",icon:"▥",title:"AI usage & costs",line:"Understand where credits go.",owner:"Token",detail:"See token usage and AI costs by project, task, model or assistant, with real provider charges distinguished from calculated estimates and unknown prices.",steps:["Open usage for the active workspace.","Compare recorded activity and its cost source.","Drill into a high-usage task."],example:{label:"Usage example",title:"This workspace",desc:"Never show missing cost evidence as free usage.",rows:[["Usage","Tokens and requests"],["Cost evidence","Actual / Calculated / Unknown"],["Breakdown","By task, model or Bot"]],action:"Inspect usage"}},
    {id:"data",group:"advanced",icon:"▦",title:"Project data",line:"Tables, records and relationships.",owner:"Data",detail:"Open useful structured data for the selected workspace, such as a production shot list or client tracker. Data owns records and queries; Dashboard only shows authorized views.",steps:["Open a Data space linked to your project.","Filter records or view a chart.","Change a record only through an authorized owner action."],example:{label:"Data example",title:"Production shot list",desc:"A useful table appears only when the workspace has matching data.",rows:[["Scene 01","Ready to shoot"],["Scene 02","Waiting on location"],["Scene 03","Review required"]],action:"Open data view"}},
    {id:"health",group:"advanced",icon:"◈",title:"System health",line:"Know if your OS is ready.",owner:"OS + Gateway + service owners",detail:"See connection and service readiness, diagnose an offline Gateway or paused scheduler, and find one clear fix instead of deciphering a terminal log.",steps:["Check the small health indicator.","Open details only when a service needs attention.","Follow an owner-backed doctor/recovery instruction."],example:{label:"Health example",title:"This installation",desc:"Readiness is checked per service, not guessed from an open webpage.",rows:[["AI runtime","Requires verified model"],["Scheduler","Requires running service"],["OS Core","Read-only compatibility check"]],action:"See diagnostics"}},
    {id:"results",group:"advanced",icon:"▤",title:"Results & files",line:"Find what the work produced.",owner:"Gateway + Multiple Bots",detail:"See completed task outcomes, artifact metadata and verification evidence. Opening or downloading the actual file requires an authorized asset source, not just a filename.",steps:["Open a finished task.","See what changed and who produced it.","Open the permitted output or supporting evidence."],example:{label:"Result example",title:"Shot list delivered",desc:"A receipt links the output to the originating task.",rows:[["Result","Production notes"],["Source","Completed assistant task"],["Evidence","Verified owner receipt"]],action:"Inspect result"}},
    {id:"connections",group:"advanced",icon:"⇄",title:"Connections & channels",line:"Your tools, safely linked.",owner:"Connections + Multiple Bots",detail:"Understand which external tools or messaging channels are configured, verified and permitted. A sign-in does not automatically authorize all actions.",steps:["Inspect the service and its allowed capabilities.","Reconnect or grant permission through its owner.","Review effect receipts or disable access."],example:{label:"Connection example",title:"Connected services",desc:"Credentials stay with the secure host, never in the public preview.",rows:[["External tools","Configured / needs verification"],["Channels","Telegram, Discord when enabled"],["Permissions","Explicit per action"]],action:"See connection details"}}
  ];
  let selected="attention",query="",category="all";
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const btn=(cls,label,callback)=>{
    const b=el("button",cls,label);b.type="button";b.addEventListener("click",callback);return b;
  };
  function mount(root){
    root.replaceChildren();
    const view=el("div","feature-explorer");
    const head=el("div","feature-explorer-head");
    const header=el("div");
    header.append(el("span","feature-eyebrow","EXPLORE YOUR AI-VERSE"),el("h2","","Your OS, made visible"),el("p","","Explore what the existing AI-Verse components can offer. These are design examples, not live data."));
    const count=el("div","feature-total",FEATURES.length+" capabilities");
    head.append(header,count);
    view.append(head);
    const controls=el("div","feature-controls");
    const search=el("input","feature-search");
    search.type="search";search.placeholder="Find a feature…";search.setAttribute("aria-label","Search OS features");search.maxLength=80;search.value=query;
    const segments=el("div","feature-segments");segments.setAttribute("role","group");segments.setAttribute("aria-label","Filter feature priorities");
    const tabs=[["all","All"],["essential","Essentials"],["intelligent","AI work"],["advanced","More tools"]];
    const nav=el("nav","feature-list");nav.setAttribute("aria-label","OS feature explorer");
    const detail=el("section","feature-detail");detail.setAttribute("aria-label","Selected feature details");detail.setAttribute("aria-live","polite");
    function redraw(){
      segments.replaceChildren();
      tabs.forEach(([id,title])=>{
        const item=btn("feature-segment"+(category===id?" active":""),title,()=>{category=id;redraw();});
        item.setAttribute("aria-pressed",String(category===id));segments.append(item);
      });
      nav.replaceChildren();
      const matches=FEATURES.filter(f=>(category==="all"||f.group===category)&&(!query||[f.title,f.line,f.detail,f.owner].join(" ").toLowerCase().includes(query.toLowerCase())));
      if(!matches.some(f=>f.id===selected)&&matches.length)selected=matches[0].id;
      if(!matches.length){nav.append(el("p","feature-no-results","No matches. Try another search."));detail.replaceChildren();return;}
      GROUPS.forEach(group=>{
        const list=matches.filter(f=>f.group===group.id);
        if(!list.length)return;
        nav.append(el("h3","feature-group-label",group.title));
        for(const f of list){
          const choice=btn("feature-nav-item"+(f.id===selected?" current":""),"",()=>{selected=f.id;redraw();});
          choice.setAttribute("aria-current",f.id===selected?"true":"false");
          choice.setAttribute("aria-label","Preview "+f.title);
          const symbol=el("span","feature-nav-icon",f.icon);
          symbol.setAttribute("aria-hidden","true");
          const copy=el("span","feature-nav-copy");
          copy.append(el("strong","",f.title),el("small","",f.line));
          choice.append(symbol,copy,el("span","feature-nav-arrow","›"));
          nav.append(choice);
        }
      });
      const f=FEATURES.find(x=>x.id===selected);if(!f){detail.replaceChildren();return;}
      detail.replaceChildren();
      const focus=el("div","feature-detail-intro");
      const kicker=el("span","feature-eyebrow",GROUPS.find(g=>g.id===f.group).title+" · DESIGN EXAMPLE");
      const title=el("h3","",f.title);
      focus.append(kicker,title,el("p","",f.detail));
      detail.append(focus);
      const mock=el("div","feature-mock");
      const mockTop=el("div","feature-mock-top");
      mockTop.append(el("span","feature-mock-tag","EXAMPLE INTERFACE"),el("span","feature-mock-muted","Illustrative data"));
      mock.append(mockTop);
      const mockInner=el("div","feature-mock-inner");
      mockInner.append(el("span","feature-mock-label",f.example.label),el("h4","",f.example.title),el("p","",f.example.desc));
      const rows=el("div","feature-mock-rows");
      f.example.rows.forEach(([name,value])=>{
        const row=el("div","feature-mock-row");row.append(el("span","",name),el("strong","",value));rows.append(row);
      });
      mockInner.append(rows);
      const future=el("div","feature-example-action");
      future.append(el("span","feature-future-dot",""),el("span","",f.example.action+" · Available when connected"));
      mockInner.append(future);mock.append(mockInner);detail.append(mock);
      const workflow=el("div","feature-workflow");
      workflow.append(el("h4","","How you would use it"));
      const ol=el("ol","");
      f.steps.forEach(step=>ol.append(el("li","",step)));
      workflow.append(ol);detail.append(workflow);
      const bottom=el("div","feature-detail-bottom");
      bottom.append(el("span","","Powered by existing "+f.owner),el("span","","Preview only · No OS actions"));
      detail.append(bottom);
      const next=btn("feature-next","Next feature →",()=>{
        const idx=matches.findIndex(x=>x.id===selected);
        selected=matches[(idx+1)%matches.length].id;redraw();
        if(matchMedia("(max-width: 700px)").matches)detail.scrollIntoView({block:"start",behavior:"instant"});
      });
      detail.append(next);
    }
    search.addEventListener("input",()=>{query=search.value.trim().slice(0,80);redraw();});
    search.addEventListener("keydown",e=>{if(e.key==="Escape"&&query){query="";search.value="";redraw();e.stopPropagation();}});
    controls.append(search,segments);
    view.append(controls);
    const content=el("div","feature-content");
    content.append(nav,detail);view.append(content);
    const foot=el("p","feature-footnote","This visual tour explains the intended Dashboard experience. No AI requests, approvals, schedules, files, payments or account connections run in this preview.");
    view.append(foot);
    root.append(view);
    redraw();
  }
  window.AIVerseFeatureExplorer={mount,features:FEATURES.map(f=>({id:f.id,title:f.title,group:f.group,owner:f.owner}))};
})();