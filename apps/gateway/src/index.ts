/** @ai-verse/dashboard-gateway — localhost Dashboard gateway. */
export { QueryRouter, GATEWAY_VERSION, GATEWAY_PHASE } from "./query-router.js";
export type {
  PurposeMutationBridge,
  PurposeRoutedProposalInput,
  PurposeConfirmationInput,
  PurposeApplicationInput,
} from "./purpose-mutation-bridge.js";
export { SubscriptionHub, watchWorkspace } from "./subscriptions.js";
export type { HubEvent, DeliveredEvent } from "./subscriptions.js";
export { CanonicalGatewayBridge } from "./canonical-gateway-bridge.js";
export { CanvasOwnerBridge } from "./canvas-owner-bridge.js";
export {CanvasAgentActions} from "./canvas-agent-actions.js";
export {createGatewayStoreCanvasRunVerifier} from "./canvas-gateway-run-verifier.js";
export type {CanonicalGatewayRunStore,CanvasAgentGrantFacts,CanvasAdmittedActorGrant,GatewayCanvasRunVerifierOptions} from "./canvas-gateway-run-verifier.js";
export type {CanvasAgentAction,CanonicalCanvasAgentRun,CanvasAgentVerifier} from "./canvas-agent-actions.js";
export {withCanvasOsPolicy} from "./canvas-os-policy.js";
export {createAdmittedCanvasDataOwner} from "./canvas-data-owner.js";
export {createCanvasOwnerPreflight} from "./canvas-owner-preflight.js";
export type {CanvasPreflightNative,CanvasScopeReadiness} from "./canvas-owner-preflight.js";
export type {AdmittedCanvasDataOwner,NativeCanvasDataModules,CanvasDataActor} from "./canvas-data-owner.js";
export type {CanvasOsPolicy,OsActionPermissionResult} from "./canvas-os-policy.js";
export type {CanvasHostFacts,CanvasHostRequest,ApprovedCanvasOwner} from "./canvas-owner-bridge.js";
export type { ApprovedCanonicalGateway } from "./canonical-gateway-bridge.js";
export { startGateway, DEFAULT_PORT } from "./server.js";
export type { GatewayServer } from "./server.js";
