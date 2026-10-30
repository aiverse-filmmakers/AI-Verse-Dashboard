import type {SystemRegistry} from "../../../packages/registry/src/index.js";
import type {CanvasDataActor} from "./canvas-data-owner.js";
import type {CanvasHostFacts,CanvasHostRequest} from "./canvas-owner-bridge.js";
import type {CanvasAgentGrantFacts,CanvasAdmittedActorGrant} from "./canvas-gateway-run-verifier.js";

/**
 * Native OS *reader*, not a grant issuer. Caller MUST separately authenticate
 * human session / running Gateway session; a browser cookie is insufficient.
 * Injected verifier is the owner code in AI-Verse-OS's pinned source.
 */
export interface NativeOsCanvasGrant{
  readonly source:string;
  readonly actorKind:"human"|"bot";
  readonly actorId:string;
  readonly leaseEpoch:string;
  readonly systemId:string;
  readonly workspaceId:string;
  readonly principal:string;
  readonly method:string;
  readonly runId?:string;
  readonly sessionId?:string;
}
export interface NativeOsGrantReader{
  verifyInstalledCanvasGrant(input:{
    osRoot:string;
    facts:{
      systemId:string;workspaceId:string;principal:string;
      actorKind:"human"|"bot";actorId?:string;method:string;
      runId?:string;sessionId?:string;
    };
  }):NativeOsCanvasGrant|null|Promise<NativeOsCanvasGrant|null>;
}
export interface TrustedCanvasHumanSession{
  /** Stable identity verified by a native OS session, not a Dashboard bearer. */
  readonly principal:string;
}
export interface TrustedCanvasBotSession{
  readonly principal:string;
  readonly runId:string;
  readonly sessionId:string;
  readonly actorId:string;
}
export interface OsCanvasGrantOptions{
  dashboardSystemId:string;
  native:NativeOsGrantReader;
  /** Deliberately absent unless native owner session authentication exists. */
  authenticateHuman:(facts:CanvasHostFacts,req:CanvasHostRequest)=>
    TrustedCanvasHumanSession|null|Promise<TrustedCanvasHumanSession|null>;
  /** An independently verified, currently running canonical Gateway session. */
  authenticateBot:(facts:CanvasHostFacts,req:CanvasHostRequest)=>
    TrustedCanvasBotSession|null|Promise<TrustedCanvasBotSession|null>;
}
const ID=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const deny=()=>null;
const SOURCE="ai-verse-os/canvas-actor-grants-v1";
const humanFacts=(facts:CanvasHostFacts,verified:TrustedCanvasHumanSession,method:string)=>({
  systemId:facts.systemId,workspaceId:facts.workspaceId,
  principal:verified.principal,actorKind:"human" as const,method,
});
const botFacts=(facts:CanvasHostFacts,verified:TrustedCanvasBotSession,method:string)=>({
  systemId:facts.systemId,workspaceId:facts.workspaceId,
  principal:verified.principal,actorKind:"bot" as const,
  actorId:verified.actorId,runId:verified.runId,
  sessionId:verified.sessionId,method,
});
/** Host-only adapters for existing Data and OS policy effect edges. */
export function createOsNativeCanvasGrantResolvers(
  registry:SystemRegistry, options:OsCanvasGrantOptions,
){
  const root=registry.resolveRoot(options.dashboardSystemId);
  const generation=registry.bindingGeneration(options.dashboardSystemId);
  const lease=()=>{
    try{
      return registry.resolveRoot(options.dashboardSystemId)===root
        && registry.bindingGeneration(options.dashboardSystemId)===generation;
    }catch{return false;}
  };
  const admitted=async(facts:CanvasHostFacts,req:CanvasHostRequest):Promise<NativeOsCanvasGrant|null>=>{
    if(!lease()||facts.root!==root||facts.systemId!==options.dashboardSystemId
      ||typeof req.method!=="string")return deny();
    try{facts.assertLease();}catch{return deny();}
    let claim:ReturnType<typeof humanFacts>|ReturnType<typeof botFacts>;
    if(facts.principal==="local-operator" && !facts.agent){
      const session=await options.authenticateHuman(facts,req);
      if(!lease()||!session||!ID.test(session.principal))return deny();
      claim=humanFacts(facts,session,req.method);
    }else if(facts.principal==="verified-agent"&&facts.agent){
      const session=await options.authenticateBot(facts,req);
      if(!lease()||!session||!ID.test(session.principal)
        ||!ID.test(session.actorId)||!ID.test(session.sessionId)
        ||session.runId!==facts.agent.runId
        ||session.actorId!==facts.agent.actorId)return deny();
      claim=botFacts(facts,session,req.method);
    }else{return deny();}
    const grant=await options.native.verifyInstalledCanvasGrant({osRoot:root,facts:claim});
    if(!lease())return deny();
    try{facts.assertLease();}catch{return deny();}
    if(!grant||grant.source!==SOURCE||grant.actorKind!==claim.actorKind
      ||grant.systemId!==facts.systemId||grant.workspaceId!==facts.workspaceId
      ||grant.principal!==claim.principal||grant.method!==req.method
      ||!ID.test(grant.actorId)||typeof grant.leaseEpoch!=="string"
      ||grant.leaseEpoch.length===0
      ||(claim.actorKind==="bot"&&
        (grant.actorId!==claim.actorId||grant.runId!==claim.runId
          ||grant.sessionId!==claim.sessionId)))return deny();
    return grant;
  };
  return {
    async admittedActor(facts:CanvasHostFacts,req:CanvasHostRequest):
      Promise<CanvasDataActor|null>{
      const grant=await admitted(facts,req);
      return grant?{kind:grant.actorKind,id:grant.actorId}:null;
    },
    async operatorAdmitted(facts:CanvasHostFacts,req:CanvasHostRequest){
      return (await admitted(facts,req))?.actorKind==="human";
    },
    async agentAdmitted(facts:CanvasHostFacts,req:CanvasHostRequest){
      return (await admitted(facts,req))?.actorKind==="bot";
    },
    /** Only the canonical GatewayStore verifier may call this with authenticated run facts.
     * A "get" grant is a minimum prerequisite; actual effects still check
     * their exact method at the Data owner, with a fresh OS grant read.
     */
    async resolveAdmittedActor(facts:CanvasAgentGrantFacts):
      Promise<CanvasAdmittedActorGrant|null>{
      if(!lease()||facts.dashboardSystemId!==options.dashboardSystemId
        ||typeof facts.principal!=="string"||!ID.test(facts.principal)
        ||!ID.test(facts.runId)||!ID.test(facts.sessionId)
        ||!ID.test(facts.workspaceId))return deny();
      const grant=await options.native.verifyInstalledCanvasGrant({
        osRoot:root,facts:{systemId:facts.dashboardSystemId,
          workspaceId:facts.workspaceId,principal:facts.principal,
          actorKind:"bot",runId:facts.runId,sessionId:facts.sessionId,
          method:"aiverse.canvas.get"},
      });
      if(!lease()||!grant||grant.source!==SOURCE||grant.actorKind!=="bot"
        ||grant.systemId!==facts.dashboardSystemId
        ||grant.workspaceId!==facts.workspaceId||grant.principal!==facts.principal
        ||grant.runId!==facts.runId||grant.sessionId!==facts.sessionId
        ||grant.method!=="aiverse.canvas.get"||!ID.test(grant.actorId)
        ||!ID.test(grant.leaseEpoch))return deny();
      return {actorKind:"bot",actorId:grant.actorId,leaseEpoch:grant.leaseEpoch,
        runId:facts.runId,sessionId:facts.sessionId,
        principal:facts.principal,workspaceId:facts.workspaceId};
    },
  };
}
