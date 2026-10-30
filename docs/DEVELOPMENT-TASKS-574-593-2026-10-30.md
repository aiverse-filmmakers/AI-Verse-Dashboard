# Development Tasks 574–593: Owner-scoped canonical Stop and same-session continuation

**30 October 2026.** Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), branch `codex/dashboard-source-checkpoint`. Implemented source-backed Chat run cancellation via the **existing canonical Gateway**, not socket-closing camouflage or a second run store. No merge or private Mac installation.

## Functional tasks completed

- **574:** Inspect actual Gateway runtime/Connections ownership. `/v1/models` advertises only virtual `aiverse`; physical provider selection still has **no verified owner-backed list/authorization contract**. No fake model picker.
- **575:** Audit the canonical authenticated `/v1/runs/:id/cancel` route, principal-bound run ownership, session identity, idempotency key and terminal-state behavior.
- **576:** Add the named `aiverse.gateway.run.cancel` command to the protocol registry with mandatory system/workspace scope. It is not a general read-only query or arbitrary RPC command.
- **577:** Admit exactly that cancel command, not pause/resume/approval, in the same-origin paired browser method list.
- **578:** Add `allowRunCancel?:boolean` to the trusted host's already-authorized Gateway mapping; **default is deny**.
- **579:** Validate exact run ID, canonical session ID and operation ID with a strict schema. Reject extra parameters, provider URLs, authority hints and traversal.
- **580:** Add a trusted-host-only canonical control hook called **after** an authenticated run GET and **before** the mutating POST.
- **581:** Recheck session identity, terminal status, OS root binding and registry generation at that pre-mutation boundary; reject a rebind without posting cancellation.
- **582:** Dispatch the fixed `cancel` action with fixed `dashboard_operator_stop` audit reason and exact idempotent operation ID through the canonical client.
- **583:** Add typed Dashboard-local client API `cancelGatewayRun`; never send a physical provider key or upstream bearer to the browser.
- **584:** Add `PersonalChatRunController.stop()` with known run identity, one control request, interruption recovery and stale-epoch fencing.
- **585:** Add a real per-pane Stop button enabled only while a run is active **and** an authenticated Gateway status confirms the host's cancellation opt-in for this workspace.
- **586:** Test the real Chromium interaction using a deliberately still-running Gateway-shaped fixture; verify one run-create and one real cancel RPC, with no completed fake assistant answer.
- **587:** Test default refusal, malformed input, wrong canonical session, foreign workspace, terminal run and denial of unapproved pause/approval. Do not touch upstream on denied controls.
- **588:** Test pre-POST OS rebind and stale A→B→A workspace responses; neither may issue a foreign cancellation or repaint an obsolete conversation.
- **589:** Test uncertain cancellation and same-run authenticated GET-only reconciliation, never another model invocation.
- **590:** Reconcile a cancel request racing with a naturally completed run using canonical GET, preserving a legitimately completed answer.
- **591:** Permit another user message in the same **canceled** Gateway session, excluding aborted user/assistant fragments from confirmed model context. Render a local non-assistant 'Response stopped' status.
- **592:** Wire a genuine **interactive trusted-launcher opt-in**: `AIVERSE_DASHBOARD_ALLOW_RUN_CANCEL=1` works only with `AIVERSE_DASHBOARD_PERSONAL_UI=1` and a real interactive TTY. Plain headless host startup must refuse this permission **before Gateway preflight**.
- **593:** Add real pinned-Gateway CI proof that a headless launcher with the cancel flag exits nonzero and does not expose the bearer. Run the full cross-platform, Chromium, real Gateway and progress-integrity suites.

## Final functional-source CI

Exact source commit: `f8571dd32630c69a0534ac3d0a2d0684739eafbc`.

- [Dashboard CI / Linux, macOS, Windows 41023718870](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718870): **success**.
- [Chromium browser interaction QC 41023718799](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718799): **success**.
- [Pinned real canonical Gateway composition 41023718875](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718875): **success**.
- [GitHub/formal progress integrity 41023718779](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718779): **success**.

The source tests initially found that a synthetic run did not persist cancellation and that the Stop UI was accidentally disabled whenever Chat was running. Both were corrected; the **final** four-job functional head is green. Additional safeguards cover late event listeners, workspace changes, terminal/Stop races and failed control responses.

## Honest scoring and remaining owner work

**Chat/Gateway: 10/15 provisional** (9 prior); **GitHub/browser: 46/100 provisional** (45 prior). This is one engineering increment for a real authenticated run-control capability and safe continuation, not 20 points for task counts. **Formal roadmap acceptance: 15/100 unchanged.** The fixed 10-chapter / 40-milestone ledger remains 4 verified, 8 implemented in draft, 5 in progress, 23 planned. G02.3 stays in progress.

Default host mode and CI headless are **not granted Stop**; interactive local operator must explicitly opt in. Native per-user entitlement/approval issuance, private Mac packaging and owner consent are separate acceptance gates. No provider sign-in or physical model switching was implemented; no upstream Gateway repo changes were needed; this feature uses canonical Gateway's existing authenticated cancel and audit endpoint. No broad pause/resume/approval command was exposed.

**Next Task 594:** establish canonical Gateway/Connections-approved per-provider, per-model capability and consent contract for genuine model choice. Until a real owner can provide and enforce choices, do not offer fictitious provider selections. Further partial Chat work: asset-owner-backed attachments, typed OS Skills and operator identity/grant issuance, followed by actual Mac owner acceptance.
