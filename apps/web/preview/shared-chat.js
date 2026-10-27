/* Shared chat controls for every preview pane. Presentation-only. No provider, file upload or OS call. */
(() => {
  "use strict";
  function make(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function control(label, className, onClick) {
    const element = make("button", className, label);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
  }
  function recipientByKey(teams, key) {
    if (typeof key !== "string") return null;
    const [type,teamId,agentId] = key.split(":");
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;
    if (type === "team" && !agentId) return {key,type,label:team.name,display:team.name+" (team)",teamId};
    if (type === "agent" && agentId) {
      const agent = team.members.find(m => m.id === agentId);
      if (agent) return {key,type,label:agent.name,display:team.name+" / "+agent.name,teamId};
    }
    return null;
  }
  function mount({form,input,teams,canvasItems,initialRecipients=[],initialModel="Auto",onSubmit,onChange=()=>{},notify}) {
    if (!form || !input) throw Error("Chat form and textarea are required");
    const getTeams=()=>teams();
    const state={recipients:[],files:[],canvas:[],model:initialModel,stage:null,mention:null};
    function addKey(key) {
      const recipient=recipientByKey(getTeams(),key);
      if (!recipient) return notify("That team or assistant is unavailable.");
      if (state.recipients.includes(key)) return notify("Already tagged in this chat.");
      if (state.recipients.length >= 12) return notify("This preview allows up to 12 recipients.");
      state.recipients.push(key);
      renderChips();
    }
    for (const key of initialRecipients) if (recipientByKey(getTeams(),key) && !state.recipients.includes(key)) state.recipients.push(key);
    const chips=make("div","shared-chat-chips");
    chips.hidden=true;
    form.insertBefore(chips,input);
    const footer=form.querySelector(".composer-bottom") || (()=>{const d=make("div","composer-bottom");form.append(d);return d;})();
    const send=footer.querySelector(".send-button, .secondary-send");
    const toolbar=make("div","shared-chat-tools");
    const picker=make("div","shared-chat-picker");
    picker.hidden=true;
    picker.setAttribute("role","group");
    picker.setAttribute("aria-label","Choose recipients or canvas references");
    const at=control("@","shared-tool shared-tool-at",()=>toggleMenu(picker.hidden));
    at.title="Tag teams or assistants";
    at.setAttribute("aria-label","Tag a team or assistant");
    at.setAttribute("aria-expanded","false");
    const file=control("＋","shared-tool",()=>fileInput.click());
    file.title="Attach local files (preview)";
    file.setAttribute("aria-label","Attach files");
    const fileInput=make("input");
    fileInput.type="file";fileInput.multiple=true;fileInput.hidden=true;
    const board=control("▧","shared-tool",()=>toggleCanvas());
    board.title="Reference an item on your canvas";
    board.setAttribute("aria-label","Attach canvas item");
    const model=make("select","shared-model-choice");
    model.title="Model preference · preview only, no real model connected";
    model.setAttribute("aria-label","Model preference (design preview)");
    for (const name of ["Auto","GPT (demo)","Claude (demo)","Gemini (demo)","Local (demo)"]) {
      const option=make("option","",name);
      option.value=name;model.append(option);
    }
    if (["Auto","GPT (demo)","Claude (demo)","Gemini (demo)","Local (demo)"].includes(state.model)) model.value=state.model;
    model.addEventListener("change",()=>{state.model=model.value;onChange(metadata());});
    toolbar.append(at,file,board,model);
    if (send) footer.insertBefore(toolbar,send);else footer.append(toolbar);
    form.append(fileInput,picker);
    const note=make("p","chat-preview-note","Model, files and canvas references are preview controls. Nothing is sent to an AI.");
    note.hidden=true;
    form.append(note);

    function labelFor(key) {
      return recipientByKey(getTeams(),key);
    }
    function renderChips(){
      chips.replaceChildren();
      state.recipients=state.recipients.filter(k=>!!labelFor(k));
      for (const key of state.recipients) {
        const recipient=labelFor(key);
        const chip=make("span","shared-chat-chip");
        chip.append(make("span","chip-at","@"),make("span","chip-name",recipient.display));
        const remove=control("×","chip-remove",()=>{
          state.recipients=state.recipients.filter(v=>v!==key);
          renderChips();
        });
        remove.title="Remove "+recipient.display;
        remove.setAttribute("aria-label","Remove "+recipient.display);
        chip.append(remove);chips.append(chip);
      }
      for (const attachment of state.files) {
        const chip=make("span","shared-chat-chip shared-context-chip");
        chip.append(make("span","chip-at","＋"),make("span","chip-name",attachment.name));
        chip.append(control("×","chip-remove",()=>{state.files=state.files.filter(f=>f.id!==attachment.id);renderChips();}));
        chips.append(chip);
      }
      for (const ref of state.canvas) {
        const chip=make("span","shared-chat-chip shared-context-chip");
        chip.append(make("span","chip-at","▧"),make("span","chip-name",ref.title));
        chip.append(control("×","chip-remove",()=>{state.canvas=state.canvas.filter(f=>f.id!==ref.id);renderChips();}));
        chips.append(chip);
      }
      chips.hidden=!chips.childElementCount;
      note.hidden=true;
      onChange(metadata());
    }
    function closeMenu() {
      picker.hidden=true;at.setAttribute("aria-expanded","false");state.stage=null;
    }
    function toggleMenu(on) {
      if(!on){closeMenu();return;}
      state.stage=null;
      drawMenu();
    }
    function choose(key) {
      addKey(key);
      if (state.mention) {
        const v=input.value;
        input.value=v.slice(0,state.mention.start)+v.slice(state.mention.end);
        state.mention=null;
      }
      closeMenu();input.focus();
    }
    function drawMenu(search="") {
      picker.replaceChildren();
      picker.hidden=false;at.setAttribute("aria-expanded","true");
      const t=getTeams().find(x=>x.id===state.stage);
      if(!t){
        state.stage=null;
        picker.append(make("div","shared-menu-heading","Choose a team"));
        const names=getTeams().filter(t=>t.name.toLowerCase().includes(search.toLowerCase()));
        if(!names.length)picker.append(make("p","shared-menu-empty","No matching teams."));
        for(const team of names){
          const row=control("","shared-menu-row",()=>{state.stage=team.id;drawMenu();});
          const labels=make("span","shared-menu-labels");
          labels.append(make("strong","",team.name),make("small","",team.members.length+" assistants"));
          row.append(make("span","shared-row-symbol","◎"),labels,make("span","shared-row-arrow","›"));
          picker.append(row);
        }
      }else{
        const heading=make("div","shared-menu-team-heading");
        heading.append(control("‹ Teams","shared-menu-back",()=>{state.stage=null;drawMenu();}),make("strong","",t.name));
        picker.append(heading);
        const all=control("","shared-menu-row",()=>choose("team:"+t.id));
        const label=make("span","shared-menu-labels");
        label.append(make("strong","","Entire team"),make("small","","Tag everyone in "+t.name));
        all.append(make("span","shared-row-symbol","◎"),label);
        picker.append(all);
        if(t.members.length)picker.append(make("p","shared-menu-section","Individual assistants"));
        for(const member of t.members) {
          const row=control("","shared-menu-row",()=>choose("agent:"+t.id+":"+member.id));
          const info=make("span","shared-menu-labels");
          info.append(make("strong","",member.name),make("small","",member.role));
          row.append(make("span","shared-row-symbol","@"),info);
          picker.append(row);
        }
      }
      picker.append(make("p","shared-menu-note","Preview only · Team messages are not dispatched"));
    }
    function toggleCanvas() {
      picker.replaceChildren();
      picker.hidden=false;at.setAttribute("aria-expanded","false");
      picker.append(make("div","shared-menu-heading","Attach from canvas"));
      const entries=canvasItems().slice(0,80);
      if(!entries.length)picker.append(make("p","shared-menu-empty","No canvas items in this workspace."));
      for (const item of entries) {
        const row=control("","shared-menu-row",()=>{
          if (!state.canvas.some(x=>x.id===item.id))state.canvas.push({id:item.id,title:item.title});
          renderChips();closeMenu();input.focus();
        });
        const info=make("span","shared-menu-labels");
        info.append(make("strong","",item.title),make("small","",item.type||"Canvas item"));
        row.append(make("span","shared-row-symbol","▧"),info);
        picker.append(row);
      }
      picker.append(make("p","shared-menu-note","References only · No files are copied"));
    }
    fileInput.addEventListener("change",()=>{
      const files=Array.from(fileInput.files||[]);
      for (const f of files.slice(0,10)) {
        if(state.files.length>=10)break;
        state.files.push({id:crypto.randomUUID(),name:f.name.slice(0,90),size:f.size,type:f.type});
      }
      fileInput.value="";
      renderChips();
      if(files.length)notify("Files are shown as preview labels only. They are not uploaded.");
    });
    input.addEventListener("input",()=>{
      if(picker.hidden && !input.value.includes("@"))return;
      const pos=input.selectionStart;
      const match=/(?:^|\s)@([^\s@]*)$/.exec(input.value.slice(0,pos));
      if(!match){state.mention=null;if(!picker.hidden)closeMenu();return;}
      state.mention={start:pos-match[0].length+(match[0][0]==="@"?0:1),end:pos};
      state.stage=null;drawMenu(match[1]);
    });
    input.addEventListener("keydown",event=>{
      if(picker.hidden)return;
      if(event.key==="Enter"&&!event.shiftKey){
        event.preventDefault();event.stopImmediatePropagation();
        picker.querySelector(".shared-menu-row")?.click();
      }else if(event.key==="Escape"){event.preventDefault();closeMenu();}
    },true);
    const outside=event=>{if(!picker.hidden&&!picker.contains(event.target)&&!at.contains(event.target)&&!board.contains(event.target)&&event.target!==input)closeMenu();};
    document.addEventListener("pointerdown",outside);
    function metadata() {
      return {
        recipients:state.recipients.map(labelFor).filter(Boolean).map(({key,display,type})=>({key,label:display,type})),
        files:state.files.map(({name,size,type})=>({name,size,type})),
        canvas:state.canvas.map(({id,title})=>({id,title})),
        model:state.model
      };
    }
    form.addEventListener("submit",event=>{
      const message=input.value.trim();
      if(!message)return;
      const meta=metadata();
      if(!state.recipients.length && /(^|\s)@[^\s@]+/.test(message)) {
        event.preventDefault();event.stopImmediatePropagation();
        notify("Choose a team or assistant from the @ menu.");return;
      }
      const consumed=onSubmit({message,meta,event});
      if(consumed){
        event.preventDefault();event.stopImmediatePropagation();
        input.value="";state.files=[];state.canvas=[];renderChips();closeMenu();
      }
    },true);
    renderChips();
    return {
      addRecipient:addKey,
      recipients:()=>state.recipients.map(labelFor).filter(Boolean),
      meta:metadata,
      clearRecipients:()=>{state.recipients=[];renderChips();},
      destroy:()=>document.removeEventListener("pointerdown",outside)
    };
  }
  window.AIVerseChatUI={mount,recipientByKey};
})();
