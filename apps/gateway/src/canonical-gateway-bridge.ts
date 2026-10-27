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
}
const methods = new Set([
  "aiverse.gateway.status", "aiverse.gateway.run.create", "aiverse.gateway.run.get",
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
const SAFE_CODES = new Set([
  "GATEWAY_NOT_READY", "MODEL_UNAVAILABLE", "RUN_BINDING_MISMATCH",
  "SYSTEM_BINDING_MISMATCH", "STALE_BINDING", "GATEWAY_CREDENTIAL_UNAVAILABLE",
  "TRANSPORT_UNAVAILABLE", "ABORTED", "INVALID_RESPONSE", "RESPONSE_TOO_LARGE",
  "WORKSPACE_INVALID", "WORKSPACE_NOT_REGISTERED", "SYSTEM_NOT_REGISTERED",
  "GATEWAY_MAPPING_STALE", "GATEWAY_NOT_CONFIGURED", "RUN_NOT_FOUND",
  "INVALID_ENVELOPE", "UNKNOWN_METHOD",
  "SESSION_BINDING_MISMATCH", "IDEMPOTENCY_CONFLICT", "FORBIDDEN", "UNAUTHENTICATED",
  "HTTP_401", "HTTP_403", "HTTP_404", "HTTP_409", "HTTP_429", "HTTP_503",
]);
function failureCode(error: unknown): string {
  const code=(error as {code?:unknown})?.code;
  return typeof code==="string" && SAFE_CODES.has(code) ? code : "GATEWAY_UNAVAILABLE";
}
function boundedRun(run:GatewayRun):Record<string,unknown> {
  const output=run.output?.content;
  return {
    runId:run.run_id,sessionId:run.session_id,systemId:run.system_id,
    workspaceId:run.workspace_id,status:run.status,
    ...(typeof output==="string" ? {output:output.slice(0,65_536)} : {}),
    source:"canonical-gateway",
  };
}
export class CanonicalGatewayBridge {
  private readonly connections = new Map<string, {
    root:string; binding: ApprovedCanonicalGateway;
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
      this.connections.set(entry.dashboardSystemId,{root,binding:{...entry}});
    }
  }
  static recognizes(raw:unknown):boolean {
    return Boolean(raw && typeof raw==="object"
      && typeof (raw as {method?:unknown}).method==="string"
      && (raw as {method:string}).method.startsWith("aiverse.gateway."));
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
    const parsed=requestSchema.safeParse(raw);
    if(!parsed.success)return respond(false,undefined,"INVALID_ENVELOPE");
    const frame:DashboardRequest=parsed.data;
    if(!methods.has(frame.method))return respond(false,undefined,"UNKNOWN_METHOD");
    try {
      const system=frame.systemId;
      const workspace=frame.workspaceId;
      if(!system || !workspace)throw new GatewayTransportError("INVALID_ENVELOPE");
      const configured=this.connections.get(system);
      if(!configured)throw new GatewayTransportError("GATEWAY_NOT_CONFIGURED");
      if(this.registry.resolveRoot(system)!==configured.root)
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
            capabilities:{runCreate:true,runGet:true,events:false,controls:false,
              conversationLibrary:false,providerSelection:false},
            source:"canonical-gateway"});
        }
        if(frame.method==="aiverse.gateway.run.create"){
          const parse=input.safeParse(frame.params);
          if(!parse.success)throw new GatewayTransportError("INVALID_ENVELOPE");
          const args=parse.data;
          // A real Gateway status/identity check, not an inferred browser state.
          await client.preflight(signal);
          return respond(true,boundedRun(await client.createRun({...args,signal})));
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
