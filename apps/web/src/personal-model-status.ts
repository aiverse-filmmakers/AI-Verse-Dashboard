import {DashboardClient,type ClientScope} from "../../../packages/client/src/index.js";

/** Actual installed Gateway capability information, never a local model-picker store. */
export interface ModelCatalogView {
  model:string;
  runtimeKind:string;
  selectionSupported:false;
  providerSelectionSupported:false;
  evidence:string;
  observedAt:string;
}
function bad():never {throw Error("MODEL_CATALOG_INVALID_SOURCE");}
export function inspectModelCatalog(input:unknown,scope:Required<ClientScope>):ModelCatalogView {
  if(!input||typeof input!=="object"||Array.isArray(input))return bad();
  const value=input as Record<string,unknown>;
  if(value.source!=="canonical-gateway"||value.workspaceId!==scope.workspaceId)
    throw Error("MODEL_CATALOG_SCOPE_MISMATCH");
  if(value.modelSelectionSupported!==false||value.providerSelectionSupported!==false
    ||value.inferenceVerified!==false||value.evidence!=="authenticated-status-and-models"
    ||!Array.isArray(value.models)||value.models.length!==1)return bad();
  const first=value.models[0];
  if(!first||typeof first!=="object"||Array.isArray(first))return bad();
  const model=first as Record<string,unknown>;
  if(model.id!=="aiverse"||model.kind!=="gateway-virtual"||model.label!=="AI-Verse Gateway")
    return bad();
  if(typeof value.runtimeKind!=="string"
    ||!(/^[a-z][a-z0-9_-]{0,31}$/.test(value.runtimeKind))
    ||typeof value.observedAt!=="string"||value.observedAt.length>40
    ||Number.isNaN(Date.parse(value.observedAt)))return bad();
  return {model:"aiverse",runtimeKind:value.runtimeKind,
    selectionSupported:false,providerSelectionSupported:false,
    evidence:"authenticated-status-and-models",observedAt:value.observedAt};
}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string){
  const node=document.createElement(tag);
  node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
}
function safeCode(error:unknown){
  const code=(error as {code?:unknown})?.code;
  return typeof code==="string"&&/^[A-Z][A-Z0-9_]{1,63}$/.test(code)
    ?code:"MODEL_CATALOG_UNAVAILABLE";
}
/** Read-only window. Provider choices cannot be forged by browser or model text. */
export class PersonalModelStatus {
  private epoch=0;
  private opened=false;
  private destroyed=false;
  private selected:Required<ClientScope>;
  private readonly heading:HTMLElement;
  private readonly content:HTMLElement;
  private readonly refreshButton:HTMLButtonElement;
  constructor(private readonly host:HTMLElement,private readonly client:DashboardClient){
    const scope=client.getScope();
    if(!scope.systemId||!scope.workspaceId)throw Error("MODEL_CATALOG_SCOPE_REQUIRED");
    this.selected={systemId:scope.systemId,workspaceId:scope.workspaceId};
    host.classList.add("personal-model-status");
    host.setAttribute("aria-label","Gateway model availability");
    host.hidden=true;
    this.heading=el("strong","personal-model-status-heading","AI model · "+scope.workspaceId);
    this.refreshButton=el("button","personal-model-refresh","Refresh models");
    this.refreshButton.type="button";
    this.refreshButton.addEventListener("click",()=>{void this.refresh();});
    const header=el("div","personal-model-header");
    header.append(this.heading,this.refreshButton);
    this.content=el("div","personal-model-content");
    host.replaceChildren(header,this.content);
  }
  toggle():void{
    if(this.destroyed)return;
    this.opened=!this.opened;
    this.host.hidden=!this.opened;
    this.epoch++;
    if(this.opened)void this.refresh();
  }
  retarget(scope:Required<ClientScope>):void{
    if(this.destroyed)throw Error("MODEL_CATALOG_CLOSED");
    if(!scope.systemId||!scope.workspaceId)throw Error("MODEL_CATALOG_SCOPE_REQUIRED");
    this.selected={...scope};
    this.client.retarget(scope);
    this.epoch++;
    this.heading.textContent="AI model · "+scope.workspaceId;
    this.content.replaceChildren(el("p","personal-model-state","Workspace changed. Refresh required."));
    if(this.opened)void this.refresh();
  }
  private async refresh():Promise<void>{
    if(this.destroyed||!this.opened)return;
    const epoch=++this.epoch,scope={...this.selected};
    this.refreshButton.disabled=true;
    this.content.replaceChildren(el("p","personal-model-state","Checking canonical Gateway…"));
    try{
      const response=await this.client.gatewayModels();
      if(this.destroyed||!this.opened||epoch!==this.epoch
        ||scope.systemId!==this.selected.systemId||scope.workspaceId!==this.selected.workspaceId)return;
      const view=inspectModelCatalog(response.result,scope);
      const title=el("p","personal-model-name","AI-Verse Gateway (aiverse)");
      const runtime=el("p","personal-model-state","Reported runtime: "+view.runtimeKind);
      const note=el("p","personal-model-state",
        "This is the Gateway's actual virtual model. Physical provider/model selection is not supported by this connection.");
      const observation=el("p","personal-model-state",
        "Authenticated model inventory · inference not verified · "+view.observedAt);
      this.content.replaceChildren(title,runtime,note,observation);
    }catch(error){
      if(this.destroyed||!this.opened||epoch!==this.epoch)return;
      this.content.replaceChildren(el("p","personal-model-state",
        "Model inventory unavailable · "+safeCode(error)));
    }finally{
      if(epoch===this.epoch&&!this.destroyed)this.refreshButton.disabled=false;
    }
  }
  destroy():void{
    this.destroyed=true;this.epoch++;
    this.host.replaceChildren();
  }
}
