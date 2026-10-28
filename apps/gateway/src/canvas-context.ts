import type {SystemRegistry} from "../../../packages/registry/src/index.js";
import {getWorkspace} from "../../../packages/os-read-adapter/src/index.js";
import type {ApprovedCanvasOwner,CanvasHostFacts,CanvasHostRequest}
  from "./canvas-owner-bridge.js";
import {projectCanvasDocument} from "./canvas-owner-bridge.js";

/**
 * Read a bounded snapshot of an actively selected Canvas through its
 * canonical owner. NOT an HTTP route and NOT a model tool.
 *
 * This does not authenticate a user. The installed trusted OS/Gateway host
 * must supply already authenticated CanvasHostFacts, including a fresh native
 * actor-grant checker in owner.authorize/owner.execute.
 */
export interface CanvasSelectionRequest{
  readonly documentId:string;
  readonly expectedVersion?:number;
  readonly selectedNodeIds?:readonly string[];
  readonly selectedEdgeIds?:readonly string[];
}
export interface SelectedCanvasNote{
  readonly id:string;readonly x:number;readonly y:number;
  readonly text:string;readonly truncated:boolean;
  readonly trust:"untrusted-canvas-text";
}
export interface SelectedCanvasEdge{
  readonly id:string;readonly from:string;readonly to:string;
}
export interface CanvasContextSnapshot{
  readonly source:"canonical-data/canvas-selection";
  readonly systemId:string;readonly workspaceId:string;
  readonly documentId:string;readonly documentTitle:string;
  readonly documentVersion:number;readonly selectedNodes:readonly SelectedCanvasNote[];
  readonly selectedEdges:readonly SelectedCanvasEdge[];
  readonly noteCount:number;readonly edgeCount:number;
}
const IDENTIFIER=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const issuedSnapshots=new WeakSet<object>();
/** Only in-process snapshots minted by a trusted canonical Canvas owner qualify. */
export function isHostCanvasContextSnapshot(value:unknown):
  value is CanvasContextSnapshot{
  return !!value&&typeof value==="object"&&issuedSnapshots.has(value);
}
const DENIED="CANVAS_CONTEXT_DENIED";
const fail=()=>Object.assign(Error(DENIED),{code:DENIED});
const keys=(v:unknown,allowed:readonly string[])=>!!v&&typeof v==="object"
  &&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const validId=(v:unknown):v is string=>typeof v==="string"&&IDENTIFIER.test(v);
function ids(v:unknown):string[]{
 if(v===undefined)return [];
 if(!Array.isArray(v)||v.length>16||v.some(x=>!validId(x))
   ||new Set(v).size!==v.length)throw fail();
 return [...v] as string[];
}
function requestOf(input:CanvasSelectionRequest){
 if(!keys(input,["documentId","expectedVersion","selectedNodeIds","selectedEdgeIds"])
   ||!validId(input.documentId)
   ||(input.expectedVersion!==undefined
     &&(!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<1)))
   throw fail();
 return {documentId:input.documentId,expectedVersion:input.expectedVersion,
   nodeIds:ids(input.selectedNodeIds),edgeIds:ids(input.selectedEdgeIds)};
}
function isBoardDocument(v:unknown):v is {
 id:string;title:string;version:number;
 board:{nodes:{id:string;kind:"note";text:string;x:number;y:number}[];
 edges:{id:string;from:string;to:string}[]}
}{
 if(!v||typeof v!=="object")return false;
 const o=v as Record<string,unknown>;
 if(typeof o.id!=="string"||typeof o.title!=="string"
   ||!Number.isSafeInteger(o.version)||!o.board||typeof o.board!=="object")
   return false;
 const board=o.board as Record<string,unknown>;
 return Array.isArray(board.nodes)&&Array.isArray(board.edges);
}
export class CanvasContextReader{
 private readonly root:string;
 private readonly generation:number;
 constructor(private readonly registry:SystemRegistry,
   private readonly owner:ApprovedCanvasOwner){
  this.root=registry.resolveRoot(owner.dashboardSystemId);
  this.generation=registry.bindingGeneration(owner.dashboardSystemId);
 }
 private lease(facts:CanvasHostFacts,signal?:AbortSignal):void{
  if(signal?.aborted||facts.root!==this.root||
    facts.systemId!==this.owner.dashboardSystemId||
    this.registry.resolveRoot(facts.systemId)!==this.root||
    this.registry.bindingGeneration(facts.systemId)!==this.generation)
    throw fail();
  try{facts.assertLease();}catch{throw fail();}
  if(facts.workspaceId!=="operator"){
   try{
    if(getWorkspace(this.registry,facts.systemId,facts.workspaceId)
      .summary.status!=="active")throw fail();
   }catch{throw fail();}
  }
 }
 async capture(facts:CanvasHostFacts,input:CanvasSelectionRequest,
   signal?:AbortSignal):Promise<CanvasContextSnapshot>{
  const selected=requestOf(input);
  if(!facts||!["local-operator","verified-agent"].includes(facts.principal)
    ||(facts.principal==="verified-agent"
      &&(!facts.agent||!validId(facts.agent.runId)
        ||!validId(facts.agent.actorId)))
    ||(facts.principal==="local-operator"&&facts.agent!==undefined)
    ||facts.access!=="read")throw fail();
  this.lease(facts,signal);
  const request:CanvasHostRequest={
   method:"aiverse.canvas.get",params:{id:selected.documentId}};
  // Authorization must use the independently authenticated host identity.
  if(await this.owner.authorize(facts,request)!==true)throw fail();
  this.lease(facts,signal);
  const raw=await this.owner.execute(facts,request);
  this.lease(facts,signal);
  let document:unknown;
  try{document=projectCanvasDocument(raw);}catch{throw fail();}
  if(!isBoardDocument(document)||document.id!==selected.documentId
    ||(selected.expectedVersion!==undefined
      &&document.version!==selected.expectedVersion))throw fail();
  const nodes=new Map(document.board.nodes.map(n=>[n.id,n]));
  const edges=new Map(document.board.edges.map(e=>[e.id,e]));
  if(selected.nodeIds.some(id=>!nodes.has(id))
    ||selected.edgeIds.some(id=>!edges.has(id)))throw fail();
  const selectedNodes=selected.nodeIds.map(id=>{
    const n=nodes.get(id)!;
    return Object.freeze({id:n.id,x:n.x,y:n.y,
      text:n.text.slice(0,1000),truncated:n.text.length>1000,
      trust:"untrusted-canvas-text" as const});
  });
  const selectedEdges=selected.edgeIds.map(id=>{
    const e=edges.get(id)!;
    return Object.freeze({id:e.id,from:e.from,to:e.to});
  });
  // Do not send unselected note text, raw records, actor/grant identities,
  // filesystem roots, bearer secrets or owner permission decisions.
  const snapshot:CanvasContextSnapshot={
   source:"canonical-data/canvas-selection",
   systemId:facts.systemId,workspaceId:facts.workspaceId,
   documentId:document.id,documentTitle:document.title,
   documentVersion:document.version,
   selectedNodes:Object.freeze(selectedNodes),
   selectedEdges:Object.freeze(selectedEdges),
   noteCount:document.board.nodes.length,
   edgeCount:document.board.edges.length,
  };
  this.lease(facts,signal);
  const minted=Object.freeze(snapshot);
  issuedSnapshots.add(minted);
  return minted;
 }
}
