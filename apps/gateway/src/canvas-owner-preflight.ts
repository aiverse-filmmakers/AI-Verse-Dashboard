import type {SystemRegistry} from "../../../packages/registry/src/index.js";
import {getWorkspace} from "../../../packages/os-read-adapter/src/index.js";

/**
 * Trusted-host-only, readonly readiness inspection for installed Canvas Data.
 * There is NO RPC method, browser entrypoint, fallback database or installer.
 * The Data owner performs all actual scope, binding and SQLite checks.
 */
export interface CanvasPreflightNative<Root,Scope>{
  TrustedDataRoot:{fromExistingDirectory:(root:string)=>Root};
  createStandaloneDataScope:(root:Root,id:string)=>Scope;
  createWorkspaceDataScope:(root:Root,id:string)=>Scope;
  SqliteStorageDriver:new()=>unknown;
  inspectScopedDataDatabase:(driver:any,scope:Scope)=>{
    state:string;
    binding:{kind:string;workspaceId:string;bindingVersion:number}|null;
  };
}
export interface CanvasScopeReadiness{
  readonly ready:boolean;
  readonly systemId:string;
  readonly workspaceId:string;
  readonly reason:"ready"|"scope-inactive"|"root-rebound"|"invalid-workspace"
    |"database-missing"|"scope-conflict"|"migration-required"
    |"database-quarantined"|"database-unavailable";
}
const WORKSPACE=/^(operator|[a-z0-9][a-z0-9-]{0,127})$/;
const reasonFor=(error:unknown):CanvasScopeReadiness["reason"]=>{
  const code=(error as {code?:unknown})?.code;
  switch(code){
    case "DATABASE_NOT_FOUND":return "database-missing";
    case "DATABASE_SCOPE_CONFLICT":return "scope-conflict";
    case "DATABASE_QUARANTINED":return "database-quarantined";
    default:return "database-unavailable";
  }
};
export function createCanvasOwnerPreflight<Root,Scope>(
  registry:SystemRegistry,
  systemId:string,
  native:CanvasPreflightNative<Root,Scope>,
){
  const root=registry.resolveRoot(systemId);
  const generation=registry.bindingGeneration(systemId);
  return {
    inspect(workspaceId:string):CanvasScopeReadiness{
      const emit=(reason:CanvasScopeReadiness["reason"]):CanvasScopeReadiness=>({
        ready:reason==="ready",systemId,workspaceId,reason,
      });
      // Fail closed after any root reassignment, including across restart.
      try{
        if(registry.resolveRoot(systemId)!==root||
          registry.bindingGeneration(systemId)!==generation)
          return emit("root-rebound");
      }catch{return emit("root-rebound");}
      if(typeof workspaceId!=="string"||!WORKSPACE.test(workspaceId))
        return emit("invalid-workspace");
      if(workspaceId!=="operator"){
        try{
          const workspace=getWorkspace(registry,systemId,workspaceId);
          if(workspace.summary.status!=="active")return emit("scope-inactive");
        }catch{return emit("scope-inactive");}
      }
      try{
        const trusted=native.TrustedDataRoot.fromExistingDirectory(root);
        const scope=workspaceId==="operator"
          ?native.createStandaloneDataScope(trusted,"local")
          :native.createWorkspaceDataScope(trusted,workspaceId);
        const state=native.inspectScopedDataDatabase(new native.SqliteStorageDriver(),scope);
        const expected={kind:workspaceId==="operator"?"standalone":"workspace",
          workspaceId:workspaceId==="operator"?"local":workspaceId};
        if(state.binding?.kind!==expected.kind||
           state.binding?.workspaceId!==expected.workspaceId||
           state.binding?.bindingVersion!==1)return emit("scope-conflict");
        if(state.state!=="current")return emit("migration-required");
        // An inspection may be slow, so the OS root must be rechecked.
        try{
          if(registry.resolveRoot(systemId)!==root||
            registry.bindingGeneration(systemId)!==generation)return emit("root-rebound");
        }catch{return emit("root-rebound");}
        return emit("ready");
      }catch(error){return emit(reasonFor(error));}
    },
  };
}
