import type {SystemRegistry} from "../../../packages/registry/src/index.js";
import type {ApprovedCanvasOwner,CanvasHostFacts,CanvasHostRequest} from "./canvas-owner-bridge.js";
import {withCanvasOsPolicy,type CanvasOsPolicy} from "./canvas-os-policy.js";

/**
 * Trusted host attachment for the existing Data-owned Canvas API.
 * Only an installed host may provide these native modules and an independently
 * authenticated actor grant. Neither is ever selected from an RPC frame.
 *
 * Deliberately no Dashboard database, Data installation, OS permission parser,
 * actor minting, or browser-visible path is introduced here.
 */
export type CanvasDataActor={readonly kind:"human"|"bot";readonly id:string};
type NativeCanvas={
  list:(...args:any[])=>unknown;
  get:(...args:any[])=>unknown;
  create:(...args:any[])=>unknown;
  rename:(...args:any[])=>unknown;
  edit:(...args:any[])=>unknown;
  delete:(...args:any[])=>unknown;
};
export interface NativeCanvasDataModules<Root,Scope,Database>{
  TrustedDataRoot:{fromExistingDirectory:(path:string)=>Root};
  createStandaloneDataScope:(root:Root,workspaceId:string)=>Scope;
  createWorkspaceDataScope:(root:Root,workspaceId:string)=>Scope;
  openScopedDataDatabase:(driver:any,scope:Scope,options:{mode:"open-existing"})=>{database:Database};
  SqliteStorageDriver:new()=>any;
  CanvasDocuments:new(database:Database)=>NativeCanvas;
}
export interface AdmittedCanvasDataOwner<Root,Scope,Database>{
  readonly dashboardSystemId:string;
  readonly native:NativeCanvasDataModules<Root,Scope,Database>;
  /** Independent OS evaluator, NOT a policy reconstructed inside Dashboard. */
  readonly osPolicy:CanvasOsPolicy;
  /**
   * Trusted host's live actor/scope grant resolver. Null means no grant.
   * It must validate authenticated identity, operation, system and workspace.
   * Browser cookies and the Dashboard "local-operator" label are not grants.
   */
  readonly admittedActor:(facts:CanvasHostFacts,request:CanvasHostRequest)=>
    CanvasDataActor|null|Promise<CanvasDataActor|null>;
}
const deny=()=>Object.assign(new Error("CANVAS_ACCESS_DENIED"),{code:"CANVAS_ACCESS_DENIED"});
const actorId=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

/** Builds the *host-only*, generation-pinned owner; the caller installs it in CanvasOwnerBridge. */
export function createAdmittedCanvasDataOwner<Root,Scope,Database extends {close():void}>(
  registry:SystemRegistry,
  options:AdmittedCanvasDataOwner<Root,Scope,Database>,
):ApprovedCanvasOwner{
  const systemId=options.dashboardSystemId;
  const approvedRoot=registry.resolveRoot(systemId);
  const generation=registry.bindingGeneration(systemId);
  const verify=(facts:CanvasHostFacts)=>{
    facts.assertLease();
    if(facts.systemId!==systemId || facts.root!==approvedRoot
      ||registry.resolveRoot(systemId)!==approvedRoot
      ||registry.bindingGeneration(systemId)!==generation
      ||(facts.principal!=="local-operator"&&facts.principal!=="verified-agent"))throw deny();
  };
  const admit=async(facts:CanvasHostFacts,request:CanvasHostRequest)=>{
    verify(facts);
    const grant=await options.admittedActor(facts,request);
    verify(facts);
    const expectedKind=facts.principal==="verified-agent"?"bot":"human";
    if(!grant||grant.kind!==expectedKind||typeof grant.id!=="string"
      ||!actorId.test(grant.id)
      ||(facts.principal==="verified-agent"&&grant.id!==facts.agent?.actorId))throw deny();
    return {kind:expectedKind,id:grant.id};
  };
  const owner:ApprovedCanvasOwner={
    dashboardSystemId:systemId,
    async authorize(facts,request){
      await admit(facts,request);
      return true;
    },
    async execute(facts,request){
      // The OS policy wrapper rechecks policy and owner authorization at the
      // effect edge. Resolve the live actor grant once more, never cache it.
      const actor=await admit(facts,request);
      verify(facts);
      const api=options.native;
      const trustedRoot=api.TrustedDataRoot.fromExistingDirectory(approvedRoot);
      const scope=facts.workspaceId==="operator"
        ?api.createStandaloneDataScope(trustedRoot,"local")
        :api.createWorkspaceDataScope(trustedRoot,facts.workspaceId);
      verify(facts);
      // Existing DB only. Data initialization/provisioning is an explicit
      // owner lifecycle step, never an implicit browser create/list action.
      const handle=api.openScopedDataDatabase(new api.SqliteStorageDriver(),scope,
        {mode:"open-existing"});
      try{
        verify(facts);
        const canvas=new api.CanvasDocuments(handle.database);
        const p=request.params;
        const target={
          id:p.id,expectedVersion:p.expectedVersion,
          idempotencyKey:p.idempotencyKey,actor,
        };
        // Schema validation was already performed by CanvasOwnerBridge.
        // Pass the native methods through unchanged to retain Data's own
        // version, provenance, idempotency, and soft-delete behavior.
        verify(facts);
        switch(request.method){
          case "aiverse.canvas.list":return canvas.list(p.limit);
          case "aiverse.canvas.get":return canvas.get(p.id);
          case "aiverse.canvas.create":return canvas.create({
            title:p.title,idempotencyKey:p.idempotencyKey,actor,
          });
          case "aiverse.canvas.rename":return canvas.rename({...target,title:p.title});
          case "aiverse.canvas.edit":return canvas.edit({...target,edit:p.edit});
          case "aiverse.canvas.delete":return canvas.delete(target);
          default:throw deny();
        }
      }finally{handle.database.close();}
    },
  };
  return withCanvasOsPolicy(owner,options.osPolicy);
}
