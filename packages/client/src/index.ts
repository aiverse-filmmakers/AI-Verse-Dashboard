/**
 * @ai-verse/dashboard-client — typed Gateway client (Task 5).
 * Law: panels consume this client; IDs in, never raw roots; cache
 * partitioned by systemId.
 */
export { DashboardClient } from "./client.js";
export type { ClientScope, FetchFn, QueryOptions } from "./client.js";

/** Authenticated browser projection of canonical Gateway run events. */
export {DashboardChatEventFeed} from "./gateway-event-feed.js";
export type {ChatRunEvent,ChatEventFeed,ChatWebSocket,ChatWebSocketFactory}
  from "./gateway-event-feed.js";

/** Personal Chat state is a scoped projection of actual Gateway Run truth. */
export {PersonalChatRunController} from "./conversation-run.js";
export type {ChatRunPhase,ChatRunView,ChatRunReceipt} from "./conversation-run.js";
