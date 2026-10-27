# Mission Control -> AI-Verse Dashboard Execution Tracker

## Personal-first amendment — 27 October 2026 (review draft)

The operator has requested Personal-first delivery with always-present agent chat, app awareness/control, shared chat tools and later specialist Filmmaking. See the [living plan](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md) for the explicit scope and ordering amendment. The following original requirements/accounting remain historical baseline until reconciliation is reviewed; do not interpret the full-shell assumption or fixed future order as approval of the amended design. MC0/MC1 remain accepted at 15 baseline points. New scope has not been estimated or accepted.


**Date:** 2026-09-15  
**Status:** CANONICAL EXECUTION TRACKER  
**PRD:** `docs/PRD-MISSION-CONTROL-AIVERSE-DASHBOARD-2026-09-15.md`  
**Canonical plan:** `docs/CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`

## Standing execution preference: browser agent / GitHub-first (operator decision, 27 October 2026)

The operator wants the browser agent to **continue the real implementation through GitHub and disposable GitHub Actions runners for as long as practical, aiming for roughly 90–93% of the existing 100-point roadmap before asking to test locally**. This includes a working downloadable app, secure local launcher and extensive real-component/negative CI tests, not just UI mock-ups. The browser agent **does not access the Mac**. Preserve the already-accepted MC0/MC1 work and continue building safely even when a single member-local acceptance gate is deferred. See the [canonical plan's standing decision](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md#standing-operator-decision-github-first-to-the-9093-pre-local-target-27-october-2026) for the full workflow and boundaries.

**100% includes local owner acceptance.** The 90–93% is an *aspirational pre-local preparation target*, not currently earned points or permission to skip acceptance, account consent, real-Mac testing or security checks. Historical A/H weighted tasks still involving human acceptance: MC2.6 (1), MC5.4 (2), MC6.4 (3), MC7.3 (1), total 7 points; member/private-Core conditions may cause other gates. Current formal accepted score **15/100** until independently documented gate closure. The revised Personal scope still requires weight reconciliation. New chats must inspect the actual branch/PR/CI and this tracker, avoid repeating completed slices, and keep deferred local steps recorded without blocking independently testable GitHub work.

## Pre-dogfood whole-system audit override

AI-Verse-System retains the whole-system audit authority. The operator explicitly approved the bounded disposable local Qwen trial recorded in System PR #288 and Dashboard PR #40. Its real Mac proof passed; [scope, evidence and limitations](MC1-REAL-MODEL-ACCEPTANCE-2026-10-26.md) close MC1.4/MC1.5 for this standalone local-model path. Generic/private-owner and credentialed-cloud trials remain blocked. Current Dashboard progress is **15/100**; next is MC2.1.

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

**Current accepted progress: 15 / 100. 85% remaining.**

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
Status: COMPLETE

Deliver:
- script that clones/checks out pinned stock Mission Control into a lab directory;
- dependency/runtime preflight;
- no writes into AI-Verse repos;
- idempotent rerun.

Acceptance:
- script unit/static checks;
- clear failure messages;
- no secret persistence.

Evidence:
- Dashboard PR #8 merged at `23edb8bea28e3f1ceac53df0daff28319b43090d`.
- Exact upstream Mission Control pin is enforced at `5483a0e1eef15b467c167e95796791112cedbb7c`.
- Disposable lab path, origin validation, dirty-tree refusal and pinned lockfile install are automated.


### MC1.2 - Gateway preflight + smoke verifier - 2 points - A
Status: COMPLETE

Deliver:
- script that verifies `/health`, `/status` where appropriate, `/v1/models`, auth and model `aiverse`;
- optional direct `/v1/chat/completions` smoke;
- secret redaction.

Acceptance:
- deterministic pass/fail output;
- mock/fixture tests in CI.

Evidence:
- PR #8 adds authenticated `/health`, `/status`, `/v1/models` verification, local Gateway config binding checks, and optional workspace-explicit read-only chat smoke.
- Unit/fixture coverage passed on Linux, macOS and Windows.


### MC1.3 - Mission Control AI-Verse dispatch setup automation - 2 points - A
Status: COMPLETE

Deliver:
- safe env/template setup for `LOCAL_LLM_ENDPOINT`;
- documented `local/aiverse` agent config;
- no committed bearer token;
- exact pinned upstream compatibility assertions.

Acceptance:
- automated fixture proves generated config is correct.

Evidence:
- PR #8 adds in-memory Mission Control credentials/provider configuration, temporary `ai-verse` agent creation, `local/aiverse` routing, task creation, scheduler trigger, sanitized result capture and cleanup.
- `npm run mc1:local` prompts for the Gateway token with hidden input and clears it on exit.
- Current-head PR CI run `34994307940` and post-merge main CI run `34994439986` passed Linux, macOS and Windows.


### MC1.4 - Real local Mission Control -> Gateway proof - 3 points - A/H
Status: COMPLETE — approved disposable standalone local-model scope

The operator explicitly approved the local Ollama/Qwen setup, required code and test. System PR #288 records the scope; Dashboard PR #40 implements the exact expiring admission and the automated ephemeral-bearer path. Generic/private-owner execution stays blocked.

Acceptance evidence: [real Mac proof](MC1-REAL-MODEL-ACCEPTANCE-2026-10-26.md) and [sanitized result](evidence/mc1-real-model-macos-2026-10-26.json).

- Real Qwen model response returned through actual Mission Control task dispatch, canonical Gateway and the real installed standalone OS host.
- Exact system/workspace, unique response marker, missing/wrong-token refusal, unchanged canonical OS fingerprint and lab cleanup passed.
- The original hidden-personal-token step was explicitly delegated and replaced for this scope with a fresh in-memory lab bearer using the same proof; no personal credential or private OS was used.
- A background conversation-summary write authorization was denied by the additional read-only trial policy. Zero effect dispatches occurred.
- No production/private-Core, tool-action, cloud-provider or member-release acceptance is claimed.

### MC1.5 - MC1 evidence + gate closure - 1 point - A
Status: COMPLETE

Sanitized evidence, exact refs, execution-path amendment, initial failures and remaining limitations are recorded in the linked acceptance packet. Mission Control state remains disposable. Existing MC2.1 is the next eligible Dashboard task; Gateway G4.2 remains separately owned.

---

# MC2 - First-class AI-Verse adapter - 15 points

### MC2.1 - Adapter contract design - 2 points - A
Status: REVIEW READY / PENDING PR ACCEPTANCE (no points awarded)

Deliver:
- exact Dashboard <-> AI-Verse Gateway client contract;
- capability discovery;
- system/workspace binding;
- auth handling;
- event/run/control mapping.

Acceptance:
- design review against Gateway protocol and Dashboard invariants.

Local continuation prepared, 26 October 2026:
- 3/3 design tasks prepared: actual-source seam characterization; [typed client contract draft](MC2.1-AIVERSE-GATEWAY-CLIENT-CONTRACT-2026-10-26.md); source/PRD review and explicit gap dispositions.
- The [living implementation plan](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md) now uses the current Plan Maker layout, with the original slice IDs, weights, order and accepted history preserved.
- This is proposed design work pending normal PR acceptance, not an implemented client or accepted MC2.1. Progress remains15/100. After acceptance, its existing2 points bring progress to17/100 and MC2.2 is next.

### MC2.2 - AI-Verse Gateway client package - 3 points - A
Status: IN PROGRESS / SLICE 1 SOURCE + CI, NOT INTEGRATED (no points awarded)

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

H1: completed for the explicitly delegated disposable standalone local-model trial; no personal token was requested. Generic/private-owner use remains blocked.  
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


## 26 October 2026 — Owned routing qualification

The operator explicitly replaced waiting for upstream acceptance with a maintained
AI-Verse dependency repair. [Current decision and Mac evidence](MC1-AIVERSE-OWNED-ROUTING-2026-10-26.md)
record the exact owned source, three-line delta, 11 routing checks, Dashboard checks
and successful genuine `local/aiverse` macOS HTTP composition. The old alias is
removed from the runner; unknown pins and non-disposable synthetic runs remain
blocked. This resolves the routing prerequisite, not the real OS/runtime portion
of MC1.4. Continue with our bounded owner-runtime qualification and its audit
record; do not wait for Builderz or count the deterministic host as real-runtime
acceptance. Dashboard progress is unchanged until fixed MC1.4 acceptance is met.

### 27 October Stage 1 UI checkpoint, no points awarded

Operator requested that the eleven essential experiences be **visible first**, then resume the canonical MC sequence. Draft PR #42 now contains a consolidated Essentials page, browser-local main conversation create/reopen/rename/archive, preview backup/restore, honest provider setup and unknown usage/health states, plus added browser regressions. This is not production runtime acceptance. Latest-head CI/browser/deployment are separate verification gates and must be read before reporting a pass.

**Current execution position remains MC2.1 PENDING**. MC0 and MC1 are complete (15 accepted baseline points). The Personal-first plan amendment must reconcile the MC3/MC5 shell-order change, missing owner contracts, revised future weights and MC2.1 acceptance. Do not start work from MC0 again or award points for visible examples. Next accepted gate after MC2.1 is MC2.2.

### MC2.2 live-host bridge slice, 27 October 2026

Source checkpoint in draft Dashboard PR #42: the host-only transport now has an explicit opt-in `CanonicalGatewayBridge` for authenticated Dashboard-local `/rpc` requests `aiverse.gateway.status`, `aiverse.gateway.run.create`, and `aiverse.gateway.run.get`. A separate authenticated WebSocket command `gateway-run-subscribe` projects allowlisted canonical run events with the selected Dashboard system/workspace and local stream sequence. `gateway-run-unsubscribe` cancels that subscription, including on connection close/retarget. The browser-safe `DashboardClient` methods send only IDs and messages to the Dashboard host and bypass live-operation caches. Existing read models, local /rpc calls, and general chat preview remain unchanged.

The bridge exists only when an authenticated trusted process injects an **already approved** canonical system ID, loopback Gateway origin and host-held bearer resolver after validating the registered OS root. No browser can add a credential or Gateway URL through these interfaces. Real run **controls/approvals remain intentionally disabled** pending the documented owner-driven workspace-rebind race proof. Live credential setup and actual provider/runtime integration remain pending.

New tests cover actual localhost Dashboard HTTP/WS connections talking to a synthetic localhost canonical Gateway-shaped fixture: authentication, wrong origin, system and workspace rejection, idempotency request forwarding, response redaction, malformed method payloads and run-event projection. These are verified contract fixtures, not a qualified real private/Core provider run. MC2.2 remains IN PROGRESS until actual owner/credential binding and real runtime integration pass; do not award its 3 points solely from source/CI.

### MC2 progression checkpoint: real pinned Gateway and safe local startup, 27 October 2026

The **real** `AI-Verse-Gateway@ceb8849ec062f0d3997ceb0207e42c25aedd20c6` now passes the disposable composition workflow `MC2 Canonical Gateway Composition`. It exercises a canonical installed Gateway process and deterministic runtime (not a stubbed HTTP handler), a Dashboard authenticated host bridge, `aiverse` model preflight, run completion with an echoed unique marker, run idempotency replay and the authenticated Dashboard WebSocket event stream. The test also invokes the new `mc2:local` launcher against the disposable canonical installation, verifies its safe readiness report and default-denied unauthenticated host route, then disposes of both services and all test files. **No owner Mac/system/provider credentials were used.**

Safety repairs discovered and made during qualification:
- `system.get` now uses the explicit public registry projection, excluding internal realpath/root identity.
- The OS registry has a host-only binding generation; explicit same-root rebind invalidates a previously approved Gateway mapping.
- Authenticated workspace selection cancels outstanding canonical event subscriptions; late A→B→A HTTP results are rejected even when they resolve after a new A selection.
- Upstream credential-bearing fetches disallow redirects and live Gateway status/run requests bypass Dashboard projection cache.
- New negative tests cover cross-system response denial, stale same-root lease and delayed WS events after workspace retarget.

`npm run mc2:local` is an opt-in, **local host-only backend launcher**, not a published browser/chat app. It reads the already-existing owner Gateway config from `AIVERSE_GATEWAY_HOME` (default `~/.aiverse/gateway`), requires the already-approved `AIVERSE_GATEWAY_TOKEN` in the local process environment, validates the canonical `system_id` via authenticated Gateway `/status` and `/v1/models`, registers the declared compatible OS root, then binds the Dashboard host to `127.0.0.1:3100` (or `AIVERSE_DASHBOARD_PORT`). The launcher **never** prints or persists either bearer. It does not approve Connections or grant a model/tool permission.

**Original acceptance gates remain separate:** MC2.1 contract review is ready but PR #42 is unmerged; MC2.2 is implemented through the host backend and verified against a real disposable Gateway but does not yet include a user-qualified local OS/provider session or the control/approval facade; MC2.3 first-class `aiverse` runtime identity has real source/preflight proof without disguising it as a vendor model; MC2.4 workspace and stale-epoch guards are implemented and under normal regression acceptance; MC2.5 real personal app chat and run-control UI still need the secure native/local-app session and the owner-controlled Stop race proof. No additional points have been awarded without gate acceptance. Preserve the historical MC0+MC1 baseline of 15/100 and do not restart earlier slices.
