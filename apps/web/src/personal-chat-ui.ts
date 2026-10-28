import {DashboardClient,DashboardChatEventFeed,PersonalChatRunController,
  type ChatRunView,type ClientScope} from "../../../packages/client/src/index.js";

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
  private readonly parent:HTMLElement;
  private destroyed=false;
  constructor(container:HTMLElement,private readonly session:TrustedLocalChatSession){
    this.selected=scopeOf(session);
    const feed=new DashboardChatEventFeed(session.dashboardOrigin,
      session.authentication==="host-cookie" ? {mode:"host-cookie"} : this.requireBearer(session));
    this.feed=feed;
    this.parent=container;
    container.replaceChildren();
    container.classList.add("aiverse-live-chat");
    const bar=el("header","live-chat-toolbar");
    const title=el("div","live-chat-heading","Personal · AI-Verse");
    this.title=title;
    const create=button("Split chat",()=>{this.openPane();},"live-chat-split");
    this.createButton=create;
    bar.append(title,create);
    this.panesHost=el("div","live-chat-panes");
    container.append(bar,this.panesHost);
    this.openPane();
  }
  get paneIds():string[]{return [...this.panes.keys()];}
  /** Host-owned selection, not parsed from model text or preview workspace IDs. */
  retarget(next:Required<ClientScope>):void{
    if(this.destroyed)throw Error("Chat application closed");
    if(!next.systemId || !next.workspaceId)throw Error("Explicit OS scope required");
    this.selected={...next};
    this.title.textContent="AI-Verse · "+next.workspaceId;
    for(const pane of this.panes.values()){
      pane.generation++;
      pane.turns=[];pane.activeTurn=-1;
      pane.run.retarget(this.selected);
      const scopeLabel=pane.node.querySelector(".live-chat-scope");
      if(scopeLabel)scopeLabel.textContent="Workspace: "+next.workspaceId;
      pane.input.value="";
      pane.busy=false;
      this.render(pane);
      pane.status.textContent="New workspace selected. Previous runs remain in Gateway.";
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
    const close=button("Close chat",()=>this.closePane(paneId),"");
    actions.append(open,clear,retry,close);heading.append(name,actions);
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
    section.append(heading,scope,log,status,form,recovery);
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
      if(turn?.role==="assistant")turn.text=view.output;
    }
    pane.busy=view.phase==="submitting"||view.phase==="running";
    pane.status.textContent=view.phase+(view.runId?" · "+view.runId:"")
      +(view.errorCode?" · "+view.errorCode:"")
      +(view.contextLimited?" · Earlier conversation context unavailable or trimmed":"");
    this.render(pane);
  }
  private render(pane:Pane):void{
    const fragment=document.createDocumentFragment();
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
    if(send)send.disabled=pane.busy;
    const recover=pane.node.querySelector(".live-chat-recovery button") as HTMLButtonElement;
    if(recover)recover.disabled=pane.busy;
    const retry=pane.node.querySelector(".live-chat-retry") as HTMLButtonElement;
    if(retry)retry.disabled=pane.busy || pane.run.snapshot().phase!=="interrupted"
      || Boolean(pane.run.snapshot().runId);
    const split=pane.node.querySelector(".live-pane-actions .live-chat-split") as HTMLButtonElement;
    if(split)split.disabled=this.panes.size>=MAX_PANES;
  }
  async send(paneId:string,text:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    const payload=text.trim();
    if(!payload || payload.length>1200)return;
    const generation=++pane.generation;
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
  async recover(paneId:string,runId:string):Promise<void>{
    const pane=this.panes.get(paneId);
    if(!pane||this.destroyed||pane.busy)return;
    const generation=++pane.generation;
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
    this.destroyed=true;
    for(const pane of this.panes.values())pane.run.close();
    this.panes.clear();
    this.parent.replaceChildren();
  }
}
export function mountAuthenticatedPersonalChat(root:HTMLElement,session:TrustedLocalChatSession):PersonalChatApplication{
  return new PersonalChatApplication(root,session);
}
