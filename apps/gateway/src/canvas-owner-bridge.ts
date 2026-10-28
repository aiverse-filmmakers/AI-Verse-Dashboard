import {z} from "zod";
import {
  PROTOCOL_VERSION,requestSchema,
  type DashboardRequest,type DashboardResponse,
} from "../../../packages/protocol/src/index.js";
import {getWorkspace} from "../../../packages/os-read-adapter/src/index.js";
import type {SystemRegistry} from "../../../packages/registry/src/index.js";

/**
 * Trusted Canvas transport boundary, NOT a Canvas database.
 * OS and Data retain the canonical permissions and write authority.
 * A browser can only supply an operation and document inputs, never a path,
 * storage adapter, principal, credential or authorization decision.
 */
export interface CanvasHostFacts {
  readonly systemId:string;
  readonly workspaceId:string;
  readonly root:string;
  readonly principal:"local-operator"|"verified-agent";
  /** Set only by the trusted host after verifying a canonical running agent run. */
  readonly agent?:{readonly runId:string;readonly actorId:string};
  readonly access:"read"|"write";
  /** Host + owner must revalidate immediately before any canonical effect. */
  assertLease():void;
}
export type CanvasHostRequest={
  readonly method:string;
  readonly params:Record<string,unknown>;
};
export interface ApprovedCanvasOwner{
  readonly dashboardSystemId:string;
  /** Mandatory real host/OS permission evaluation for each operation. */
  authorize(facts:CanvasHostFacts,request:CanvasHostRequest):boolean|Promise<boolean>;
  /** Invoke the canonical Data owner, never a Dashboard-owned document store. */
  execute(facts:CanvasHostFacts,request:CanvasHostRequest):unknown|Promise<unknown>;
}
const id=z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const text=z.string().max(5000);
const position=z.number().finite().min(-100000).max(100000);
const title=z.string().trim().min(1).max(140);
const key=id;
const mutation=z.object({idempotencyKey:key}).strict();
const target=mutation.extend({id,expectedVersion:z.number().int().min(1)}).strict();
const note=z.discriminatedUnion("type",[
  z.object({type:z.literal("note.add"),id,text,x:position,y:position}).strict(),
  z.object({type:z.literal("note.move"),id,x:position,y:position}).strict(),
  z.object({type:z.literal("note.text"),id,text}).strict(),
  z.object({type:z.literal("note.remove"),id}).strict(),
  z.object({type:z.literal("edge.add"),id,from:id,to:id}).strict(),
  z.object({type:z.literal("edge.remove"),id}).strict(),
]);
const operations=new Map<string,{schema:z.ZodTypeAny;access:"read"|"write"}>([
  ["aiverse.canvas.list",{schema:z.object({limit:z.number().int().min(1).max(100).optional()}).strict(),access:"read"}],
  ["aiverse.canvas.get",{schema:z.object({id}).strict(),access:"read"}],
  ["aiverse.canvas.create",{schema:mutation.extend({title}).strict(),access:"write"}],
  ["aiverse.canvas.rename",{schema:target.extend({title}).strict(),access:"write"}],
  ["aiverse.canvas.edit",{schema:target.extend({edit:note}).strict(),access:"write"}],
  ["aiverse.canvas.duplicate",{schema:target.extend({title:title.optional()}).strict(),access:"write"}],
  ["aiverse.canvas.delete",{schema:target,access:"write"}],
]);
/** Shared strict Canvas action parser for trusted host agent and browser routes. */
export function validateCanvasOperation(method:string,params:unknown):
  {access:"read"|"write";params:Record<string,unknown>}|null{
  const op=operations.get(method);
  if(!op)return null;
  const parsed=op.schema.safeParse(params??{});
  return parsed.success?{access:op.access,params:parsed.data as Record<string,unknown>}:null;
}

/** Reuse the same bounded Data projection for local operator and verified agent. */
export function projectCanvasDocument(value:unknown):unknown{return project(value);}

function code(error:unknown):string{
  const value=(error as {code?:unknown})?.code;
  const safe=new Set(["CANVAS_ACCESS_DENIED","CANVAS_OWNER_UNAVAILABLE",
    "CANVAS_DOCUMENT_NOT_FOUND","RECORD_NOT_FOUND","RECORD_VERSION_CONFLICT",
    "IDEMPOTENCY_CONFLICT","CANVAS_NODE_CONFLICT","CANVAS_EDGE_CONFLICT",
    "CANVAS_NODE_NOT_FOUND","CANVAS_EDGE_NOT_FOUND","CANVAS_SCHEMA_CONFLICT"]);
  return typeof value==="string"&&safe.has(value)?value:"CANVAS_OWNER_UNAVAILABLE";
}
function project(value:unknown):unknown{
  // Data owner may add internal metadata in future. Only public Canvas
  // document fields are projected; raw SQLite rows, scope roots and receipts
  // must never escape into browser RPC.
  if(Array.isArray(value)){
    if(value.length>100)throw Error("CANVAS_PROJECTION_INVALID");
    return value.map(project);
  }
  if(!value||typeof value!=="object"||Array.isArray(value))
    throw Error("CANVAS_PROJECTION_INVALID");
  const raw=value as Record<string,unknown>;
  if(typeof raw.id!=="string"||!id.safeParse(raw.id).success
    ||typeof raw.title!=="string"||raw.title.length>140
    ||!Number.isSafeInteger(raw.version)||Number(raw.version)<1
    ||typeof raw.createdAt!=="string"||typeof raw.updatedAt!=="string")
    throw Error("CANVAS_PROJECTION_INVALID");
  const doc:Record<string,unknown>={id:raw.id,title:raw.title,version:raw.version,
    createdAt:raw.createdAt,updatedAt:raw.updatedAt};
  if(raw.board!==undefined){
    const board=raw.board as {nodes?:unknown;edges?:unknown};
    if(!board||!Array.isArray(board.nodes)||board.nodes.length>150
      ||!Array.isArray(board.edges)||board.edges.length>300)
      throw Error("CANVAS_PROJECTION_INVALID");
    const nodeSchema=z.object({id,kind:z.literal("note"),text,x:position,y:position}).strict();
    const edgeSchema=z.object({id,from:id,to:id}).strict();
    const parsedNodes=z.array(nodeSchema).safeParse(board.nodes);
    const parsedEdges=z.array(edgeSchema).safeParse(board.edges);
    if(!parsedNodes.success||!parsedEdges.success)throw Error("CANVAS_PROJECTION_INVALID");
    doc.board={nodes:parsedNodes.data,edges:parsedEdges.data};
  }
  return doc;
}
export class CanvasOwnerBridge{
  private readonly owners=new Map<string,{root:string;generation:number;owner:ApprovedCanvasOwner}>();
  constructor(private readonly registry:SystemRegistry,approved:readonly ApprovedCanvasOwner[]){
    for(const owner of approved){
      if(this.owners.has(owner.dashboardSystemId))throw Error("CANVAS_OWNER_DUPLICATE");
      const root=registry.resolveRoot(owner.dashboardSystemId);
      this.owners.set(owner.dashboardSystemId,{
        root,generation:registry.bindingGeneration(owner.dashboardSystemId),owner,
      });
    }
  }
  static recognizes(raw:unknown):boolean{
    const obj=raw&&typeof raw==="object"&&!Array.isArray(raw)
      ?raw as Record<string,unknown>:{};
    return typeof obj.method==="string"&&obj.method.startsWith("aiverse.canvas.");
  }
  async handle(raw:unknown,signal?:AbortSignal):Promise<DashboardResponse>{
    const tagged=raw&&typeof raw==="object"&&!Array.isArray(raw)
      ?raw as Record<string,unknown>:{};
    const requestId=typeof tagged.id==="string"&&tagged.id.length>0&&tagged.id.length<=128
      ?tagged.id:"unparseable";
    const systemId=typeof tagged.systemId==="string"?tagged.systemId:undefined;
    const respond=(ok:boolean,result?:unknown,errorCode?:string):DashboardResponse=>({
      type:"res",v:PROTOCOL_VERSION,id:requestId,ok,
      ...(systemId&&/^[a-z0-9][a-z0-9-]{0,63}$/.test(systemId)?{systemId}:{}),
      ...(ok?{result}:{error:{code:errorCode??"CANVAS_OWNER_UNAVAILABLE",
        message:"Canvas "+(errorCode??"CANVAS_OWNER_UNAVAILABLE")}}),
      observedAt:new Date().toISOString(),
      sourceVersion:"dashboard-canvas-owner-host-v1",
    });
    const operation=typeof tagged.method==="string"?operations.get(tagged.method):undefined;
    if(!operation)return respond(false,undefined,"UNKNOWN_METHOD");
    const parsed=requestSchema.safeParse(raw);
    if(!parsed.success)return respond(false,undefined,"INVALID_ENVELOPE");
    const frame:DashboardRequest=parsed.data;
    const payload=operation.schema.safeParse(frame.params??{});
    if(!payload.success)return respond(false,undefined,"INVALID_ENVELOPE");
    const system=frame.systemId,workspace=frame.workspaceId;
    if(!system||!workspace)return respond(false,undefined,"INVALID_ENVELOPE");
    const installed=this.owners.get(system);
    if(!installed)return respond(false,undefined,"CANVAS_OWNER_UNAVAILABLE");
    try{
      const assertLease=()=>{
        if(signal?.aborted
          ||this.registry.resolveRoot(system)!==installed.root
          ||this.registry.bindingGeneration(system)!==installed.generation)
          throw Object.assign(Error("CANVAS_ACCESS_DENIED"),{code:"CANVAS_ACCESS_DENIED"});
        if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
      };
      assertLease();
      const facts:CanvasHostFacts={
        systemId:system,workspaceId:workspace,root:installed.root,
        principal:"local-operator",access:operation.access,assertLease,
      };
      const request:CanvasHostRequest={method:frame.method,params:payload.data as Record<string,unknown>};
      // Host owner must confirm permissions, including mutation approval
      // requirements, separately from cookie/bearer authentication.
      const authorized=await installed.owner.authorize(facts,request);
      assertLease();
      if(authorized!==true)return respond(false,undefined,"CANVAS_ACCESS_DENIED");
      const result=await installed.owner.execute(facts,request);
      assertLease();
      return respond(true,{source:"canonical-data",workspaceId:workspace,
        document:project(result)});
    }catch(error){return respond(false,undefined,code(error));}
  }
}
