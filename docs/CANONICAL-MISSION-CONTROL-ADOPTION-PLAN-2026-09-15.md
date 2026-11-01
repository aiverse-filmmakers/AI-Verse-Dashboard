# AI-Verse Dashboard Canonical Mission Control Adoption Plan

## Current implementation direction: Personal-first, 1 November 2026

**Operator-approved product order, not a rebaseline of accepted MC weights.** Personal is the first usable Dashboard. Chat remains present throughout navigation; Filmmaking builds on those same chats, agent tools, workspaces, Canvas and connected providers. The original full visible Mission Control shell is a **reference implementation and reusable capability source**, not a requirement that users see its whole operator console first. Retain previous source, accepted MC0/MC1 proof and 17/100 historical acceptance. This section supersedes the older full-shell-first sentences under **Decision** and **First objective**, not their ownership/security invariants.

### First useful owner-backed journey

1. **Open Personal and actually chat.** Dashboard displays an authenticated, scope-bound real Gateway conversation, streaming state, stop/control, terminal recovery and persisted session/history. Reuse existing source in draft [PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), not fake preview replies. Every split chat has the same functional controls, can close/reopen, and must survive workspace changes without cross-system leakage.
2. **Select the correct system, workspace and context.** A trusted host manages registered roots, scopes, lease rotation and readback. General chat need not force a newly created workspace. Canvas notes and app context attach only when selected and admitted; no arbitrary model-generated filesystem path.
3. **Use actual shared Canvas and tools.** Canonical Data owns documents, revisions and grouping; OS grants govern actor actions; Gateway owns runs. Their merged owner APIs can be consumed by Dashboard after explicit host integration/security tests. Binary attachments, model tools and Skills execution remain blocked until real owner-backed ingestion/provenance and permissions exist.
4. **Expose useful work when it exists.** Compact agent activity, owner-confirmed tasks, approvals, health, Memory/Skills and usage appear contextually, never as invented live backend data. Stop/Resume permissions and approvals are checked by the actual owner at final effect.
5. **Make connections beginner-friendly.** One Connections area plus contextual entry from Chat or creation tools. Explain ChatGPT, OpenRouter, KIE.ai and Higgsfield with their real supported sign-in or API-key method, privacy, costs and verification states. [Connections UX handoff](CONNECTIONS-UX-HANDOFF-2026-10-27.md) is product intent only; no paid provider access or fake OAuth is authorized by this plan.
6. **Deliver one bounded Filmmaking feature**, then a supervised, recoverable local desktop application/installer, followed by supported multi-OS operation and private Mac owner acceptance. No separate backends, stores, schedulers, credential vaults, installer or feature-completion percentages may be invented.

### Execution milestones and mandatory reviews

- **Already accepted:** MC0/MC1 = 15 original formal points; [MC2.1 design](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/43) reviewed and merged, plus [formal ledger reconciliation](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/45), giving **17/100** original MC points. No owner Mac rollout acceptance. The 10-chapter, 40 G## engineering inventory and provisional GitHub/browser **47/100**, Chat **11/15** figures are source-review checkpoints on draft #42, not an accepted new scoring system.
- **Current original MC gate: MC2.2 (3 points), formal acceptance still 0/3.** The native Gateway host/HTTP/WebSocket/client and canonical run controller from [#46–#59](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/59) are merged. Secure local pairing, owner activity/diagnostics/Canvas-unavailable seam and actual mounted Chat source are merged in [#61–#65](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/65). [#66](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/66) merged 36 passing real-Chromium fixture interactions, [#67](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/67) merged the first-party terminal launcher, disposable pinned *real Gateway* Chromium journey and direct executable smoke test, with all #67 main push checks green, and [#68](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/68) adds a reviewed real-browser operator -> film -> operator round-trip isolation proof. These are implemented, tested and reviewed source, **not** accepted private Mac installation or full owner/security approval. Pending gates include formal MC2.2 client/owner-security acceptance, MC2.4 owner acceptance, production/provider admission and the independently required local release checks. The legacy draft #42 is only an extraction checkpoint; do not bulk-merge it. [Current tracker](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md) and [source-review checkpoint](MC2.2-CODE-REVIEW-CHECKPOINT-2026-10-31.md) retain the acceptance blockers.
- **Then MC2.3 and remaining original MC2 gates:** use a first-class admitted `aiverse` runtime source and system/workspace selection, verified with actual Gateway composition. A listed model is not a usable physical model; dynamic provider/model admission and billable execution require Connections/Gateway/Token owner contracts.
- **Parallel only when independent:** Data/OS Canvas owner changes already merged to those owner mains, so Dashboard integration can be reviewed in separate small PRs without changing their authority. Complete source slices in existing Personal-first milestone order rather than chasing 12/15 or creating arbitrary task counts.
- **Later original MC3-MC6:** feature disposition, owner-backed conversion, UI simplification and package/desktop qualify against revised Personal-first behavior. Any expanded scope or points beyond the old 100-point rubric requires a separate reviewed versioned rebaseline.
- **Every step:** implement → exact-head unit/negative/browser/real-composition CI → [Code Review](REVIEW-ACCEPTANCE-WORKFLOW-2026-10-30.md) with severity/findings and factual AI-assisted provenance → milestone acceptance only when all scoped tests/contracts pass → merge bounded code → post-merge checks → actual owner Mac gate when necessary. Any P0-P2 defect blocks that slice. Do not mass-merge PR #42 or overwrite its code without preserving a reviewable source path.

**Status of old Plan PR #41:** its proposed product direction is recognized here, but its old replacement files still state 15/100 and predate accepted MC2.1 governance. Once this reconciled change is reviewed and merged, #41 should be closed as superseded; its child source PR #42 remains intact for dependency-ordered extraction and review.

## Review and acceptance amendment (operator-approved, 30 October 2026)

From this point forward, every scoped source milestone must follow **implementation → exact-head automated CI/security/browser/real-owner tests as relevant → Code Review skill assessment with recorded AI-assisted provenance → recorded acceptance against its actual criteria → merge of independently eligible code → owner-local/production validation where required**.

See [the review and acceptance workflow and current 40-milestone catch-up audit](REVIEW-ACCEPTANCE-WORKFLOW-2026-10-30.md). That document is an additional governance gate for the existing plan, not a replacement for the System owner, an amendment of existing weights or retroactive acceptance of drafts. Do not advance a formal MC or G## milestone by CI alone; do not treat AI-assisted self-review as independent human signoff or a privileged production grant. Prior MC0/MC1 accepted total stays 15/100 until a new gate actually closes. MC2.1 is being reviewed separately in [focused PR #43](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/43), not as bulk approval of implementation PR #42.

**Date:** 2026-09-15  
**Status:** CANONICAL IMPLEMENTATION PLAN  
**System authority:** `AI-Verse-System/docs/DASHBOARD-CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`  
**Upstream shell pin:** `builderz-labs/mission-control@5483a0e1eef15b467c167e95796791112cedbb7c`  
**Dashboard baseline before adoption:** `c636acf019f76194c40a341bd7985906383f7106`

## Implementation authority

Before implementation, read:

- [Canonical PRD](PRD-MISSION-CONTROL-AIVERSE-DASHBOARD-2026-09-15.md)
- [Execution tracker](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md)

The PRD defines invariants and the tracker defines the only active execution order. Future chats must recheck live GitHub state, then continue the first eligible tracker task.

## Decision

Use Builderz Labs Mission Control as the initial launchable UI/application shell.

Keep AI-Verse as the architecture and source-of-truth system underneath it.

Do not restart the previous scratch-built shell sequence. Do not delete the existing Dashboard foundations. Reuse the existing protocol, isolation, registry, panel/layout, live-event and runtime-adapter work where it strengthens the Mission Control-derived shell.

## First objective

Get a real Mission Control task executing through a real AI-Verse system before stripping any Mission Control feature.

Mission Control already supports an OpenAI-compatible local provider. AI-Verse Gateway already exposes an OpenAI-compatible `/v1/chat/completions` endpoint.

Initial proof route:

~~~text
Mission Control
  -> LOCAL_LLM_ENDPOINT=http://127.0.0.1:8787/v1
  -> AI-Verse Gateway
  -> selected AI-Verse system/workspace
  -> owner boundaries
  -> runtime
~~~

Use `dispatchModel=local/aiverse`. Mission Control strips the provider prefix and sends model `aiverse`.

This is a temporary compatibility route used to prove task dispatch. Stock Mission Control does not send its main /chat page through this generic provider path. It does not make Mission Control the canonical task, agent, memory, schedule, cost, approval or session owner.

## Rules

1. Prototype before strip.
2. Every Mission Control feature gets an explicit PROJECT, ADOPT, PRESENTATION-ONLY or STRIP decision.
3. AI-Verse owner boundaries remain stronger than Mission Control's internal domain model.
4. Mission Control SQLite is never silently promoted to AI-Verse canonical state.
5. Existing Dashboard isolation and system/workspace scope tests are preserved.
6. Existing Dashboard plans remain in Git history/docs as historical evidence, but this plan controls sequencing.
7. GawkBot is a primary UX reference, not a source-code donor under its current license.
8. Tauri 2 remains the preferred final desktop wrapper over the same product UI.
9. The browser and DMG share one UI.
10. The canonical AI-Verse Gateway remains the runtime/client edge.

## Reproducible MC1 runbook

Use [MC1-MISSION-CONTROL-AIVERSE-RUNTIME-PROOF.md](MC1-MISSION-CONTROL-AIVERSE-RUNTIME-PROOF.md) for the exact non-destructive local proof.

## Work tracks

### MC0: baseline and preservation

- pin upstream Mission Control;
- record MIT provenance;
- preserve current Dashboard implementation and tests;
- run stock Mission Control locally;
- add no AI-Verse domain mutation yet.

### MC1: real AI-Verse runtime dispatch proof

- run canonical AI-Verse Gateway;
- point Mission Control local provider to Gateway;
- create/select an AI-Verse-backed runtime entry;
- create and dispatch a real task using an agent configured with `dispatchModel=local/aiverse`;
- prove system/workspace isolation and Gateway authentication;
- record an integration test.

### MC2: explicit AI-Verse mode

Replace the generic-local disguise with a first-class AI-Verse adapter.

Surface selected:

- system;
- workspace;
- Gateway;
- runtime/account;
- session/run;
- live events;
- cancel/pause/resume/approval capabilities.

### MC3: full feature disposition

Use `docs/MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md`.

Nothing gets stripped before its disposition is recorded.

### MC4: owner-backed conversion

Replace Mission Control-owned domain storage progressively with AI-Verse owner projections and commands.

Order:

1. system/workspace/Gateway;
2. chat/runs;
3. Bots/Workers/Rooms/Tasks;
4. approvals/attention;
5. Automations;
6. Token;
7. Memory/Skills;
8. Connections/channels/webhooks;
9. health/security/doctor;
10. Brain;
11. Apps/Data;
12. advanced operator extras.

### MC5: product simplification

Make AI-Verse simpler than stock Mission Control.

Default surface:

- Ask AI-Verse;
- Workspaces;
- Recent work;
- Needs You.

Advanced Control Center exposes the full Mission Control-style system view.

### MC6: desktop

Wrap the same UI in Tauri 2.

Add:

- folder selection;
- existing AI-Verse detection;
- persisted system registry;
- per-system Gateway supervision;
- secure Gateway-token storage;
- explicit Distribution installation;
- DMG packaging;
- detached windows/HUD later.

## Existing Dashboard code to retain

Retain and integrate, do not throw away:

- `packages/protocol`;
- `packages/registry`;
- systemId/workspaceId isolation rules;
- `packages/client`;
- read-only projection code where owner-correct;
- `apps/web/src/panels.ts` panel contracts;
- `apps/web/src/layout.ts` layout/presentation model;
- `packages/live` normalization and trace helpers;
- runtime-adapter interfaces;
- isolation/security tests.

The current Dashboard `apps/gateway` is not the canonical AI-Verse Gateway. Treat it as historical projection/compatibility scaffolding and retire or narrow it as owner projections move behind the real AI-Verse Gateway.

## Acceptance gate before visual stripping

Do not begin a mass removal pass until all are true:

- stock Mission Control launches;
- AI-Verse Gateway launches;
- Mission Control dispatches a successful task through AI-Verse Gateway;
- the selected AI-Verse system/workspace is explicit;
- no cross-system context leak exists;
- feature-disposition map is complete;
- upstream license/provenance is recorded;
- current Dashboard tests remain preserved or replaced by stronger equivalent coverage.

## End state

The user should no longer perceive a fork of Mission Control.

The finished product is AI-Verse:

- Mission Control contributes shell maturity and operator UX;
- GawkBot contributes job-oriented product simplicity;
- OpenHands contributes workspace/runtime UX;
- Hermes contributes Gateway/system UX;
- Celesto can later contribute isolated computer execution;
- AI-Verse owns all canonical intelligence, state, permissions and lifecycle.
