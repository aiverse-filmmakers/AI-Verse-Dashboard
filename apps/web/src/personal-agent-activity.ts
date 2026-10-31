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
export type CanonicalSession={id:string;status:string;updatedAt:string};
export type CanonicalRun={status:string;createdAt:string};
const STATUS=new Set(["active","idle","working","waiting","blocked","completed",
  "running","queued","failed","canceled","cancelled","paused","done","aborted",
  "awaiting_approval","resuming","paused_recovery_required","paused_no_progress",
  "budget_limited","parked","no_progress"]);
const runId=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
function safeStatus(value:unknown):string{
  return typeof value==="string"&&STATUS.has(value)?value:"unknown";
}
export function inspectCanonicalSessions(value:unknown,workspaceId:string):
 {sessions:CanonicalSession[];hasMore:boolean}{
  if(!value||typeof value!=="object"||Array.isArray(value))return bad();
  const v=value as Record<string,unknown>;
  if(v.source!=="canonical-gateway"||v.workspaceId!==workspaceId)
    throw Error("ACTIVITY_SCOPE_MISMATCH");
  if(!Array.isArray(v.data)||v.data.length>3||typeof v.has_more!=="boolean")return bad();
  const sessions=v.data.map(x=>{
    if(!x||typeof x!=="object"||Array.isArray(x))return bad();
    const item=x as Record<string,unknown>;
    if(typeof item.session_id!=="string"||!runId.test(item.session_id)
      ||item.workspace_id!==workspaceId)return bad();
    return {id:item.session_id,status:safeStatus(item.status),
      updatedAt:validDate(item.updated_at)?item.updated_at:"Date unavailable"};
  });
  return {sessions,hasMore:v.has_more};
}
export function inspectCanonicalRuns(value:unknown,workspaceId:string,sessionId:string):
 CanonicalRun[]{
  if(!value||typeof value!=="object"||Array.isArray(value))return bad();
  const v=value as Record<string,unknown>;
  if(v.source!=="canonical-gateway"||v.workspaceId!==workspaceId
    ||v.sessionId!==sessionId)throw Error("ACTIVITY_SCOPE_MISMATCH");
  if(!Array.isArray(v.data)||v.data.length>3||typeof v.has_more!=="boolean")return bad();
  return v.data.map(x=>{
    if(!x||typeof x!=="object"||Array.isArray(x))return bad();
    const item=x as Record<string,unknown>;
    if(item.session_id!==sessionId||typeof item.run_id!=="string"
      ||!runId.test(item.run_id))throw Error("ACTIVITY_SCOPE_MISMATCH");
    return {status:safeStatus(item.status),
      createdAt:validDate(item.created_at)?item.created_at:"Date unavailable"};
  });
}
export type ActivityFilter="all"|"tool-call"|"error-event"|"approval";
export function filterActivityEvents(view:ActivityView,filter:ActivityFilter):ActivityEvent[]{
  return filter==="all" ?view.events.slice():view.events.filter(event=>event.kind===filter);
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
  private readonly localHost:HTMLElement;
  private readonly canonicalHost:HTMLElement;
  private view?:ActivityView;
  private filter:ActivityFilter="all";
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
    this.canonicalHost=el("div","personal-agent-activity-canonical");
    this.localHost=el("div","personal-agent-activity-local");
    this.content.append(this.canonicalHost,this.localHost);
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
    this.view=undefined;this.filter="all";
    this.epoch++;
    this.title.textContent="Local activity · "+scope.workspaceId;
    this.canonicalHost.replaceChildren(el("p","personal-agent-activity-state","Workspace changed. Refresh required."));
    this.localHost.replaceChildren(el("p","personal-agent-activity-state","Workspace changed. Refresh required."));
    if(this.open)void this.refresh();
  }
  private renderView(view:ActivityView):void{
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
    const controls=el("div","personal-agent-activity-filters");
    const options:[ActivityFilter,string][]=[
      ["all","All events"],["tool-call","Tool calls"],["approval","Approvals"],["error-event","Errors"],
    ];
    for(const [value,label] of options){
      const button=el("button","personal-agent-activity-filter",label);
      button.type="button";
      button.setAttribute("aria-pressed",String(this.filter===value));
      button.addEventListener("click",()=>{
        if(this.destroyed||!this.open||!this.view)return;
        this.filter=value;this.renderView(this.view);
      });
      controls.append(button);
    }
    events.append(controls);
    const selected=filterActivityEvents(view,this.filter);
    if(!selected.length)events.append(el("p","personal-agent-activity-state",
      "No matching events in the latest 12 local records."));
    for(const row of selected){
      events.append(el("p","personal-agent-activity-entry",
        row.kind+" · "+row.role+" · "+row.createdAt));
    }
    columns.append(sessions,events);
    this.localHost.replaceChildren(header,columns);
  }
  async refresh():Promise<void>{
    if(this.destroyed||!this.open)return;
    const request=++this.epoch,selected={...this.selected};
    this.reload.disabled=true;
    this.view=undefined;
    this.localHost.replaceChildren(el("p","personal-agent-activity-state","Reading local activity…"));
    this.canonicalHost.replaceChildren(el("p","personal-agent-activity-state","Reading Gateway history…"));
    const fresh=()=>!this.destroyed&&this.open&&request===this.epoch
      &&selected.systemId===this.selected.systemId
      &&selected.workspaceId===this.selected.workspaceId;
    // The two owners are independent. One missing source cannot mask the other.
    const local=this.client.query("operator.activity",{noCache:true});
    const canonical=(async()=>{
      const response=await this.client.listGatewaySessions(3,0);
      const page=inspectCanonicalSessions(response.result,selected.workspaceId);
      const runs=await Promise.allSettled(page.sessions.slice(0,2)
        .map(session=>this.client.listGatewaySessionRuns(session.id,3,0)));
      return {page,runs};
    })();
    const [localResult,canonicalResult]=await Promise.allSettled([local,canonical]);
    if(!fresh())return;
    if(localResult.status==="fulfilled"){
      try{
        this.view=inspectActivity(localResult.value.result,selected);
        this.renderView(this.view);
      }catch(error){
        this.localHost.replaceChildren(el("p","personal-agent-activity-state",
          "Local activity response rejected · "+errorCode(error)));
      }
    }else{
      this.localHost.replaceChildren(el("p","personal-agent-activity-state",
        "Local activity unavailable · "+errorCode(localResult.reason)));
    }
    if(canonicalResult.status==="fulfilled"){
      try{
        const {page,runs}=canonicalResult.value;
        const holder=el("div","personal-agent-activity-list");
        holder.append(el("strong","","Canonical Gateway history (read only)"));
        holder.append(el("p","personal-agent-activity-state",
          page.sessions.length+" recent persisted session"+
          (page.sessions.length===1?"":"s")+" returned"+
          (page.hasMore?" · older sessions available":"")));
        for(const session of page.sessions){
          holder.append(el("p","personal-agent-activity-entry",
            "Session · "+session.status+" · "+session.updatedAt));
        }
        const recentRuns=el("div","personal-agent-activity-runs");
        recentRuns.append(el("strong","","Recent run statuses (up to 6)"));
        let runCount=0,unavailable=0;
        runs.forEach((result,index)=>{
          if(result.status!=="fulfilled"){unavailable++;return;}
          try{
            for(const run of inspectCanonicalRuns(result.value.result,selected.workspaceId,
              page.sessions[index].id)){
              const awaiting=run.status==="awaiting_approval";
              recentRuns.append(el("p","personal-agent-activity-entry",
                awaiting?"Run · awaiting owner approval (read-only) · "+run.createdAt:
                  "Run · "+run.status+" · "+run.createdAt));
              runCount++;
            }
          }catch{unavailable++;}
        });
        if(!runCount)recentRuns.append(el("p","personal-agent-activity-state",
          "No recent run statuses returned."));
        if(unavailable)recentRuns.append(el("p","personal-agent-activity-state",
          unavailable+" session run histor"+(unavailable===1?"y":"ies")+" unavailable"));
        holder.append(recentRuns);
        this.canonicalHost.replaceChildren(holder);
      }catch(error){
        this.canonicalHost.replaceChildren(el("p","personal-agent-activity-state",
          "Gateway history response rejected · "+errorCode(error)));
      }
    }else{
      this.canonicalHost.replaceChildren(el("p","personal-agent-activity-state",
        "Gateway history unavailable · "+errorCode(canonicalResult.reason)));
    }
    if(fresh())this.reload.disabled=false;
  }
  destroy():void{
    this.destroyed=true;this.open=false;this.epoch++;
    this.view=undefined;
    this.host.replaceChildren();
  }
}
