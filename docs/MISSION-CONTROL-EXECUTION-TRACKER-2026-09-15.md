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

### MC2.5 Personal Chat run-controller slice (GitHub-first, 27 October 2026)

Scoped implementation in draft PR #42, **not formal phase acceptance**: `packages/client/src/conversation-run.ts` now defines a browser-safe, source-backed Personal chat controller and authenticated Dashboard-local WebSocket event feed. The controller calls the existing typed `DashboardClient` for canonical `aiverse.gateway.run.create` / `.run.get`, binds exact Gateway run and session identifiers, reconciles terminal events through canonical GET, and never treats provisional streamed text as a confirmed final response. It can recover a known canonical run by ID, transparently represents paused-recovery-required states, and retries uncertain submissions only with the original idempotency key.

Isolation guards check selected Dashboard system/workspace plus the monotonic client selection epoch (including A→B→A). Retargeting cancels stale event streams; wrong-scope event envelopes are rejected; interrupted streams and terminal-reconciliation failures remain visibly interrupted. Local WebSocket transport restricts the target to a loopback Dashboard host and uses the existing Dashboard WS authentication protocol, not the upstream canonical Gateway bearer. No new session database or provider credential owner was created. Automated tests in `test/personal-chat-run.test.ts` exercise canonical send/stream/final output, explicit run recovery, uncertain idempotent retry, stale HTTP/WS scope, fake terminal rejection and invalid socket frames. CI must pass on the current head before marking this source slice verified.

**Next MC2.5 slice:** mount this source controller into the actual trusted Personal application session and its multi-pane chat presentation, retaining the static GitHub Pages preview as explicitly disconnected. Do not claim complete user-visible live chat, owner-qualified provider inference, or Stop/approval authority from this controller alone. Keep MC2.1 review and MC2.2/MC2.5 acceptance pending under the original gates, with historical accepted programme score unchanged at 15/100.

### MC2.5 real Personal Chat screen and independent split panes (GitHub-first, 27 October 2026)

**Source in draft PR #42, not formal acceptance:** the actual client/runtime UI is implemented separately from the browser mock at `apps/web/src/personal-chat-ui.ts` and styled by `apps/web/src/personal-chat.css`. A trusted host can invoke `mountAuthenticatedPersonalChat(root,{dashboardOrigin,dashboardBearer,selected})`; host-provided system/workspace scope and the memory-held Dashboard session never come from static Pages, model text or browser localStorage. This is a real client over `DashboardClient`, the existing authenticated Dashboard WebSocket protocol, and `PersonalChatRunController`. It supports three independent resizable chat panes with identical Send/New Chat/Recover Run/Same-Key Retry controls, explicit workspace retarget, protected terminal statuses, and scope-cancelled updates. The last pane minimizes rather than disappearing. Text is inserted as DOM text, not trusted HTML. Closing a view is not misrepresented as canceling the canonical Gateway run.

**Verification:** `test/live-personal-chat-ui.browser.mjs` operates Chromium against a disposable authenticated Dashboard-shaped RPC/WS service, verifying actual Send/stream/canonical terminal GET, split panes, conversation reset, recover-with-wrong-workspace rejection, and no localStorage credential/transcript persistence. The existing GitHub Pages static preview is unchanged; it must never auto-mount the private runtime client. The separate browser QC workflow builds and bundles this UI for Chromium (the underlying TypeScript client uses npm module imports), alongside the existing public-preview regression suite. Inspect the **latest commit's** CI results before claiming this slice verified.

**Not yet complete:** native/Tauri host session bootstrap and the actual launchable Personal application shell are later gates. No production browser session, owner Mac login, provider inference, canonical run-list/history API or Stop/approval was invented. Canonical Gateway owns run/session truth; the UI holds transient display text only. For full conversational continuity, owner-qualified canonical session reuse and restart restoration require further integration. Keep MC2.5 and the historical 15/100 accounting unaccepted pending the prescribed product/owner gates.

### MC2 secure local browser-session boundary (GitHub-first, 27 October 2026)

**Implemented but not yet an operator-launched UI:** draft PR #42 now contains opt-in `LocalApplicationSession` (`apps/gateway/src/local-app-session.ts`) and its integration with Dashboard's loopback HTTP + WebSocket host. A trusted caller can mint a single-use 5-minute pairing secret, bounded to five failed attempts, and redeem it only from the exact first-party `127.0.0.1:<port>` origin to obtain an 8-hour `HttpOnly; SameSite=Strict` local cookie. The browser receives **no Dashboard bearer and no canonical Gateway/provider credentials**. A cookie-auth RPC is scoped to the already-selected system and workspace and to canonical Gateway methods; cookie-auth WebSocket access refuses another system and wrong/missing origins. Existing explicit bearer clients remain supported. Logout revokes the in-memory cookie session. These routes are **off by default** and are not yet exposed by the ordinary `mc2:local` launcher.

`DashboardClient`, `DashboardChatEventFeed`, and the new live Personal UI support `{mode:"host-cookie"}` as an alternative to a bearer. Negative tests cover unpaired/remote-origin/weak-scope requests, one-use redemption/replay, five-failure lockout, cookie-only WS refusal, logout, and absence of browser bearer. No private credentials or persistent session store have been committed.

**Next bounded work:** a trusted launcher/native host must opt in, securely deliver the pairing invitation to the operator, serve a same-origin signed/packaged production chat bundle and call `mountAuthenticatedPersonalChat` only after successful cookie-scoped readiness. The current GitHub Pages preview must remain disconnected. Do not claim a running Mac app or complete MC2.5 until the whole host-to-UI bootstrap is tested and accepted. Historical accepted score remains **15/100**; check exact latest-head CI before claiming test acceptance.

### MC2.5 trusted localhost Personal application launcher (27 October 2026, GitHub-first)

**One bounded source/CI slice on draft Dashboard PR #42, not formal MC2.5 acceptance:** `npm run mc2:local-app` now builds TypeScript, bundles the browser-safe Personal UI using pinned `esbuild@0.25.12`, and starts the already-approved canonical Gateway-backed Dashboard host with `AIVERSE_DASHBOARD_PERSONAL_UI=1`. The original `mc2:local` mode remains unchanged and does **not** serve the app. The opt-in launcher requires an actual interactive private terminal and refuses background/non-TTY execution. It prints an ephemeral pairing code **only to that private terminal** (not readiness JSON, URL, source, telemetry or public preview) and makes the first-party app available at `http://127.0.0.1:<port>/local-app/`. The operator will need an already-approved local Gateway configuration and existing Gateway token in the trusted process environment when eventually using this launcher; no live member machine was accessed here.

The local host serves only four explicit same-origin assets (`index.html`, `boot.js`, combined `chat.css`, and session-gated `chat.js`) with no-store, nosniff, cross-origin policy, frame protection and restrictive CSP. The user enters the one-use code in the local browser, receives an HttpOnly SameSite=Strict host cookie, then the page fetches the authorized system/workspace scope and mounts the **real split-pane PersonalChatApplication** over the existing Dashboard HTTP/WS → canonical Gateway bridge. Until pairing, the private chat bundle is denied. Cookie-authenticated WS frames are limited to that system/workspace's canonical run subscriptions. Logout and session expiry revoke the cookie and close cookie-authenticated event sockets. Nothing is connected to public GitHub Pages.

**Verification / outstanding:** existing localhost session negative tests include cross-origin pairing refusal, scope denial, replay lockout and logout socket revocation; `test/local-app-launch.browser.mjs` uses actual compiled Dashboard host + packaged browser app for Chromium pairing, multi-pane mount, honest missing-Gateway response, private transcript/storage isolation and logout. The browser QC workflow uses the **same** `npm run mc2:bundle` as the local launcher. Inspect exact latest GitHub Action results before claiming all gates green. No real provider consent, macOS installer, production owner-machine proof, persistent canonical session listing or Stop/approval is claimed. Next independently testable task: trusted app boot into a real pinned disposable Gateway execution from the browser, then consolidate native installer acceptance without pressing the operator for Mac testing at every stage.

The standing GitHub-first **90–93% pre-local target** remains; formal accepted score is still **15/100** until existing gates are reviewed.

### MC2.5 actual first-party Chromium → authenticated Dashboard → pinned real Gateway end-to-end proof (28 October 2026)

**Verified GitHub-first integration slice in draft PR #42, not owner acceptance:** `scripts/mc2/ci-authenticated-browser-proof.mjs` now runs inside `scripts/mc2/ci-canonical-proof.mjs` using the **real pinned canonical AI-Verse Gateway revision `ceb8849ec062f0d3997ceb0207e42c25aedd20c6`**, a disposable registered AI-Verse OS, and Gateway's deterministic fixture host. The same test launches the real Dashboard bridge with its opt-in `LocalApplicationSession` and serves the actual packaged first-party Personal chat UI to Chromium. This is **not a mock Gateway**, not a live private model/provider, and not an operator-Mac test.

Chromium navigates the real localhost app, confirms the private bundle cannot load before pairing, enters the server-side one-use pairing code, receives an HttpOnly SameSite=Strict cookie, submits a unique marker from the actual Personal Chat composer and checks that **the canonical Gateway run.create request carried the marker**. It observes real Gateway `assistant.delta` and `run.completed` events via the authenticated Dashboard WebSocket, then verifies the displayed final answer contains the marker **after authenticated canonical run.get reconciliation**. It opens a second split chat pane, submits a distinct marker, verifies independent canonical completion and message isolation, logs out, and confirms privileged assets become inaccessible again. Negative checks ensure no bearer in browser RPC requests, no local/session storage leakage, and no browser errors. The existing bearer-only integration and browser preview regressions remain independently tested.

**Evidence:** [MC2 Canonical Gateway Composition run 40674169451](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40674169451) succeeded on source commit `48971495bfb3b6e8cde3eeae5c9775c56dc106b2`. CI flags include `actual_pinned_gateway_browser_run`, `local_pairing_http_only`, `canonical_assistant_delta_to_chromium`, `canonical_terminal_get_verified`, `scoped_two_chat_panes` and `cookie_logout_revoked` all `true`. The runner was pinned to `ubuntu-24.04` because Playwright 1.58.2 cannot provision Chromium on newly chosen `ubuntu-latest` (26.04).

**Remaining gates:** real member Gateway/provider authorization and private OS installation have **not** been verified; a local/native macOS app, installer, persistent canonical chat history and owner dogfood acceptance remain pending. Do not re-run the same integration implementation in a new chat or claim MC2/MC5 fully accepted from CI alone. Continue the standing **90–93% GitHub-first pre-local target**; historical formal accepted progress is **15/100** until explicit plan gates close.

### MC2.5 canonical multi-turn continuity and bounded recovery (28 October 2026)

**Verified on real pinned disposable Gateway, not owner-accepted:** Personal Chat panes now reuse the **canonical `sessionId`** from a completed run on their next turn. They also send a bounded, ordered transcript of previous **canonical-GET-confirmed** user/assistant pairs (at most six pairs, 18 KB of context) with the new user prompt. This matters because the pinned Gateway supports an existing session ID but does **not automatically inject all prior raw turns** into a new run. Stream deltas, incomplete/rejected runs and fake preview messages are **never** promoted to prompt history. A second run with a changed session binding is rejected, an interrupted run must be recovered rather than silently superseded, and uncertain create retries reuse their exact original request and idempotency key. Workspace A→B→A, New Chat, and closing a pane discard the pane's confirmed history and session authority; different split panes do not share it.

**Partial recovery is explicit:** `Recover run` obtains the canonical output and session from a user-supplied run ID, but the read-only run projection does **not include previous user turns**. The interface flags `Earlier conversation context unavailable or trimmed`; it may reuse the canonical session ID on a follow-up, but it **does not fabricate** missing transcript. When history exceeds the bounded window, older complete pairs are dropped and the limitation is shown. Full cross-restart transcript browsing remains a distinct owner-backed Gateway history API task, **not** implemented by client-localStorage workarounds.

**Evidence:** [Real Gateway + Chromium workflow run 40692644124](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40692644124) passed on source commit `9e72c010aaa87bd1b1c4ac648744f791ce31919d`. Pinned real Gateway with disposable deterministic runtime, first-party pairing screen, canonical streamed/final responses, then a Chromium follow-up verified both the same `sessionId` and the exact earlier confirmed messages inside the next run request. CI output: `canonical_followup_same_session_and_confirmed_history=true`; 165 unit/integration tests passed, 0 failures. `test/personal-chat-continuity.test.ts` adds regression coverage for three turns, idempotent retry, session reassignment denial, interrupted unverified deltas, partial run recovery, context bounds and scope reset. Exact head CI status may include a later documentation-only commit; do not misreport any pending job.

The historical formally accepted programme score remains **15/100** until the roadmap's acceptance gates close; GitHub-first **90–93% pre-local** remains an aspirational readiness target. Next independently valuable work: owner-backed canonical run/session listing and transcript recovery, without inventing a separate conversation database or requiring Mac use before the consolidated local acceptance checkpoint.

### MC2.5 canonical conversation library and post-browser-reload restoration (28 October 2026)

**One source/CI slice in two draft PRs, not formal acceptance.** The pinned canonical Gateway lacked any session/run-list endpoint, so the owner-bound read interface was added **inside the Gateway repository**, not faked by a Dashboard localStorage or duplicate conversation database: [Gateway draft PR #80](https://github.com/aiverse-filmmakers/AI-Verse-Gateway/pull/80), commit `9748dd0d5473b65ad95ef92df62fe0a13575e378`. Authenticated `GET /v1/sessions` and `GET /v1/sessions/:id/runs` read canonical session/run files, enforce bearer principal, canonical system and explicit workspace scope, cap page sizes and index scans, and project only bounded session metadata, last actual user text and completed canonical output. System/tool prompts, internal traces and upstream bearer never enter the library projection. Gateway CI passed with access denial, pagination and redaction tests.

**Dashboard integration:** in [Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), two read-only `aiverse.gateway.session.*` RPC methods were added through existing local authenticated host bridges. The client verifies owner-bound projections; the real Personal app now has a **Previous chats** panel that lists Gateway-owned sessions and opens a selected session in a chat pane. `PersonalChatRunController.openSession()` loads at most 50 recent canonical run summaries, reconstructs only their confirmed user/assistant turns, retains the verified session identity for next-message continuation, and marks incomplete, truncated or unresolved context rather than inventing missing history. It never writes a browser chat database or stores conversation content in local/session storage.

**Evidence:** commit `d7e98c58355d3eada10af259a62aa0cca9c58ae6` passed [real pinned Gateway + Chromium workflow 40694831583](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40694831583), [Dashboard CI 40694831668](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40694831668), and [browser UI QC 40694831451](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40694831451). Real deterministic Gateway test flags include `canonical_history_reopened_after_browser_reload=true`: Chromium reloads the first-party app with a live localhost host, discovers prior canonical chats, restores two earlier confirmed exchanges and proves a new follow-up uses the **same canonical session**. Browser local/session storage remains empty.

**Remaining limits:** this validates a **browser reload**, not a full canonical Gateway/host process teardown and restart or owner Mac dogfood. Gateway PR #80 and Dashboard PR #42 are still draft; deployment must install the new pinned Gateway history contract, not the old main revision. Canonical history is bounded and may omit older/truncated turns, always visibly marked. Keep 15/100 historically accepted roadmap points until actual plan gates close; next acceptance activity should explicitly test process restarts and source installation, not repeat this passing browser test.

### MC2.5 hard process-restart recovery proven with real pinned Gateway and fresh browser authorization (28 October 2026)

**GitHub-first source/CI verified; not formal owner acceptance.** This closes the previously outstanding **disposable full-process restart** proof. [Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) adds `scripts/mc2/ci-restart-child.mjs` and `scripts/mc2/ci-process-restart-proof.mjs`, connected to the existing canonical real-Gateway composition workflow. The child processes each run the **real** installed canonical Gateway (reviewed history pin `9748dd0d5473b65ad95ef92df62fe0a13575e378`, [Gateway draft PR #80](https://github.com/aiverse-filmmakers/AI-Verse-Gateway/pull/80)) or real authenticated Dashboard host. They use generated disposable OS state and generated ephemeral CI bearer only. The parent and child communicate readiness and pairing code over private IPC, never GitHub logs, URLs or browser storage.

**Verified journey:** existing canonical runs are completed and written to Gateway-owned disk. Both original servers are stopped. Independent child processes start on pinned loopback ports, and Chromium securely pairs, discovers the original session via Gateway's owner-scoped history endpoint, restores original canonical turns and sends an actual follow-up into the same session. Then BOTH child processes cleanly exit, their listeners are demonstrably unavailable, and entirely new Gateway and Dashboard child processes start on the same ports with the SAME Gateway-owned disk state. The prior HttpOnly browser cookie fails (HTTP 401), the private chat bundle is denied until a NEW single-use code is paired, and Chromium then restores the original and newly completed turns and successfully sends a second follow-up into the unchanged canonical session. The original run is verified through authenticated Gateway `GET /v1/runs/:id` after the hard restart. Neither localStorage nor sessionStorage stores messages or credentials.

**Evidence:** all three [source-commit `ee9fb268040606fa9c34464f25ed201647a3021f`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/ee9fb268040606fa9c34464f25ed201647a3021f) workflows succeeded: [real Gateway composition 40697808818](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40697808818), [browser UI QC 40697808812](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40697808812), and [cross-platform Dashboard CI 40697808854](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40697808854). Test evidence includes `gateway_relaunched_in_independent_os_process`, `dashboard_relaunched_in_independent_os_process`, `canonical_disk_history_survived_two_host_cycles`, `old_browser_cookie_rejected_after_host_restart`, `fresh_pairing_required_after_host_restart` and `resumed_session_followups_after_full_restart` all `true`.

**Boundaries:** this was not run against the member's Mac, private owner OS/provider or production login. The new Gateway history contract and Dashboard application remain draft/not merged. No provider, remote approval, installed macOS app or real owner machine was tested; the acceptance programme remains historically **15/100** pending recorded gate review, with GitHub-first 90–93% as target rather than progress. **Recommended next independent implementation:** canonical owner-backed persistent Workspace + Canvas document/action contract and functional Personal interface, starting with source verification rather than building another duplicate chat mechanism.

### Personal Canvas foundation: Data-owned durable document model (28 October 2026)

**Task 9 first owner-backed slice, not a Dashboard Canvas UI or accepted roadmap points.** After auditing live OS, Apps, Data, System and Gateway ownership, the canonical location for structured Canvas document records is the **Data** owner's existing scope-bound SQLite database, **not** browser localStorage, Dashboard files, a duplicate app store or the currently empty Apps runtime. OS retains system/workspace topology; Gateway retains sessions and run state. The first implementation is [Data draft PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22), branch `codex/canvas-document-owner-v1`, recorded contract `docs/CANVAS-DOCUMENT-OWNER-V1.md` in that PR.

New `@ai-verse/data/canvas` exports `CanvasDocuments` over **an already-open trusted scoped Data database**, supporting standalone Personal or a named workspace. It creates a compatible `creative-canvas` Data schema and persists versioned Canvas documents containing text notes and connections; it supports create/list/get/rename, bounded add/move/edit/remove note, add/remove connection and soft-delete. Every mutation uses canonical Data record storage and provenance/idempotency/version checks, with declared limits and no direct browser endpoint. Test fixture opens a *real* scoped SQLite database, creates a Canvas, adds notes and a connection, closes and reopens the same database, confirms durable nodes/edges and version, then modifies and deletes. It also checks Personal/workspace isolation, create idempotency, stale-version conflict and invalid operations. **No Mac, member data, credentials or live provider are involved.** [Data CI run 40700847141](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40700847141) passed all six Node 22/24 × Linux/macOS/Windows matrix jobs at commit `68f642cee430dc22381033f1338398b635993972`, with [Release Smoke 40700847140](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40700847140) and [Five-Component Release Acceptance 40700847181](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40700847181) also green. This is Data source/CI readiness, not private Mac/product acceptance.

**Boundary:** this establishes the canonical document owner and testable persistence only. **No Canvas window is connected to Dashboard**, no authenticated host action route has been admitted, no automatic OS workspace creation, files/assets, multi-user collaboration, undo or AI agent action parity. The caller remains responsible for OS/trusted-host actor admission. Uncertain non-create edit retries are version-conflict-aware, not automatically replayed; require canonical refetch/reconcile. See [Canvas Data owner contract](https://github.com/aiverse-filmmakers/AI-Verse-Data/blob/codex/canvas-document-owner-v1/docs/CANVAS-DOCUMENT-OWNER-V1.md).

**Next task 10:** inspect the existing OS authorization/action spine and Data's scoped runtime adapters, then implement a **narrow authorized read/write host facade** for real Canvas documents that never takes arbitrary roots/tokens/principals from browser frames. Follow with real Canvas library UI, note drag/edit/links and app-aware agent operations in distinct bounded tasks. Existing 15/100 historical accepted score unchanged; GitHub-first 90–93% ambition unchanged. Do not repeat the persistence implementation in another chat.

### MC2/P01–P04 Canvas owner bridge and real Data composition (28 October 2026)

**Task 10 source/CI verified; pending formal acceptance and real OS policy admission.** [Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) now exposes six strictly bounded `aiverse.canvas.{list,get,create,rename,edit,delete}` commands through `CanvasOwnerBridge` and the existing authenticated localhost `/rpc` host. This transport is **opt-in**: without a trusted host-injected `ApprovedCanvasOwner`, all Canvas operations fail closed as `CANVAS_OWNER_UNAVAILABLE`. Even with a configured owner, each request validates system root identity/generation, manifest workspace (Personal uses `operator` scope), strict typed params, user-supplied version and idempotency, and invokes a mandatory separate owner/host authorization callback; no raw path, principal, token, actor or permission flag is accepted from the browser. Only bounded public Canvas document fields project back to the app. The existing browser pairing cookie remains bound to its selected system/operator workspace; neither the public GitHub Pages preview nor ordinary Dashboard startup enables Data writes.

**Real owner evidence:** [Gateway composition workflow 40709020351](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40709020351) passes against pinned Data [PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22) source `68f642cee430dc22381033f1338398b635993972` plus the pinned real canonical Gateway and Chromium. `scripts/mc2/ci-canvas-data-owner-proof.mjs` opens Data's **actual scoped SQLite owner**, sends authenticated Dashboard Canvas RPC, creates a Personal document, idempotently retries, adds a note, rejects stale version, denies a delete through explicit authority, verifies workspace isolation, fully stops/restarts the Dashboard server and reloads the same persistent document. All flags `real_scoped_data_sqlite`, `personal_canvas_persisted_across_host_restart`, `two_workspace_scope_isolated`, `stale_version_rejected`, `idempotent_create` and `explicit_write_authorization_enforced` were true; `private_owner_mac_verified` false. Host negative and input-validation tests in `test/canvas-owner-bridge.test.ts` passed across Linux/macOS/Windows at [source run 40708643287](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40708643287). [Browser QC 40709020266](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40709020266) also passed. **Exact final current-head 3-workflow state must still be checked** after documentation changes.

**Honest limitations:** real Data source was linked in **disposable CI** via a trusted fixture permission evaluator, not admitted for unattended production OS authorization. The packaged `start-connected` launcher still does not inject a Data owner; normal browser UI has no active Canvas backend until an OS-approved Data actor/permission adapter is configured. The Canvas library/editor is not mounted; Canvas duplication/undo and agent action parity remain separate tasks. Do not treat the test fixture's `authorize` callback as live OS policy. [Full security boundary and next gates](CANVAS-HOST-OWNER-INTEGRATION-2026-10-28.md).

**Progress accounting:** retain 15/100 formal accepted. The next historical increment is **MC2.1 design contract's +2 → 17/100** after review/PR acceptance. The Personal-first plan amendment still needs acceptance reconciliation. Work on independent GitHub-first owner/data/UI slices need not wait for owner Mac; do not pre-award points for draft PRs.

### MC2.1 review gating and Canvas OS final-edge permission composition (28 October 2026)

**Review state:** [MC2.1 focused design-only PR #43](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/43) passed [Dashboard CI 40711556090](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40711556090) and is mergeable, but still has **no recorded independent reviewer approval**. An attempt to request a review from `pkbannutz` was rejected by GitHub HTTP 422 because the account is not a repository collaborator; the request made no permission change. Do **not** merge, impersonate reviewer, self-approve or award MC2.1 until the required review is actually recorded. Total formal acceptance remains **15/100**; a correctly approved MC2.1 would add **2 points** to **17/100**, with Personal-first scope amendment/estimation also separately pending.

**Independent implementation slice:** [Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) added `apps/gateway/src/canvas-os-policy.ts`, `withCanvasOsPolicy()`. This is an **opt-in trusted-host wrapper** around the previously tested `CanvasOwnerBridge`, **not** a default route or a new owner database. It requires a host-injected OS permission evaluator and separately verified operator admission; it constructs scope-bound, fingerprinted OS `read_local`, `modify_canonical_state` and `delete_data` requests, verifies actual `ai-verse-os/action-permission-v1` source/fingerprint/scope/class, defaults any `deny` or `approval_required` to rejection, and repeats the operator+OS+Data-owner permission checks immediately before the owner effect. The normal launcher **does not** install this Data owner or OS adapter yet.

**Exact real evidence:** [Source commit `e2ee162097a5d19b1edf771c25ee5a1cea5c9767`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/e2ee162097a5d19b1edf771c25ee5a1cea5c9767) passed [real Gateway + Data + pinned OS composition 40714138321](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40714138321), [cross-platform Dashboard CI 40714138602](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40714138602), and [Chromium browser QC 40714138199](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40714138199). The disposable integration now imports the exact real OS evaluator from `AI-Verse-OS@0dc744057199970a34a60c11dff192e407ad64ed`, pinned Data Canvas `68f642cee430dc22381033f1338398b635993972` and real Gateway `9748dd0d5473b65ad95ef92df62fe0a13575e378`. It validates the same canonical SQLite Canvas across host restart, workspace isolation, idempotency and version conflicts, and **new OS floor checks**: paused workspace denied, delete requiring confirmation denied, separate operator grant revocation denied, and OS policy rechecked at the effect edge. All these flags were true; `private_owner_mac_verified` remained false.

**Next steps:** obtain an eligible independent reviewer for focused design PR #43, then record exact acceptance and 17/100 only after approval/merge. In parallel continue owner-authorized Data lifecycle registration (no arbitrary host filesystem paths), then the real user-visible Canvas library and edit UI. Do not turn the simulated CI operator grant into production authority or expose the OS evaluator to the browser; real installed OS policy/actor provenance and owner approval remain separate admission gates.

### Task 12: native Canvas owner lifecycle attachment (28 October 2026)

**Implemented in Dashboard draft PR #42 without duplicating the Data owner.**
New `apps/gateway/src/canvas-data-owner.ts` exports
`createAdmittedCanvasDataOwner()`, an opt-in bridge that takes the actual
installed native Data modules, a pinned registered Dashboard OS system,
an OS permission evaluator, and an *independent host actor admission* callback.
It uses the existing `CanvasOwnerBridge` validation and
`withCanvasOsPolicy()` checks, rechecks the registry root/lease/generation,
obtains a live human actor grant before each operation, then delegates every
document operation directly to `CanvasDocuments`. It opens only an already
provisioned scoped SQLite database (`open-existing`) and closes it after
each operation. No browser-supplied roots, actor IDs or auth receipts are
accepted; no new document store or privilege parser was implemented.

**CI migration:** `scripts/mc2/ci-canvas-data-owner-proof.mjs` now imports
the same production-shaped native attachment factory instead of its old
duplicate inline Data dispatcher. It explicitly initializes disposable
Data scopes before Dashboard starts, exercises real OS policy and native
Data over localhost RPC, and adds revocable Data actor grant and missing
workspace database denial. Implementation commit
[`a966c46`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/a966c46379155e01595cab2c9beee7326edd7c07)
passed all three GitHub workflows: [CI 40719388514](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40719388514),
[browser QC 40719388527](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40719388527)
and [real owner composition 40719388603](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40719388603).
Check the latest documentation commit's workflow status separately.

**Scope still open:** actual member OS actor-admission provenance,
Data installation/provisioning, and an authenticated private deployment that
installs this adapter are not certified. Default Dashboard launcher keeps
Canvas unavailable. Functional Canvas library/editing UI, agent action parity,
safe delete confirmation and private Mac owner acceptance remain distinct
tasks. The MC2.1 independent design review and plan amendment remain open.
Accepted roadmap still **15/100**, next gated acceptance **17/100**.

### Task 13: real first-party Canvas library/editor (28 October 2026)

**Implemented, draft, not owner-accepted:** Dashboard PR #42 now mounts
`CanvasWorkspace` from `apps/web/src/canvas-workspace.ts` inside
the existing authenticated Personal Chat app, keeping chat panes visible.
The first-party view starts with a visually empty unsaved Scratch Canvas;
adding a note deliberately creates the real Data document only on that
user action. The host-backed library lists and opens workspace-specific
canonical documents, and supports create, rename, duplicate, explicit
soft-delete request, note add/edit/remove/drag and connection add/remove.
Every saved mutation goes via pre-existing typed `DashboardClient.canvas*`
RPC to `CanvasOwnerBridge` then owner-authorized `CanvasDocuments`.
The UI verifies canonical Data provenance and scope on projection and uses
expected version + new idempotency keys per mutation, with explicit
permission and version-conflict feedback and root/workspace epoch fencing.

**Proven integration levels:** browser interaction fixture validates
actual first-party Chromium UI, canonical-shaped HTTP RPC method payloads,
saved note move ID/coordinates, Scratch reload/reopen, duplicate contents,
destructive denial and scope isolation; **not a duplicate Data database**.
Separate pinned Data SQLite + real OS permission composition remains in
the previous Task 12 workflow. [Source validation commit
`06f97bf`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/06f97bf4826bcb9c7daec99e06ca2ecc1e8a4aab)
passed [browser QC run 40722781395](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40722781395).
Inspect the latest source commit's remaining CI workflows before claiming
all green; the latest docs-only commit does not change the implementation.

**Not yet complete:** the normal private launcher still has no admitted
OS actor/Data owner. Deletion is default-denied where OS requires an
approval receipt. Sequential duplicate is not atomic and reports partial
failure rather than concealing it. Undo, asset persistence, agent parity,
real native provider/login and final owner Mac acceptance are separate
gates. DO NOT award historical roadmap points yet: MC2.1 independent review
and Personal-first plan amendment remain outstanding. Formal total is
15/100; next design milestone, if approved, adds 2 to reach 17/100.

### Task 14: verified agent-to-Canvas action boundary (28 October 2026)

**GitHub-first owner source + real Data CI, no production agent installed.** Dashboard
[PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42)
introduces `CanvasAgentActions`, a **host-only** dispatcher for currently
running agent actions. It reuses the exact Canvas action schema, protected
canonical owner, bounded document projection, OS evaluator and Data owner
as the first-party UI, but does not expose any new model/browser HTTP route.
An independent Gateway run verifier supplies workspace, agent actor and
revocable lease epoch, with fresh verification before admission and effect.
OS grants are split so the default human `operatorAdmitted` can never
implicitly admit `agentAdmitted`. Data writes bear real `bot` provenance
only for the verified agent actor; model-supplied actor, workspace, root,
credential/approval flags and idempotency overrides are rejected. Agents may
read/create/rename/edit notes and edges; agent delete remains categorically
blocked, even if an external OS policy loosens its default floor, because
there is no reviewed approval-receipt contract.

**Evidence:** [source commit `0536bfa`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/0536bfad0c70e294f91b887f893bcde00bb58e9d)
passed [cross-platform CI 40725634383](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40725634383),
[real OS + Data + Gateway composition 40725634303](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40725634303),
and [browser QC 40725634501](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40725634501).
The Data test directly reads updated record provenance from the real
canonical scoped SQLite. The test's Gateway run-verifier is a disposable
trusted fixture and **not** member-provider or production run authorization.
Check documentation-head CI separately.

**Outstanding acceptance gates:** attach actual native Gateway run/actor
verifier, true agent tool-host invocation, member OS permissions and
pre-provisioned Data owner to a private installation. Approval receipts,
undo/atomic clone, UI agent receipts and stop/recovery safety remain future
slices. No Mac test or live provider performed. No original Data/OS/Gateway
repo changed and no launch/merge. The formal baseline remains **15/100**;
MC2.1 design approval still required for **17/100**. Continue GitHub-first
toward the *aspirational* 90–93% pre-local target without inflating the
current roadmap score.


### Task 15: canonical GatewayStore-backed agent run verification (28 October 2026)

**Implemented and source-verified in Dashboard draft PR #42.** Task 14
introduced a host-only Canvas agent dispatcher with injectable verified-run
contract; this Task 15 **replaces the fake run assertion in its real
integration proof**, not the Data owner or authentication system. A new
`apps/gateway/src/canvas-gateway-run-verifier.ts` uses the *actual pinned*
canonical AI-Verse-Gateway `GatewayStore.getRun/getSession` data: running
run, authenticated principal, canonical system/workspace binding, active
session matching `active_run_id`, valid deadline, no pending approval,
active workspace manifest and unchanged registered OS root. The verifier
re-reads both real Gateway records after awaiting separately admitted
actor/grant lookup. A native OS/host grant must provide an exact bot ID
and revocable grant epoch; no model, chat transcript or human Gateway
bearer can mint an agent actor. There is still **no** new HTTP route,
second run store or hard-coded production authority.

**Evidence:** implementation [`7ee30ba`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/7ee30ba2554d4731de1b96002419fe46cfb0480a)
passed all three workflows:
[Dashboard cross-platform CI 40727330201](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40727330201),
[real pinned Gateway/Data/OS composition 40727330245](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40727330245),
[browser QC 40727330183](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40727330183).
New `test/canvas-gateway-run-verifier.test.ts` denies revoked actor grants,
completed/paused runs, session rebind, wrong principal/system, stale
deadlines, awaiting approvals and paused workspaces. The disposable
integration test now loads pinned Gateway `9748dd0`, creates a real
persisted Gateway run/session and verifies a bot Canvas write against
pinned Data `68f642c` and pinned OS `0dc7440`, then verifies
Gateway cancellation blocks further writes and canonical Data provenance
records `updatedBy.kind=bot`. Only the **OS actor grant callback** is
disposable fixture authority, as the existing installed OS does not expose
an admitted production Canvas bot grant.

**Remaining gates, not fabricated:** approved operator/agent OS grant
source, trusted installed Data provisioning, real out-of-process Gateway
run verifier/broker or native in-process owner capability, model tool-call
integration, true atomic run cancellation/write boundary, human approval
receipts, durable undo and atomic Canvas duplication, Mac owner sign-off.
Normal launcher still denies Canvas absent an approved owner. No merge.
Formal accepted **15/100**, pending MC2.1 review and personal-first
amendment. Next acceptance **17/100** if approved; pre-local 90–93%
is a future target rather than current score. **Next Task 16:** qualify
Data-owned atomic clone and undo/version reversal against the existing
canonical record owner; add only a demonstrated missing contract and tests,
without building Dashboard document storage or bypassing OS approvals.
