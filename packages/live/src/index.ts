/**
 * @ai-verse/dashboard-live — chat + runtime session foundation (Phase 2 Task 1).
 * Laws: sessions partitioned by systemId; transcripts bounded; adapter
 * never sees roots; same provider/model never shares conversation state.
 */
export { normalizeTimelineEntry, TIMELINE_KINDS } from "./timeline.js";
export type { TimelineEntry, TimelineKind, TimelineRole } from "./timeline.js";

export { SessionStore, SESSION_ERRORS, MAX_ENTRIES, MAX_BODY } from "./sessions.js";
export type { ChatSession, SessionStatus } from "./sessions.js";

export { LocalEchoAdapter } from "./adapter.js";
export type { RuntimeAdapter, RuntimeCapabilities, CommandAck } from "./adapter.js";

export { publishLive, groupToolsBySession } from "./activity.js";
export type { LiveEventName, LivePublish, ToolGroup } from "./activity.js";

export { buildTrace, buildLogDrawer, copyLogLine, DRAWER_BUFFER_MAX } from "./runs.js";
export type { SpanKind, TraceSpan, TraceView, LogSeverity, LogLine, LogDrawer } from "./runs.js";
