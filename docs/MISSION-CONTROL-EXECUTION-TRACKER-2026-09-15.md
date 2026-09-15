# Mission Control -> AI-Verse Dashboard Execution Tracker

**Date:** 2026-09-15  
**Status:** CANONICAL EXECUTION TRACKER  
**PRD:** `docs/PRD-MISSION-CONTROL-AIVERSE-DASHBOARD-2026-09-15.md`  
**Canonical plan:** `docs/CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`

## How to use this tracker

This file is the execution ledger for the Mission Control adoption program.

Future chats must:

1. inspect current GitHub state first;
2. read this tracker and the PRD;
3. continue the first ACTIVE or PENDING task whose dependencies are accepted;
4. update this file after each accepted PR/gate;
5. never skip ahead merely because a later task is easier.

## Responsibility labels

- **A** = assistant can complete through GitHub/CI without user action.
- **A/H** = assistant prepares and automates everything; user performs one local or security-sensitive acceptance step.
- **H** = user-controlled action is inherently required.

The goal is to minimize H work.

## Progress accounting

Formal program weight totals **100 points**.

A task contributes its points only after its acceptance gate is satisfied and evidence is recorded.

**Current accepted progress: 5 / 100. 95% remaining.**

The previously merged canonical adoption plan is prerequisite context, not retroactive execution credit for this tracker.

---

# MC0 - Governance, preservation and build safety - 5 points

### MC0.1 - Canonical PRD - 1 point - A
Status: COMPLETE

Deliver:
- PRD with product goals, invariants, source-adoption strategy, phases, human checkpoints and failure rules.

Acceptance:
- merged to Dashboard main;
- canonical plan links to it.

Evidence:
- Dashboard PR #5 merged at `604b7fec8d1e53a930c63be62f6891050eb0e33b`.

### MC0.2 - Canonical execution tracker - 1 point - A
Status: COMPLETE

Deliver:
- this file;
- fixed phase order;
- responsibility labels;
- weighted progress.

Acceptance:
- merged to Dashboard main.

Evidence:
- Dashboard PR #5 merged at `604b7fec8d1e53a930c63be62f6891050eb0e33b`.

### MC0.3 - Third-party provenance baseline - 1 point - A
Status: COMPLETE

Deliver:
- `THIRD_PARTY_NOTICES.md`;
- exact Builderz Mission Control MIT pin;
- source-adoption rules;
- GawkBot reference-only licensing note;
- upstream upgrade policy.

Acceptance:
- license/provenance review passes;
- no copied third-party source exists without attribution.

Evidence:
- `THIRD_PARTY_NOTICES.md` merged in Dashboard PR #6 at `f54625255f76bccc716915620b8bd687710fe943`.
- Builderz Mission Control pinned to `5483a0e1eef15b467c167e95796791112cedbb7c` under MIT.
- GawkBot recorded as reference-only under its reviewed Sustainable Use License.

### MC0.4 - Dashboard CI baseline - 1 point - A
Status: COMPLETE

Deliver:
- GitHub Actions for Node 22;
- `npm ci` / build / tests;
- clean runner support;
- no developer-local absolute dependencies.

Acceptance:
- current pre-adoption Dashboard test suite passes on hosted CI.

Evidence:
- Dashboard PR #6 repaired the clean-install lockfile, portable live-OS probe and Windows root-overlap logic.
- PR-head CI run `34992855307` passed Linux, macOS and Windows.
- post-merge main CI run `34993003011` passed Linux, macOS and Windows at `f54625255f76bccc716915620b8bd687710fe943`.

### MC0.5 - Baseline architecture preservation report - 1 point - A
Status: COMPLETE

Deliver:
- exact files/packages that must survive adoption;
- current tests mapped to invariants;
- current known defects/scaffolding explicitly separated from preserved law.

Acceptance:
- report merged;
- MC1 activated.

Evidence:
- `docs/BASELINE-PRESERVATION-REPORT-2026-09-15.md` merged in Dashboard PR #6 at `f54625255f76bccc716915620b8bd687710fe943`.
- MC1.1 is now the only active implementation task.

---

# MC1 - Real AI-Verse runtime dispatch proof - 10 points

### MC1.1 - Automated local lab bootstrap - 2 points - A
Status: ACTIVE

Deliver:
- script that clones/checks out pinned stock Mission Control into a lab directory;
- dependency/runtime preflight;
- no writes into AI-Verse repos;
- idempotent rerun.

Acceptance:
- script unit/static checks;
- clear failure messages;
- no secret persistence.

### MC1.2 - Gateway preflight + smoke verifier - 2 points - A
Status: PENDING

Deliver:
- script that verifies `/health`, `/status` where appropriate, `/v1/models`, auth and model `aiverse`;
- optional direct `/v1/chat/completions` smoke;
- secret redaction.

Acceptance:
- deterministic pass/fail output;
- mock/fixture tests in CI.

### MC1.3 - Mission Control AI-Verse dispatch setup automation - 2 points - A
Status: PENDING

Deliver:
- safe env/template setup for `LOCAL_LLM_ENDPOINT`;
- documented `local/aiverse` agent config;
- no committed bearer token;
- exact pinned upstream compatibility assertions.

Acceptance:
- automated fixture proves generated config is correct.

### MC1.4 - Real local Mission Control -> Gateway proof - 3 points - A/H
Status: PENDING

Assistant:
- provides one command/script;
- interprets result;
- diagnoses failures;
- updates code/runbook if needed.

User:
- runs the command on the Mac where the real AI-Verse system and Gateway token exist;
- completes local Mission Control admin setup only if stock upstream requires it;
- returns output or screenshot if needed.

Acceptance:
- one real task executes through canonical Gateway;
- intended system/workspace proven;
- response returns to Mission Control;
- deleting the lab does not affect AI-Verse.

### MC1.5 - MC1 evidence + gate closure - 1 point - A
Status: PENDING

Deliver:
- sanitized evidence;
- accepted refs;
- known limitations;
- MC2 activation.

Acceptance:
- tracker updated;
- no Mission Control state promoted to canonical AI-Verse truth.

---

# MC2 - First-class AI-Verse adapter - 15 points

### MC2.1 - Adapter contract design - 2 points - A
Status: PENDING

Deliver:
- exact Dashboard <-> AI-Verse Gateway client contract;
- capability discovery;
- system/workspace binding;
- auth handling;
- event/run/control mapping.

Acceptance:
- design review against Gateway protocol and Dashboard invariants.

### MC2.2 - AI-Verse Gateway client package - 3 points - A
Status: PENDING

Deliver:
- typed client for models/chat/runs/events/cancel/pause/resume/approval;
- auth redaction;
- timeout/retry/idempotency behavior;
- tests.

Acceptance:
- CI green;
- no direct canonical-domain writes.

### MC2.3 - Explicit AI-Verse runtime source - 3 points - A
Status: PENDING

Deliver:
- `aiverse` runtime identity;
- no `local/aiverse` disguise for normal product use;
- Gateway readiness/capability state.

Acceptance:
- product can distinguish AI-Verse from generic OpenAI-compatible runtimes.

### MC2.4 - System/workspace selection integration - 2 points - A
Status: PENDING

Deliver:
- explicit system/workspace selection;
- no silent fallback;
- preservation of existing isolation tests.

Acceptance:
- A -> B -> A tests;
- wrong-system requests fail closed.

### MC2.5 - Main Chat + Run/event controls - 4 points - A
Status: PENDING

Deliver:
- main Chat path through canonical Gateway;
- streaming;
- runs/events;
- cancel/pause/resume/approval when advertised.

Acceptance:
- end-to-end fixture tests;
- Session/Run truth remains Gateway-owned.

### MC2.6 - Provider/account login projection - 1 point - A/H
Status: PENDING

Assistant:
- implements readiness/login hooks that do not own provider tokens.

User:
- completes an interactive provider login only if the chosen runtime requires browser/account approval.

Acceptance:
- Dashboard stores readiness, not raw provider credential truth.

---

# MC3 - Mission Control shell adoption + disposition freeze - 10 points

### MC3.1 - Control-center app skeleton - 2 points - A
Status: PENDING

Deliver:
- new launchable app surface inside Dashboard repo;
- existing packages remain intact;
- no wholesale repo replacement.

### MC3.2 - Mission Control presentation import tranche 1 - 2 points - A
Status: PENDING

Deliver:
- core layout/nav/overview/chat presentation components;
- attribution;
- backend seams replaced with adapters where required.

### MC3.3 - Existing Dashboard contract bridge - 2 points - A
Status: PENDING

Deliver:
- reuse of registry/protocol/isolation/layout/live packages;
- no duplicate system/workspace model.

### MC3.4 - Reference mode + full panel inventory - 2 points - A
Status: PENDING

Deliver:
- upstream panels visible in dev/reference mode where practical;
- final per-panel disposition confirmed against actual imported code.

### MC3.5 - Pre-strip gate - 2 points - A
Status: PENDING

Acceptance:
- shell launches from AI-Verse-Dashboard repo;
- CI green;
- all existing isolation laws preserved;
- provenance complete;
- no feature has been stripped without disposition.

---

# MC4 - Owner-backed conversion - 35 points

Each subphase is independently gated. Mission Control authority for an area is retired only after the AI-Verse owner path passes.

### MC4A - System / Workspace / Gateway - 3 points - A
Status: PENDING

Owner: OS + Gateway + Dashboard local presentation metadata.

Acceptance:
- explicit system/workspace;
- owner-backed Gateway state;
- no Mission Control workspace authority.

### MC4B - Chat / Runs / Live Activity - 3 points - A
Status: PENDING

Owner: Gateway.

Acceptance:
- all production live state comes from Gateway.

### MC4C - Bots / Workers / Rooms / Tasks - 4 points - A
Status: PENDING

Owner: Multiple Bots / OS where defined.

Acceptance:
- no Mission Control agent/task registry is canonical.

### MC4D - Attention / Approvals / Quality Review - 4 points - A
Status: PENDING

Owner: Gateway/OS/Brain/Multiple Bots according to action.

Adopt:
- unified review queue;
- human-readable completion receipts.

Acceptance:
- review UI never invents verdict authority.

### MC4E - Automations - 3 points - A
Status: PENDING

Owner: Automations.

Acceptance:
- schedules/triggers are Automations-backed;
- Mission Control cron authority retired.

### MC4F - Token / Usage / Cost - 3 points - A
Status: PENDING

Owner: Token.

Acceptance:
- ACTUAL/CALCULATED/UNKNOWN preserved;
- no Dashboard pricing engine.

### MC4G - Memory / Skills - 3 points - A
Status: PENDING

Owners: Memory + Skills.

Acceptance:
- browser/graph/skills views use owner projections;
- no Mission Control memory/skill store is canonical.

### MC4H - Connections / Integrations / Channels / Webhooks - 4 points - A
Status: PENDING

Owners: Connections + Automations as appropriate.

Acceptance:
- credentials remain opaque;
- external effects remain owner/permission controlled.

### MC4I - Health / Doctor / Security / Audit - 3 points - A
Status: PENDING

Owners: each component + OS/Gateway aggregation.

Adopt:
- security center;
- doctor/update banners;
- backup/maintenance projection.

Acceptance:
- unavailable remains unavailable;
- no Dashboard-invented health.

### MC4J - Brain - 2 points - A
Status: PENDING

Owner: Brain.

Acceptance:
- goals/strategy/verification/graph are projections only.

### MC4K - Apps / Data - 2 points - A
Status: PENDING

Owners: Apps + Data.

Acceptance:
- structured state and app lifecycle remain owner-backed.

### MC4L - Advanced operator extras - 1 point - A
Status: PENDING

Evaluate/adopt:
- alerts;
- notifications;
- global search;
- runtime discovery;
- provider quota evidence;
- GitHub sync;
- optional APIs/CLI/MCP surfaces.

Acceptance:
- every retained extra has a named owner and threat model.

---

# MC5 - Product simplification and AI-Verse identity - 10 points

### MC5.1 - Beginner information architecture - 3 points - A
Status: PENDING

Default:
- Ask AI-Verse;
- Workspaces;
- Recent Work;
- Needs You;
- Control Center.

Acceptance:
- no component knowledge required for normal use.

### MC5.2 - Customizable Control Center overview - 2 points - A
Status: PENDING

Adopt:
- widget grid;
- briefing;
- health/attention/activity summaries.

### MC5.3 - AI-Verse visual system + accessibility - 3 points - A
Status: PENDING

Deliver:
- AI-Verse visual identity;
- light/dark where appropriate;
- keyboard/focus/accessibility baseline;
- responsive layout.

### MC5.4 - UX regression and usability gate - 2 points - A/H
Status: PENDING

Assistant:
- automated visual/interaction tests.

User:
- owner preference check on the real product if subjective visual choices remain.

---

# MC6 - macOS desktop + install experience - 10 points

### MC6.1 - Tauri 2 host - 2 points - A
Status: PENDING

Deliver:
- same product UI;
- native host bridge;
- development build.

### MC6.2 - Folder registration + multi-system Gateway supervision - 3 points - A
Status: PENDING

Deliver:
- folder picker;
- compatible-system validation;
- stable registrations;
- isolated Gateway process per system when needed.

### MC6.3 - Secure secrets + Distribution install path - 2 points - A
Status: PENDING

Deliver:
- protected Gateway credential handling;
- explicit install flow through Distribution;
- no Dashboard-owned installer logic.

### MC6.4 - DMG / clean-machine acceptance - 3 points - A/H
Status: PENDING

Assistant:
- CI/build automation;
- unsigned/dev DMG where possible;
- clean-runner tests.

User:
- macOS permission approvals;
- Apple signing/notarization credentials only if public signed release is required;
- real Mac acceptance.

---

# MC7 - Final release acceptance - 5 points

### MC7.1 - Independent architecture + ownership audit - 2 points - A
Status: PENDING

Acceptance:
- no hidden Mission Control authority;
- no duplicate canonical owner;
- all deviations documented.

### MC7.2 - Security / licensing / two-system acceptance - 2 points - A
Status: PENDING

Acceptance:
- licensing clean;
- secrets clean;
- browser + desktop isolation;
- Gateway restart/recovery;
- two-system A/B proof.

### MC7.3 - Owner dogfood sign-off - 1 point - A/H
Status: PENDING

Assistant:
- provides final dogfood checklist and fixes defects.

User:
- uses the actual product on the Mac and gives final go/no-go.

---

# Human action summary

The expected user workload is intentionally small.

H1: run one MC1 local acceptance script with the real local Gateway/system.  
H2: complete provider login only if interactive auth is required.  
H3: macOS approvals/signing secrets when desktop packaging reaches that point.  
H4: final dogfood/visual acceptance.

All other tasks are assistant-owned by default.

# Anti-derail rules

1. Do not strip Mission Control before MC3.5.
2. Do not replace AI-Verse owners with Mission Control stores.
3. Do not rewrite Gateway to make Dashboard easier.
4. Do not merge unrelated architecture cleanup into Dashboard tasks.
5. Do not change the upstream Mission Control pin mid-phase.
6. Do not advance a phase without its acceptance gate.
7. Do not infer completion from code presence; require evidence.
8. Do not resume the historical Dashboard BUILD-MAP as the active sequence.
9. Do not rely on conversation memory when this tracker has the answer.
10. At each update, report accepted points and percentage remaining.
