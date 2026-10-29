import {DashboardClient,type ClientScope} from "../../../packages/client/src/index.js";

/** Read-only, scoped Dashboard-local session monitor. No persisted activity
 * authority is inferred from these in-memory records. */
export type ActivityRow={status:string;entryCount:number;updatedAt:string};
export type ActivityEvent={kind:string;role:string;createdAt:string};
export interface ActivityView{
  sessionCount:number;
  sessions:ActivityRow[];
  events:ActivityEvent[];
  observedAt:string;
}
const STATES=new Set(["active","idle","working","waiting","blocked","done","aborted"]);
const KINDS=new Set(["message","tool-call","approval","task-card","handoff","file-card",
  "diff-card","preview-card","run-event","error-event","command-confirm"]);
const ROLES=new Set(["user","agent","system"]);
const validDate=(value:unknown):value is string=>
  typeof value==="string" && value.length<=40 && !Number.isNaN(Date.parse(value));
function bad():never{throw Error("ACTIVITY_INVALID_SOURCE");}
export function inspectActivity(value:unknown,scope:Required<ClientScope>):ActivityView{
  if(!value||typeof value!=="object"||Array.isArray(value))return bad();
  const v=value as Record<string,unknown>;
  if(v.source!=="dashboard-local-sessions"||v.systemId!==scope.systemId
    ||v.workspaceId!==scope.workspaceId||v.retention!=="in-memory-only")
    throw Error("ACTIVITY_SCOPE_MISMATCH");
  if(!Number.isSafeInteger(v.sessionCount)||Number(v.sessionCount)<0
    ||!Array.isArray(v.sessions)||v.sessions.length>12
    ||!Array.isArray(v.events)||v.events.length>12
    ||!validDate(v.observedAt))return bad();
  const sessions:ActivityRow[]=v.sessions.map(item=>{
    if(!item||typeof item!=="object"||Array.isArray(item))return bad();
    const x=item as Record<string,unknown>;
    if(typeof x.status!=="string"||!STATES.has(x.status)
      ||!Number.isInteger(x.entryCount)||Number(x.entryCount)<0
      ||Number(x.entryCount)>500||!validDate(x.updatedAt))return bad();
    return {status:x.status,entryCount:x.entryCount as number,updatedAt:x.updatedAt};
  });
  const events:ActivityEvent[]=v.events.map(item=>{
    if(!item||typeof item!=="object"||Array.isArray(item))return bad();
    const x=item as Record<string,unknown>;
    if(typeof x.kind!=="string"||!KINDS.has(x.kind)
      ||typeof x.role!=="string"||!ROLES.has(x.role)
      ||!validDate(x.createdAt))return bad();
    return {kind:x.kind,role:x.role,createdAt:x.createdAt};
  });
  if(sessions.length>Number(v.sessionCount))return bad();
  return {sessionCount:v.sessionCount as number,sessions,events,
    observedAt:v.observedAt as string};
}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string){
  const n=document.createElement(tag);n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
}
function errorCode(e:unknown){
  const code=(e as {code?:unknown})?.code;
  return typeof code==="string"&&/^[A-Z][A-Z0-9_]{1,63}$/.test(code)
    ?code:"ACTIVITY_OWNER_UNAVAILABLE";
}
export class PersonalAgentActivity{
  private readonly selected:Required<ClientScope>;
  private epoch=0;
  private open=false;
  private destroyed=false;
  private readonly title:HTMLElement;
  private readonly reload:HTMLButtonElement;
  private readonly content:HTMLElement;
  constructor(private readonly host:HTMLElement,private readonly client:DashboardClient){
    const scope=client.getScope();
    if(!scope.systemId||!scope.workspaceId)throw Error("ACTIVITY_SCOPE_REQUIRED");
    this.selected={systemId:scope.systemId,workspaceId:scope.workspaceId};
    host.classList.add("personal-agent-activity");
    host.setAttribute("aria-label","Workspace agent activity");
    host.hidden=true;
    this.title=el("strong","personal-agent-activity-title","Local activity · "+scope.workspaceId);
    this.reload=el("button","personal-agent-activity-refresh","Refresh activity");
    this.reload.type="button";
    this.reload.addEventListener("click",()=>{void this.refresh();});
    this.content=el("div","personal-agent-activity-content");
    const head=el("div","personal-agent-activity-heading");
    head.append(this.title,this.reload);
    host.replaceChildren(head,this.content);
  }
  toggle():void{
    if(this.destroyed)return;
    this.open=!this.open;
    this.host.hidden=!this.open;
    this.epoch++;
    if(this.open)void this.refresh();
  }
  retarget(scope:Required<ClientScope>):void{
    if(this.destroyed)throw Error("ACTIVITY_CLOSED");
    if(!scope.systemId||!scope.workspaceId)throw Error("ACTIVITY_SCOPE_REQUIRED");
    this.selected.systemId=scope.systemId;this.selected.workspaceId=scope.workspaceId;
    this.client.retarget(scope);
    this.epoch++;
    this.title.textContent="Local activity · "+scope.workspaceId;
    this.content.replaceChildren(el("p","personal-agent-activity-state","Selection changed. Refresh required."));
    if(this.open)void this.refresh();
  }
  async refresh():Promise<void>{
    if(this.destroyed||!this.open)return;
    const request=++this.epoch,selected={...this.selected};
    this.reload.disabled=true;
    this.content.replaceChildren(el("p","personal-agent-activity-state","Reading scoped local activity…"));
    try{
      const response=await this.client.query("operator.activity",{noCache:true});
      if(this.destroyed||!this.open||request!==this.epoch
        ||selected.systemId!==this.selected.systemId
        ||selected.workspaceId!==this.selected.workspaceId)return;
      const view=inspectActivity(response.result,selected);
      const header=el("p","personal-agent-activity-state",
        view.sessionCount+" local session"+(view.sessionCount===1?"":"s")
        +" in this workspace · not persisted history");
      const columns=el("div","personal-agent-activity-columns");
      const sessions=el("div","personal-agent-activity-list");
      const events=el("div","personal-agent-activity-list");
      sessions.append(el("strong","","Recent sessions (up to 12)"));
      events.append(el("strong","","Recent activity (up to 12)"));
      if(!view.sessions.length)sessions.append(el("p","","No current local sessions."));
      for(const row of view.sessions){
        sessions.append(el("p","personal-agent-activity-entry",
          row.status+" · "+row.entryCount+" entries · "+row.updatedAt));
      }
      if(!view.events.length)events.append(el("p","","No recent local activity."));
      for(const row of view.events){
        events.append(el("p","personal-agent-activity-entry",
          row.kind+" · "+row.role+" · "+row.createdAt));
      }
      columns.append(sessions,events);
      this.content.replaceChildren(header,columns);
    }catch(error){
      if(this.destroyed||!this.open||request!==this.epoch)return;
      this.content.replaceChildren(el("p","personal-agent-activity-state",
        "Local activity unavailable · "+errorCode(error)));
    }finally{
      if(!this.destroyed&&request===this.epoch)this.reload.disabled=false;
    }
  }
  destroy():void{
    this.destroyed=true;this.open=false;this.epoch++;
    this.host.replaceChildren();
  }
}
