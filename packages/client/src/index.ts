/**
 * @ai-verse/dashboard-client — typed Gateway client (Task 5).
 * Law: panels consume this client; IDs in, never raw roots; cache
 * partitioned by systemId.
 */
export { DashboardClient } from "./client.js";
export type { ClientScope, FetchFn, QueryOptions } from "./client.js";
