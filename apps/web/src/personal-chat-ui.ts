import {DashboardClient,DashboardChatEventFeed,PersonalChatRunController,
  type ChatRunView,type ClientScope} from "../../../packages/client/src/index.js";
import {CanvasWorkspace} from "./canvas-workspace.js";
import {PersonalDiagnostics} from "./personal-diagnostics.js";
import {PersonalAgentActivity} from "./personal-agent-activity.js";
import {PersonalModelStatus} from "./personal-model-status.js";

/**
 * Real Personal Chat UI for a trusted local/desktop Dashboard session.
 * Unlike apps/web/preview, no sample replies or localStorage conversations.
 * The native host must supply the already-authorized, in-memory local session;
 * GitHub Pages does not initialize this module.
 */
export interface TrustedLocalChatSession {
  dashboardOrigin: string;
  dashboardBearer?: string;
  authentication?: "host-cookie";
  selected: Required<ClientScope>;
}
type Role = "user"|"assistant"|"status";
interface Turn { role:Role; text:string }
interface Pane {
  id:string;
  node:HTMLElement;
  form:HTMLFormElement;
  input:HTMLTextAreaElement;
  log:HTMLElement;
  status:HTMLElement;
  run:PersonalChatRunController;
  turns:Turn[];
  activeTurn:number;
  busy:boolean;
  generation:number;
  historyHasOlder?:boolean;
  historyLoading?:boolean;
  historyError?:string;
  historyNotice?:string;
  min?:boolean;
}
const MAX_PANES=3;
const TERMINAL=new Set(["completed","failed","blocked","canceled","recovery-required","paused"]);
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string):HTMLElementTagNameMap[K]{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
}
function button(label:string,action:()=>void,cls=""):HTMLButtonElement{
  const node=el("button",cls,label);node.type="button";node.setAttribute("aria-label",label);
  node.addEventListener("click",action);return node;
}
function id():string{
  if(!globalThis.crypto?.randomUUID)throw Error("Trusted chat requires secure random UUID");
  return globalThis.crypto.randomUUID();
}
function errorCode(error:unknown):string{
  const code=(error as {code?:unknown})?.code;
  return typeof code==="string"&&/^[A-Z][A-Z0-9_]{1,63}$/.test(code) ? code:"CHAT_UNAVAILABLE";
}
function scopeOf(s:TrustedLocalChatSession):Required<ClientScope>{
  if(!s.selected?.systemId || !s.selected?.workspaceId)throw Error("Explicit OS scope required");
  return {...s.selected};
}
export class PersonalChatApplication {
  private readonly panes=new Map<string,Pane>();
  private counter=0;
  private selected:Required<ClientScope>;
  private readonly feed:DashboardChatEventFeed;
  private readonly panesHost:HTMLElement;
  private readonly title:HTMLElement;
  private readonly createButton:HTMLButtonElement;
  private readonly historyPanel:HTMLElement;
  private readonly historyClient:DashboardClient;
  private readonly canvas:CanvasWorkspace;
  private readonly diagnostics:PersonalDiagnostics;
  private readonly activity:PersonalAgentActivity;
  private readonly models:PersonalModelStatus;
  private runControlEpoch=0;
  private runCancelSupported=false;
  private historyEpoch=0;
  private historyNextOffset:number|null=null;
  private historyLoading=false;
  private readonly historySeen=new Set<string>();
  private readonly parent:HTMLElement;
  private destroyed=false;
  constructor(container:HTMLElement,private readonly session:TrustedLocalChatSession){
    this.selected=scopeOf(session);
    const feed=new DashboardChatEventFeed(session.dashboardOrigin,
      session.authentication==="host-cookie" ? {mode:"host-cookie"} : this.requireBearer(session));
    this.feed=feed;
    this.historyClient=new DashboardClient(session.dashboardOrigin,this.selected,
      session.authentication==="host-cookie" ? {mode:"host-cookie"} : this.requireBearer(session));
    this.parent=container;
    container.replaceChildren();
    container.classList.add("aiverse-live-chat");
    const bar=el("header","live-chat-toolbar");
    const title=el("div","live-chat-heading","Personal · AI-Verse");
    this.title=title;
    const create=button("Split chat",()=>{this.openPane();},"live-chat-split");
    this.createButton=create;
    const previous=button("Previous chats",()=>{void this.toggleHistory();},"live-chat-history-toggle");
    const diagnosticsToggle=button("Workspace status",()=>{
      this.diagnostics.toggle();
    },"live-chat-diagnostics-toggle");
    const activityToggle=button("Agent activity",()=>{
      this.activity.toggle();
    },"live-chat-activity-toggle");
    const modelToggle=button("AI models",()=>{
      this.models.toggle();
    },"live-chat-model-toggle");
    bar.append(title,previous,diagnosticsToggle,activityToggle,modelToggle,create);
    const diagnosticsHost=el("section","live-chat-diagnostics-host");
    const activityHost=el("section","live-chat-activity-host");
    const modelHost=el("section","live-chat-model-host");
    this.historyPanel=el("section","live-chat-history");
    this.historyPanel.hidden=true;
    this.historyPanel.setAttribute("aria-label","Previous canonical conversations");
    this.panesHost=el("div","live-chat-panes");
    const body=el("div","live-chat-workspace");
    const canvasHost=el("aside","live-chat-canvas-host");
    canvasHost.setAttribute("aria-label","Personal Canvas and document library");
    body.append(this.panesHost,canvasHost);
    container.append(bar,diagnosticsHost,activityHost,modelHost,this.historyPanel,body);
    this.diagnostics=new PersonalDiagnostics(diagnosticsHost,
      new DashboardClient(session.dashboardOrigin,this.selected,
        session.authentication==="host-cookie"
          ?{mode:"host-cookie"}:this.requireBearer(session)));
    this.activity=new PersonalAgentActivity(activityHost,
      new DashboardClient(session.dashboardOrigin,this.selected,
        session.authentication==="host-cookie"
          ?{mode:"host-cookie"}:this.requireBearer(session)));
    this.models=new PersonalModelStatus(modelHost,
      new DashboardClient(session.dashboardOrigin,this.selected,
        session.authentication==="host-cookie"
          ?{mode:"host-cookie"}:this.requireBearer(session)));
    this.canvas=new CanvasWorkspace(canvasHost,
      new DashboardClient(session.dashboardOrigin,this.selected,
        session.authentication==="host-cookie" ? {mode:"host-cookie"} : this.requireBearer(session)));
    this.openPane();
    void this.refreshRunControls();
  }
  get paneIds():string[]{return [...this.panes.keys()];}
  /** Host-owned selection, not parsed from model text or preview workspace IDs. */
  retarget(next:Required<ClientScope>):void{
    if(this.destroyed)throw Error("Chat application closed");
    if(!next.systemId || !next.workspaceId)throw Error("Explicit OS scope required");
    this.selected={...next};
    this.historyClient.retarget(this.selected);
    this.runControlEpoch++;
    this.runCancelSupported=false;
    void this.refreshRunControls();
    this.canvas.retarget(this.selected);
    this.diagnostics.retarget(this.selected);
    this.activity.retarget(this.selected);
    this.models.retarget(this.selected);
    this.historyEpoch++;
    this.historyNextOffset=null;this.historyLoading=false;this.historySeen.clear();
    this.historyPanel.hidden=true;this.historyPanel.replaceChildren();
    this.title.textContent="AI-Verse · "+next.workspaceId;
    for(const pane of this.panes.values()){
      pane.generation++;
      pane.turns=[];pane.activeTurn=-1;
      pane.historyHasOlder=false;pane.historyLoading=false;pane.historyError=undefined;pane.historyNotice=undefined;
      pane.run.retarget(this.selected);
      const scopeLabel=pane.node.querySelector(".live-chat-scope");
      if(scopeLabel)scopeLabel.textContent="Workspace: "+next.workspaceId;
      pane.input.value="";
      pane.busy=false;
      this.render(pane);
      pane.status.textContent="New workspace selected. Previous runs remain in Gateway.";
    }
  }
  /** Only authenticated host status can unlock Stop in this workspace. */
  private async refreshRunControls():Promise<void>{
    const epoch=++this.runControlEpoch,scope={...this.selected};
    this.runCancelSupported=false;
    for(const pane of this.panes.values())this.render(pane);
    try{
      const response=await this.historyClient.gatewayStatus();
      if(this.destroyed||epoch!==this.runControlEpoch
        ||scope.systemId!==this.selected.systemId
        ||scope.workspaceId!==this.selected.workspaceId)return;
      const value=response.result as Record<string,unknown>;
      this.runCancelSupported=value?.source==="canonical-gateway"
        &&value.workspaceId===scope.workspaceId
        &&value.runCancelSupported===true;
    }catch{
      if(!this.destroyed&&epoch===this.runControlEpoch)this.runCancelSupported=false;
    }
    finally{
      if(!this.destroyed&&epoch===this.runControlEpoch)
        for(const pane of this.panes.values())this.render(pane);
    }
  }
  private async toggleHistory():Promise<void>{
    if(this.destroyed)return;
    this.historyEpoch++;
    this.historyLoading=false;
    this.historyNextOffset=null;
    this.historySeen.clear();
    if(!this.historyPanel.hidden){
      this.historyPanel.hidden=true;
      this.historyPanel.replaceChildren();
      return;
    }
    this.historyPanel.hidden=false;
    this.historyNextOffset=0;
    this.historyPanel.replaceChildren(el("p","live-chat-history-status","Loading from canonical Gateway…"));
    await this.loadHistoryPage(0);
  }
  /** Read each bounded page from Gateway, never from browser-local chat storage. */
  private async loadHistoryPage(offset:number):Promise<void>{
    if(this.destroyed||this.historyPanel.hidden||this.historyLoading
      ||this.historyNextOffset!==offset)return;
    const epoch=this.historyEpoch,scope={...this.selected};
    const previousButton=this.historyPanel.querySelector(".live-chat-history-more") as HTMLButtonElement|null;
    this.historyLoading=true;
    if(previousButton){previousButton.disabled=true;previousButton.textContent="Loading older chats…";}
    try{
      const response=await this.historyClient.listGatewaySessions(20,offset);
      if(this.destroyed||this.historyPanel.hidden||epoch!==this.historyEpoch
        ||scope.systemId!==this.selected.systemId
        ||scope.workspaceId!==this.selected.workspaceId)return;
      const page=response.result as Record<string,unknown>;
      if(!page||page.source!=="canonical-gateway"
        ||page.workspaceId!==scope.workspaceId||!Array.isArray(page.data)
        ||page.data.length>20||typeof page.has_more!=="boolean"
        ||(page.has_more
          ?typeof page.next_offset!=="number"||!Number.isSafeInteger(page.next_offset)
            ||page.next_offset<=offset||page.next_offset>10_000
          :page.next_offset!==null))throw Error("CHAT_HISTORY_INVALID");
      const rows=document.createDocumentFragment();
      if(offset===0)rows.append(el("strong","live-chat-history-title","Previous chats"));
      if(page.data.length===0 && offset===0)
        rows.append(el("p","live-chat-history-status","No canonical chats yet."));
      const incoming=new Set<string>();
      for(const value of page.data){
        if(!value||typeof value!=="object"||Array.isArray(value))
          throw Error("CHAT_HISTORY_INVALID");
        const record=value as Record<string,unknown>;
        if(typeof record.session_id!=="string"
          ||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(record.session_id)
          ||record.workspace_id!==scope.workspaceId
          ||this.historySeen.has(record.session_id)||incoming.has(record.session_id))
          throw Error("CHAT_HISTORY_INVALID");
        incoming.add(record.session_id);
        const item=el("div","live-chat-history-item");
        const label=el("span","",typeof record.title==="string"
          ?record.title.slice(0,120):record.session_id);
        const open=button("Open conversation",()=>{
          void this.openFromHistory(record.session_id as string);
        });
        item.append(label,open);rows.append(item);
      }
      if(offset===0)this.historyPanel.replaceChildren();
      else{
        previousButton?.remove();
        this.historyPanel.querySelector(".live-chat-history-page-error")?.remove();
      }
      for(const sessionId of incoming)this.historySeen.add(sessionId);
      this.historyPanel.append(rows);
      this.historyNextOffset=page.has_more?page.next_offset as number:null;
      if(this.historyNextOffset!==null){
        const next=this.historyNextOffset;
        this.historyPanel.append(button("Load older chats",()=>{
          void this.loadHistoryPage(next);
        },"live-chat-history-more"));
      }
    }catch(error){
      if(this.destroyed||this.historyPanel.hidden||epoch!==this.historyEpoch)return;
      const message="History unavailable · "+errorCode(error);
      if(offset===0)this.historyPanel.replaceChildren(el("p","live-chat-history-status",message));
      else{
        this.historyPanel.querySelector(".live-chat-history-page-error")?.remove();
        const warning=el("p","live-chat-history-status live-chat-history-page-error",message);
        if(previousButton){
          previousButton.disabled=false;previousButton.textContent="Load older chats";
          this.historyPanel.insertBefore(warning,previousButton);
        }else this.historyPanel.append(warning);
      }
    }finally{
      if(epoch===this.historyEpoch)this.historyLoading=false;
    }
  }
  /** History must never silently replace an existing chat, including a
   * currently running generation. Find an empty pane or open a new split.
   */
  private async openFromHistory(sessionId:string):Promise<void>{
    if(this.destroyed)return;
    const idle=[...this.panes.values()].find(p=>!p.busy&&p.turns.length===0
      &&p.run.snapshot().phase==="idle");
    const paneId=idle?.id??(this.panes.size<MAX_PANES?this.openPane():undefined);
    if(idle?.node.classList.contains("live-chat-minimized"))
      idle.node.classList.remove("live-chat-minimized");
    if(!paneId){
      this.historyPanel.querySelector(".live-chat-history-no-room")?.remove();
      this.historyPanel.prepend(el("p","live-chat-history-status live-chat-history-no-room",
        "All three chats are in use. Close a chat or start a new one before opening history."));
      return;
    }
    await this.openHistoricalSession(paneId,sessionId);
  }
  async openHistoricalSession(paneId:string,sessionId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    const generation=++pane.generation;
    pane.run.close();
    pane.run=this.controller(view=>this.onChange(paneId,view));
    pane.turns=[];pane.activeTurn=-1;pane.busy=true;
    pane.historyHasOlder=false;pane.historyLoading=false;pane.historyError=undefined;pane.historyNotice=undefined;
    pane.status.textContent="Opening canonical conversation…";
    this.render(pane);
    const restored=await pane.run.openSession(sessionId);
    if(this.destroyed||this.panes.get(paneId)!==pane||generation!==pane.generation)return;
    pane.turns=restored.turns.map(turn=>({role:turn.role,text:turn.content}));
    pane.historyHasOlder=restored.hasOlder;
    pane.activeTurn=-1;
    pane.busy=false;
    if(restored.view.phase==="interrupted")
      pane.status.textContent="History unavailable · "+(restored.view.errorCode??"CHAT_HISTORY_UNAVAILABLE");
    else pane.status.textContent=restored.view.phase+" · "+sessionId+
      (restored.view.contextLimited?" · Earlier conversation context unavailable or trimmed":"");
    this.historyPanel.hidden=true;
    this.historyEpoch++;
    this.historyNextOffset=null;this.historySeen.clear();this.historyLoading=false;
    this.render(pane);
  }
  /** Load genuinely older canonical messages, never browser-local transcripts. */
  async loadOlderHistory(paneId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.historyLoading||!pane.historyHasOlder)return;
    const generation=pane.generation,scope={...this.selected};
    const clickAnchor=pane.log.scrollTop;
    pane.historyLoading=true;pane.historyError=undefined;pane.historyNotice=undefined;
    this.render(pane);
    pane.log.scrollTop=clickAnchor;
    let scrollAnchor:{height:number;top:number}|undefined;
    try{
      const result=await pane.run.loadOlderSessionRuns();
      if(this.destroyed||this.panes.get(paneId)!==pane||generation!==pane.generation
        ||scope.systemId!==this.selected.systemId||scope.workspaceId!==this.selected.workspaceId)
        return;
      scrollAnchor={height:pane.log.scrollHeight,top:pane.log.scrollTop};
      pane.turns.unshift(...result.turns.map(turn=>({role:turn.role,text:turn.content})));
      pane.historyHasOlder=result.hasOlder;
      pane.historyNotice=result.limitedByView
        ?"Showing the most recent 200 runs. Earlier records may still be available in Gateway.":undefined;
    }catch(error){
      if(this.destroyed||this.panes.get(paneId)!==pane||generation!==pane.generation)return;
      pane.historyError="Older messages unavailable · "+errorCode(error);
    }finally{
      if(!this.destroyed&&this.panes.get(paneId)===pane&&generation===pane.generation){
        pane.historyLoading=false;this.render(pane);
        if(scrollAnchor)pane.log.scrollTop=scrollAnchor.top+
          pane.log.scrollHeight-scrollAnchor.height;
      }
    }
  }
  private requireBearer(s:TrustedLocalChatSession):string{
    if(typeof s.dashboardBearer!=="string")throw Error("Trusted native host session missing");
    return s.dashboardBearer;
  }
  private controller(changed:(v:ChatRunView)=>void):PersonalChatRunController{
    return new PersonalChatRunController(
      new DashboardClient(this.session.dashboardOrigin,this.selected,
        this.session.authentication==="host-cookie"
          ? {mode:"host-cookie"} : this.requireBearer(this.session)),this.feed,changed);
  }
  openPane():string|undefined{
    if(this.destroyed)throw Error("Chat application closed");
    if(this.panes.size>=MAX_PANES)return undefined;
    const paneId="chat-"+(++this.counter);
    const section=el("section","live-chat-pane");
    section.dataset.paneId=paneId;
    section.setAttribute("aria-label","AI-Verse conversation "+this.counter);
    const heading=el("div","live-pane-heading");
    const name=el("strong","","AI-Verse");
    const actions=el("div","live-pane-actions");
    const open=button("Split chat",()=>{this.openPane();},"live-chat-split");
    const clear=button("New chat",()=>this.newConversation(paneId),"");
    const retry=button("Retry request",()=>{void this.retry(paneId);},"live-chat-retry");
    const reconnect=button("Reconnect run",()=>{void this.reconnectRun(paneId);},"live-chat-reconnect");
    const stop=button("Stop run",()=>{void this.stopRun(paneId);},"live-chat-stop");
    stop.title="Requires the trusted host to authorize run cancellation";
    const close=button("Close chat",()=>this.closePane(paneId),"");
    actions.append(open,clear,retry,reconnect,stop,close);heading.append(name,actions);
    const scope=el("div","live-chat-scope","Workspace: "+this.selected.workspaceId);
    const log=el("div","live-chat-log");
    log.setAttribute("role","log");log.setAttribute("aria-live","polite");
    log.setAttribute("aria-label","Conversation "+this.counter);
    const status=el("p","live-chat-status","Connected session. No run started.");
    status.setAttribute("role","status");
    const form=el("form","live-chat-form");
    const input=el("textarea","live-chat-input");
    input.rows=2;input.maxLength=1200;input.placeholder="What's on your mind?";
    input.setAttribute("aria-label","Message in conversation "+this.counter);
    const send=el("button","live-chat-send","Send");
    send.type="submit";form.append(input,send);
    const recovery=el("div","live-chat-recovery");
    const recoverInput=el("input","live-chat-run-id");
    recoverInput.placeholder="Canonical run ID";
    recoverInput.setAttribute("aria-label","Recover run ID for conversation "+this.counter);
    recoverInput.maxLength=128;
    const recover=button("Recover run",()=>{
      if(recoverInput.value.trim())void this.recover(paneId,recoverInput.value.trim());
    });
    recovery.append(recoverInput,recover);

    // Pointer + keyboard resizing changes layout only; no chat data, owner
    // state or browser storage is modified by the resizer.
    const grip=el("div","live-pane-resizer");
    grip.setAttribute("role","separator");
    grip.setAttribute("aria-label","Resize conversation");
    grip.setAttribute("aria-orientation","vertical");
    grip.setAttribute("aria-valuemin","280");
    grip.setAttribute("aria-valuemax","750");
    grip.setAttribute("aria-valuenow","360");
    grip.tabIndex=0;
    let activePointer:number|null=null,startX=0,startWidth=0;
    const setPaneWidth=(width:number)=>{
      const bounded=Math.round(Math.max(280,Math.min(750,width)));
      section.style.setProperty("--chat-pane-width",bounded+"px");
      section.dataset.userSized="true";
      grip.setAttribute("aria-valuenow",String(bounded));
    };
    grip.addEventListener("pointerdown",event=>{
      if(event.button!==0)return;
      event.preventDefault();
      activePointer=event.pointerId;
      startX=event.clientX;
      startWidth=section.getBoundingClientRect().width;
      grip.setPointerCapture(event.pointerId);
    });
    grip.addEventListener("pointermove",event=>{
      if(activePointer===event.pointerId)
        setPaneWidth(startWidth+event.clientX-startX);
    });
    const stopResize=(event:PointerEvent)=>{
      if(activePointer!==event.pointerId)return;
      activePointer=null;
      if(grip.hasPointerCapture(event.pointerId))
        grip.releasePointerCapture(event.pointerId);
    };
    grip.addEventListener("pointerup",stopResize);
    grip.addEventListener("pointercancel",stopResize);
    grip.addEventListener("keydown",event=>{
      if(event.key!=="ArrowLeft"&&event.key!=="ArrowRight")return;
      event.preventDefault();
      const step=event.shiftKey?64:32;
      setPaneWidth(section.getBoundingClientRect().width+
        (event.key==="ArrowRight"?step:-step));
    });
    section.append(heading,scope,log,status,form,recovery,grip);
    const pane:Pane={id:paneId,node:section,form,input,log,status,
      run:this.controller(view=>this.onChange(paneId,view)),
      turns:[],activeTurn:-1,busy:false,generation:0};
    form.addEventListener("submit",e=>{
      e.preventDefault();
      const message=input.value.trim();
      if(message)void this.send(paneId,message);
    });
    input.addEventListener("keydown",event=>{
      if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){
        event.preventDefault();form.requestSubmit();
      }
    });
    this.panes.set(paneId,pane);
    this.panesHost.append(section);
    this.createButton.disabled=this.panes.size>=MAX_PANES;
    this.render(pane);
    return paneId;
  }
  private onChange(paneId:string,view:ChatRunView):void{
    const pane=this.panes.get(paneId);
    if(!pane || this.destroyed)return;
    if(view.workspaceId!==this.selected.workspaceId ||
      view.systemId!==this.selected.systemId)return;
    if(pane.activeTurn>=0){
      const turn=pane.turns[pane.activeTurn];
      if(turn?.role==="assistant"){
        if(view.phase==="canceled"){
          turn.role="status";turn.text="Response stopped";pane.activeTurn=-1;
        }else turn.text=view.output;
      }
    }
    pane.busy=view.phase==="submitting"||view.phase==="running";
    pane.status.textContent=view.phase+(view.runId?" · "+view.runId:"")
      +(view.errorCode?" · "+view.errorCode:"")
      +(view.contextLimited?" · Earlier conversation context unavailable or trimmed":"");
    this.render(pane);
  }
  private render(pane:Pane):void{
    const fragment=document.createDocumentFragment();
    if(pane.historyHasOlder){
      const older=button(pane.historyLoading?"Loading older messages…":"Load older messages",
        ()=>{void this.loadOlderHistory(pane.id);},"live-chat-older-messages");
      older.disabled=Boolean(pane.historyLoading);
      fragment.append(older);
    }
    if(pane.historyError)
      fragment.append(el("p","live-chat-history-status",pane.historyError));
    if(pane.historyNotice)
      fragment.append(el("p","live-chat-history-status",pane.historyNotice));
    for(const turn of pane.turns){
      const card=el("div","live-chat-message "+turn.role);
      card.append(el("span","live-chat-role",turn.role==="user"?"You":
        turn.role==="assistant"?"AI-Verse":"Status"));
      card.append(el("p","",turn.text));
      fragment.append(card);
    }
    if(!pane.turns.length)
      fragment.append(el("div","live-chat-empty","A new conversation. Your real Gateway will answer here."));
    pane.log.replaceChildren(fragment);
    pane.log.scrollTop=pane.log.scrollHeight;
    const send=pane.form.querySelector("button[type=submit]") as HTMLButtonElement;
    if(send)send.disabled=pane.busy || !["idle","completed","canceled"].includes(pane.run.snapshot().phase);
    const recover=pane.node.querySelector(".live-chat-recovery button") as HTMLButtonElement;
    if(recover)recover.disabled=pane.busy;
    const retry=pane.node.querySelector(".live-chat-retry") as HTMLButtonElement;
    if(retry)retry.disabled=pane.busy || pane.run.snapshot().phase!=="interrupted"
      || Boolean(pane.run.snapshot().runId);
    const reconnect=pane.node.querySelector(".live-chat-reconnect") as HTMLButtonElement;
    if(reconnect)reconnect.disabled=pane.busy || pane.run.snapshot().phase!=="interrupted"
      || !pane.run.snapshot().runId;
    const stop=pane.node.querySelector(".live-chat-stop") as HTMLButtonElement;
    // A running run is busy for Send, but that is precisely when Stop is useful.
    if(stop)stop.disabled=!this.runCancelSupported
      ||pane.run.snapshot().phase!=="running" || !pane.run.snapshot().runId;
    const split=pane.node.querySelector(".live-pane-actions .live-chat-split") as HTMLButtonElement;
    if(split)split.disabled=this.panes.size>=MAX_PANES;
  }
  async send(paneId:string,text:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    const payload=text.trim();
    if(!payload || payload.length>1200)return;
    const generation=++pane.generation;
    pane.historyHasOlder=false;pane.historyLoading=false;pane.historyError=undefined;pane.historyNotice=undefined;
    pane.turns.push({role:"user",text:payload},{role:"assistant",text:""});
    pane.activeTurn=pane.turns.length-1;
    pane.busy=true;pane.input.value="";this.render(pane);
    try {
      // This UI currently sends one canonical user turn per run. Until
      // session continuation is owner-qualified it does not invent transcripts.
      await pane.run.send(payload,id());
    }catch(err){
      if(this.panes.get(paneId)!==pane||generation!==pane.generation)return;
      pane.busy=false;pane.status.textContent="Request could not start · "+errorCode(err);
      this.render(pane);
    }
  }
  async retry(paneId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    if(pane.run.snapshot().phase!=="interrupted"||pane.run.snapshot().runId)return;
    pane.busy=true;this.render(pane);
    try{await pane.run.retrySubmission();}
    catch(err){pane.busy=false;pane.status.textContent="Retry unavailable · "+errorCode(err);
      this.render(pane);}
  }
  /** Reconnect a known interrupted run. Never sends the user message again. */
  async reconnectRun(paneId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    const view=pane.run.snapshot();
    if(view.phase!=="interrupted"||!view.runId)return;
    const generation=pane.generation;
    pane.busy=true;this.render(pane);
    try{await pane.run.reconnect();}
    catch(err){
      if(this.destroyed||this.panes.get(paneId)!==pane||generation!==pane.generation)return;
      pane.busy=false;pane.status.textContent="Reconnect unavailable · "+errorCode(err);
      this.render(pane);
    }
  }
  /** This dispatches a canonical Gateway cancellation, not UI-only hiding. */
  async stopRun(paneId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||!this.runCancelSupported
      ||pane.run.snapshot().phase!=="running")return;
    try{await pane.run.stop(id());}
    catch(err){
      if(this.panes.get(paneId)!==pane || this.destroyed)return;
      pane.status.textContent="Stop unavailable · "+errorCode(err);
      this.render(pane);
    }
  }
  async recover(paneId:string,runId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    const generation=++pane.generation;
    pane.historyHasOlder=false;pane.historyLoading=false;pane.historyError=undefined;pane.historyNotice=undefined;
    pane.turns.push({role:"assistant",text:""});
    pane.activeTurn=pane.turns.length-1;
    pane.busy=true;this.render(pane);
    try{await pane.run.recover(runId);}
    catch(err){
      if(this.panes.get(paneId)!==pane||generation!==pane.generation)return;
      pane.busy=false;pane.status.textContent="Recovery failed · "+errorCode(err);
      this.render(pane);
    }
  }
  newConversation(paneId:string):void{
    const pane=this.panes.get(paneId);
    if(!pane)return;
    pane.generation++;pane.run.close();
    pane.run=this.controller(view=>this.onChange(paneId,view));
    pane.turns=[];pane.activeTurn=-1;pane.busy=false;pane.input.value="";
    pane.historyHasOlder=false;pane.historyLoading=false;pane.historyError=undefined;pane.historyNotice=undefined;
    pane.status.textContent="New conversation. Previous runs remain in Gateway.";
    this.render(pane);
  }
  closePane(paneId:string):void{
    const pane=this.panes.get(paneId);
    if(!pane)return;
    if(this.panes.size===1){
      pane.node.classList.toggle("live-chat-minimized");
      pane.status.textContent=pane.node.classList.contains("live-chat-minimized")
        ?"Chat minimized. Canonical runs continue in Gateway.":"Chat restored.";
      return;
    }
    pane.generation++;pane.run.close();
    pane.node.remove();this.panes.delete(paneId);
    this.createButton.disabled=false;
    for(const other of this.panes.values())this.render(other);
  }
  destroy():void{
    this.destroyed=true;this.historyEpoch++;this.runControlEpoch++;
    this.canvas.destroy();
    this.diagnostics.destroy();
    this.activity.destroy();
    this.models.destroy();
    for(const pane of this.panes.values())pane.run.close();
    this.panes.clear();
    this.parent.replaceChildren();
  }
}
export function mountAuthenticatedPersonalChat(root:HTMLElement,session:TrustedLocalChatSession):PersonalChatApplication{
  return new PersonalChatApplication(root,session);
}
