# AI-Verse Dashboard Build Map

**Updated:** 2026-09-12
**Status:** Phase 1 IN PROGRESS
**Implementation progress:** 7 tasks complete
**Next:** Task 8 - Phase 1 gate

This is the canonical task ledger for Dashboard, like Data's 41-task map.

## Phase 1 - Read-only Control Room (tasks 1-8)

- [x] Task 1 - Protocol package (versioned envelope, systemId + workspaceId + panelId/presentation, Zod, no raw roots) — DONE 2026-09-12: packages/protocol/src (ids, methods, envelope) + test/protocol.test.ts 10/10; shell amendment: panelId slug + full/compact/hud; npm run check green
- [x] Task 2 - OS registry + validation (compatible OS check, systemId map, per-window selection) — DONE 2026-09-12: packages/registry/src (validation, registry, selection) + test/registry.test.ts 5/5, npm run check green (14/14 total)
- [x] Task 3 - Read adapters (read-only Markdown + SQLite, disposable cache by systemId) — DONE 2026-09-12: packages/os-read-adapter/src (path-resolve, markdown, sqlite, workspace, cache) + test/read-adapters.test.ts 6/6, npm run check green (21/21 total)
- [x] Task 4 - Gateway query path (localhost server + WS events, no fallback across systems) — DONE 2026-09-12: apps/gateway/src (query-router, subscriptions, server) + test/gateway.test.ts 3/3, npm run check green (24/24 total)
- [x] Task 5 - Web shell (panel registry, layout, client, tokens, shell model) — DONE 2026-09-12: packages/client/src + apps/web/src (panels, layout, tokens, shell) + test/web-shell.test.ts 5/5, npm run check green (29/29 total)
- [x] Task 6 - Health + tasks + Inbox read models (4Cs, provenance, freshness) — DONE 2026-09-12: packages/read-models/src (health, work, inbox, now, workspace-sources) + gateway workspace.inbox.list/task.list + test/read-models.test.ts 5/5, npm run check green (34/34 total)
- [x] Task 7 - Isolation + security tests (A vs B, traversal, symlink, byte-identical fixtures) — DONE 2026-09-12: test/isolation.test.ts 8/8, npm run check green (42/42 total)
- [ ] Task 8 - Phase 1 gate (full story green)

## Phase 2-6 - Later (not started)

Phase 2 live control, Phase 3 automations, Phase 4 channels, Phase 5 Brain graph, Phase 6 observability. Plus final desktop install (Mac + Windows) only when Bogdan says so.

## Laws

1. One task at a time. Next starts only when last is green.
2. Dashboard owns zero domain truth.
3. Every OS action scoped by systemId, workspace by workspaceId.
4. No mutations until command boundary exists.
5. No sibling repo edits. No deletions.
