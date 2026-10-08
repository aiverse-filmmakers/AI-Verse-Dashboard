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
export { startGateway, DEFAULT_PORT } from "./server.js";
export type { GatewayServer } from "./server.js";
