import type {SystemRegistry} from "../../../packages/registry/src/index.js";
import {getWorkspace} from "../../../packages/os-read-adapter/src/index.js";
import type {ApprovedCanvasOwner,CanvasHostFacts,CanvasHostRequest} from "./canvas-owner-bridge.js";
import {validateCanvasOperation,projectCanvasDocument} from "./canvas-owner-bridge.js";

/**
 * Trusted host-only agent entrypoint. No HTTP route or browser/model callback
 * is registered here. Canonical Gateway run identity and binding MUST be
 * resolved by an independent host-installed verifier on every operation.
 * The same approved Canvas owner and OS policy decide every Data write.
 */
export interface CanonicalCanvasAgentRun {
  readonly source:"canonical-gateway";
  readonly state:"running";
  readonly runId:string;
  readonly systemId:string;
  readonly workspaceId:string;
  readonly actorId:string;
  /** Changes whenever the trusted run/identity binding is rebound or revoked. */
  readonly leaseEpoch:string;
}
export interface CanvasAgentAction {
  readonly runId:string;
  readonly operationId:string;
  readonly method:string;
  readonly params:Record<string,unknown>;
}
export interface CanvasAgentVerifier {
  verifyRun(runId:string):CanonicalCanvasAgentRun|null|Promise<CanonicalCanvasAgentRun|null>;
}
const identifier=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const workspace=/^(operator|[a-z0-9][a-z0-9-]{0,127})$/;
const deny=(code="CANVAS_AGENT_ACCESS_DENIED")=>
  Object.assign(new Error(code),{code});
const allowed=new Set(["aiverse.canvas.list","aiverse.canvas.get",
  "aiverse.canvas.create","aiverse.canvas.rename","aiverse.canvas.edit",
  "aiverse.canvas.duplicate","aiverse.canvas.history"]);

export class CanvasAgentActions {
  private readonly root:string;
  private readonly generation:number;
  constructor(
    private readonly registry:SystemRegistry,
    private readonly owner:ApprovedCanvasOwner,
    private readonly verifier:CanvasAgentVerifier,
  ){
    this.root=registry.resolveRoot(owner.dashboardSystemId);
    this.generation=registry.bindingGeneration(owner.dashboardSystemId);
  }
  private checkLease(signal?:AbortSignal):void{
    if(signal?.aborted
      ||this.registry.resolveRoot(this.owner.dashboardSystemId)!==this.root
      ||this.registry.bindingGeneration(this.owner.dashboardSystemId)!==this.generation)
      throw deny();
  }
  private async verify(runId:string,previous?:CanonicalCanvasAgentRun,
    signal?:AbortSignal):Promise<CanonicalCanvasAgentRun>{
    this.checkLease(signal);
    const claim=await this.verifier.verifyRun(runId);
    this.checkLease(signal);
    if(!claim||claim.source!=="canonical-gateway"||claim.state!=="running"
      ||claim.runId!==runId||!identifier.test(claim.actorId)
      ||!identifier.test(claim.leaseEpoch)
      ||claim.systemId!==this.owner.dashboardSystemId
      ||!workspace.test(claim.workspaceId))
      throw deny();
    if(previous&&(claim.actorId!==previous.actorId||claim.leaseEpoch!==previous.leaseEpoch
      ||claim.workspaceId!==previous.workspaceId||claim.systemId!==previous.systemId))
      throw deny();
    if(claim.workspaceId!=="operator")
      {
        const manifest=getWorkspace(this.registry,claim.systemId,claim.workspaceId);
        if(manifest.summary.status!=="active")throw deny();
      }
    this.checkLease(signal);
    return claim;
  }
  async invoke(input:CanvasAgentAction,signal?:AbortSignal):Promise<{
    source:"canonical-data";workspaceId:string;agentRunId:string;document:unknown;
  }>{
    // Input is a proposed typed action, NOT a grant, scope, or actor.
    // The canonical target is derived solely from verified run state.
    if(!input||typeof input!=="object"||Array.isArray(input)
      ||Object.keys(input).sort().join(",")!=="method,operationId,params,runId"
      ||!identifier.test(input.runId)||!identifier.test(input.operationId)
      ||typeof input.method!=="string"||!allowed.has(input.method))
      throw deny("CANVAS_AGENT_ACTION_INVALID");
    if(!input.params||typeof input.params!=="object"||Array.isArray(input.params)
      ||Object.hasOwn(input.params,"idempotencyKey")
      ||Object.hasOwn(input.params,"actor")
      ||Object.hasOwn(input.params,"principal")
      ||Object.hasOwn(input.params,"workspaceId")
      ||Object.hasOwn(input.params,"systemId")
      ||Object.hasOwn(input.params,"root")
      ||Object.hasOwn(input.params,"approval"))
      throw deny("CANVAS_AGENT_ACTION_INVALID");
    const candidate={...input.params,
      ...(input.method==="aiverse.canvas.list"||input.method==="aiverse.canvas.get"
        ||input.method==="aiverse.canvas.history"
        ?{}:{idempotencyKey:input.operationId})};
    const parsed=validateCanvasOperation(input.method,candidate);
    if(!parsed)throw deny("CANVAS_AGENT_ACTION_INVALID");

    const claim=await this.verify(input.runId,undefined,signal);
    const assertLease=()=>{
      this.checkLease(signal);
      if(claim.workspaceId!=="operator")
        {
        const manifest=getWorkspace(this.registry,claim.systemId,claim.workspaceId);
        if(manifest.summary.status!=="active")throw deny();
      }
    };
    const facts:CanvasHostFacts={
      systemId:claim.systemId,workspaceId:claim.workspaceId,root:this.root,
      principal:"verified-agent",agent:{runId:claim.runId,actorId:claim.actorId},
      access:parsed.access,assertLease,
    };
    const request:CanvasHostRequest={method:input.method,params:parsed.params};
    // Both owner entry and owner effect are gated by a FRESH verified run
    // binding. No in-memory cached "agent permission" may become authority.
    await this.verify(input.runId,claim,signal);
    if(await this.owner.authorize(facts,request)!==true)throw deny();
    assertLease();
    await this.verify(input.runId,claim,signal);
    if(await this.owner.authorize(facts,request)!==true)throw deny();
    await this.verify(input.runId,claim,signal);
    assertLease();
    const result=await this.owner.execute(facts,request);
    assertLease();
    return {source:"canonical-data",workspaceId:claim.workspaceId,
      agentRunId:claim.runId,document:projectCanvasDocument(result)};
  }
}
