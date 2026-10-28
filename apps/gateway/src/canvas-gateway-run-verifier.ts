import type {SystemRegistry} from "../../../packages/registry/src/index.js";
import {getWorkspace} from "../../../packages/os-read-adapter/src/index.js";
import type {CanonicalCanvasAgentRun,CanvasAgentVerifier} from "./canvas-agent-actions.js";

/**
 * Trusted-host adapter to the *actual* AI-Verse-Gateway Store contract
 * (GatewayStore.getRun/getSession, reviewed 9748dd0).
 *
 * Gateway owns run/session status and principal. It does not issue a bot
 * identity or Canvas grant, so that must come from an independently admitted,
 * trusted OS/host actor-grant resolver. This is NOT a general Dashboard RPC
 * and deliberately does not open Gateway state files or invent a token.
 */
export interface CanonicalGatewayRunStore{
  getRun(runId:string):Promise<unknown>;
  getSession(sessionId:string):Promise<unknown>;
}
export interface CanvasAgentGrantFacts{
  readonly runId:string;
  readonly sessionId:string;
  readonly canonicalSystemId:string;
  readonly dashboardSystemId:string;
  readonly workspaceId:string;
  readonly principal:string;
}
export interface CanvasAdmittedActorGrant{
  readonly actorKind:"bot";
  readonly actorId:string;
  /** Revocable generation from the real trusted OS/host actor-grant owner. */
  readonly leaseEpoch:string;
  /** Bind the grant to the exact authenticated canonical run. */
  readonly runId:string;
  readonly sessionId:string;
  readonly principal:string;
  readonly workspaceId:string;
}
export interface GatewayCanvasRunVerifierOptions{
  readonly dashboardSystemId:string;
  readonly canonicalSystemId:string;
  /** Authenticated Gateway principal bound to the installed Gateway service. */
  readonly approvedPrincipal:string;
  readonly store:CanonicalGatewayRunStore;
  /** May return null; never synthesize a grant from chat content or run ID. */
  readonly resolveAdmittedActor:(facts:CanvasAgentGrantFacts)=>
    CanvasAdmittedActorGrant|null|Promise<CanvasAdmittedActorGrant|null>;
}
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const WORKSPACE=/^(operator|[a-z0-9][a-z0-9-]{0,127})$/;
const fail=()=>Object.assign(Error("CANVAS_AGENT_ACCESS_DENIED"),
  {code:"CANVAS_AGENT_ACCESS_DENIED"});
const obj=(v:unknown):Record<string,unknown>=>{
  if(!v||typeof v!=="object"||Array.isArray(v))throw fail();
  return v as Record<string,unknown>;
};

/**
 * A running Gateway run alone is NOT authorization. The two independent
 * predicates (canonical run/session and approved bot grant) must both hold.
 */
export function createGatewayStoreCanvasRunVerifier(
  registry:SystemRegistry,
  options:GatewayCanvasRunVerifierOptions,
):CanvasAgentVerifier{
  const {dashboardSystemId,canonicalSystemId,approvedPrincipal,store}=options;
  if(!ID.test(canonicalSystemId)||!ID.test(approvedPrincipal)
    ||typeof options.resolveAdmittedActor!=="function"
    ||typeof store?.getRun!=="function"||typeof store?.getSession!=="function")
    throw fail();
  const approvedRoot=registry.resolveRoot(dashboardSystemId);
  const generation=registry.bindingGeneration(dashboardSystemId);
  const lease=()=>{
    if(registry.resolveRoot(dashboardSystemId)!==approvedRoot
      ||registry.bindingGeneration(dashboardSystemId)!==generation)throw fail();
  };
  const read=async(runId:string)=>{
    lease();
    const run=obj(await store.getRun(runId));
    if(run.run_id!==runId||run.system_id!==canonicalSystemId
      ||run.principal!==approvedPrincipal||run.status!=="running"
      ||typeof run.session_id!=="string"||!ID.test(run.session_id)
      ||typeof run.workspace_id!=="string"||!WORKSPACE.test(run.workspace_id)
      ||run.pending_approval!=null
      ||(run.deadline_at!=null&&
        (typeof run.deadline_at!=="string"||
          !Number.isFinite(Date.parse(run.deadline_at))||
          Date.now()>=Date.parse(run.deadline_at))))
      throw fail();
    const session=obj(await store.getSession(run.session_id));
    lease();
    if(session.session_id!==run.session_id
      ||session.system_id!==canonicalSystemId
      ||session.workspace_id!==run.workspace_id
      ||session.principal!==approvedPrincipal
      ||session.status!=="active"
      ||session.active_run_id!==runId)throw fail();
    if(run.workspace_id!=="operator"){
      try{
        const workspace=getWorkspace(registry,dashboardSystemId,run.workspace_id);
        if(workspace.summary.status!=="active")throw fail();
      }catch{throw fail();}
    }
    return {run,session};
  };
  return {
    async verifyRun(runId){
      if(typeof runId!=="string"||!ID.test(runId))return null;
      try{
        const before=await read(runId);
        const b=before.run;
        const facts:CanvasAgentGrantFacts={
          runId,sessionId:b.session_id as string,
          canonicalSystemId,dashboardSystemId,
          workspaceId:b.workspace_id as string,principal:approvedPrincipal,
        };
        const grant=await options.resolveAdmittedActor(facts);
        lease();
        if(!grant||grant.actorKind!=="bot"
          ||typeof grant.actorId!=="string"||!ID.test(grant.actorId)
          ||typeof grant.leaseEpoch!=="string"||!ID.test(grant.leaseEpoch)
          ||grant.runId!==facts.runId||grant.sessionId!==facts.sessionId
          ||grant.principal!==facts.principal
          ||grant.workspaceId!==facts.workspaceId)throw fail();
        // Re-read canonical state after potentially delayed native admission.
        // Rebinding, cancellation, concurrent session reassignment and
        // paused/awaiting_approval statuses revoke this result.
        const after=await read(runId);
        if(after.run.session_id!==before.run.session_id
          ||after.run.workspace_id!==before.run.workspace_id
          ||after.run.principal!==before.run.principal)throw fail();
        return {
          source:"canonical-gateway",state:"running",
          runId,systemId:dashboardSystemId,workspaceId:facts.workspaceId,
          actorId:grant.actorId,leaseEpoch:grant.leaseEpoch,
        };
      }catch{return null;}
    },
  };
}
