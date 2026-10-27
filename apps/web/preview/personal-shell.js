/* Optional Personal design surfaces. Demo-only UI: no real AI teams, providers or OS writes. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const key = "aiverse-personal-shell-preview-v1";
  const demoTeams = () => [
    { id: "personal", name: "Personal team", description: "Everyday work", members: [
      { id: "p1", name: "AI-Verse", role: "General assistant" },
      { id: "p2", name: "Researcher", role: "Research and ideas" },
      { id: "p3", name: "Planner", role: "Plans and priorities" }
    ] },
    { id: "film", name: "Film studio", description: "Production and storytelling", members: [
      { id: "f1", name: "Director", role: "Story and vision" },
      { id: "f2", name: "Cinematographer", role: "Camera and lighting" },
      { id: "f3", name: "Editor", role: "Post-production" }
    ] },
    { id: "content", name: "Content lab", description: "Campaigns and publishing", members: [
      { id: "c1", name: "Strategist", role: "Creative strategy" },
      { id: "c2", name: "Writer", role: "Scripts and copy" }
    ] }
  ];
  const blank = () => ({ version: 1, teams: demoTeams(), activeTeam: "personal", panes: 0, chats: {}, app: "canvas" });
  const valid = s => s && s.version === 1 && Array.isArray(s.teams) && s.teams.length > 0 && s.teams.length <= 20 &&
    s.teams.every(t => typeof t.id === "string" && typeof t.name === "string" && t.name.length <= 65 &&
      Array.isArray(t.members) && t.members.length <= 20 &&
      t.members.every(m => typeof m.id === "string" && typeof m.name === "string" && typeof m.role === "string")) &&
    s.teams.some(t => t.id === s.activeTeam) &&
    Number.isInteger(s.panes) && s.panes >= 0 && s.panes <= 2 &&
    ["canvas","notes","assets","activity"].includes(s.app) &&
    s.chats && typeof s.chats === "object";
  let data = blank();
  try { const restored = JSON.parse(localStorage.getItem(key)); if (valid(restored)) data = restored; } catch {}
  data.chatTargets = data.chatTargets && typeof data.chatTargets === "object" ? data.chatTargets : {};
  data.threads = data.threads && typeof data.threads === "object" ? data.threads : {};
  data.paneRecipients = data.paneRecipients && typeof data.paneRecipients === "object" ? data.paneRecipients : {};
  data.paneModels = data.paneModels && typeof data.paneModels === "object" ? data.paneModels : {};
  data.mainRecipients = Array.isArray(data.mainRecipients) ? data.mainRecipients : [];
  data.paneDrafts = data.paneDrafts && typeof data.paneDrafts==="object" ? data.paneDrafts : {};
  data.paneCanvasRefs = data.paneCanvasRefs && typeof data.paneCanvasRefs==="object" ? data.paneCanvasRefs : {};
  data.mainCanvasRefs = Array.isArray(data.mainCanvasRefs) ? data.mainCanvasRefs : [];
  data.mainVisible = data.mainVisible !== false;
  data.minimizedChat = typeof data.minimizedChat === "string" ? data.minimizedChat : null;
  data.primaryWidth = Number.isFinite(data.primaryWidth) ? Math.max(260,Math.min(550,data.primaryWidth)) : 300;
  data.secondaryWidth = Number.isFinite(data.secondaryWidth) ? Math.max(270,Math.min(850,data.secondaryWidth)) : 315;
  data.secondPaneWidth = Number.isFinite(data.secondPaneWidth) ? Math.max(220,Math.min(500,data.secondPaneWidth)) : 280;
  let lastActiveChat = typeof data.lastActiveChat==="string" ? data.lastActiveChat : "main";
  const id = () => crypto.randomUUID();
  // Recipient identity is a stable team/member ID, not a pane number or display name.
  const findRecipient = key => {
    if (typeof key !== "string") return null;
    const [type, teamId, memberId] = key.split(":");
    const team = data.teams.find(t => t.id === teamId);
    if (!team) return null;
    if (type === "team" && !memberId) return {key,label:team.name,display:team.name+" (team)",detail:"Entire team · Preview only",type,teamId};
    if (type === "agent" && memberId) {
      const agent = team.members.find(m => m.id === memberId);
      if (agent) return {key,label:agent.name,display:team.name+" / "+agent.name,detail:team.name + " · " + agent.role + " · Preview only",type,teamId};
    }
    return null;
  };
  function startTargetChat(key) {
    const target = findRecipient(key);
    if (!target) return notify("This team or assistant is no longer available.");
    let slot = [1,2].find(i => data.chatTargets[String(i)] === key && i <= data.panes);
    if (!slot) slot = data.panes < 2 ? data.panes + 1 : 2;
    data.panes = Math.max(data.panes,slot);
    data.chatTargets[String(slot)] = key;
    data.paneRecipients[String(slot)] = [key];
    lastActiveChat=String(slot);
    data.lastActiveChat=lastActiveChat;
    showTeams(false);save();renderPanes();window.AIVerseCanvasRetarget?.();
    secondaryHost.querySelectorAll(".secondary-chat-pane")[slot-1]?.querySelector("textarea")?.focus();
  }

  const save = () => { try { localStorage.setItem(key, JSON.stringify(data)); } catch { notify("This browser cannot save the extra demo layout."); } };
  const make = (tag, cls, content) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = content;
    return node;
  };
  const icon = (name) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const paths = {
      teams:["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8","M22 21v-2a4 4 0 0 0-3-3.87"],
      chat:["M20 11a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 1 1 17-5"],
      plus:["M12 5v14","M5 12h14"], split:["M3 4h18v16H3z","M12 4v16"],
      down:["m6 9 6 6 6-6"], close:["M18 6 6 18","M6 6l12 12"], grid:["M3 3h8v8H3z","M13 3h8v8h-8z","M3 13h8v8H3z","M13 13h8v8h-8z"],
      layers:["M12 2 2 8l10 6 10-6-10-6z","m2 12 10 6 10-6","m2 16 10 6 10-6"]
    };
    for (const d of paths[name] || paths.grid) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", d);
      svg.append(path);
    }
    return svg;
  };
  const button = (cls, title, onClick, symbol, text) => {
    const b = make("button", cls);
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    if (symbol) b.append(icon(symbol));
    if (text) b.append(make("span", "", text));
    b.addEventListener("click", onClick);
    return b;
  };
  let toastTimeout;
  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("visible"), 3400);
  }
  function formDialog(title, fields, action, commit) {
    const dialog = make("dialog", "personal-mini-dialog");
    const form = make("form");
    form.method = "dialog";
    const heading = make("h2", "", title);
    form.append(heading);
    const inputs = [];
    for (const field of fields) {
      const label = make("label", "", field.label);
      const input = make("input");
      input.required = true;
      input.maxLength = field.max || 65;
      input.placeholder = field.placeholder || "";
      input.value = field.value || "";
      label.append(input);
      form.append(label);
      inputs.push(input);
    }
    const actions = make("div", "mini-dialog-actions");
    const cancel = button("quiet-action", "Cancel", () => dialog.close(), null, "Cancel");
    const submit = make("button", "mini-submit", action);
    submit.type = "submit";
    actions.append(cancel, submit);
    form.append(actions);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const values = inputs.map(i => i.value.trim());
      if (values.some(v => !v)) return;
      if (commit(values) === false) return;
      dialog.close();
    });
    dialog.addEventListener("close", () => dialog.remove());
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
    inputs[0]?.focus();
  }

  /* Teams are discoverable only on demand, never a persistent sidebar. */
  const top = $(".top-actions");
  const teamsButton = button("quiet-teams-toggle", "Open AI teams", toggleTeams, "teams", "Teams");
  teamsButton.setAttribute("aria-expanded", "false");
  teamsButton.setAttribute("aria-controls", "personal-teams-popover");
  top.insertBefore(teamsButton, $("#theme"));
  const popover = make("section", "personal-teams-popover");
  popover.id = "personal-teams-popover";
  popover.hidden = true;
  popover.setAttribute("aria-label", "AI teams design preview");
  $(".topbar").append(popover);
  function toggleTeams() { showTeams(popover.hidden); }
  function showTeams(on) {
    if (on) renderTeams();
    popover.hidden = !on;
    teamsButton.setAttribute("aria-expanded", String(on));
  }
  function renderTeams() {
    popover.replaceChildren();
    const header = make("div", "teams-pop-header");
    const headerTitle = make("div");
    headerTitle.append(make("strong", "", "Your AI teams"), make("p", "", "Separate teams for different projects."));
    header.append(headerTitle, button("quiet-icon", "Close teams", () => showTeams(false), "close"));
    popover.append(header);
    const list = make("div", "team-chip-list");
    for (const t of data.teams) {
      const active = t.id === data.activeTeam;
      const b = button("team-chip" + (active ? " is-active" : ""), "Select " + t.name, () => {
        data.activeTeam = t.id; save(); renderTeams();
      }, null, t.name);
      b.setAttribute("aria-pressed", String(active));
      list.append(b);
    }
    popover.append(list);
    const t = data.teams.find(x => x.id === data.activeTeam);
    const profile = make("div", "team-profile");
    const profileTitle = make("div", "team-profile-title");
    profileTitle.append(make("strong", "", t.name), make("small", "", t.description || "A space for your assistants"));
    profile.append(profileTitle);
    profile.append(button("team-chat-button", "Chat with the entire " + t.name + " team", () => startTargetChat("team:" + t.id), "teams", "Chat with team"));
    const members = make("div", "team-members");
    if (!t.members.length) members.append(make("p", "empty-members", "Add the first assistant to this team."));
    for (const member of t.members) {
      const item = make("div", "team-member");
      const dot = make("span", "member-avatar", member.name.slice(0,1).toUpperCase());
      const lines = make("div");
      lines.append(make("strong", "", member.name), make("small", "", member.role));
      item.append(dot,lines);
      item.append(button("member-chat-button", "Chat with " + member.name, () => startTargetChat("agent:" + t.id + ":" + member.id), null, "Chat"));
      members.append(item);
    }
    profile.append(members);
    const actions = make("div", "team-profile-actions");
    actions.append(button("quiet-action", "Add teammate", () => {
      if (t.members.length >= 20) return notify("Maximum 20 demo teammates per team.");
      formDialog("Add teammate",[{label:"Assistant name",placeholder:"e.g. Producer",max:50},{label:"Role",placeholder:"e.g. Production planning",max:65}],
        "Add", ([name,role]) => { t.members.push({id:id(),name,role});save();renderTeams(); });
    }, "plus", "Add teammate"));
    if (data.teams.length > 1) actions.append(button("quiet-action remove-team", "Remove " + t.name, () => {
      formDialog("Remove this team?",[{label:"Type the team name to confirm",placeholder:t.name,max:65}],"Remove", ([value]) => {
        if (value !== t.name) { notify("Enter the exact team name to remove it."); return false; }
        data.teams=data.teams.filter(x=>x.id!==t.id);data.activeTeam=data.teams[0].id;
        data.mainRecipients=data.mainRecipients.filter(k=>!!findRecipient(k));
        for(const slot of Object.keys(data.paneRecipients)) data.paneRecipients[slot]=data.paneRecipients[slot].filter(k=>!!findRecipient(k));
        save();renderTeams();renderPanes();
      });
    }, null, "Remove team"));
    profile.append(actions);
    popover.append(profile);
    const bottom = make("div", "team-pop-bottom");
    bottom.append(button("new-team-action", "Create another AI team", () => {
      if (data.teams.length >= 20) return notify("Maximum 20 demo teams.");
      formDialog("New AI team",[{label:"Team name",placeholder:"e.g. Marketing",max:65}],"Create team", ([name]) => {
        const entry={id:id(),name,description:"Your own team",members:[]};
        data.teams.push(entry);data.activeTeam=entry.id;save();renderTeams();
      });
    }, "plus", "New team"));
    bottom.append(make("small", "", "Design preview only. No real agents are running."));
    popover.append(bottom);
  }
  document.addEventListener("pointerdown", event => {
    if (!popover.hidden && !popover.contains(event.target) && !teamsButton.contains(event.target)) showTeams(false);
  });

  /* The canonical chat never moves or gets replaced. Additional chats are opt-in. */
  const shell = $(".app-shell");
  const rail = make("div","chat-minimized-rail");
  rail.hidden=true;
  shell.prepend(rail);
  const chatMinSize=260;
  function visibleCount(){return (data.mainVisible?1:0)+data.panes;}
  function persistLayout(){data.lastActiveChat=lastActiveChat;save();}
  function applyChatWidths(){
    const max=Math.max(chatMinSize,innerWidth-460);
    shell.style.setProperty("--primary-chat-size",Math.min(data.primaryWidth,max)+"px");
    shell.style.setProperty("--secondary-chat-size",Math.min(data.secondaryWidth,max)+"px");
    shell.style.setProperty("--secondary-first-size",data.secondPaneWidth+"px");
  }
  function addResizeGrip(panel,onResize,initialWidth,{minimum=chatMinSize,maximum=550}={}){
    const grip=make("div","chat-resize-grip");
    grip.tabIndex=0;grip.setAttribute("role","separator");
    grip.setAttribute("aria-orientation","vertical");
    grip.setAttribute("aria-label","Resize conversation width");
    grip.setAttribute("aria-valuemin",String(minimum));grip.setAttribute("aria-valuemax",String(maximum));
    const set=n=>{const width=Math.max(minimum,Math.min(maximum,Math.round(n)));grip.setAttribute("aria-valuenow",String(width));onResize(width);applyChatWidths();};
    grip.setAttribute("aria-valuenow",String(initialWidth()));
    grip.addEventListener("pointerdown",e=>{
      if(e.button!==0)return;
      e.preventDefault();e.stopPropagation();
      const start=e.clientX,startWidth=initialWidth();
      grip.setPointerCapture(e.pointerId);
      const move=ev=>{if(ev.pointerId===e.pointerId)set(startWidth+ev.clientX-start);};
      const end=ev=>{if(ev.pointerId!==e.pointerId)return;grip.removeEventListener("pointermove",move);grip.removeEventListener("pointerup",end);grip.removeEventListener("pointercancel",end);persistLayout();};
      grip.addEventListener("pointermove",move);grip.addEventListener("pointerup",end);grip.addEventListener("pointercancel",end);
    });
    grip.addEventListener("keydown",e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();set(initialWidth()+(e.key==="ArrowRight"?20:-20));persistLayout();}});
    grip.addEventListener("dblclick",()=>{set(minimum+80);persistLayout();});
    panel.append(grip);
    return grip;
  }
  const main = $("#workspace");
  const secondaryHost = make("div", "secondary-chat-host");
  shell.insertBefore(secondaryHost, main);
  const mainChatHeading = $(".chat-heading");
  const originalChat=$(".chat-panel");
  function openAnotherChat(){
    data.minimizedChat=null;
    if(data.panes<2){data.panes++;lastActiveChat=String(data.panes);}
    else if(!data.mainVisible){data.mainVisible=true;lastActiveChat="main";}
    else return notify("Three chat panes are already open.");
    persistLayout();renderPanes();window.AIVerseCanvasRetarget?.();
    (lastActiveChat==="main"?$("#message"):secondaryHost.querySelectorAll(".secondary-chat-pane")[Number(lastActiveChat)-1]?.querySelector("textarea"))?.focus();
  }
  const split = button("quiet-icon split-chat-action", "Open an additional chat", openAnotherChat, "split");
  const chatHeadingActions = make("div", "chat-heading-actions");
  mainChatHeading.append(chatHeadingActions);
  const closeMain=button("quiet-icon close-primary-chat", "Close this conversation", ()=>{
    if(visibleCount()===1){
      data.minimizedChat="main";
      lastActiveChat="main";
    }else{
      data.mainVisible=false;
      data.minimizedChat=null;
      if(lastActiveChat==="main")lastActiveChat=String(data.panes);
    }
    persistLayout();renderPanes();window.AIVerseCanvasRetarget?.();
  },"close");
  addResizeGrip(originalChat,w=>{data.primaryWidth=w;},()=>data.primaryWidth,{minimum:260,maximum:550});
  chatHeadingActions.append(split, $("#new-chat"),closeMain);
  const topNewChat=button("quiet-chat-new", "Open a chat", ()=>{
    if(data.minimizedChat){data.minimizedChat=null;}
    else if(!data.mainVisible){data.mainVisible=true;lastActiveChat="main";}
    else if(data.panes<2){data.panes++;lastActiveChat=String(data.panes);}
    else return notify("Three visible preview chats are the current layout limit.");
    persistLayout();renderPanes();window.AIVerseCanvasRetarget?.();
    if(lastActiveChat==="main")$("#message")?.focus();
    else secondaryHost.querySelectorAll(".secondary-chat-pane")[Number(lastActiveChat)-1]?.querySelector("textarea")?.focus();
  },"chat");
  topNewChat.title="New chat";
  $(".top-actions").insertBefore(topNewChat,teamsButton);
  originalChat.addEventListener("pointerdown",()=>{if(data.mainVisible){lastActiveChat="main";data.lastActiveChat="main";save();window.AIVerseCanvasRetarget?.();}});
  originalChat.addEventListener("focusin",()=>{if(data.mainVisible){lastActiveChat="main";data.lastActiveChat="main";save();window.AIVerseCanvasRetarget?.();}});

  // The same chat shell, composer and controls are used by main and every extra pane.
  function activeCanvasItems() {
    try {
      const saved=JSON.parse(localStorage.getItem("aiverse-design-preview-v1"));
      const workspace=saved?.workspaces?.find(w=>w.id===saved.selected);
      if (workspace?.nodes) return workspace.nodes.map(n=>({id:n.id,title:n.title,type:n.type}));
    } catch {}
    return Array.from(document.querySelectorAll("#nodes [data-node]")).map(el=>({
      id:el.dataset.node,title:el.querySelector("h3")?.textContent||"Untitled",type:"Canvas item"
    }));
  }
  function showChatContext(meta) {
    const container=make("div","chat-message-context");
    for (const r of meta?.recipients||[]) container.append(make("span","message-context-tag","@ "+r.label));
    for (const f of meta?.files||[]) container.append(make("span","message-context-tag","＋ "+f.name));
    for (const c of meta?.canvas||[]) container.append(make("span","message-context-tag","▧ "+c.title));
    return container;
  }
  let secondaryControllers=[];
  function renderPanes() {
    for(const [i,pane] of Array.from(secondaryHost.querySelectorAll(".secondary-chat-pane")).entries()){
      data.paneDrafts[String(i+1)]=pane.querySelector("textarea")?.value||"";
    }
    for(const controller of secondaryControllers) controller.destroy();
    secondaryControllers=[];
    secondaryHost.replaceChildren();
    document.body.classList.toggle("with-parallel-chats",data.panes>0);
    document.body.classList.toggle("primary-chat-closed",!data.mainVisible);
    // Never leave the operator with zero conversations. Minimize the last one into a restorable rail.
    if(visibleCount()===0){data.mainVisible=true;data.minimizedChat="main";}
    if(data.minimizedChat && !(data.minimizedChat==="main"?data.mainVisible: Number(data.minimizedChat)>0&&Number(data.minimizedChat)<=data.panes)) data.minimizedChat=null;
    const compact=visibleCount()===1 && Boolean(data.minimizedChat);
    document.body.classList.toggle("chat-only-rail",compact);
    document.body.classList.toggle("zero-chats",false);
    rail.replaceChildren();rail.hidden=!compact;
    if(compact){
      const title= data.minimizedChat==="main"?"AI-Verse":"Chat "+(Number(data.minimizedChat)+1);
      const restore=button("restore-chat-action","Restore "+title,()=>{
        lastActiveChat=data.minimizedChat;
        data.minimizedChat=null;persistLayout();renderPanes();window.AIVerseCanvasRetarget?.();
        if(lastActiveChat==="main")$("#message")?.focus();else secondaryHost.querySelector("textarea")?.focus();
      },"chat");
      restore.append(make("span","chat-rail-label","Chat"));
      rail.append(restore);
    }
    closeMain.title=visibleCount()===1?"Minimize chat":"Close this conversation";
    closeMain.setAttribute("aria-label",closeMain.title);
    applyChatWidths();
    topNewChat.hidden=false;
    topNewChat.title=data.minimizedChat?"Restore chat":"Open another chat";
    topNewChat.setAttribute("aria-label",topNewChat.title);
    if(lastActiveChat==="main"&&!data.mainVisible)lastActiveChat=data.panes?String(data.panes):null;
    document.body.classList.toggle("with-three-chats",data.panes===2);
    split.disabled=visibleCount()>=3;
    for(let i=1;i<=data.panes;i++){
      const pane=make("section","chat-panel secondary-chat-pane unified-chat-pane");
      pane.addEventListener("pointerdown",()=>{lastActiveChat=slot;data.lastActiveChat=slot;save();window.AIVerseCanvasRetarget?.();});
      pane.addEventListener("focusin",()=>{lastActiveChat=slot;data.lastActiveChat=slot;save();window.AIVerseCanvasRetarget?.();});
      pane.setAttribute("aria-label","Conversation "+(i+1));
      const slot=String(i);
      const key=data.chatTargets[slot]||null;
      const recipient=findRecipient(key);
      const heading=make("div","chat-heading");
      const identity=make("div","pane-assistant-identity");
      identity.append(make("span","assistant-mark","✳"),make("strong","",recipient?recipient.display:"AI-Verse"));
      heading.append(identity);
      const actions=make("div","chat-heading-actions");
      const paneSplit=button("quiet-icon split-chat-action","Open an additional chat",openAnotherChat,"split");
      paneSplit.disabled=visibleCount()>=3;
      actions.append(paneSplit);
      actions.append(button("quiet-icon",visibleCount()===1?"Minimize chat":"Close chat "+(i+1),()=>{
        if(visibleCount()===1){
          data.minimizedChat=slot;lastActiveChat=slot;persistLayout();renderPanes();return;
        }
        data.minimizedChat=null;
        if(i<data.panes){
          const last=String(data.panes);
          data.chats[slot]=data.chats[last]||[];
          data.chatTargets[slot]=data.chatTargets[last];
          data.paneRecipients[slot]=data.paneRecipients[last]||[];
          data.paneModels[slot]=data.paneModels[last]||"Auto";
          data.paneCanvasRefs[slot]=data.paneCanvasRefs[last]||[];
          data.paneDrafts[slot]=data.paneDrafts[last]||"";
        }
        const last=String(data.panes);
        delete data.chats[last];delete data.chatTargets[last];
        delete data.paneRecipients[last];delete data.paneModels[last];delete data.paneCanvasRefs[last];delete data.paneDrafts[last];
        data.panes--;
        if(lastActiveChat===slot||Number(lastActiveChat)>data.panes)lastActiveChat=data.panes?String(Math.min(data.panes,i)):data.mainVisible?"main":null;
        data.lastActiveChat=lastActiveChat;save();renderPanes();window.AIVerseCanvasRetarget?.();
      },"close"));
      heading.append(actions);pane.append(heading);
      if(data.panes===2&&i===1) addResizeGrip(pane,w=>{data.secondPaneWidth=w;},()=>data.secondPaneWidth,{minimum:220,maximum:500});
      if(i===data.panes) addResizeGrip(pane,w=>{data.secondaryWidth=w;},()=>data.secondaryWidth,{minimum:data.panes===2?500:270,maximum:850});
      const scope=make("div","chat-scope");
      scope.append(make("span","scope-dot"),make("span","",recipient?recipient.detail:"Independent demo conversation"));
      pane.append(scope);
      const log=make("div","conversation");
      log.setAttribute("role","log");log.setAttribute("aria-label","Demo conversation");
      const messages=recipient?data.threads[recipient.key]:data.chats[slot];
      if(!Array.isArray(messages)||!messages.length){
        const welcome=make("div","chat-welcome");
        welcome.append(make("span","tiny-mark","✳"),make("h2","",recipient?"Chat with "+recipient.display:"A fresh conversation."));
        welcome.append(make("p","",recipient?"This conversation is addressed to "+recipient.display+". Nothing is sent to a real AI.":"Another place to think, without closing your work."));
        log.append(welcome);
      }else for(const msg of messages){
        const item=make("div","chat-message "+msg.role);
        if(msg.role==="assistant")item.append(make("span","role","AI-Verse · Demo"));
        item.append(make("p","",msg.text));
        if(msg.role==="user"&&msg.meta)item.append(showChatContext(msg.meta));
        log.append(item);
      }
      pane.append(log);
      const bottom=make("div","chat-bottom");
      const form=make("form","unified-chat-form");
      const input=make("textarea");
      input.rows=2;input.maxLength=1200;
      input.setAttribute("aria-label","Message in conversation "+(i+1));
      input.placeholder="What's on your mind?";
      input.value=data.paneDrafts[slot]||"";
      input.addEventListener("input",()=>{data.paneDrafts[slot]=input.value;save();});
      const bar=make("div","composer-bottom");
      const hint=make("span","","Chat · Local demo");
      const send=button("send-button","Send message",()=>form.requestSubmit(),"arrow");
      // Keep the exact same send-button styling and icon as the main conversation.
      send.replaceChildren();
      send.innerHTML='<svg aria-hidden="true"><use href="#i-arrow"/></svg>';
      bar.append(hint,send);
      form.append(input,bar);
      bottom.append(form,make("p","chat-footnote","Sample responses. Your real OS is not connected."));
      pane.append(bottom);
      secondaryHost.append(pane);
      const initKeys=data.paneRecipients[slot]|| (recipient?[recipient.key]:[]);
      const ui=window.AIVerseChatUI.mount({
        form,input,teams:()=>data.teams,canvasItems:activeCanvasItems,
        initialRecipients:initKeys,initialCanvas:data.paneCanvasRefs[slot]||[],initialModel:data.paneModels[slot]||"Auto",
        notify,onChange:meta=>{
          data.paneRecipients[slot]=meta.recipients.map(r=>r.key);
          data.paneModels[slot]=meta.model;
          data.paneCanvasRefs[slot]=meta.canvas;
          save();
        },
        onSubmit:({message,meta})=>{
          const store=recipient?data.threads:data.chats;
          const storeKey=recipient?recipient.key:slot;
          if(recipient&&!findRecipient(recipient.key)){notify("This assistant or team no longer exists.");return true;}
          if(!Array.isArray(store[storeKey]))store[storeKey]=[];
          if(store[storeKey].length>=100){notify("This demo conversation is full.");return true;}
          store[storeKey].push({role:"user",text:message,meta});
          store[storeKey].push({role:"assistant",text:"This is a design preview. The selected model, recipients, attachments and canvas items were not sent to an AI."});
          data.paneDrafts[slot]="";save();renderPanes();return true;
        }
      });
      secondaryControllers.push(ui);
      // Keep individual/team identity legible even after selecting additional recipients.
      log.scrollTop=log.scrollHeight;
    }
    applyChatWidths();
  }
  const mainComposer=$("#chat-form");
  const mainInput=$("#message");
  const mainUI=window.AIVerseChatUI.mount({
    form:mainComposer,input:mainInput,teams:()=>data.teams,canvasItems:activeCanvasItems,
    initialRecipients:data.mainRecipients,initialCanvas:data.mainCanvasRefs,initialModel:data.paneModels.main||"Auto",
    notify,onChange:meta=>{
      data.mainRecipients=meta.recipients.map(r=>r.key);
      data.paneModels.main=meta.model;data.mainCanvasRefs=meta.canvas;save();
    },
    onSubmit:({message,meta})=>{
      const enhanced=meta.recipients.length||meta.files.length||meta.canvas.length||meta.model!=="Auto";
      if(!enhanced)return false; // Original chat's demo proposals still work without additions.
      if(typeof window.AIVerseDemoPost!=="function"){notify("Chat demo is not ready.");return false;}
      window.AIVerseDemoPost(message,meta);return true;
    }
  });

  // Canvas clicks are routed exclusively to the last chat the user interacted with.
  let liveCanvasSelection={workspaceId:null,nodes:[]};
  function dispatchCanvasSelection(){
    const controllers=[mainUI,...secondaryControllers];
    let target=lastActiveChat==="main"&&data.mainVisible?mainUI:null;
    if(!target&&lastActiveChat!==null&&/^[1-9]\d*$/.test(String(lastActiveChat)))
      target=secondaryControllers[Number(lastActiveChat)-1]||null;
    if(!target)target=data.mainVisible?mainUI:secondaryControllers[0]||null;
    for(const chat of controllers){
      if(chat===target && liveCanvasSelection.workspaceId)
        chat.setCanvasSelection(liveCanvasSelection.workspaceId,liveCanvasSelection.nodes);
      else chat.clearCanvasSelection();
    }
  }
  window.AIVerseCanvasSelectionChanged=({workspaceId,nodes})=>{
    if(typeof workspaceId!=="string")return;
    liveCanvasSelection={workspaceId,nodes:Array.isArray(nodes)?nodes:[]};
    dispatchCanvasSelection();
  };
  window.AIVerseCanvasScopeChanged=workspaceId=>{
    liveCanvasSelection={workspaceId,nodes:[]};
    dispatchCanvasSelection();
  };
  window.AIVerseCanvasRetarget=dispatchCanvasSelection;
  /* Existing canvas stays the default application panel, new surfaces are selected on demand. */
  const board = $(".board-section");
  const headerActions = $(".board-header-actions");
  const appToggle = button("app-picker-toggle", "Choose workspace app", toggleApps, "layers", "Canvas");
  appToggle.setAttribute("aria-expanded","false");
  const appMenu = make("div","app-picker-menu");
  appMenu.hidden = true;
  const appPicker = make("div","app-picker-container");
  appPicker.append(appToggle,appMenu);
  headerActions.insertBefore(appPicker,headerActions.firstChild);
  const viewport = $("#viewport");
  const appSurface = make("div","personal-app-surface");
  appSurface.hidden = true;
  board.append(appSurface);
  const available = [{id:"canvas",label:"Canvas",summary:"Your spatial workspace"},
    {id:"notes",label:"Notes",summary:"Words and ideas in one place"},
    {id:"assets",label:"References",summary:"Images and visual ideas"},
    {id:"activity",label:"Activity",summary:"Preview of future run controls"}];
  function toggleApps() { appMenu.hidden=!appMenu.hidden;appToggle.setAttribute("aria-expanded",String(!appMenu.hidden));if(!appMenu.hidden)renderAppMenu(); }
  function renderAppMenu() {
    appMenu.replaceChildren();
    for(const app of available) {
      const b=button("app-menu-choice"+(data.app===app.id?" selected":""),"Open "+app.label,()=>{
        data.app=app.id;save();appMenu.hidden=true;appToggle.setAttribute("aria-expanded","false");renderAppSurface();
      });
      b.append(make("strong","",app.label),make("small","",app.summary));
      b.setAttribute("aria-current",String(data.app===app.id));
      appMenu.append(b);
    }
  }
  function currentWorkspace() {
    try {
      const raw=JSON.parse(localStorage.getItem("aiverse-design-preview-v1"));
      if (raw && Array.isArray(raw.workspaces)) return raw.workspaces.find(w=>w.id===raw.selected);
    } catch {}
    return { name: $("#board-title")?.textContent || "Personal canvas", nodes: Array.from(document.querySelectorAll("#nodes .canvas-node")).map(el => ({
      id: el.dataset.node,
      type: el.classList.contains("note") ? "note" : el.classList.contains("link") ? "link" : el.classList.contains("art") ? "art" : "image",
      title: el.querySelector("h3")?.textContent || "Untitled",
      body: el.querySelector(".node-content p, .node-content a, .art-caption small")?.textContent || ""
    })) };
  }
  function openNode(nodeId) {
    data.app="canvas";save();renderAppSurface();
    const el=Array.from(document.querySelectorAll("#nodes [data-node]")).find(x=>x.dataset.node===nodeId);
    el?.click();el?.focus();
  }
  function renderAppSurface() {
    appToggle.lastElementChild.textContent=available.find(x=>x.id===data.app)?.label||"Canvas";
    const isCanvas=data.app==="canvas";
    viewport.hidden=!isCanvas;
    appSurface.hidden=isCanvas;
    if (isCanvas) { window.dispatchEvent(new Event("resize")); return; }
    appSurface.replaceChildren();
    const w=currentWorkspace();
    const head=make("div","app-surface-heading");
    const h=make("div");
    h.append(make("span","app-surface-kicker","PERSONAL APPS"),make("h2","",available.find(x=>x.id===data.app).label));
    head.append(h,make("span","app-surface-subtitle", w ? w.name : "Local design preview"));
    appSurface.append(head);
    if (data.app==="activity") {
      const empty=make("div","app-empty-card");
      empty.append(make("div","app-empty-icon","✳"),make("h3","","Nothing running here yet."),make("p","","Future agent progress, approvals and recent actions will appear here when the real Gateway is connected. No activity is simulated as real."));
      appSurface.append(empty);return;
    }
    const nodes=(w?.nodes||[]).filter(n=>data.app==="notes"?n.type==="note":n.type==="image"||n.type==="art"||n.type==="link");
    const list=make("div","app-items-grid");
    if (!nodes.length) {
      const empty=make("div","app-empty-card");
      empty.append(make("h3","","Nothing here yet."),make("p","","Add content to the canvas to see it here."));
      list.append(empty);
    }
    for(const n of nodes) {
      const item=button("app-content-card","Open "+n.title+" on canvas",()=>openNode(n.id));
      item.append(make("small","",data.app==="notes"?"NOTE":n.type==="link"?"LINK":"REFERENCE"));
      item.append(make("strong","",n.title));
      item.append(make("p","",(n.body||"Open in canvas").slice(0,175)));
      list.append(item);
    }
    appSurface.append(list);
    appSurface.append(make("p","app-surface-disclaimer","These are browser-local preview items, not canonical OS files."));
  }
  document.addEventListener("pointerdown",event=>{if(!appMenu.hidden&&!appPicker.contains(event.target)){appMenu.hidden=true;appToggle.setAttribute("aria-expanded","false");}});
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape") {showTeams(false);appMenu.hidden=true;appToggle.setAttribute("aria-expanded","false");}
  });
  // Re-render the optional note/reference list when the current canvas is edited or workspace changes.
  const nodes=$("#nodes");
  new MutationObserver(()=>{if(data.app!=="canvas")renderAppSurface();}).observe(nodes,{childList:true});
  renderPanes();renderAppSurface();window.AIVerseCanvasRetarget?.();
})();
