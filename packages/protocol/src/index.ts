/**
 * @ai-verse/dashboard-protocol — versioned Gateway protocol (Task 1).
 *
 * Laws enforced here:
 * - every OS-bound op carries systemId; workspace ops also carry workspaceId;
 * - clients send IDs only, never raw filesystem roots;
 * - commands parse but are blocked until the command boundary exists;
 * - identity/subscription/cache keys namespace by systemId.
 */
export {
  PROTOCOL_VERSION,
  PROTOCOL_MAJOR,
  SUPPORTED_MAJORS,
  MAX_PARAMS_BYTES,
  SYSTEM_ID_PATTERN,
  WORKSPACE_ID_PATTERN,
  PANEL_ID_PATTERN,
  PRESENTATIONS,
  systemIdSchema,
  workspaceIdSchema,
  panelIdSchema,
  presentationSchema,
  checkNoRawRoots,
  jsonBytes,
} from "./ids.js";

export {
  QUERY_METHODS,
  COMMAND_METHODS,
  PROTOCOL_METHODS,
  ALL_METHODS,
  PROTOCOL_ERRORS,
  isKnownMethod,
  isQueryMethod,
  isCommandMethod,
  requiresSystem,
  requiresWorkspace,
  assertQueryOnly,
  scopeKey,
  workspaceScopeKey,
} from "./methods.js";

export {
  requestSchema,
  responseSchema,
  eventSchema,
  parseFrame,
  handshakeParamsSchema,
  handshakeResultSchema,
  negotiateHandshake,
} from "./envelope.js";

export type { DashboardRequest, DashboardResponse, DashboardEvent } from "./envelope.js";
export type {
  QueryMethod,
  CommandMethod,
  ProtocolMethod,
  DashboardMethod,
  ProtocolErrorCode,
} from "./methods.js";
export type { SystemId, WorkspaceId, PanelId, NoRootsCheck } from "./ids.js";
export type { Presentation } from "./ids.js";
