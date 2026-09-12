/**
 * @ai-verse/dashboard-read-adapters — read-only OS projectors (Task 3).
 *
 * Laws: IDs in, realpaths resolved server-side; traversal and symlink
 * escapes fail closed; SQLite opens read-only with SELECT-only queries;
 * cache is disposable and partitioned by systemId; missing sources never
 * fall back to another system.
 */
export {
  ADAPTER_ERRORS,
  assertRelativeLogical,
  isWithin,
  resolveWorkspaceRoot,
  resolveWithinWorkspace,
} from "./path-resolve.js";
export type { AdapterErrorCode } from "./path-resolve.js";

export { readMarkdownFile, MAX_MARKDOWN_BYTES } from "./markdown.js";
export type { MarkdownProjection } from "./markdown.js";

export { openReadOnly, MAX_SQLITE_BYTES, MAX_ROWS } from "./sqlite.js";
export type { SqliteHandle } from "./sqlite.js";

export { listWorkspaces, getWorkspace } from "./workspace.js";
export type { WorkspaceSummary } from "./workspace.js";

export { DisposableCache } from "./cache.js";
