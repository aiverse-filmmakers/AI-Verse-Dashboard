import {DashboardClient,type ClientScope} from "../../../packages/client/src/index.js";

/**
 * Host-authenticated Personal control surface. All observations come through
 * the existing localhost /rpc owner boundaries; no synthetic preview data,
 * no direct OS files, no model/provider credentials in the browser.
 */
type State="idle"|"loading"|"available"|"unavailable";
type Observation={state:State;label:string;details:string;observedAt?:string};
function node<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string){
  const n=document.createElement(tag);n.className=cls;
  if(text!==undefined)n.textContent=text;return n;
}
function safeCode(error:unknown):string{
  const code=(error as {code?:unknown})?.code;
  return typeof code==="string"&&/^[A-Z][A-Z0-9_]{1,63}$/.test(code)
    ?code:"OWNER_UNAVAILABLE";
}
function scopedResponse(value:unknown,workspaceId:string,source:string):
  Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const obj=value as Record<string,unknown>;
  if(obj.source!==source||obj.workspaceId!==workspaceId)
    throw Error("DIAGNOSTICS_SCOPE_MISMATCH");
  return obj;
}
export function inspectGateway(value:unknown,workspaceId:string):Observation{
  const v=scopedResponse(value,workspaceId,"canonical-gateway");
  const c=v.capabilities;
  if(!c||typeof c!=="object"||Array.isArray(c))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const available=c as Record<string,unknown>;
  const canRun=available.runCreate===true&&available.runGet===true;
  const continuity=available.conversationLibrary===true;
  return {state:"available",label:"Canonical Gateway reachable",
    details:(canRun?"Run creation and retrieval available":"Run controls not confirmed")
      +" · "+(continuity?"Conversation history supported":"Conversation history not confirmed")
      +" · "+(available.providerSelection===true
        ?"Provider selection supported":"Provider selection not available")
      +" · "+((v.runtimeSource as {inferenceVerified?:unknown}|undefined)?.inferenceVerified===true
        ?"Inference verified by owner":"Inference not verified by status"),
  };
}
export function inspectCanvas(value:unknown,workspaceId:string):Observation{
  const v=scopedResponse(value,workspaceId,"canonical-data");
  if(!Array.isArray(v.document)||v.document.length>25)
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  for(const item of v.document){
    if(!item||typeof item!=="object"||Array.isArray(item)
      ||typeof (item as Record<string,unknown>).id!=="string")
      throw Error("DIAGNOSTICS_INVALID_SOURCE");
  }
  return {state:"available",label:"Canonical Canvas owner reachable",
    details:v.document.length===0?"No Canvas documents returned"
      :v.document.length+" Canvas document"+(v.document.length===1?"":"s")
        +" returned (up to 25; not a lifetime total)",
  };
}
export function inspectHistory(value:unknown,workspaceId:string):Observation{
  const v=scopedResponse(value,workspaceId,"canonical-gateway");
  if(!Array.isArray(v.data)||v.data.length>5
    ||typeof v.has_more!=="boolean")throw Error("DIAGNOSTICS_INVALID_SOURCE");
  for(const x of v.data){
    if(!x||typeof x!=="object"||Array.isArray(x)
      ||typeof (x as Record<string,unknown>).session_id!=="string"
      ||(x as Record<string,unknown>).workspace_id!==workspaceId)
      throw Error("DIAGNOSTICS_SCOPE_MISMATCH");
  }
  return {state:"available",label:"Conversation library reachable",
    details:v.data.length===0?"No recent sessions returned"
      :v.data.length+" recent session"+(v.data.length===1?"":"s")
        +" returned"+(v.has_more?" · older sessions available":""),
  };
}
export function inspectSystem(value:unknown,systemId:string):Observation{
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const v=value as Record<string,unknown>;
  if(!v.system||typeof v.system!=="object"||Array.isArray(v.system))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const s=v.system as Record<string,unknown>;
  if(s.systemId!==systemId||typeof s.label!=="string"
    ||typeof s.osType!=="string"||typeof s.osVersion!=="string"
    ||typeof s.authorized!=="boolean")
    throw Error("DIAGNOSTICS_SCOPE_MISMATCH");
  return {state:s.authorized?"available":"unavailable",
    label:s.authorized?"Registered OS authorized":"Registered OS not authorized",
    details:s.label.slice(0,80)+" · "+s.osType.slice(0,60)+
      " · "+s.osVersion.slice(0,40)};
}
export function inspectWorkspace(value:unknown,workspaceId:string):Observation{
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const v=value as Record<string,unknown>;
  if(!v.workspace||typeof v.workspace!=="object"||Array.isArray(v.workspace))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const workspace=v.workspace as Record<string,unknown>;
  if(workspace.id!==workspaceId)throw Error("DIAGNOSTICS_SCOPE_MISMATCH");
  if(!(workspace.name===null||typeof workspace.name==="string")
    ||!(workspace.status===null||typeof workspace.status==="string"))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const name=typeof workspace.name==="string"&&workspace.name.trim()
    ?workspace.name.slice(0,80):"Unnamed workspace";
  const state=typeof workspace.status==="string"&&workspace.status.trim()
    ?workspace.status.slice(0,40):"Status unspecified";
  return {state:"available",label:"Selected workspace manifest found",
    details:name+" · "+state};
}
/** Accept only host-whitelisted, exact-scope factual owner diagnostics. */
export function inspectRunDiagnostics(value:unknown,workspaceId:string,
  runId:string,sessionId:string):Observation{
  const v=scopedResponse(value,workspaceId,"canonical-gateway");
  const safety=v.safety;
  if(v.runId!==runId||v.sessionId!==sessionId)
    throw Error("DIAGNOSTICS_SCOPE_MISMATCH");
  if(typeof v.status!=="string"||!/^[a-z_]{2,48}$/.test(v.status)
    ||!safety||typeof safety!=="object"||Array.isArray(safety))
    throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const safe=safety as Record<string,unknown>;
  if(safe.rawContentIncluded!==false||safe.promptsIncluded!==false
    ||safe.chainOfThoughtIncluded!==false)throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const obj=(x:unknown):Record<string,unknown>|null=>
    x&&typeof x==="object"&&!Array.isArray(x)?x as Record<string,unknown>:null;
  const folds=obj(v.folds),archive=obj(v.archive);
  const retrieval=v.retrieval===null?null:obj(v.retrieval);
  const context=v.context===null?null:obj(v.context);
  if(!folds||!archive||(v.retrieval!==null&&!retrieval)
    ||(v.context!==null&&!context))throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const count=(x:unknown)=>typeof x==="number"&&Number.isSafeInteger(x)
    &&x>=0&&x<=1_000_000_000_000?x:undefined;
  const values:[string,unknown][]=[
    ["Source reads",retrieval?.source_reads],
    ["Gateway source-range reads",retrieval?.gateway_source_range_reads],
    ["Archived retrieval depth",archive.retrieval_depth],
    ["Validated folds",folds.valid_cards],
    ["Invalid folds",folds.invalid_cards],
  ];
  for(const [,raw] of values){if(raw!==undefined&&raw!==null&&count(raw)===undefined)
    throw Error("DIAGNOSTICS_INVALID_SOURCE");}
  if(typeof folds.pendingFoldWork!=="boolean")throw Error("DIAGNOSTICS_INVALID_SOURCE");
  const facts=[...values.filter(([,x])=>count(x)!==undefined)
    .map(([label,x])=>label+": "+String(x)),
    "Pending fold work: "+(folds.pendingFoldWork?"yes":"no")];
  return {state:"available",label:"Canonical run diagnostics · "+v.status,
    details:facts.join(" · ")+" · Raw prompts and traces excluded"};
}
export class PersonalDiagnostics{
  private readonly scope:Required<ClientScope>;
  private epoch=0;
  private runEpoch=0;
  private open=false;
  private destroyed=false;
  private readonly gateway:HTMLElement;
  private readonly system:HTMLElement;
  private readonly workspace:HTMLElement;
  private readonly canvas:HTMLElement;
  private readonly history:HTMLElement;
  private readonly heading:HTMLElement;
  private readonly reload:HTMLButtonElement;
  private readonly runInput:HTMLInputElement;
  private readonly sessionInput:HTMLInputElement;
  private readonly runButton:HTMLButtonElement;
  private readonly runResult:HTMLElement;
  private current:{system:Observation;workspace:Observation;gateway:Observation;canvas:Observation;history:Observation};
  constructor(private readonly host:HTMLElement,
    private readonly client:DashboardClient){
    const scope=client.getScope();
    if(!scope.systemId||!scope.workspaceId)
      throw Error("DIAGNOSTICS_SCOPE_REQUIRED");
    this.scope={systemId:scope.systemId,workspaceId:scope.workspaceId};
    this.heading=node("strong","personal-diagnostics-title",
      "Workspace · "+this.scope.workspaceId);
    this.reload=node("button","personal-diagnostics-refresh","Refresh status");
    this.reload.type="button";this.reload.setAttribute("aria-label","Refresh workspace status");
    this.reload.addEventListener("click",()=>{void this.refresh();});
    this.gateway=node("div","personal-diagnostics-source");
    this.system=node("div","personal-diagnostics-source");
    this.workspace=node("div","personal-diagnostics-source");
    this.canvas=node("div","personal-diagnostics-source");
    this.history=node("div","personal-diagnostics-source");
    this.runInput=node("input","personal-diagnostics-run-input");
    this.runInput.placeholder="Canonical run ID";this.runInput.maxLength=128;
    this.runInput.setAttribute("aria-label","Diagnostic run ID");
    this.sessionInput=node("input","personal-diagnostics-session-input");
    this.sessionInput.placeholder="Exact session ID";this.sessionInput.maxLength=128;
    this.sessionInput.setAttribute("aria-label","Diagnostic session ID");
    this.runButton=node("button","personal-diagnostics-run-button","Inspect run");
    this.runButton.type="button";
    this.runButton.addEventListener("click",()=>{void this.inspectRun();});
    this.runResult=node("div","personal-diagnostics-source personal-diagnostics-run-result");
    const inspectControls=node("div","personal-diagnostics-run-controls");
    inspectControls.append(this.runInput,this.sessionInput,this.runButton);
    host.classList.add("personal-diagnostics");
    host.setAttribute("aria-label","Canonical workspace diagnostics");
    host.hidden=true;
    const head=node("div","personal-diagnostics-header");
    head.append(this.heading,this.reload);
    host.replaceChildren(head,this.system,this.workspace,this.gateway,this.canvas,this.history,
      inspectControls,this.runResult);
    this.current={
      system:{state:"idle",label:"OS system registry",details:"Not checked"},
      workspace:{state:"idle",label:"Selected workspace manifest",details:"Not checked"},
      gateway:{state:"idle",label:"Canonical Gateway",details:"Not checked"},
      canvas:{state:"idle",label:"Canvas Data owner",details:"Not checked"},
      history:{state:"idle",label:"Conversation library",details:"Not checked"},
    };
    this.render();
    this.renderEntry(this.runResult,{state:"idle",label:"Inspect a canonical run",
      details:"Read-only, requires the exact run and session IDs"});
  }
  isOpen():boolean{return this.open;}
  toggle():void{
    if(this.destroyed)return;
    this.open=!this.open;this.host.hidden=!this.open;
    if(this.open)void this.refresh();
    else {this.epoch++;this.runEpoch++;this.resetRunInspection();}
  }
  retarget(next:Required<ClientScope>):void{
    if(this.destroyed)throw Error("Diagnostics closed");
    if(!next.systemId||!next.workspaceId)throw Error("DIAGNOSTICS_SCOPE_REQUIRED");
    this.epoch++;this.runEpoch++;this.resetRunInspection();
    this.scope.systemId=next.systemId;
    this.scope.workspaceId=next.workspaceId;this.client.retarget(next);
    this.heading.textContent="Workspace · "+next.workspaceId;
    this.current={
      system:{state:"idle",label:"OS system registry",details:"Not checked"},
      workspace:{state:"idle",label:"Selected workspace manifest",details:"Not checked"},
      gateway:{state:"idle",label:"Canonical Gateway",details:"Not checked"},
      canvas:{state:"idle",label:"Canvas Data owner",details:"Not checked"},
      history:{state:"idle",label:"Conversation library",details:"Not checked"},
    };
    this.render();
    if(this.open)void this.refresh();
  }
  private resetRunInspection():void{
    this.runInput.value="";this.sessionInput.value="";this.runButton.disabled=false;
    this.renderEntry(this.runResult,{state:"idle",label:"Inspect a canonical run",
      details:"Read-only, requires the exact run and session IDs"});
  }
  async inspectRun():Promise<void>{
    if(this.destroyed||!this.open)return;
    const runId=this.runInput.value.trim(),sessionId=this.sessionInput.value.trim();
    const valid=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
    if(!valid.test(runId)||!valid.test(sessionId)){
      this.renderEntry(this.runResult,{state:"unavailable",label:"Invalid run or session ID",
        details:"Enter both exact canonical identifiers"});return;
    }
    const epoch=++this.runEpoch,workspace=this.scope.workspaceId,
      system=this.scope.systemId;
    this.runButton.disabled=true;
    this.renderEntry(this.runResult,{state:"loading",label:"Inspecting canonical run",
      details:"Requesting owner-scoped diagnostics…"});
    try{
      const response=await this.client.getGatewayRunDiagnostics(runId,sessionId);
      if(this.destroyed||!this.open||epoch!==this.runEpoch
        ||workspace!==this.scope.workspaceId||system!==this.scope.systemId)return;
      const checked=inspectRunDiagnostics(response.result,workspace,runId,sessionId);
      this.renderEntry(this.runResult,{...checked,observedAt:response.observedAt});
    }catch(error){
      if(this.destroyed||!this.open||epoch!==this.runEpoch
        ||workspace!==this.scope.workspaceId||system!==this.scope.systemId)return;
      this.renderEntry(this.runResult,{state:"unavailable",label:"Run diagnostics unavailable",
        details:safeCode(error)});
    }finally{
      if(!this.destroyed&&this.open&&epoch===this.runEpoch)this.runButton.disabled=false;
    }
  }
  snapshot():Readonly<{system:Observation;workspace:Observation;gateway:Observation;canvas:Observation;history:Observation}>{
    return {system:{...this.current.system},workspace:{...this.current.workspace},gateway:{...this.current.gateway},
      canvas:{...this.current.canvas},history:{...this.current.history}};
  }
  private renderEntry(host:HTMLElement,observation:Observation){
    host.dataset.state=observation.state;
    host.replaceChildren(
      node("strong","personal-diagnostics-name",observation.label),
      node("p","personal-diagnostics-details",observation.details),
      ...(observation.observedAt?
        [node("span","personal-diagnostics-timestamp",
          "Observed · "+observation.observedAt)]:[]),
    );
  }
  private render(){
    this.renderEntry(this.system,this.current.system);
    this.renderEntry(this.workspace,this.current.workspace);
    this.renderEntry(this.gateway,this.current.gateway);
    this.renderEntry(this.canvas,this.current.canvas);
    this.renderEntry(this.history,this.current.history);
  }
  async refresh():Promise<void>{
    if(this.destroyed||!this.open)return;
    const epoch=++this.epoch,workspaceId=this.scope.workspaceId,
      systemId=this.scope.systemId;
    this.current={
      system:{state:"loading",label:"Registered OS",details:"Checking current scope…"},
      workspace:{state:"loading",label:"Selected workspace manifest",details:"Checking current scope…"},
      gateway:{state:"loading",label:"Canonical Gateway",details:"Checking current scope…"},
      canvas:{state:"loading",label:"Canvas Data owner",details:"Checking current scope…"},
      history:{state:"loading",label:"Conversation library",details:"Checking current scope…"},
    };
    this.reload.disabled=true;this.render();
    const results=await Promise.allSettled([
      this.client.gatewayStatus(),this.client.canvasList(25),
      this.client.listGatewaySessions(5,0),
      this.client.query("system.get",{noCache:true}),
      this.client.query("workspace.get",{noCache:true}),
    ]);
    if(this.destroyed||!this.open||epoch!==this.epoch
      ||workspaceId!==this.scope.workspaceId
      ||systemId!==this.scope.systemId)return;
    const observed=()=>new Date().toISOString();
    const gateway=results[0],canvas=results[1],history=results[2],
      system=results[3],workspace=results[4];
    try{
      this.current.gateway=gateway.status==="fulfilled"
        ?{...inspectGateway(gateway.value.result,workspaceId),
          observedAt:gateway.value.observedAt||observed()}
        :{state:"unavailable",label:"Canonical Gateway unavailable",
          details:safeCode(gateway.reason)};
    }catch(error){
      this.current.gateway={state:"unavailable",label:"Gateway response rejected",
        details:safeCode(error)};
    }
    try{
      this.current.canvas=canvas.status==="fulfilled"
        ?{...inspectCanvas(canvas.value.result,workspaceId),
          observedAt:canvas.value.observedAt||observed()}
        :{state:"unavailable",label:"Canvas Data owner unavailable",
          details:safeCode(canvas.reason)};
    }catch(error){
      this.current.canvas={state:"unavailable",label:"Canvas response rejected",
        details:safeCode(error)};
    }
    try{
      this.current.history=history.status==="fulfilled"
        ?{...inspectHistory(history.value.result,workspaceId),
          observedAt:history.value.observedAt||observed()}
        :{state:"unavailable",label:"Conversation library unavailable",
          details:safeCode(history.reason)};
    }catch(error){
      this.current.history={state:"unavailable",label:"History response rejected",
        details:safeCode(error)};
    }
    try{
      this.current.system=system.status==="fulfilled"
        ?{...inspectSystem(system.value.result,systemId),
          observedAt:system.value.observedAt||observed()}
        :{state:"unavailable",label:"Registered OS unavailable",
          details:safeCode(system.reason)};
    }catch(error){
      this.current.system={state:"unavailable",label:"OS response rejected",
        details:safeCode(error)};
    }
    try{
      this.current.workspace=workspace.status==="fulfilled"
        ?{...inspectWorkspace(workspace.value.result,workspaceId),
          observedAt:workspace.value.observedAt||observed()}
        :{state:"unavailable",label:"Workspace manifest unavailable",
          details:safeCode(workspace.reason)};
    }catch(error){
      this.current.workspace={state:"unavailable",label:"Workspace response rejected",
        details:safeCode(error)};
    }
    this.reload.disabled=false;this.render();
  }
  destroy():void{
    this.destroyed=true;this.epoch++;this.runEpoch++;this.resetRunInspection();
    this.host.replaceChildren();
  }
}
