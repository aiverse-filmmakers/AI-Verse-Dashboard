import {createHash} from "node:crypto";
import type {ApprovedCanvasOwner,CanvasHostFacts,CanvasHostRequest} from "./canvas-owner-bridge.js";

/**
 * Optional trusted-host OS permission guard for Canvas. It never opens a path,
 * imports a browser/module URL or authorizes a principal by itself. The host
 * must inject an already admitted OS evaluator and a separate authenticated
 * operator grant. The same policy is checked twice: on host admission and at
 * the canonical Data effect edge, eliminating the stale permission gap.
 *
 * Deliberately fail-closed for delete if the OS says human approval is needed:
 * approval receipts are not implemented here and cannot be supplied in RPC.
 */
export interface OsActionPermissionResult{
  decision:"allow"|"deny"|"approval_required";
  source:string;
  scope:string;
  action_class:string;
  request_fingerprint:string;
}
export interface CanvasOsPolicy{
  evaluate(input:{
    osRoot:string;
    request:{
      request_id:string;action_class:string;scope:string;operation:string;
      parameters:Record<string,unknown>;idempotency_key:string;
      request_fingerprint:string;in_scope:true;within_budget:true;
      reversible:boolean;reason:string;created_at:string;
    };
  }):OsActionPermissionResult|Promise<OsActionPermissionResult>;
  /** Authenticated independent native/OS actor-grant lookup. Cookie != grant. */
  operatorAdmitted(facts:CanvasHostFacts,req:CanvasHostRequest):boolean|Promise<boolean>;
}
const ownerSource="ai-verse-os/action-permission-v1";
const deny=()=>Object.assign(new Error("CANVAS_ACCESS_DENIED"),{code:"CANVAS_ACCESS_DENIED"});
function stable(value:unknown):unknown{
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==="object"){
    const out:Record<string,unknown>={};
    for(const k of Object.keys(value as Record<string,unknown>).sort())
      out[k]=stable((value as Record<string,unknown>)[k]);
    return out;
  }
  return value;
}
function fingerprint(value:unknown):string{
  return createHash("sha256").update(JSON.stringify(stable(value)),"utf8").digest("hex");
}
function classFor(method:string){
  switch(method){
    case "aiverse.canvas.list":
    case "aiverse.canvas.get":return "read_local";
    case "aiverse.canvas.create":
    case "aiverse.canvas.rename":
    case "aiverse.canvas.edit":return "modify_canonical_state";
    case "aiverse.canvas.delete":return "delete_data";
    default:throw deny();
  }
}
function checkRootAndScope(facts:CanvasHostFacts,owner:ApprovedCanvasOwner){
  facts.assertLease();
  if(facts.systemId!==owner.dashboardSystemId||facts.principal!=="local-operator"
    ||!/^(operator|[a-z0-9][a-z0-9-]{0,127})$/.test(facts.workspaceId))
    throw deny();
}
/**
 * The returned owner still needs an approved Data adapter. The OS evaluator
 * is the operator permission floor, not a replacement for role/actor grants.
 * Throws rather than silently granting on malformed/stale evaluator receipts.
 */
export function withCanvasOsPolicy(
  owner:ApprovedCanvasOwner,policy:CanvasOsPolicy,
):ApprovedCanvasOwner{
  const admit=async(facts:CanvasHostFacts,req:CanvasHostRequest):Promise<boolean>=>{
    checkRootAndScope(facts,owner);
    if(await policy.operatorAdmitted(facts,req)!==true)throw deny();
    facts.assertLease();
    const actionClass=classFor(req.method);
    if(facts.access!==(actionClass==="read_local"?"read":"write"))throw deny();
    const scope=facts.workspaceId==="operator"?"operator":"workspace:"+facts.workspaceId;
    const immutable={
      system_id:facts.systemId,workspace_id:facts.workspaceId,
      action:req.method,params:req.params,
    };
    const digest=fingerprint(immutable);
    // The permission evaluator's fingerprint binds the same accepted
    // request and target; it must echo it in its decision record.
    const requestId="canvas-"+digest.slice(0,32);
    const key=req.params.idempotencyKey;
    const permissionRequest={
      request_id:requestId,
      action_class:actionClass,scope,operation:req.method,
      parameters:req.params,
      idempotency_key:typeof key==="string"?key:requestId,
      request_fingerprint:digest,in_scope:true as const,within_budget:true as const,
      reversible:actionClass!=="delete_data",
      reason:"Authorized local Canvas "+req.method,
      created_at:new Date().toISOString(),
    };
    const result=await policy.evaluate({osRoot:facts.root,request:permissionRequest});
    facts.assertLease();
    if(!result||result.source!==ownerSource||result.scope!==scope
      ||result.action_class!==actionClass||result.request_fingerprint!==digest
      ||result.decision!=="allow")throw deny();
    return true;
  };
  return {
    dashboardSystemId:owner.dashboardSystemId,
    async authorize(facts,req){
      if(await admit(facts,req)!==true)return false;
      facts.assertLease();
      return await owner.authorize(facts,req)===true;
    },
    async execute(facts,req){
      // Revoke/retarget after early admission? NO effect until this fresh check.
      if(await admit(facts,req)!==true)throw deny();
      facts.assertLease();
      if(await owner.authorize(facts,req)!==true)throw deny();
      facts.assertLease();
      return await owner.execute(facts,req);
    },
  };
}
