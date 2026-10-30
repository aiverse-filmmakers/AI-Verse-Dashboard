# Development tasks 413–438: Real Personal workspace diagnostics

**29 October 2026.** Dashboard draft PR [#42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42). **26 small, source-backed implementation/integration/security/verification/documentation slices.** Each task is a bounded outcome or named test group, not a major chapter or automatically accepted point.

**Chapter:** G06 Owner-backed Control Center. **Milestone:** G06.1 IN PROGRESS, not complete. This adds a real Personal diagnostics panel to existing approved host-authenticated interactions. Full fleet/workspace lifecycle controls are not implemented.

- **Task 413.** Audited draft PR #42 and confirmed every previous exact-head workflow green before starting new source.
- **Task 414.** Qualified pre-existing localhost owner/session policy and bound UI to the existing authenticated DashboardClient.
- **Task 415.** Created a real first-party PersonalDiagnostics component (no preview or localStorage state).
- **Task 416.** Implemented actual canonical Gateway readiness and supported-capabilities projection.
- **Task 417.** Implemented real canonical Data-owned Canvas document availability with bounded page count.
- **Task 418.** Implemented real canonical Gateway recent-conversation availability (5-row page only).
- **Task 419.** Implemented public OS SystemRegistry current-system status projection.
- **Task 420.** Validated each source and exact selected workspace/system before reporting availability.
- **Task 421.** Reported independent failures for each owner through Promise.allSettled instead of fake green aggregate.
- **Task 422.** Separated supported run/model capabilities from verified inference truth.
- **Task 423.** Redacted private document titles, session IDs, credentials and raw owner records from displayed diagnostics.
- **Task 424.** Implemented stale-result fencing across close, refresh, scope retarget and A→B→A transitions.
- **Task 425.** Added manual Refresh status with per-source pending and error states.
- **Task 426.** Integrated Workspace status into real host-authenticated Personal Chat toolbar.
- **Task 427.** Added responsive accessible status cards and keyboard-visible focus controls.
- **Task 428.** Expanded HttpOnly paired local-app allowlist only for exact-scope read-only system.get.
- **Task 429.** Added real localhost paired-cookie assertion that the own public system.get succeeds.
- **Task 430.** Added denial regressions for other systems, other workspaces and broad system/workspace list.
- **Task 431.** Proved public SystemRegistry response never exports root or rootIdentity.
- **Task 432.** Added 36 native diagnostic source/shape/count/scope/projection regression cases.
- **Task 433.** Proved real canonical Gateway status in paired Chromium browser via the actual host RPC.
- **Task 434.** Proved missing Canvas owner displays unavailable, not a fake healthy document.
- **Task 435.** Proved real recent conversation status and bounded history in paired Chromium.
- **Task 436.** Proved exact current registered OS status and restricted browser scope.
- **Task 437.** Fixed the browser test's exact toolbar locator and verified no privileged bearer reaches browser RPC.
- **Task 438.** Documented source evidence, owner boundary, milestone G06.1 and GitHub/formal/local progress split.

## Source and verification

- First-party UI: `apps/web/src/personal-diagnostics.ts`, `apps/web/src/personal-chat-ui.ts`, `apps/web/src/personal-chat.css`.
- Authenticated exact-boundary local app: `apps/gateway/src/local-app-session.ts`; public registry `system.get` only for paired system/workspace; no `system.list`, `workspace.list`, raw OS root or other-system access.
- Tests: `test/personal-diagnostics.test.ts` (36 model cases), `test/local-app-session.test.ts` (real cookie and denied cross-scope), `scripts/mc2/ci-authenticated-browser-proof.mjs` (real pinned Gateway browser journey with four source checks and honest missing Canvas owner).
- Source implementation verified at `0f276bae960f98b0082bad4a7e1fe7685009e6b4`: [Linux/macOS/Windows Dashboard CI 40832818420](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40832818420) GREEN; [real canonical Gateway and actual paired Chromium 40832818224](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40832818224) GREEN. Final progress/doc-only head has a separate newer CI rerun; check its exact conclusion.
- Runbook: `docs/PERSONAL-WORKSPACE-DIAGNOSTICS-2026-10-29.md`.

## Progress and remaining gates

- **GB ~38/100 provisional** (controls partial 0→1 point, verified source only). FA **15/100 formally accepted**, unchanged. Local native/owner acceptance unmeasured.
- Finite milestone inventory unchanged: **10 chapters, 40 milestones**, 4 verified, 8 implemented in draft, **2 in progress** (G03.4 Canvas and G06.1 Control Center), 26 planned.
- This is **not** a complete System/Workspace Control Center. Still pending: supervised native Mac login, host-bound system switching, workspace lifecycle and scopes, real Gateway/OS agent/approval log panels, provider connections, Brain/Memory/Skills/Automations/Token/Connections projections, desktop build/signing, account consent and dogfood.
- **Next task 439**. Reuse existing diagnostics source and don't reintroduce false metrics or broaden paired-browser permissions without a new threat review.
