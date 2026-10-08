/**
 * @ai-verse/dashboard-read-models — bounded UI projections.
 * The OS owns meaning; missing is unavailable, never zero, never borrowed
 * from another system.
 */
export type {
  HealthStatus,
  Freshness,
  HealthEvidence,
  HealthCheck,
  HealthDimension,
  HealthReport,
} from "./health.js";
export { buildHealthReport, assessFreshness, HEALTH_STALE_MS } from "./health.js";

export type { WorkStatus, WorkKind, WorkItem, WorkSummary } from "./work.js";
export { normalizeWorkItem, summarizeWork, unavailableWorkSummary } from "./work.js";

export type {
  InboxKind,
  InboxSeverity,
  SourceRef,
  CommandDescriptor,
  InboxItem,
} from "./inbox.js";
export {
  normalizeInboxItem,
  sortInbox,
  INBOX_KINDS,
  INBOX_SEVERITIES,
} from "./inbox.js";

export type { WorkspaceProjections } from "./workspace-sources.js";
export { buildWorkspaceProjections, SOURCES } from "./workspace-sources.js";

export type { NowModel } from "./now.js";
export { buildNowModel, NOW_RUNNING_MAX, NOW_ATTENTION_MAX } from "./now.js";

export type {
  PurposeMissionView,
  PurposeGoalsView,
  PurposeViewProvenance,
  PurposeMissionModel,
  PurposeMissionGoalsModel,
} from "./purpose.js";
export { buildPurposeMissionModel, buildPurposeMissionGoalsModel } from "./purpose.js";
