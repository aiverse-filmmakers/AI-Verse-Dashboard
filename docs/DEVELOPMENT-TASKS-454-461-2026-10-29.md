# Development Tasks 454–461: Verified owner diagnostics and resizable real chat

**29 October 2026.** Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42). These are **eight small source, verification and documentation slices**, not eight major features. Continuation from [Tasks 439–453](DEVELOPMENT-TASKS-439-453-2026-10-29.md).

- **454:** Confirm the restart-test harness repair at `5c371568dd380440343844bc281766eccb07d124` passed the entire real canonical Gateway/OS/Data composition, not merely a local assertion.
- **455:** Implement actual per-conversation desktop width control in first-party host-authenticated chat, not the static preview.
- **456:** Provide accessible arrow-key adjustment (32 px, Shift+Arrow 64 px), labelled separator, pointer capture and 280–750 px bounds.
- **457:** Preserve widths when clearing a chat, leave conversations/backend ownership untouched, and fall back to full-width stacked panes on narrow screens.
- **458:** Add a real Playwright browser interaction checking keyboard and pointer width, controls, width continuity and mobile layout.
- **459:** Verify the exact new source commit across Dashboard Node 22 Linux/macOS/Windows and progress-integrity CI.
- **460:** Verify browser QC and real pinned canonical Gateway composition on the same source commit.
- **461:** Reconcile the fixed scorecard, milestone status and this handoff, preserving the existing roadmap and accepted points.

## Evidence and boundaries

**Source**: `apps/web/src/personal-chat-ui.ts`, `apps/web/src/personal-chat.css`, `test/live-personal-chat-ui.browser.mjs`.

Exact verified source commit: `0e915209fe2d151c2d9306ab156d05522460d4bf`.

- [Dashboard Node 22 CI 40874888256](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40874888256): success.
- [Chromium interaction QC 40874888550](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40874888550): success.
- [Real canonical Gateway composition 40874888319](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40874888319): success.
- [Progress integrity 40874888246](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40874888246): success.
- Restart harness composition at `5c371568`: [40874360134](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40874360134), success.

**Provisional GitHub/browser engineering 39/100**, UX category 1→2/5, based on actual source/Chromium interaction, not task count. **Formal accepted 15/100**, unchanged. Native owner Mac installation/release acceptance unmeasured.

**10 chapters, 40 milestones**: 4 verified, 8 implemented in draft, 3 in progress (G03.4, G06.1, G08.2), 25 planned. G08.2 is partial, not accepted. Chat resizing is real in the authenticated first-party app, but not production installed.

**Next Task 462:** qualify the next highest-value G06.1 native workspace-lifecycle or G05 provider/asset integration, after checking latest exact-head CI. Keep the finite milestone plan and avoid duplicate owner stores or preview-only feature work.
