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
  const id = () => crypto.randomUUID();
  // Recipient identity is a stable team/member ID, not a pane number or display name.
  const findRecipient = key => {
    if (typeof key !== "string") return null;
    const [type, teamId, memberId] = key.split(":");
    const team = data.teams.find(t => t.id === teamId);
    if (!team) return null;
    if (type === "team" && !memberId) return {key,label:team.name,detail:"Entire team · Preview only",type,teamId};
    if (type === "agent" && memberId) {
      const agent = team.members.find(m => m.id === memberId);
      if (agent) return {key,label:agent.name,detail:team.name + " · " + agent.role + " · Preview only",type,teamId};
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
    showTeams(false);save();renderPanes();
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
        if (draftTarget && !findRecipient(draftTarget)) { draftTarget=null; renderDraftTarget(); }
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
  const main = $("#workspace");
  const secondaryHost = make("div", "secondary-chat-host");
  shell.insertBefore(secondaryHost, main);
  const mainChatHeading = $(".chat-heading");
  const split = button("quiet-icon split-chat-action", "Open an additional chat", () => {
    if (data.panes >= 2) return notify("Three chat panes are already open.");
    data.panes++;save();renderPanes();
  }, "split");
  const chatHeadingActions = make("div", "chat-heading-actions");
  mainChatHeading.append(chatHeadingActions);
  chatHeadingActions.append(split, $("#new-chat"));
  function renderPanes() {
    secondaryHost.replaceChildren();
    document.body.classList.toggle("with-parallel-chats", data.panes > 0);
    document.body.classList.toggle("with-three-chats", data.panes === 2);
    split.disabled = data.panes >= 2;
    for (let i=1;i<=data.panes;i++) {
      const pane = make("section", "secondary-chat-pane");
      pane.setAttribute("aria-label", "Demo chat " + (i+1));
      const head = make("div", "secondary-chat-heading");
      const targetKey = data.chatTargets[String(i)] || null;
      const recipient = findRecipient(targetKey);
      if (targetKey && !recipient) delete data.chatTargets[String(i)];
      const text = make("div");
      text.append(make("strong", "", recipient ? recipient.label : "Chat " + (i+1)),
        make("small", "", recipient ? recipient.detail : "Independent demo conversation"));
      head.append(text, button("quiet-icon", "Close chat " + (i+1), () => {
        if (i < data.panes) {
          data.chats[String(i)] = data.chats[String(data.panes)] || [];
          data.chatTargets[String(i)] = data.chatTargets[String(data.panes)];
        }
        delete data.chats[String(data.panes)];
        delete data.chatTargets[String(data.panes)];
        data.panes--;save();renderPanes();
      }, "close"));
      pane.append(head);
      const log = make("div", "secondary-chat-log");
      log.setAttribute("role", "log");
      const source = recipient ? data.threads[recipient.key] : data.chats[String(i)];
      const messages = Array.isArray(source) ? source : [];
      if (!messages.length) {
        const welcome=make("div","secondary-chat-welcome");
        welcome.append(make("span","","✳"),make("h3","",recipient ? "Chat with " + recipient.label : "A fresh conversation."),
          make("p","",recipient ? "A separate preview thread for this " + (recipient.type === "team" ? "team" : "assistant") + ". No real messages are being sent." : "Another place to think, without closing your work."));
        log.append(welcome);
      }
      for (const m of messages) {
        const bubble=make("div","secondary-message "+m.role);
        if (m.role==="assistant") bubble.append(make("small","","AI-Verse · Demo"));
        bubble.append(make("p","",m.text));
        log.append(bubble);
      }
      pane.append(log);
      const form=make("form","secondary-composer");
      const input=make("textarea");
      input.rows=2;
      input.maxLength=1200;
      input.placeholder=recipient ? "Message " + recipient.label + "…" : "Message AI-Verse...";
      input.setAttribute("aria-label","Message in chat "+(i+1));
      const foot=make("div");
      foot.append(make("small","","Sample responses"),button("secondary-send","Send message in chat "+(i+1),()=>form.requestSubmit(),null,"↑"));
      form.append(input,foot);
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const message=input.value.trim();
        if (!message) return;
        const store = recipient ? data.threads : data.chats;
        const storeKey = recipient ? recipient.key : String(i);
        if (recipient && !findRecipient(recipient.key)) return notify("This recipient no longer exists. Choose another.");
        if (!Array.isArray(store[storeKey])) store[storeKey]=[];
        const messages=store[storeKey];
        if (messages.length>=80) return notify("This demo conversation is full.");
        messages.push({role:"user",text:message});
        messages.push({role:"assistant",text:recipient ?
          "Preview only: addressed to " + recipient.label + ". Live team and agent routing are not connected yet." :
          "This is a separate design-preview conversation. Real AI, agents and OS tools are not connected yet."});
        save();renderPanes();
      });
      input.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();form.requestSubmit();}});
      pane.append(form);
      secondaryHost.append(pane);
      log.scrollTop=log.scrollHeight;
    }
  }


  /* A compact @ picker on the original composer. No routing to real OS agents. */
  let draftTarget = null;
  const composer = $("#chat-form");
  const composeInput = $("#message");
  const composeBar = $(".composer-bottom");
  const mentionTrigger = button("mention-trigger", "Mention a team or assistant", () => showMentionPicker(mentionMenu.hidden), null, "@");
  mentionTrigger.setAttribute("aria-controls","mention-recipient-menu");
  mentionTrigger.setAttribute("aria-expanded","false");
  composeBar.insertBefore(mentionTrigger,$(".send-button"));
  const chip=make("div","draft-recipient-chip");
  chip.hidden=true;
  composer.insertBefore(chip,composeInput);
  const mentionMenu=make("div","mention-recipient-menu");
  mentionMenu.id="mention-recipient-menu";
  mentionMenu.hidden=true;
  mentionMenu.setAttribute("role","group");
  mentionMenu.setAttribute("aria-label","Choose a team or assistant");
  composer.append(mentionMenu);
  let mentionToken=null;
  function renderDraftTarget() {
    chip.replaceChildren();
    const target=findRecipient(draftTarget);
    if (!target) {draftTarget=null;chip.hidden=true;return;}
    chip.hidden=false;
    chip.append(make("span","recipient-symbol","@"),
      make("span","", (target.type==="team" ? "Team: " : "Agent: ") + target.label));
    chip.append(button("recipient-clear","Remove tagged recipient",()=>{
      draftTarget=null;renderDraftTarget();
    },"close"));
  }
  function showMentionPicker(on,filter="") {
    mentionMenu.hidden=!on;
    mentionTrigger.setAttribute("aria-expanded",String(on));
    if (!on) return;
    mentionMenu.replaceChildren();
    mentionMenu.append(make("div","mention-menu-title","Send to a team or assistant"));
    const query=filter.toLocaleLowerCase();
    const recipients=[];
    for(const t of data.teams) {
      recipients.push({key:"team:"+t.id,label:t.name,type:"team",detail:"Entire team"});
      for(const a of t.members)
        recipients.push({key:"agent:"+t.id+":"+a.id,label:a.name,type:"agent",detail:t.name+" · "+a.role});
    }
    const filtered=recipients.filter(r=>!query||r.label.toLocaleLowerCase().includes(query)||r.detail.toLocaleLowerCase().includes(query));
    const list=make("div","mention-options");
    if (!filtered.length) list.append(make("p","mention-empty","No matching teams or assistants."));
    for(const entry of filtered.slice(0,45)) {
      const choice=button("mention-option","Tag "+entry.label,()=>{
        if (!findRecipient(entry.key)) return notify("Recipient no longer available.");
        draftTarget=entry.key;
        if (mentionToken) {
          const previous=composeInput.value;
          composeInput.value=previous.slice(0,mentionToken.start)+previous.slice(mentionToken.end);
          mentionToken=null;
        }
        renderDraftTarget();showMentionPicker(false);composeInput.focus();
      });
      choice.append(make("span","mention-icon",entry.type==="team"?"◎":"@"));
      const labels=make("span","mention-option-labels");
      labels.append(make("strong","",entry.label),make("small","",entry.detail));
      choice.append(labels);
      list.append(choice);
    }
    mentionMenu.append(list);
    mentionMenu.append(make("p","mention-disclaimer","Design preview only. No real agent messages are sent."));
  }
  // Enter picks the highlighted suggestion instead of accidentally sending a raw @word.
  composeInput.addEventListener("keydown",event=>{
    if(mentionMenu.hidden) return;
    if(event.key==="Enter"&&!event.shiftKey) {
      event.preventDefault();event.stopImmediatePropagation();
      mentionMenu.querySelector(".mention-option")?.click();
    }
  },true);
  composeInput.addEventListener("input",()=>{
    const cursor=composeInput.selectionStart;
    const before=composeInput.value.slice(0,cursor);
    const match=/(?:^|\s)@([^\s@]*)$/.exec(before);
    if (!match) {mentionToken=null;showMentionPicker(false);return;}
    mentionToken={start:cursor-match[0].length+(match[0].startsWith("@")?0:1),end:cursor};
    showMentionPicker(true,match[1]);
  });
  document.addEventListener("pointerdown",event=>{
    if(!mentionMenu.hidden&&!mentionMenu.contains(event.target)&&!mentionTrigger.contains(event.target)&&event.target!==composeInput)
      showMentionPicker(false);
  });
  // Capture before app.js demo submit handler. The selected recipient is explicit in
  // the visible message and saved only in demo thread history, never sent to an AI.
  composer.addEventListener("submit",event=>{
    const target=findRecipient(draftTarget);
    if(draftTarget&&!target) {
      event.preventDefault();event.stopImmediatePropagation();
      draftTarget=null;renderDraftTarget();return notify("Recipient unavailable. Select again.");
    }
    const message=composeInput.value.trim();
    if(!message) return;
    if(!target && /(^|\s)@[^\s@]+/.test(message)) {
      event.preventDefault();event.stopImmediatePropagation();
      return notify("Choose a recipient from the @ menu before sending.");
    }
    if(!target) return;
    const thread=Array.isArray(data.threads[target.key])?data.threads[target.key]:[];
    if(thread.length>=80) {
      event.preventDefault();event.stopImmediatePropagation();return notify("This preview thread is full.");
    }
    thread.push({role:"user",text:message});
    thread.push({role:"assistant",text:"Preview only: addressed to "+target.label+". Live agent routing is not connected yet."});
    data.threads[target.key]=thread;
    save();
    renderPanes();
    composeInput.value="[Demo to "+(target.type==="team"?"team":"agent")+" @"+target.label+"]\n"+message;
  },true);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){mentionToken=null;showMentionPicker(false);}
  });

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
  renderPanes();renderAppSurface();
})();
