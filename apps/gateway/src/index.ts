/**
 * @ai-verse/dashboard-gateway — localhost query path (Task 4).
 * Laws: loopback bind only; every OS read resolves via the registry for
 * exactly one systemId; missing/unknown never falls back to another
 * system; subscriptions partitioned by systemId; commands blocked.
 */
export { QueryRouter, GATEWAY_VERSION } from "./query-router.js";
export { SubscriptionHub, watchWorkspace } from "./subscriptions.js";
export type { HubEvent, DeliveredEvent } from "./subscriptions.js";
export { startGateway, DEFAULT_PORT } from "./server.js";
export type { GatewayServer } from "./server.js";
