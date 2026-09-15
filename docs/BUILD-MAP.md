> **CANONICAL PLAN NOTICE, 2026-09-15**
>
> This file is retained as the historical implementation ledger through Dashboard Phase 2 Task 5. **Do not resume from Phase 2 Task 6 as the product sequence.** The current go-ahead plan is [CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md), with the pre-strip audit in [MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md](MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md).
>
> Completed code and tests recorded below remain valuable and must be preserved/reused. The old sequencing, including the statement that desktop packaging is only a final step, is superseded.

# AI-Verse Dashboard Build Map

**Updated:** 2026-09-12
**Status:** Phase 2 IN PROGRESS
**Implementation progress:** 13 tasks complete
**Next:** Phase 2 Task 6

This is the canonical task ledger for Dashboard, like Data's 41-task map.

## Phase 1 - Read-only Control Room (tasks 1-8)

- [x] Task 1 - Protocol package (versioned envelope, systemId + workspaceId + panelId/presentation, Zod, no raw roots) — DONE 2026-09-12: packages/protocol/src (ids, methods, envelope) + test/protocol.test.ts 10/10; shell amendment: panelId slug + full/compact/hud; npm run check green
- [x] Task 2 - OS registry + validation (compatible OS check, systemId map, per-window selection) — DONE 2026-09-12: packages/registry/src (validation, registry, selection) + test/registry.test.ts 5/5, npm run check green (14/14 total)
- [x] Task 3 - Read adapters (read-only Markdown + SQLite, disposable cache by systemId) — DONE 2026-09-12: packages/os-read-adapter/src (path-resolve, markdown, sqlite, workspace, cache) + test/read-adapters.test.ts 6/6, npm run check green (21/21 total)
- [x] Task 4 - Gateway query path (localhost server + WS events, no fallback across systems) — DONE 2026-09-12: apps/gateway/src (query-router, subscriptions, server) + test/gateway.test.ts 3/3, npm run check green (24/24 total)
- [x] Task 5 - Web shell (panel registry, layout, client, tokens, shell model) — DONE 2026-09-12: packages/client/src + apps/web/src (panels, layout, tokens, shell) + test/web-shell.test.ts 5/5, npm run check green (29/29 total)
- [x] Task 6 - Health + tasks + Inbox read models (4Cs, provenance, freshness) — DONE 2026-09-12: packages/read-models/src (health, work, inbox, now, workspace-sources) + gateway workspace.inbox.list/task.list + test/read-models.test.ts 5/5, npm run check green (34/34 total)
- [x] Task 7 - Isolation + security tests (A vs B, traversal, symlink, byte-identical fixtures) — DONE 2026-09-12: test/isolation.test.ts 8/8, npm run check green (42/42 total)
- [x] Task 8 - Phase 1 gate (full story green) — DONE 2026-09-12: test/phase1-gate.test.ts 1/1 (register -> read -> panels -> isolate -> shell, live gateway), npm run check green (43/43 total)
- Phase 1 COMPLETE 8/8 100%

## Phase 2 - Live agent control (6 tasks)

- [x] Phase 2 Task 1 - Chat + live screens slice — DONE 2026-09-12: packages/live/src (timeline, sessions, adapter) + chat/bots/runs panels + test/live-chat.test.ts 4/4, npm run check green (47/47 total)
- [x] Phase 2 Task 2 - Agent + runs reads (session summaries, history, run filters, single-entry fetch) — DONE 2026-09-12: gateway agent.list/agent.sessions/run.list/run.get/run.logs + sessions summaries/recent/find + phase-2-live handshake + test/live-runs.test.ts 4/4, npm run check green (51/51 total)
- [x] Phase 2 Task 3 - Live activity stream (WS live events, task rail, tool grouping) — DONE 2026-09-12: packages/live/src/activity.ts (publishLive, groupToolsBySession) + test/live-activity.test.ts 2/2, npm run check green (53/53 total)
- [x] Phase 2 Task 4 - Runs timeline + terminal drawer (trace view, logs, cancel path) — DONE 2026-09-12: packages/live/src/runs.ts (buildTrace, buildLogDrawer, copyLogLine) + test/live-runs-timeline.test.ts 3/3, npm run check green (56/56 total)
- [x] Phase 2 Task 5 - Runtime adapters (Claude/Codex/ACP contract + one working adapter) — DONE 2026-09-12: packages/live/src/runtime-adapters.ts (validateAdapterDescriptor, CliJsonlAdapter, AdapterRegistry) + test/live-adapters.test.ts 4/4, npm run check green (60/60 total)
- [ ] Phase 2 Task 6 - Phase 2 gate (full live story green)

## Phase 3 - Automations + approvals (4 tasks)

- [ ] Phase 3 Task 1 - Automations page (list, run history, create/pause/resume/run-now)
- [ ] Phase 3 Task 2 - Approval inbox (cards, approve/deny, provenance, audit view)
- [ ] Phase 3 Task 3 - Command audit visibility
- [ ] Phase 3 Task 4 - Phase 3 gate (full automation story green)

## Phase 4 - Omnichannel (3 tasks)

- [ ] Phase 4 Task 1 - OpenClaw bridge (scoped tools, no direct file access)
- [ ] Phase 4 Task 2 - Telegram/Discord/WhatsApp via bridge (pairing, ACLs, risk policy)
- [ ] Phase 4 Task 3 - Phase 4 gate (channel story green)

## Phase 5 - Brain graph (3 tasks)

- [ ] Phase 5 Task 1 - Graph projection API (2D first, budgets, provenance panel)
- [ ] Phase 5 Task 2 - 3D mode + clusters (LOD, layout cache, optional view)
- [ ] Phase 5 Task 3 - Phase 5 gate (graph story green)

## Phase 6 - Observability (3 tasks)

- [ ] Phase 6 Task 1 - Trace tree + spans (OTEL-style model, token/cost overlays)
- [ ] Phase 6 Task 2 - Usage views + exporters (Phoenix/Langfuse optional)
- [ ] Phase 6 Task 3 - Phase 6 gate (final release green)

Desktop install (Mac .dmg + Windows) is a planned FINAL step, ONLY on Bogdan approval. Never build early.

## Laws

1. One task at a time. Next starts only when last is green.
2. Dashboard owns zero domain truth.
3. Every OS action scoped by systemId, workspace by workspaceId.
4. No mutations until command boundary exists.
5. No sibling repo edits. No deletions.
