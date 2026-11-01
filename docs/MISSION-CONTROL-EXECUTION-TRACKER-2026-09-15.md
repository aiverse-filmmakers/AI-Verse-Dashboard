# Mission Control -> AI-Verse Dashboard Execution Tracker

**Date:** 2026-09-15  
**Status:** CANONICAL EXECUTION TRACKER  
**PRD:** `docs/PRD-MISSION-CONTROL-AIVERSE-DASHBOARD-2026-09-15.md`  
**Canonical plan:** `docs/CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`

## Pre-dogfood whole-system audit override

AI-Verse-System retains the whole-system audit authority. The operator explicitly approved the bounded disposable local Qwen trial recorded in System PR #288 and Dashboard PR #40. Its real Mac proof passed; [scope, evidence and limitations](MC1-REAL-MODEL-ACCEPTANCE-2026-10-26.md) close MC1.4/MC1.5 for this standalone local-model path. Generic/private-owner and credentialed-cloud trials remain blocked. Current formal Dashboard progress is **17/100** after scoped MC2.1 design acceptance on 30 October; MC2.2 implementation is next. This does not qualify a user Mac release or the Personal-first extra scope.

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

**Current formal accepted progress: 17 / 100. 83% remaining.** MC0/MC1 15 points plus MC2.1 scoped original design 2 points, see source/CI/review/merge evidence below.

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

Sanitized evidence, exact refs, execution-path amendment, initial failures and remaining limitations are recorded in the linked acceptance packet. Mission Control state remains disposable. MC2.1 design has since been accepted with scoped evidence; MC2.2 implementation is the next historical acceptance gate. Gateway G4.2 remains separately owned.

---

# MC2 - First-class AI-Verse adapter - 15 points

### MC2.1 - Adapter contract design - 2 points - A
Status: **ACCEPTED: SCOPED DESIGN ONLY, 2/2 POINTS. NO IMPLEMENTATION OR RELEASE CREDIT.**

**30 October 2026 acceptance evidence:** [focused design PR #43](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/43) merged with squash commit `297f99b9380c9905fbe6c359668f504142c2ee89`, after [exact-head Dashboard CI 40711556090](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40711556090) passed Linux, macOS and Windows and AI-assisted Code Review COMMENT `5718854282` examined the actual design and current owner contracts. **Reviewer provenance: AI-assisted self-review, explicitly delegated by product owner, not an independent human or GitHub APPROVE.** Original MC2.1 design acceptance checks (exact Gateway routes, auth/root/workspace bind, SSE/replay, scope separation and documented absent APIs) are satisfied **for the design packet only**. Implementation PR #42 and Gateway/Data/OS owner drafts remain unaccepted. Next historical gate MC2.2. Formal 15→17/100; no source code, local installation, real provider, Personal-first extra-scope, or privileged permissions are accepted by this record.

28 October 2026: [MC2.1 design-only acceptance PR #43](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/43) is independently reviewable against main. The [Gateway client wire contract](MC2.1-AIVERSE-GATEWAY-CLIENT-CONTRACT-2026-10-26.md) and [source-pinned Personal-first review packet](MC2.1-ACCEPTANCE-REVIEW-2026-10-28.md) cover the actual Gateway routes, host/auth/system/workspace binding, SSE/cancel race, Connections credential ownership, typed app-action design, current owner-draft API status, missing routes and negative tests. This is **documentation/review**, not a deployed/approved interface; implementation PR #42, Gateway #80, Data #22 and Personal-first plan PR #41 remain separate drafts.

**Acceptance closure:** original design-only review and merge were recorded above. The owner explicitly delegated AI-assisted technical review in the [review policy](REVIEW-ACCEPTANCE-WORKFLOW-2026-10-30.md); this is not described as independent signoff. Revised Personal-first scope totals still require their own plan review before any reweighting.

Deliver:
- exact Dashboard <-> AI-Verse Gateway client contract;
- capability discovery;
- system/workspace binding;
- auth handling;
- event/run/control mapping.

Acceptance:
- design review against Gateway protocol and Dashboard invariants.

### MC2.2 - AI-Verse Gateway client package - 3 points - A
Status: **REAL GATEWAY COMPOSITION AND CLIENT SOURCE MERGED, FORMAL ACCEPTANCE PENDING (0/3 points)**

**31 October 2026 review checkpoint:** The following bounded, AI-assisted Code Review-cleared implementation PRs have exact-head Linux/macOS/Windows Dashboard CI and are merged into `main` in sequence. This is actual source, not a simulated feature claim:

| Slice | Merged PR / commit | Exact-head CI | Scope |
| --- | --- | --- | --- |
| Host-only canonical Gateway transport | [#46](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/46) / `21ddcaf22dd86fa752b7cda46d8668b48403b93c` | 41139063402 | Loopback host binding, bearer redaction, model/status, run control, bounded SSE |
| Streamed JSON byte cap | [#48](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/48) / `9ce334bb9f0c46beeeb2119f40fa971a6ffd396a` | 41139745419 | 1 MiB byte bound before buffering, forged-size negatives |
| Native scope/lease Gateway bridge | [#49](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/49) / `79a5c9f9a51019b88260170229272621665fadf2` | 41140143589 | Host credential mapping, allowlisted projection, monotonic OS rebind/re-register revocation |
| Authenticated HTTP /rpc dispatch | [#51](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/51) / `ffa6062f387560d0fbdef341d418439882cbed3e` | 41140354565 | Existing local bearer+Origin, absent owner mapping deny-first, redacted canonical projections |
| Scoped WebSocket run events | [#52](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/52) / `1c46933a57cfa7dbe5075a658d08ed7482ae6711` | 41140792051 | Event allowlist, workspace-switch epoch fence, malformed frames fail closed |
| Typed browser RPC facade | [#53](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/53) / `728d8c6b3540a9752b29ca74a47e39754fabd0fc` | 41140987362 | No live effect cache, A→B→A response fencing, typed run operations |

| Real canonical Gateway owner CI | [#55](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/55) / `1fab108a8fceeb3d8ae16ac4ca19a29070e52789` | Dashboard 41185008184, real owner 41185008100 | Immutable pinned real canonical Gateway, durable run and usage, streamed event replay, idempotency, scope and missing-grant denials |
| Native admitted approval path | [#56](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/56) / `91d8b292d23c6480ec9ce6b9ba2d517f770dfc1f` | Dashboard 41185342720, real owner 41185342767 | Default-deny approval, fresh native authorization and changed pending tool/rebind failure |
| Typed browser event adapter | [#57](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/57) / `d8d3227f2ee7c54bb960adb99a39fe26cb04513f` | Dashboard 41185530484, real owner 41185530471 | Scoped WebSocket adapter, malformed-frame rejection, real Gateway run event proof |
| Real Personal Chat run controller | [#58](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/58) / `9338b8a85b38297087ce000f756dfc0408d20c14` | Dashboard 41185727707, real owner 41185727735 | Reconnect/recovery, trusted terminal GET, multi-turn confirmation, owner-only sessions, actual Gateway completed chat run |
| Canonical runtime/model status | [#59](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/59) / `a0aa78f590d762e9a6572c377adccec343a0e46a` | Dashboard 41185902944, real owner 41185903079 | Actual virtual `aiverse` owner identity; no fabricated physical models or paid provider selection |

All eleven listed source slices have documented scoped AI-assisted **COMMENT** reviews on their respective PRs. **These source reviews are not independent GitHub approval or permission to use an owner/private Mac.**

**Remaining original MC2.2 acceptance:** The next exact-head disposable CI proof **has passed** against pinned actual canonical Gateway source at PR #55 and was extended through #59; the Dashboard client/host/run/stream/approval surfaces are real source. To award the 3 original formal points, complete an acceptance decision against *all* original client criteria, owner authentication/security review and any pending native approval contract. In particular, the approval endpoint is default-denied until a separate native owner authorizes the exact action, and history read-only methods may fail if the pinned Gateway owner does not release them. Do not assume draft Gateway conversation discovery PR #80 is a released session-history API. A working Personal Chat UI, browser app session/credential admission, paid provider choice and user Mac install are later or separate owner-gated requirements; do not infer their readiness. The historic formal roadmap remains **17/100 accepted** (MC2.2 still 0/3) and provisional GitHub/Browser **47/100** is not automatically increased by these source merges. See [review checkpoint](MC2.2-CODE-REVIEW-CHECKPOINT-2026-10-31.md) for the exact risks and next acceptance action.

**1 November 2026 source/CI follow-up:** The following additional slices have been merged and reviewed at their immutable heads. These supersede the older "controller-only" wording but **do not close the original 3-point MC2.2 gate**.

| Bounded slice | Merged PR / main SHA | Exact-head / post-merge proof | Scope |
| --- | --- | --- | --- |
| Local host pairing, cookie and scope boundary | [#61](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/61) | Head CI and AI-assisted technical review on #61 | No browser bearer; native-owned session and workspace fences |
| Read-only owner activity, diagnostics and Canvas seam | [#62](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/62), [#63](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/63), [#64](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/64) | Scoped source reviews and CI on merged PRs | Canonical owner or explicit unavailable; no invented Data persistence |
| Real Personal Chat DOM source | [#65](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/65) / `7deca974` | [main CI 41191096302](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41191096302) passed | Actual mountable UI, not a production-installed application |
| Real Chromium suite and browser compatibility | [#66](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/66) / `fa287d303ba1381f88b7c9299807424e5fb7e164` | [browser PR CI 41249308734](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41249308734) and [main CI 41249472465](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41249472465) passed | 36 fixture browser tests passed, one intentionally skipped static preview; protocol changes trigger browser QC |
| Actual native terminal launcher and pinned real-Gateway Chromium | [#67](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/67) / `c5323cf83b9b182e28e500089c19509eafd44673` | [PR native CI 41249578528](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41249578528), [main native CI 41249681628](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41249681628), [main Dashboard CI 41249681489](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41249681489), [main Gateway CI 41249681594](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41249681594), all passed | Private one-time terminal pairing, real browser streaming/recovery, owner-approved workspace change, direct launcher executable smoke |

**Review provenance:** #66 and #67 have recorded, scoped `change-review` COMMENT receipts (not GitHub APPROVE or independent human security audit). Head and main checks are green. No private user Mac install, paid inference, Data owner mounting or final owner security signoff is implied. Original MC2.2 acceptance remains **0/3**, with **17/100** formal total. Outstanding review is complete client-contract/owner authority acceptance, not repeating already proven source/Chromium construction.

Deliver:
- typed client for models/chat/runs/events/cancel/pause/resume/approval;
- auth redaction;
- timeout/retry/idempotency behavior;
- tests.

Acceptance:
- CI green;
- no direct canonical-domain writes.

### MC2.3 - Explicit AI-Verse runtime source - 3 points - A
Status: **SOURCE PROJECTION MERGED, PRODUCT ACCEPTANCE PENDING (0/3 points)**

31 October source: [#59](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/59) merged actual authenticated `aiverse` model catalog UI helper and negative provider-claim tests, exercised against pinned canonical Gateway in CI. No live physical-provider selection or final mounted Personal UI acceptance.

Deliver:
- `aiverse` runtime identity;
- no `local/aiverse` disguise for normal product use;
- Gateway readiness/capability state.

Acceptance:
- product can distinguish AI-Verse from generic OpenAI-compatible runtimes.

### MC2.4 - System/workspace selection integration - 2 points - A
Status: **NATIVE OWNER-SCOPED WORKSPACE SWITCHING SOURCE MERGED; FULL A -> B -> A ACCEPTANCE PENDING (0/2 points)**

1 November: PR #67's real pinned-Gateway Chromium proof covers host-approved operator -> film selection, stale cookie revocation, no inherited film turns and scoped Gateway history. PR #68 adds explicit return to operator with renewed host pairing and full A -> B -> A negative checks. Until #68's exact-head review, merge and target CI are recorded, this is a pending test, not accepted evidence.

Deliver:
- explicit system/workspace selection;
- no silent fallback;
- preservation of existing isolation tests.

Acceptance:
- A -> B -> A tests;
- wrong-system requests fail closed.

### MC2.5 - Main Chat + Run/event controls - 4 points - A
Status: **RUN CONTROLLER AND TRANSPORT MERGED, MOUNTED MAIN CHAT ACCEPTANCE PENDING (0/4 points)**

31 October source: [#58](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/58) merged the canonical run controller with continuity/recovery tests and actual completed owner Gateway chat proof; browser event adapter [#57](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/57) is merged. The real user-facing mounted Personal Chat, secure local app session, persistent history availability and advertised control UX still require bounded review. Source CI does not close this UI milestone.

**1 November update:** [#65](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/65) merged the actual native-mountable Personal Chat DOM. [#66](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/66) merged the real Chromium fixture/interaction suite, and [#67](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/67) merged the interactive localhost terminal launcher and separate *actual pinned Gateway* browser proof. All three latest #67 post-merge workflows passed at `c5323cf8`. Real history works only when the pinned owner API supplies it, and Canvas truth remains explicitly unavailable without a Data owner. This is verified source/browser engineering, **not MC2.5 acceptance**, private Mac security signoff or a signed desktop release.

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
