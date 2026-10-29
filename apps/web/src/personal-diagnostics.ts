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
export class PersonalDiagnostics{
  private readonly scope:Required<ClientScope>;
  private epoch=0;
  private open=false;
  private destroyed=false;
  private readonly gateway:HTMLElement;
  private readonly canvas:HTMLElement;
  private readonly history:HTMLElement;
  private readonly heading:HTMLElement;
  private readonly reload:HTMLButtonElement;
  private current:{gateway:Observation;canvas:Observation;history:Observation};
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
    this.canvas=node("div","personal-diagnostics-source");
    this.history=node("div","personal-diagnostics-source");
    host.classList.add("personal-diagnostics");
    host.setAttribute("aria-label","Canonical workspace diagnostics");
    host.hidden=true;
    const head=node("div","personal-diagnostics-header");
    head.append(this.heading,this.reload);
    host.replaceChildren(head,this.gateway,this.canvas,this.history);
    this.current={
      gateway:{state:"idle",label:"Canonical Gateway",details:"Not checked"},
      canvas:{state:"idle",label:"Canvas Data owner",details:"Not checked"},
      history:{state:"idle",label:"Conversation library",details:"Not checked"},
    };
    this.render();
  }
  isOpen():boolean{return this.open;}
  toggle():void{
    if(this.destroyed)return;
    this.open=!this.open;this.host.hidden=!this.open;
    if(this.open)void this.refresh();
    else this.epoch++;
  }
  retarget(next:Required<ClientScope>):void{
    if(this.destroyed)throw Error("Diagnostics closed");
    if(!next.systemId||!next.workspaceId)throw Error("DIAGNOSTICS_SCOPE_REQUIRED");
    this.epoch++;this.scope.systemId=next.systemId;
    this.scope.workspaceId=next.workspaceId;this.client.retarget(next);
    this.heading.textContent="Workspace · "+next.workspaceId;
    this.current={
      gateway:{state:"idle",label:"Canonical Gateway",details:"Not checked"},
      canvas:{state:"idle",label:"Canvas Data owner",details:"Not checked"},
      history:{state:"idle",label:"Conversation library",details:"Not checked"},
    };
    this.render();
    if(this.open)void this.refresh();
  }
  snapshot():Readonly<{gateway:Observation;canvas:Observation;history:Observation}>{
    return {gateway:{...this.current.gateway},canvas:{...this.current.canvas},
      history:{...this.current.history}};
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
    this.renderEntry(this.gateway,this.current.gateway);
    this.renderEntry(this.canvas,this.current.canvas);
    this.renderEntry(this.history,this.current.history);
  }
  async refresh():Promise<void>{
    if(this.destroyed||!this.open)return;
    const epoch=++this.epoch,workspaceId=this.scope.workspaceId,
      systemId=this.scope.systemId;
    this.current={
      gateway:{state:"loading",label:"Canonical Gateway",details:"Checking current scope…"},
      canvas:{state:"loading",label:"Canvas Data owner",details:"Checking current scope…"},
      history:{state:"loading",label:"Conversation library",details:"Checking current scope…"},
    };
    this.reload.disabled=true;this.render();
    const results=await Promise.allSettled([
      this.client.gatewayStatus(),this.client.canvasList(25),
      this.client.listGatewaySessions(5,0),
    ]);
    if(this.destroyed||!this.open||epoch!==this.epoch
      ||workspaceId!==this.scope.workspaceId
      ||systemId!==this.scope.systemId)return;
    const observed=()=>new Date().toISOString();
    const gateway=results[0],canvas=results[1],history=results[2];
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
    this.reload.disabled=false;this.render();
  }
  destroy():void{
    this.destroyed=true;this.epoch++;this.host.replaceChildren();
  }
}
