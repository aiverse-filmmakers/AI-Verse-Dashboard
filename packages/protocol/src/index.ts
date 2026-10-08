/** @ai-verse/dashboard-protocol — versioned Gateway protocol. */
export {
  PROTOCOL_VERSION, PROTOCOL_MAJOR, SUPPORTED_MAJORS, MAX_PARAMS_BYTES,
  SYSTEM_ID_PATTERN, WORKSPACE_ID_PATTERN, PANEL_ID_PATTERN, PRESENTATIONS,
  systemIdSchema, workspaceIdSchema, panelIdSchema, presentationSchema,
  checkNoRawRoots, jsonBytes,
} from "./ids.js";

export {
  QUERY_METHODS, PURPOSE_CONTROL_METHODS, COMMAND_METHODS, PROTOCOL_METHODS,
  ALL_METHODS, PROTOCOL_ERRORS, isKnownMethod, isQueryMethod, isCommandMethod,
  isPurposeControlMethod, requiresSystem, requiresWorkspace, assertQueryOnly,
  scopeKey, workspaceScopeKey,
} from "./methods.js";

export {
  requestSchema, subscriptionRequestSchema, responseSchema, eventSchema, parseFrame,
  handshakeParamsSchema, handshakeResultSchema, negotiateHandshake,
} from "./envelope.js";

export type {
  DashboardRequest, DashboardSubscriptionRequest, DashboardResponse, DashboardEvent,
} from "./envelope.js";
export type {
  QueryMethod, CommandMethod, PurposeControlMethod, ProtocolMethod, DashboardMethod,
  ProtocolErrorCode,
} from "./methods.js";
export type { SystemId, WorkspaceId, PanelId, NoRootsCheck, Presentation } from "./ids.js";
export { DASHBOARD_WS_PROTOCOL, assertDashboardAuthToken, dashboardWsAuthProtocol } from "./gateway-auth.js";
