import { z } from "zod";
import { PROTOCOL_VERSION, requestSchema, type DashboardRequest, type DashboardResponse } from "../../../packages/protocol/src/index.js";
import { getWorkspace } from "../../../packages/os-read-adapter/src/index.js";
import type { SystemRegistry } from "../../../packages/registry/src/index.js";
import {
  CanonicalGatewayClient, GatewayTransportError,
  type GatewayRun, type HostGatewayBinding, type GatewayTransportOptions,
} from "../../../packages/client/src/canonical-gateway-client.js";

/**
 * MC2.2 trusted-host bridge. No provider credential, origin, root, principal
 * or permission can be supplied by a browser RPC frame. An admitted host
 * explicitly injects a connection mapping and a bearer resolver at startup.
 * Existing Dashboard /rpc projections retain their original QueryRouter.
 */
export interface ApprovedCanonicalGateway {
  dashboardSystemId: string;
  canonicalSystemId: string;
  origin: string;
  /** Secret resolved by the trusted runtime, not serialized to a browser. */
  resolveBearer: HostGatewayBinding["resolveBearer"];
  /** Explicit trusted-launcher opt-in. Default false: no browser run control. */
  allowRunCancel?:boolean;
  /** Independent interactive-owner grant for checkpointed Pause/Resume. */
  allowRunPauseResume?:boolean;
  /** Trusted native owner admission on EVERY pending run approval decision.
   * Never derive this from a browser bearer, request flag or preview session.
   * Absent callback means approval is impossible, including "deny".
   */
  admitRunApproval?: (facts:{
    dashboardSystemId:string;canonicalSystemId:string;workspaceId:string;
    runId:string;sessionId:string;operationId:string;
    decision:"approve"|"deny";pendingToolCallId:string;
  }) => boolean|Promise<boolean>;
}
const methods = new Set([
  "aiverse.gateway.status", "aiverse.gateway.models", "aiverse.gateway.run.create", "aiverse.gateway.run.get",
  "aiverse.gateway.run.diagnostics",
  "aiverse.gateway.session.list", "aiverse.gateway.session.runs",
  "aiverse.gateway.run.cancel", "aiverse.gateway.run.pause", "aiverse.gateway.run.resume",
  "aiverse.gateway.run.approval",
]);
const identifier = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/);
const input = z.object({
  messages: z.array(z.object({
    role: z.enum(["system","user","assistant","tool"]),
    content: z.string().max(32_768).nullable(),
  }).strict()).min(1).max(200),
  idempotencyKey: identifier,
  sessionId: identifier.optional(),
}).strict();
const getInput = z.object({runId:identifier}).strict();
const diagInput=z.object({runId:identifier,sessionId:identifier}).strict();
const cancelInput=z.object({runId:identifier,sessionId:identifier,
  operationId:identifier}).strict();
// Pause and Resume also require the exact canonical session and a unique
// idempotent operation, never a browser-supplied action or principal.
const checkpointInput=cancelInput;
const approvalInput=cancelInput.extend({decision:z.enum(["approve","deny"])});
const pageInput=z.object({limit:z.number().int().min(1).max(25).optional(),
  offset:z.number().int().min(0).max(10_000).optional()}).strict();
const historyInput=pageInput.extend({sessionId:identifier}).strict();
const SAFE_CODES = new Set([
  "GATEWAY_NOT_READY", "MODEL_UNAVAILABLE", "RUN_BINDING_MISMATCH",
  "SYSTEM_BINDING_MISMATCH", "STALE_BINDING", "GATEWAY_CREDENTIAL_UNAVAILABLE",
  "TRANSPORT_UNAVAILABLE", "ABORTED", "INVALID_RESPONSE", "RESPONSE_TOO_LARGE",
  "WORKSPACE_INVALID", "WORKSPACE_NOT_REGISTERED", "SYSTEM_NOT_REGISTERED",
  "GATEWAY_MAPPING_STALE", "GATEWAY_NOT_CONFIGURED", "RUN_NOT_FOUND",
  "INVALID_ENVELOPE", "UNKNOWN_METHOD",
  "SESSION_BINDING_MISMATCH", "IDEMPOTENCY_CONFLICT", "FORBIDDEN", "UNAUTHENTICATED",
  "HTTP_401", "HTTP_403", "HTTP_404", "HTTP_409", "HTTP_429", "HTTP_503",
  "SESSION_NOT_FOUND", "INVALID_HISTORY_QUERY", "INVALID_HISTORY_SCOPE",
  "HISTORY_BINDING_MISMATCH", "HISTORY_INDEX_TOO_LARGE",
  "DIAGNOSTICS_INVALID",
  "RUN_CONTROL_NOT_AUTHORIZED", "RUN_APPROVAL_NOT_AUTHORIZED",
  "APPROVAL_NOT_PENDING", "APPROVAL_CHANGED", "RUN_NOT_CANCELABLE",
  "RUN_NOT_PAUSABLE", "RUN_NOT_RESUMABLE",
]);
function failureCode(error: unknown): string {
  const code=(error as {code?:unknown})?.code;
  return typeof code==="string" && SAFE_CODES.has(code) ? code : "GATEWAY_UNAVAILABLE";
}
/** Whitelist factual execution metadata only. Canonical Gateway cost is NOT
 * Token-owner verified billed cost, so no price or cost figure is projected.
 * Never spread an upstream run, runtime object or checkpoint into /rpc.
 */
function safeRunReceipt(run:GatewayRun):Record<string,unknown>{
  const extra=run as Record<string,unknown>;
  const usage=extra.usage;
  const counter=(v:unknown)=>Number.isSafeInteger(v)&&typeof v==="number"
    &&v>=0&&v<=1_000_000_000_000?v:undefined;
  let counts:Record<string,number>|undefined;
  if(usage&&typeof usage==="object"&&!Array.isArray(usage)){
    const u=usage as Record<string,unknown>;
    const incoming=counter(u.input_tokens),outgoing=counter(u.output_tokens),actions=counter(u.actions);
    if(incoming!==undefined&&outgoing!==undefined&&actions!==undefined)
      counts={inputTokens:incoming,outputTokens:outgoing,actions};
  }
  const timestamp=(value:unknown)=>typeof value==="string"
    &&value.length>=20&&value.length<=35
    &&/^\d{4}-\d{2}-\d{2}T/.test(value)
    &&Number.isFinite(Date.parse(value))?value:undefined;
  const runtime=extra.runtime;
  const kind=runtime&&typeof runtime==="object"&&!Array.isArray(runtime)
    ?(runtime as Record<string,unknown>).kind:undefined;
  return {
    ...(counts?{usage:counts}:{}),
    ...(timestamp(extra.created_at)?{createdAt:timestamp(extra.created_at)}:{}),
    ...(timestamp(extra.completed_at)?{completedAt:timestamp(extra.completed_at)}:{}),
    ...(typeof kind==="string"&&/^[a-z][a-z0-9_-]{0,31}$/.test(kind)
      ?{runtimeKind:kind}:{}),
  };
}
function boundedRun(run:GatewayRun):Record<string,unknown> {
  const output=run.output?.content;
  return {
    runId:run.run_id,sessionId:run.session_id,systemId:run.system_id,
    workspaceId:run.workspace_id,status:run.status,
    ...(typeof output==="string" ? {output:output.slice(0,65_536)} : {}),
    ...safeRunReceipt(run),
    source:"canonical-gateway",
  };
}
/** Narrow read-only G06.1 Control Center projection. Canonical advanced
 * diagnostics may contain private scope/principal, source refs, deep retrieval
 * request traces or context fingerprints. None can cross /rpc. */
function safeDiagnostics(raw:Record<string,unknown>,run:GatewayRun):Record<string,unknown>{
  const invalid=():never=>{throw new GatewayTransportError("DIAGNOSTICS_INVALID");};
  const record=(v:unknown):Record<string,unknown>|null=>
    v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:null;
  const scope=record(raw.scope),safety=record(raw.safety);
  if(raw.schema_version!=="1.0"||raw.kind!=="gateway_advanced_diagnostics"
    ||raw.run_id!==run.run_id||raw.session_id!==run.session_id
    ||raw.status!==run.status||!scope
    ||scope.system_id!==run.system_id||scope.workspace_id!==run.workspace_id
    ||scope.principal!==run.principal||!safety
    ||safety.raw_message_content_included!==false
    ||safety.prompts_included!==false
    ||safety.chain_of_thought_included!==false)invalid();
  const count=(v:unknown):number|undefined=>{
    if(v===undefined||v===null)return undefined;
    if(typeof v!=="number"||!Number.isSafeInteger(v)||v<0||v>1_000_000_000_000)
      invalid();
    return v as number;
  };
  const numbers=(v:Record<string,unknown>,fields:readonly string[])=>{
    const out:Record<string,number>={};
    for(const name of fields){const n=count(v[name]);if(n!==undefined)out[name]=n;}
    return out;
  };
  const yes=(obj:Record<string,unknown>,field:string)=>{
    if(typeof obj[field]!=="boolean")invalid();return obj[field] as boolean;
  };
  const context=raw.context===null?null:record(raw.context);
  const retrieval=raw.retrieval===null?null:record(raw.retrieval);
  const archive=record(raw.archive),folds=record(raw.folds);
  if(!archive||!folds||(raw.context!==null&&!context)
    ||(raw.retrieval!==null&&!retrieval)
    ||archive.raw_content_included!==false
    ||archive.chain_of_thought_included!==false)invalid();
  const state=context?.status;
  if(state!==undefined&&state!==null&&(typeof state!=="string"
    ||!/^[a-z][a-z0-9_-]{0,47}$/.test(state)))invalid();
  return {
    source:"canonical-gateway",workspaceId:run.workspace_id,
    runId:run.run_id,sessionId:run.session_id,status:run.status,
    context:context?{...(state?{status:state}:{}),
      ...numbers(context,["window_tokens","estimated_tokens_before","estimated_tokens_after"]),
      configured:yes(context,"configured"),foldScheduled:yes(context,"fold_scheduled"),
      emergencyTailShrink:yes(context,"emergency_tail_shrink")}:null,
    retrieval:retrieval?numbers(retrieval,[
      "source_reads","gateway_source_range_reads","legacy_reads"]):null,
    archive:numbers(archive!,["retrieval_depth"]),
    folds:{...numbers(folds!,["valid_cards","invalid_cards","max_level"]),
      pendingFoldWork:yes(folds!,"pending_fold_work")},
    safety:{rawContentIncluded:false,promptsIncluded:false,chainOfThoughtIncluded:false},
  };
}
export class CanonicalGatewayBridge {
  private readonly connections = new Map<string, {
    root:string; generation:number; binding: ApprovedCanonicalGateway;
  }>();
  constructor(
    private readonly registry:SystemRegistry,
    approvals: readonly ApprovedCanonicalGateway[],
    private readonly transportOptions: GatewayTransportOptions = {},
  ) {
    for(const entry of approvals){
      if(this.connections.has(entry.dashboardSystemId))
        throw new Error("Duplicate canonical Gateway system binding");
      // Capture the already-approved root identity here. A later rebind
      // invalidates this mapping and requires a fresh explicit host setup.
      const root=registry.resolveRoot(entry.dashboardSystemId);
      // Validate host-provided Gateway origin, workspace and resolver early.
      new CanonicalGatewayClient({
        origin:entry.origin,canonicalSystemId:entry.canonicalSystemId,
        workspaceId:"operator",resolveBearer:entry.resolveBearer,
      },transportOptions);
      this.connections.set(entry.dashboardSystemId,{root,generation:registry.bindingGeneration(entry.dashboardSystemId),binding:{...entry}});
    }
  }
  static recognizes(raw:unknown):boolean {
    return Boolean(raw && typeof raw==="object"
      && typeof (raw as {method?:unknown}).method==="string"
      && (raw as {method:string}).method.startsWith("aiverse.gateway."));
  }
  /**
   * Trusted host projection of an upstream run-event stream. Scope and Gateway
   * bearer never derive from the socket's payload. Caller must already have
   * authenticated the Dashboard WebSocket and bound it to systemId.
   */
  openEventStream(
    systemId:string, workspaceId:string, runId:string,
    send:(projection:Record<string,unknown>)=>void,
    failed:(code:string)=>void,
  ):()=>void {
    const abort=new AbortController();
    let finished=false, sequence=0;
    let client:CanonicalGatewayClient|undefined;
    const cancel=()=>{finished=true;abort.abort();client?.invalidate();};
    void (async()=>{
      try{
        if(!identifier.safeParse(runId).success)throw new GatewayTransportError("INVALID_ENVELOPE");
        const registered=this.connections.get(systemId);
        if(!registered)throw new GatewayTransportError("GATEWAY_NOT_CONFIGURED");
        if(this.registry.resolveRoot(systemId)!==registered.root ||
          this.registry.bindingGeneration(systemId)!==registered.generation)
          throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
        if(!/^(operator|[a-z0-9][a-z0-9-]{0,127})$/.test(workspaceId))
          throw new GatewayTransportError("INVALID_ENVELOPE");
        if(workspaceId!=="operator")getWorkspace(this.registry,systemId,workspaceId);
        client=new CanonicalGatewayClient({
          origin:registered.binding.origin,workspaceId,
          canonicalSystemId:registered.binding.canonicalSystemId,
          resolveBearer:registered.binding.resolveBearer,
        },this.transportOptions);
        const allowed=new Set(["run.created","run.started","run.completed","run.failed",
          "run.canceled","run.blocked","run.paused","run.resumed","run.parked",
          "run.budget_limited","run.no_progress","approval.required","assistant.delta"]);
        const terminal=new Set(["run.completed","run.failed","run.canceled","run.blocked",
          "run.budget_limited","run.parked"]);
        await client.subscribeRun(runId,event=>{
          if(finished || !allowed.has(event.type))return;
          try{
            if(this.registry.resolveRoot(systemId)!==registered.root ||
              this.registry.bindingGeneration(systemId)!==registered.generation)throw new Error("binding changed");
          }catch{cancel();return;}
          const projection:Record<string,unknown>={
            runId,eventId:event.event_id,kind:event.type,at:event.at,
            ...(event.type==="assistant.delta" && typeof event.data.text==="string"
              ? {text:event.data.text.slice(0,8192)} : {}),
          };
          send({type:"event",v:PROTOCOL_VERSION,event:"aiverse.gateway.run.event",
            systemId,workspaceId,seq:++sequence,observedAt:new Date().toISOString(),
            payload:projection});
          if(terminal.has(event.type))cancel();
        },abort.signal);
        // Upstream EOF does not mean successful completion. Reconcile by GET.
        if(!finished)failed("EVENT_STREAM_INTERRUPTED");
      }catch(error){
        if(!finished)failed(failureCode(error));
      }finally{cancel();}
    })();
    return cancel;
  }
  async handle(raw:unknown, signal?:AbortSignal):Promise<DashboardResponse> {
    const tagged=raw && typeof raw==="object" ? raw as Record<string,unknown> : {};
    const id=typeof tagged.id==="string" && tagged.id.length<=128 && tagged.id.length>0 ? tagged.id : "unparseable";
    const systemId=typeof tagged.systemId==="string" ? tagged.systemId : undefined;
    const respond=(ok:boolean, result?:unknown, code?:string):DashboardResponse=>({
      type:"res",v:PROTOCOL_VERSION,id,ok,
      ...(systemId && /^[a-z0-9][a-z0-9-]{0,63}$/.test(systemId) ? {systemId}:{}),
      ...(ok?{result}:{error:{code:code??"GATEWAY_UNAVAILABLE",message:"Canonical Gateway "+(code??"GATEWAY_UNAVAILABLE")}}),
      observedAt:new Date().toISOString(),sourceVersion:"dashboard-canonical-gateway-host-v1",
    });
    if(typeof tagged.method==="string" && tagged.method.startsWith("aiverse.gateway.") && !methods.has(tagged.method))
      return respond(false,undefined,"UNKNOWN_METHOD");
    const parsed=requestSchema.safeParse(raw);
    if(!parsed.success)return respond(false,undefined,"INVALID_ENVELOPE");
    const frame:DashboardRequest=parsed.data;
    try {
      const system=frame.systemId;
      const workspace=frame.workspaceId;
      if(!system || !workspace)throw new GatewayTransportError("INVALID_ENVELOPE");
      const configured=this.connections.get(system);
      if(!configured)throw new GatewayTransportError("GATEWAY_NOT_CONFIGURED");
      if(this.registry.resolveRoot(system)!==configured.root ||
        this.registry.bindingGeneration(system)!==configured.generation)
        throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
      if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
      const binding:HostGatewayBinding={
        canonicalSystemId:configured.binding.canonicalSystemId,
        origin:configured.binding.origin,workspaceId:workspace,
        resolveBearer:configured.binding.resolveBearer,
      };
      const client=new CanonicalGatewayClient(binding,this.transportOptions);
      const onAbort=()=>client.invalidate();
      signal?.addEventListener("abort",onAbort,{once:true});
      try{
        if(signal?.aborted)throw new GatewayTransportError("ABORTED");
        if(frame.method==="aiverse.gateway.status"){
          if(frame.params!==undefined && !z.object({}).strict().safeParse(frame.params).success)
            throw new GatewayTransportError("INVALID_ENVELOPE");
          const value=await client.preflight(signal);
          return respond(true,{...value,workspaceId:workspace,
            runtimeSource:{id:"aiverse",owner:"canonical-gateway",model:"aiverse",
              runtimeKind:value.runtime,readinessEvidence:"authenticated-status-and-models",
              inferenceVerified:false},
            capabilities:{runCreate:true,runGet:true,events:true,
              controls:configured.binding.allowRunCancel===true
                ||configured.binding.allowRunPauseResume===true,
              conversationLibrary:true,providerSelection:false},
            source:"canonical-gateway",runCancelSupported:configured.binding.allowRunCancel===true,
            runPauseResumeSupported:configured.binding.allowRunPauseResume===true});
        }
        if(frame.method==="aiverse.gateway.models"){
          if(frame.params!==undefined && !z.object({}).strict().safeParse(frame.params).success)
            throw new GatewayTransportError("INVALID_ENVELOPE");
          // The real canonical /v1/models currently advertises exactly one
          // virtual Gateway model. Never invent physical provider choices.
          const value=await client.preflight(signal);
          const runtimeKind=/^[a-z][a-z0-9_-]{0,31}$/.test(value.runtime)
            ?value.runtime:"unavailable";
          return respond(true,{
            source:"canonical-gateway",workspaceId:workspace,
            models:[{id:"aiverse",label:"AI-Verse Gateway",kind:"gateway-virtual"}],
            runtimeKind,modelSelectionSupported:false,
            providerSelectionSupported:false,inferenceVerified:false,
            evidence:"authenticated-status-and-models",observedAt:value.observedAt,
          });
        }
        if(frame.method==="aiverse.gateway.session.list"){
          const parsed=pageInput.safeParse(frame.params??{});
          if(!parsed.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          return respond(true,{...await client.listSessions({...parsed.data,signal}),
            source:"canonical-gateway",workspaceId:workspace});
        }
        if(frame.method==="aiverse.gateway.session.runs"){
          const parsed=historyInput.safeParse(frame.params);
          if(!parsed.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          return respond(true,{...await client.listSessionRuns({...parsed.data,signal}),
            source:"canonical-gateway",workspaceId:workspace,sessionId:parsed.data.sessionId});
        }
        if(frame.method==="aiverse.gateway.run.create"){
          const parse=input.safeParse(frame.params);
          if(!parse.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const args=parse.data;
          // A real Gateway status/identity check, not an inferred browser state.
          await client.preflight(signal);
          return respond(true,boundedRun(await client.createRun({...args,signal,
            validateBeforeDispatch:()=>{
              // Preflight is asynchronous: the OS owner can be revoked or
              // rebound while it runs or while resolving the Gateway bearer.
              // Never submit a run under the old host lease afterward.
              if(this.registry.resolveRoot(system)!==configured.root
                ||this.registry.bindingGeneration(system)!==configured.generation)
                throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
              if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
              if(signal?.aborted)throw new GatewayTransportError("ABORTED");
            },
          })));
        }
        if(frame.method==="aiverse.gateway.run.cancel"){
          // The paired browser is not a native owner grant. Only a trusted
          // launch configuration may *also* opt this specific control in.
          if(configured.binding.allowRunCancel!==true)
            throw new GatewayTransportError("RUN_CONTROL_NOT_AUTHORIZED");
          const parsed=cancelInput.safeParse(frame.params);
          if(!parsed.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const {runId,sessionId,operationId}=parsed.data;
          const canceled=await client.controlRun({runId,action:"cancel",operationId,
            reason:"dashboard_operator_stop",signal,
            validateBeforePost:(run)=>{
              if(run.session_id!==sessionId)
                throw new GatewayTransportError("SESSION_BINDING_MISMATCH");
              if(!["queued","running","resuming","paused","paused_recovery_required",
                "paused_no_progress"].includes(run.status))
                throw new GatewayTransportError("RUN_NOT_CANCELABLE");
              if(this.registry.resolveRoot(system)!==configured.root
                ||this.registry.bindingGeneration(system)!==configured.generation)
                throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
              if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
              if(signal?.aborted)throw new GatewayTransportError("ABORTED");
            },
          });
          return respond(true,boundedRun(canceled));
        }
        if(frame.method==="aiverse.gateway.run.pause"
          ||frame.method==="aiverse.gateway.run.resume"){
          // A separate explicit owner grant is required; Stop alone is NOT
          // permission to pause or restart compute.
          if(configured.binding.allowRunPauseResume!==true)
            throw new GatewayTransportError("RUN_CONTROL_NOT_AUTHORIZED");
          const parsed=checkpointInput.safeParse(frame.params);
          if(!parsed.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const {runId,sessionId,operationId}=parsed.data;
          const action=frame.method==="aiverse.gateway.run.pause"?"pause":"resume";
          const result=await client.controlRun({runId,action,operationId,
            ...(action==="pause"?{reason:"dashboard_operator_pause"}:{}),signal,
            validateBeforePost:run=>{
              if(run.session_id!==sessionId)
                throw new GatewayTransportError("SESSION_BINDING_MISMATCH");
              if(action==="pause"
                &&!["queued","running","resuming"].includes(run.status))
                throw new GatewayTransportError("RUN_NOT_PAUSABLE");
              if(action==="resume"
                &&!["paused","paused_recovery_required","paused_no_progress"].includes(run.status))
                throw new GatewayTransportError("RUN_NOT_RESUMABLE");
              if(this.registry.resolveRoot(system)!==configured.root
                ||this.registry.bindingGeneration(system)!==configured.generation)
                throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
              if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
              if(signal?.aborted)throw new GatewayTransportError("ABORTED");
            },
          });
          return respond(true,boundedRun(result));
        }
        if(frame.method==="aiverse.gateway.run.approval"){
          // This method is intentionally not enabled by an authenticated
          // Dashboard browser session alone. A trusted native owner must
          // independently admit this exact decision immediately pre-effect.
          const admit=configured.binding.admitRunApproval;
          if(!admit)throw new GatewayTransportError("RUN_APPROVAL_NOT_AUTHORIZED");
          const parsed=approvalInput.safeParse(frame.params);
          if(!parsed.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const {runId,sessionId,operationId,decision}=parsed.data;
          const result=await client.controlRun({
            runId,action:"approval",operationId,decision,signal,
            validateBeforePost:async run=>{
              if(run.session_id!==sessionId)
                throw new GatewayTransportError("SESSION_BINDING_MISMATCH");
              const pending=run.pending_approval;
              if(run.status!=="awaiting_approval"||!pending
                ||typeof pending!=="object"||Array.isArray(pending)
                ||typeof (pending as Record<string,unknown>).tool_call_id!=="string")
                throw new GatewayTransportError("APPROVAL_NOT_PENDING");
              const accepted=await admit({
                dashboardSystemId:system,canonicalSystemId:configured.binding.canonicalSystemId,
                workspaceId:workspace,runId,sessionId,operationId,decision,
                pendingToolCallId:(pending as {tool_call_id:string}).tool_call_id,
              });
              if(accepted!==true)
                throw new GatewayTransportError("RUN_APPROVAL_NOT_AUTHORIZED");
              const checkLease=()=>{
                if(this.registry.resolveRoot(system)!==configured.root
                  ||this.registry.bindingGeneration(system)!==configured.generation)
                  throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
                if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
                if(signal?.aborted)throw new GatewayTransportError("ABORTED");
              };
              // A native authorization may have waited for a human decision.
              // Refresh the actual pending Gateway action before sending it.
              // Gateway itself still reauthorizes the effect at the final edge;
              // this protects the host-to-Gateway handoff from a stale tool ID.
              checkLease();
              const current=await client.getRun(runId,signal);
              const currentPending=current.pending_approval;
              if(current.session_id!==sessionId
                ||current.status!=="awaiting_approval"||!currentPending
                ||typeof currentPending!=="object"||Array.isArray(currentPending)
                ||(currentPending as {tool_call_id?:unknown}).tool_call_id
                  !==(pending as {tool_call_id:string}).tool_call_id)
                throw new GatewayTransportError("APPROVAL_CHANGED");
              checkLease();
            },
          });
          return respond(true,boundedRun(result));
        }
        if(frame.method==="aiverse.gateway.run.diagnostics"){
          const parsed=diagInput.safeParse(frame.params);
          if(!parsed.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const {runId,sessionId}=parsed.data;
          const run=await client.getRun(runId,signal);
          if(run.session_id!==sessionId)
            throw new GatewayTransportError("SESSION_BINDING_MISMATCH");
          const diagnostics=await client.getRunDiagnostics(runId,signal);
          if(this.registry.resolveRoot(system)!==configured.root
            ||this.registry.bindingGeneration(system)!==configured.generation)
            throw new GatewayTransportError("GATEWAY_MAPPING_STALE");
          if(workspace!=="operator")getWorkspace(this.registry,system,workspace);
          if(signal?.aborted)throw new GatewayTransportError("ABORTED");
          return respond(true,safeDiagnostics(diagnostics,run));
        }
        if(frame.method==="aiverse.gateway.run.get"){
          const parse=getInput.safeParse(frame.params);
          if(!parse.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const args=parse.data;
          return respond(true,boundedRun(await client.getRun(args.runId,signal)));
        }
        return respond(false,undefined,"UNKNOWN_METHOD");
      }finally{
        client.invalidate();
        signal?.removeEventListener("abort",onAbort);
      }
    }catch(error){return respond(false,undefined,failureCode(error));}
  }
}
