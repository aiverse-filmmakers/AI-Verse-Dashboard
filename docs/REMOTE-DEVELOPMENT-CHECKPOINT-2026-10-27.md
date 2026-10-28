# Resume Dashboard development — 27 October 2026

## Operator handoff directive for a new chat: maximize GitHub work before local testing

**Explicit 27 October decision:** the browser agent is expected to implement and test as much of the existing 100-point Dashboard plan as possible in GitHub, targeting roughly **90–93% pre-local implementation/readiness** before requesting the next Mac checkpoint. That range is an ambition based on the historical weighted work, **not formal accepted progress**. **100% includes owner-local installation, account authorization, clean-machine/usability tests and final sign-off.** The browser agent cannot use the Mac or its private credentials. GitHub CI *can* run real Dashboard/Gateway/OS and owner APIs against disposable installations. Never conflate the Pages preview, CI runtime tests and private member installation.

**Do not ask for routine local testing after each task.** Continue the original canonical MC sequence and safely independent tasks, with real code/tests, documented blocked owner gates and a prepared downloadable build/launcher. Defer necessary Mac actions into one later consolidated acceptance session. Read the [standing decision in the living plan](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md) and [execution tracker](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md). At this checkpoint MC0+MC1 historical accepted progress remains **15/100**. Do not falsely upgrade acceptance, invent credential access, merge the draft PR without authorization or claim the public preview is connected.

## Where to continue

This code checkpoint builds on the documentation in Dashboard PR #41. Fetch this PR branch, not just main. Do not assume a draft PR has been merged. The detailed plan remains [the living plan](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md); System PR #294 is its coordination summary.

Included source:
- `apps/web/preview/`: full buildless Personal/Filmmaking design preview and inspiration gallery, with design notes and observed QA limits.
- `apps/gateway/src/provider-authorization.ts`: host-only bounded one-use PKCE transactions for the documented ChatGPT local open-source route and OpenRouter.
- `test/provider-authorization.test.ts`: synthetic positive/negative transaction tests.

## Run and verify

From the repo root, serve only the preview folder:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory apps/web/preview
```

Open `http://127.0.0.1:4173/`, gallery at `/inspiration/`. A remote environment needs its normal authenticated port preview/forwarding; do not expose the whole repository or turn off host security to share it. Browser localStorage state belongs to each browser and is not transferred by Git. No account credentials or private state are included.

Use the existing repository dependency lockfile/tooling, then:

```sh
npm run build
node --test dist/test/provider-authorization.test.js
npm run check
```

Previous local check: build succeeded; seven new tests passed; full repository suite 102 passed, one existing skip, zero failures. Integration tests need temporary localhost listeners; the sandbox-only run was blocked with listen EPERM, and the run with loopback permission passed. No provider account or paid request was used. See preview/VERIFICATION.md for the earlier browser QA and untested cases.

## Important unfinished work

The preview is sample data and deterministic demo chat. It is not a production app or canonical workspace/session store. Focus mode/mobile chat still differ from the later always-present-chat requirement. Do not mistake its rendered UI for a connected runtime.

The authorization module is deliberately NOT exposed through HTTP or wired into UI. It returns a host-only exchange descriptor; it performs no token exchange, JWT validation, registration, refresh, credential persistence or inference. Only future authenticated trusted-host callers may provide system/session bindings. Do not send its verifier or exchange descriptor to browser/model code. Runtime credentials must stay with their inspected canonical owner. ChatGPT deployment eligibility remains to be established for the actual distribution model.

Next: reconcile amended plan/owner contracts; implement secure exchange/identity/refresh/storage and authenticated host routes; then Connect AI UI and real Gateway chat. Coordinate backend work through the Connections consumption handoff. Do not recreate the existing transaction helper or shadow a credential store. No new roadmap points or release acceptance awarded here.

## Local and remote continuity

Operator instruction for this Dashboard project: keep meaningful local source changes and checkpoints published to GitHub so browser work can resume from them. Update the active review branch/PR and this handoff as work changes; avoid leaving the only copy on a Mac. Before updating a remote branch, inspect current remote changes and preserve collaborators’ work. Do not publish secrets, personal browser state, dependency folders or generated build output. This instruction covers ongoing scoped Dashboard checkpoint publication, not automatic merges, releases, paid calls or unrelated repositories.

When handing work back, state the branch/PR, last verified commit, what works, known gaps and the next task. Update stale “local only” notes when code is published. Current prototype work and the AUTH-1 helper are preserved by this checkpoint; plans remain proposals until reviewed.

## Stage 1 preview handoff and next contract slice

On the current Dashboard PR #42, the preview now has an Essentials landing page (11 destinations), main browser-local saved-conversation lifecycle, browser backup/restore controls, and truthful disconnected Connections/Usage/Health pages. These are real preview interactions, not a live OS connection. Inspect current-head CI and published Pages deployment before claiming acceptance. Do not mark the older provider/connection/runs examples as working OS features.

**Canonical resume:** MC0 complete, MC1 complete for the recorded local-model scope, MC2.1 pending. The living plan and MC2.1 contract now include the first 11 visible UI consumers plus Connections/Token owner handoffs. The next production task is the reviewed MC2.1 trusted-host/owner contract, then MC2.2 Gateway adapter. The existing AUTH-1 host-only transaction helper must not be duplicated or exposed directly to the browser.

## MC2.1 / MC2.2 continuation checkpoint

Review the source-pinned [MC2.1 packet](MC2.1-SOURCE-REVIEW-2026-10-27.md) and host-only `packages/client/src/canonical-gateway-client.ts` with its focused synthetic tests. No real host-to-Gateway credential binding, browser fetch or model call has been wired. The accepted project total remains 15 historical points; MC2.1 awaits PR acceptance and MC2.2 is in progress.

Do not confuse Dashboard-local `/rpc` with canonical Gateway HTTP/SSE. Before wiring the app, use `SystemRegistry.resolveRoot()` against a trusted selected system and an explicit approved canonical Gateway ID+origin+credential mapping; authenticate scope at the existing host boundary; ensure A→B→A stale events never render; prove run-control workspace-rebind behavior. Avoid browser bearer injection and a duplicate Connections or Token store.

## Next after MC2.2 bridge and event transport

The code checkpoint provides an opt-in authenticated Dashboard-host bridge for canonical Gateway status/create/get and scoped WS run events, plus browser-safe typed /rpc methods. See `apps/gateway/src/canonical-gateway-bridge.ts` and synthetic fixture tests. **It is not attached to the published static UI**. `startGateway()` continues with no canonical bridge by default. No upstream bearer, provider account or native OS data is published.

Next gate: resolve an actual installed system's Gateway ID/origin and secret reference through the trusted credential/runtime owner, inject the binding explicitly, and execute one real local canonical run with events and correct scope. Only after this succeeds, wire real Personal chat to use it. Check workspace-rebind control races before exposing Stop; no restart of MC0/MC1 and no new plan.

## MC2 secure local startup and actual canonical Gateway proof

- Run `npm run mc2:local` **only on the trusted host with an existing configured Gateway**. The command uses the local `AIVERSE_GATEWAY_TOKEN` environment variable and existing Gateway config path, validates the installed canonical system ID and launches an authenticated Dashboard localhost service; it never prints/saves bearer credentials. It is not the macOS application or a public static preview login.
- Optional local environment: `AIVERSE_GATEWAY_HOME` defaults to `~/.aiverse/gateway`; `AIVERSE_GATEWAY_URL` defaults to `http://127.0.0.1:8787`; `AIVERSE_DASHBOARD_PORT` defaults to `3100`. Avoid command-line token arguments, source-code secrets, shared terminal output, and browser query-string tokens.
- CI workflow `.github/workflows/mc2-real-gateway.yml` checks out the exact Gateway source revision, uses disposable OS/Gateway state, executes an actual canonical deterministic run with run/event/WS evidence, and proves the local launcher starts without emitting tokens. It never accesses the user's Mac or third-party provider.
- The local host currently serves authenticated data/RPC/WS, not an approved browser UI session; the GitHub Pages preview remains disconnected. Securely delivering a native host session to the actual Personal chat and approving upstream Stop remain the next real product gates. See tracker and MC2.1 source review for owner and security boundaries.

## Current GitHub-first resume checkpoint — 28 October 2026

**Last verified source commit:** `ee9fb268040606fa9c34464f25ed201647a3021f` on Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), stacked on draft PR #41. Cross-platform CI, Chromium QC and real pinned canonical Gateway composition passed. Gateway [draft PR #80](https://github.com/aiverse-filmmakers/AI-Verse-Gateway/pull/80), exact source `9748dd0d5473b65ad95ef92df62fe0a13575e378`, provides owner-backed principal/workspace-scoped canonical session discovery and redacted run history. Dashboard consumes it through its authenticated localhost app and `Previous chats` panel. Browser reload, multi-turn follow-ups and complete Gateway **and** Dashboard child-process shutdown/restart on identical ports and persisted canonical disk were verified, including stale cookie denial, fresh pairing and same-session continuation. Evidence: [run 40697808818](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40697808818).

**Do not reimplement those proven chat paths.** Both PRs are draft, no member Mac, live provider, private OS, Tauri installer or owner release admission. The formal programme remains 15/100 accepted, and 90–93% remains an aspirational pre-local target. **Next qualified scope:** investigate current owner contracts for durable workspace/canvas documents and agent/manual action parity; build the first real persistent Personal Canvas path without introducing another data authority. Stop/approval and owner-login remain separately gated and must not be falsely counted as complete.

## Canvas host bridge checkpoint, 28 October 2026 (Task 10)

[Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) implements the **opt-in** authenticated `CanvasOwnerBridge` RPC facade for `aiverse.canvas.{list,get,create,rename,edit,delete}`, with strict param validation, trusted registered system root and workspace manifest, a mandatory host-injected owner authorization callback and bounded result redaction. The source of canonical persistent Canvas records remains [Data draft PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22), pinned to `68f642cee430dc22381033f1338398b635993972` in CI. No production Data owner is injected by the existing local launcher; the public demo has no real Canvas write authority.

**Verified in a disposable real-owner integration:** [Gateway composition 40709020351](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40709020351) passed: authenticated Dashboard RPC executes on real Data SQLite, persists a Canvas across host restart, isolates workspace, refuses stale version and denied write, and replays idempotent create. [Browser QC 40709020266](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40709020266) passed, and the cross-platform negative/auth tests passed at [Dashboard CI 40708643287](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40708643287); check the latest current-head CI before claiming its final status. Complete technical scope and missing gate in [Canvas host contract](CANVAS-HOST-OWNER-INTEGRATION-2026-10-28.md).

**Do not repeat:** owner Data schema/versioned persistence, host method/protocol mapping, authenticated Canvas RPC, input-boundary tests, or CI Data composition. **Next:** source review/acceptance of MC2.1 (original 2-point gate, so next accepted score would be **17/100**, not 16/100) and reconciliation of the amended Personal-first plan. Then add real OS authorization/lifecycle registration for the Data Canvas owner, and only then mount the editable Canvas library UI. Current formal accepted score stays **15/100** until approved review, not because no work was completed. Keep the GitHub-first 90–93% pre-local ambition.

## Task 12 native owner attachment checkpoint, 28 October 2026

Source is saved in Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42).
**Do not repeat Tasks 8-12.** Task 12 introduced a trusted production-shaped
Data module adapter `apps/gateway/src/canvas-data-owner.ts` that binds the
already-tested `CanvasOwnerBridge`, OS permission policy and canonical
Data `CanvasDocuments` to an independent native human-actor grant.
The integration proof now reuses this exact adapter, opens only explicitly
pre-provisioned scoped Data SQLite databases, denies unprovisioned workspace
Data, and tests both OS and actor revocation. Source commit
[`a966c46`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/a966c46379155e01595cab2c9beee7326edd7c07)
passed all three workflows (Dashboard CI, browser interaction and real OS +
Data + Gateway composition). Later docs-only commit CI must still be checked.

**Do not confuse native attachment source with production admission.**
The installed Data/OS actor source has not been authenticated on the
operator's Mac. No trusted production Canvas owner has been attached to
`start-connected`; it remains explicitly unavailable to the current
browser app. Do not add a hardcoded operator identity, use request-supplied
paths, create database files from read/list RPC, or claim live Canvas UI.

**Next independently useful task (13):** build the real first-party Canvas
library and editor via the six already-typed Canvas RPC methods, keeping
a truthful disconnected/permission/optimistic-conflict UI. Respect the
Personal Scratch Canvas plus separately named workspaces; never create a
browser-only canonical Canvas. Duplicate, undo, agent parity and approvals
must be implemented only against actual owner capabilities and recorded
as separate gates. Private production/native OS admission may be worked
as a parallel bounded slice without enabling anonymous permissions.

Keep the previous operating contract: 1-4 bounded tasks per run, GitHub-first
90-93% aspiration before consolidating necessary Mac tests, no surprise
merges or releases, and formal accepted score at **15/100** pending MC2.1
independent approval and amended plan review.

## Task 13 first-party Canvas UI checkpoint, 28 October 2026

**Code: Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), source branch
`codex/dashboard-source-checkpoint`. Tasks 8-13 have been implemented as
separate GitHub-first slices. Do not repeat the already proven session
restart, canonical Data persistence, host Canvas RPC, OS policy, native
Data owner attachment or this Canvas editor.**

Task 13 is the first **real Personal Canvas user interface** mounted
beside authenticated chat, not the static preview. File:
`apps/web/src/canvas-workspace.ts`, integrated into
`apps/web/src/personal-chat-ui.ts` and the existing CSS bundle.
A scratch area is always visible and is explicitly unsaved until the user
adds the first note. After Data owner admission, the library uses
`aiverse.canvas.{list,get,create,rename,edit,delete}` for saved
documents, note drag/edit/removal, links and canonical incremental duplicate.
It never writes canonical content to browser storage. Browser regression
test uses a scoped synthetic fixture to validate the real user controls;
separate previous CI uses the actual pinned Data SQLite and OS sources.
[Source validation 06f97bf](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/06f97bf4826bcb9c7daec99e06ca2ecc1e8a4aab)
passed Chromium [run 40722781395](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40722781395).

**Gates still open:** default production launcher does not attach the
real OS actor-granted Canvas Data owner; this requires owner-approved
Data provisioning and host grant source. Deletion requiring human approval
stays denied; copy is sequential/non-atomic and exposes partial failure,
not an owner-level clone. Agent controls, undo, collaborative/asset Canvas,
production macOS app, live member provider and final personal dogfood
remain later tasks. MC2.1 independent design review PR #43 still has no
approval, Personal-first plan amendment also pending. Formal accepted
score stays 15/100, next eligible increment +2 to 17/100.

**Next Task 14:** source-review the real OS/Data approval/action contracts,
then implement the narrow agent-to-Canvas action parity and explicit
approval-safe destructive pathway without allowing a model/browser to
mint actor authority. If owner approval/API capability is missing, record
its blocker and develop independent undo/atomic clone Data-owned contract
as a separate qualified slice. Never fake a successful agent write, undo
or approval from UI-only state. Keep 1-4 bounded tasks, GitHub-first,
check current-head workflows before reporting acceptance.

## Task 14 host-only Canvas agent parity checkpoint, 28 October 2026

**The current Dashboard draft PR #42 includes Tasks 8–14. DO NOT repeat
the previous Gateway chat/session lifecycle, restart recovery, Data-owned
Canvas persistence, Canvas RPC, OS permission policy, native owner adapter,
live library editor, or agent host dispatcher.** Canonical source branch
`codex/dashboard-source-checkpoint`.

`apps/gateway/src/canvas-agent-actions.ts` provides a **native/host-only**
`CanvasAgentActions` dispatcher. A separately installed, trusted Gateway
run verifier must return a running canonical run, bound system/workspace,
verified bot actor ID and lease epoch. The host rechecks that exact run
binding across admission and effect, reuses the **same** approved Data owner,
OS action policy, strict Canvas schemas and document projections as humans,
and derives the idempotency key from the host operation ID. The separate
`agentAdmitted` permission callback defaults to denial, independently
of the human `operatorAdmitted` grant. The native Data actor is `bot`
rather than forged `human` for verified-agent writes. Agent document
delete is always blocked until real OS approval receipts exist. There is
no public agent RPC or browser/model-supplied actor/root/grant.

New `test/canvas-agent-actions.test.ts` covers scope, run revocation,
grant isolation, lease rebind, model-provided actor/path/approval refusal
and source projection. The pinned real OS + Data + Gateway integration
`scripts/mc2/ci-canvas-data-owner-proof.mjs` now exercises an agent
note edit against real scoped SQLite and reads `updatedBy.kind=bot`.
This proof uses **a disposable trusted run-verifier fixture**, not a
member's live agent run, and the private `start-connected` launcher
still installs no Data owner. Implementation commit
[`0536bfa`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/0536bfad0c70e294f91b887f893bcde00bb58e9d)
passed [Dashboard CI 40725634383](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40725634383),
[real owner composition 40725634303](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40725634303)
and [Chromium browser QC 40725634501](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40725634501).
Latest documentation-head CI should be checked before separate claims.

**Next Task 15 qualification:** inspect existing OS/Gateway native
agent-run and actor provenance, plus owner Data initialization contracts.
Connect only a demonstrated installed trusted run verifier and explicit
owner-approved scope provisioning if the available interfaces support
it. Otherwise keep the fail-closed native dispatcher staged, and
separately qualify true Data-owned undo/atomic clone and approval
receipt workflows without inventing native permissions or duplicate
Canvas document stores. Do not expose an agent editing feature from
model prose alone. No production Mac testing is due yet.

**Programme status:** historical formally accepted **15/100**, design
MC2.1 gate awaiting independent reviewer and Personal-first amendment.
Next properly accepted milestone **17/100**. GitHub-first 90–93%
remains a pre-local *target*, not current completion. User wants an
overall percentage bar, recent slice/task completion, and next tasks
in every completion report. Keep tasks bounded 1–4, avoid duplicate work,
do not merge or deploy without admission.


## Task 15 real GatewayStore-backed agent checkpoint, 28 October 2026

**Tasks 8–15 source implemented, do not repeat.** Dashboard draft PR #42,
branch `codex/dashboard-source-checkpoint`. This slice adds the
host-only `createGatewayStoreCanvasRunVerifier()` to
`apps/gateway/src/canvas-gateway-run-verifier.ts`, complementing
Task 14's `CanvasAgentActions`. No second run/session index or document
store was created. The verifier is based on exact upstream
`AI-Verse-Gateway@9748dd0` real canonical `GatewayStore.getRun/getSession`.
It binds the authenticated Gateway principal, matching canonical
system/workspace, running run, current active session run, deadline,
pending approval, active OS workspace and registered root generation.
It re-reads Gateway run/session after a separately *owner-admitted* bot
identity and revocable grant lease is fetched. Gateway does not
independently mint a bot actor or Canvas grant, so no fake identity is
derived from a chat/run ID.

`test/canvas-gateway-run-verifier.test.ts` covers revoked/stale/foreign/
paused/expired run and workspace, session preemption, missing actor grant,
and status change during grant lookup. The existing pinned real
`scripts/mc2/ci-canvas-data-owner-proof.mjs` now uses the actual
pinned Gateway Store and real persisted run/session as its verified-run
source, while independently checking real Data bot provenance and OS
policy. Only the host bot-grant callback remains a *disposable CI fixture*
because production OS actor authorization is not yet installed.
Source commit [`7ee30ba`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/7ee30ba2554d4731de1b96002419fe46cfb0480a)
passed [cross-platform CI 40727330201](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40727330201),
[real OS+Data+Gateway composition 40727330245](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40727330245),
[browser interaction QC 40727330183](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40727330183).
Check the current HEAD's docs-only workflows separately.

**Not yet installed:** a separate Gateway process needs a real trusted
host/broker protocol or owner capability providing equivalent state
reads without arbitrary Gateway-state file access; OS member actor-grants
and canonical Data initialization require explicit approval. The
model-to-native-tool action dispatch remains unconnected; the repeat
check is not an atomic run-status/Data transaction; destructive
approval receipts and private Mac acceptance are still missing.
Do not enable an unauthorized native Canvas owner or advertise
production agent writing.

**Next Task 16:** Data-owned atomic clone and versioned undo qualification
on the existing SQLite owner. First check Data PR #22's current schema,
snapshot/events and existing transaction capability, then only implement
missing Data-owned atomic operations if justified. Do not replicate
the Data records in Dashboard. Host/OS owner admission can continue as
a separately blocked parallel production dependency. Keep bounded slices,
tests, PR/tracker/handoff parity and explicit approval gating.

**Official accepted 15/100**, MC2.1 review/plan amendment still open;
next independent acceptance +2 to 17/100. GitHub-first 90–93%
remains a target before private final-local checks, not a measured
current completion. Always show the user progress bar, completed task,
next task and distinct formal score at the end of a slice.

## Tasks 16-18 atomic duplicate checkpoint, 28 October 2026

**Do not repeat Tasks 8-18:** Gateway chat + restart, Data Canvas,
secure Canvas bridge, native OS authorization, first-party Canvas
library and editor, agent action boundary, real GatewayStore run
verification and now atomic Data duplication are all implemented
source slices in Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42)
and Data [draft PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22).
No production merge/admission.

**Task 16** qualified existing Data schema/event/transaction authority:
the previous Data provenance has version IDs and receipts but does
NOT retain immutable pre-edit Canvas board snapshots. We therefore
did *not* invent fake historical Undo. Instead, introduced
`CanvasDocuments.duplicate()` in Data itself: an immediate scoped
SQLite transaction, source expectedVersion, full notes/connections
and Data actor, idempotent after retries even when the source changes.
Tested Data code pin:
`5caa5d08151f85e503e8ceace494458736b76886`.
Release smoke, five-component acceptance and all six cross-platform
CI jobs passed that SHA. Data PR #22 remains a draft.

**Task 17** wired the same `aiverse.canvas.duplicate` contract through
Dashboard's method registry, strict RPC schema, `withCanvasOsPolicy`
modify-canonical-state class, native Data owner `duplicate()`
dispatch, host-only agent vocabulary and typed
`DashboardClient.canvasDuplicate`. The updated
`scripts/mc2/ci-canvas-data-owner-proof.mjs` pins the new Data SHA
and checks actual Data graph equality, version 1, idempotent retry
and stale source rejection over Dashboard authenticated RPC.
Permission, actor, idempotency, workspace and real OS checks are not
duplicated or bypassed.

**Task 18** replaced the old multi-request duplicate in
`apps/web/src/canvas-workspace.ts` with ONE `canvasDuplicate` RPC
and canonical projected result. Existing browser QC now asserts one
RPC and complete copied note/edge graph. Additional Chromium QC
denies stale-source copy and confirms no partial library item.
No UI-only shadow copy, no preview backend mutation.

**Next Task 19:** define a true Data-owned historical Canvas
revision archive and revert/undo contract, covering snapshot
authenticity, retention, actor receipts, optimistic version
conflicts and OS approval for destructive reversals. Do not turn
localStorage or a model-supplied "before" board into authoritative
history. Production OS actor grants, Gateway tool host, owner-admitted
Data provisioning and Mac testing remain separate gates.

**Progress:** formal accepted **15/100**, next MC2.1 accepted gate
**17/100** if independently approved. GitHub-first **90–93%** is a
future target, not current measured completion. The user expects
a percent bar, explicit completed slices, and what remains at every
completion report. Keep 1–4 tasks per batch; this batch contained
three Tasks 16–18. Do not merge PRs or claim local deployment.

**Source verification evidence for Tasks 16-18 (28 Oct 2026):**
Data atomic owner code `5caa5d0` passed
[release smoke 40738377304](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40738377304),
[six-platform Node CI 40738377314](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40738377314)
and [five-component acceptance 40738377347](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40738377347).
Dashboard atomic-duplicate code/test fix commit
[`fe2879e`](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/commit/fe2879e1cd6417ad67bb751194855699818c3cd2)
passed [real pinned Gateway/Data/OS composition 40739268703](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40739268703),
[browser interaction QC 40739272200](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40739272200),
and Linux/Windows jobs in [Dashboard CI 40739268280](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40739268280).
The **macOS job** was queued at the last check and must be verified before
claiming the newest entire matrix is green. A prior code commit
`7189567` already passed the macOS build; the latest fix changed only
a browser test's expected user-readable conflict message.


## Tasks 19-24 owner-backed historical Canvas checkpoint, 28 October 2026

**Full progression Tasks 8–24 source implemented. Do not rebuild
any prior Canvas/Gateway/OS owner, library, duplication, or agent
run verification.** Dashboard draft PR #42, Data draft PR #22,
both unmerged and without production owner admission.

This six-task batch added:
1. `AI-Verse-Data/src/canvas/index.ts`: a new bounded revision
   Data entity under existing scoped `creative-canvas` SQLite,
   capturing authentic full Canvas snapshots and the **version's
   own actor provenance** in the same transaction as create, edit,
   rename, duplicate and revert. Digest-checked, not a signed archive.
   Pre-history documents begin recording at next authorized edit.
2. Data `history(id,limit)` (max 30) and
   `revert(id,toVersion,expectedVersion,actor,idempotencyKey)`
   create a *new* Data version from a verified, previously committed
   revision. Stale, deleted and foreign-scope operations fail.
   Replay is idempotent. Journal scan bound is 5000 scope records.
3. Dashboard `aiverse.canvas.history` read and
   `aiverse.canvas.revert` write through strict original command
   registry, CanvasOwnerBridge, OS `read_local`/`modify_canonical_state`
   policy, independently admitted real native Data owner and
   DashboardClient. No browser-supplied older board or actor.
4. Real first-party `apps/web/src/canvas-workspace.ts` History,
   `Undo last change`, two-stage `Confirm restore vN`, clean
   version list and correct updated Canvas after confirmation.
5. `Reload Canvas` recovery from canonical scope after version
   conflict; older UI retarget state cleared. Agent history reading
   admitted only with fresh bot-grant/run proof; agent revert is
   *not* allowed without reviewed human approval.
6. Data + Dashboard + Chromium + pinned Gateway/OS/Data tests,
   specifically historical persistence across restart, mixed
   human/bot provenance, version conflict, no forged board,
   owner-granted history, and agent destructive deny.

Reviewed Data code SHA:
`0948d424fb31d4561c5a5ba62c835ad40ee6ffd4`.
Its [Release Smoke 40741080025](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40741080025),
[all six CI jobs 40741080717](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40741080717)
and [five-component acceptance 40741080151](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40741080151)
passed. Dashboard code SHA:
`4c527e17b0659150b40ad3a920943310c7238b2c`
passed [cross-platform Dashboard CI 40741376157](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40741376157)
and [Chromium QC 40741376101](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40741376101).
Check [real canonical composition 40741376218](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40741376218)
passed on the tested implementation SHA.
Docs commits after code do not change runtime behavior.

**Outstanding owner gates:** production actor-grant authorization,
real out-of-process trusted Gateway owner state/agent tool host,
owner-admitted Data scope creation and native Mac installation,
independent MC2.1 architectural review + Personal-first plan
amendment, destructive approval receipts, indexed/retained Data
revision history beyond 5000 events, signed audit integrity if
required, private user's acceptance. Browser test fixture is
disposable scoped simulation; pinned composition uses real Data,
OS evaluator and Gateway records. Historical versions prior to
archival setup cannot be recovered.

**Next Task 25:** qualify Data-owned history pagination/retention
and integrity with the existing index/query contracts, and then
work through real host/OS approval gates without inventing agent
identity, migrating the Data owner or duplicating systems.
Keep owner-side tests and authorization fail-closed.

**Formal roadmap remains 15/100**; next independent MC2.1
approval would bring 17/100. Browser/GitHub first 90–93%
is the pre-local **goal**, not actual current verified percentage.
User expects task slice checkmarks, ahead/tasks and percentage
progress bar at every completion. Batches only as explicitly
requested, no duplicate slices. Do not merge PRs without approval.


## Tasks 25–32 indexed Canvas revision owner checkpoint (28 October 2026)

**DO NOT REPEAT TASKS 8–32.** Continue from the existing
Dashboard `codex/dashboard-source-checkpoint` draft
[PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42)
and Data `codex/canvas-document-owner-v1` draft
[PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22).
They remain unmerged and no production Mac deployment exists.

New source tasks:
- **25** Indexed Data-owned `_records` Canvas revision query:
  partial JSON-expression index on `creative-canvas.revisions`,
  no separate DB/schema format or workspace-wide archive scan.
- **26** Bounded, stable Data history `beforeVersion` keyset
  cursor with at most 30 verified versions per page.
- **27** Direct indexed historical `revert` to one exact requested
  prior version; Data continues to own optimistic locking,
  idempotency and actor provenance.
- **28** Fail closed for a tampered, in-place modified or
  duplicate-version revision. Multiple documents with
  interleaved 74-version and 38-version histories tested.
  No automated retention pruning until a real owner backup
  and retention policy exists.
- **29** Dashboard Canvas bridge strict optional `beforeVersion`
  schema, typed `DashboardClient.canvasHistory`, existing
  native Data owner dispatch. No forged actor/root/grant.
- **30** Functional Canvas History `Load older versions`
  button, 20 per page, rejects repeated/foreign/out-of-order
  pages; clears stale history when another document is
  created, duplicated, renamed or edited. No browser store.
- **31** Agent invalid-cursor and forged-actor denial, plus
  the pinned authenticated real Gateway/OS/Data proof
  now checking history pages with cursor 3 then 2 and
  rejecting `beforeVersion=1`.
- **32** CI coverage and handoff. The originally verified
  Data source commit `3e76b71` passed all standard checks.
  Latest test-only Data integrity commit `beec725e` must
  have its own last check; Dashboard `40e5573` passed
  CI, real composition and Chromium, while the current
  later document-switch code `c27034d` needs a matching
  latest-head CI check. The Dashboard composition pin uses
  the exact code/test Data revision; do not silently
  move to unreviewed downstream sources.

**Known limits:** The index, digest and safe keysets do not
imply signed tamper-proof historical audit or automatic
backups. History snapshots before Data archive admission
cannot be reconstructed. Production actor/OS grants and
native scope provisioning are absent, same as before.
An agent cannot invoke destructive revert without
independently reviewed human approvals. A running CI
check is not evidence of passing. CI is not installed
member/owner acceptance.

**Next Task 33:** first inspect the OS owner actor-grant
contract and Data scoped provisioning/backup lifecycle
against real source; stage only compatible native
authorization or owner-run installer mechanics. Avoid
duplicating Gateway, storage or credentials and do not
infer power from an operator chat token. Continue
bounded slices, formal review gates and tests.
Formal acceptance remains **15/100**. Next MC2.1
approved milestone is **17/100**. Browser/GitHub 90–93%
is only a pre-local target, not current measured progress.
Always show slices and a separate formal percentage bar.

**Tasks 25–32 final code-head evidence:** Data
`beec725e3eeaf17e61705854d172b291dd2afa54` fully green:
[release smoke 40742775291](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40742775291),
[six job CI 40742775603](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40742775603),
[five-component acceptance 40742775695](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40742775695).
Dashboard `c27034de7559a2398a5215902be4d6d62d6521ea` fully green:
[Dashboard CI 40743057482](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40743057482),
[Chromium 40743057446](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40743057446),
[real pinned Gateway/OS/Data 40743058809](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40743058809).
All eight scoped **source** tasks can be treated as tested; no formal acceptance/merge
or private owner Mac validation. Latest docs heads may run workflows separately.


## Tasks 33–42 real owner lifecycle checkpoint, 28 October 2026

**DO NOT REBUILD Tasks 8–42.** Source-implemented, independently
CI-verified in existing Dashboard draft
[PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42)
and Data draft
[PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22).
Both PRs remain unmerged, with no private Mac production acceptance.

Ten bounded slices delivered:

**33 | OS/Gateway grant qualification.** Actual OS
`scripts/action-permission.mjs` at `0dc7440` provides
action-class policy evaluation, **NOT** actor identity, bot
lease or human approval receipts. Canonical Gateway run/session
records do not issue bot authority. No fake actor/grant was
minted. This remains a real production blocking dependency.

**34 | Data readonly preflight.** New Data
`inspectScopedDataDatabase(driver,scope)` in the existing
WeakMap-trusted scope owner calls native read-only SQLite
`inspectMigration` using the exact scope binding, with
zero file/provision/migration side effects.

**35 | Data scope safety tests.** Missing database and no new
file, healthy binding/unchanged file mtime, mismatched
standalone owner, fake constructed scope and symlink escape
all tested. No browser migration/installer created.

**36 | Host-only readiness.** Dashboard
`apps/gateway/src/canvas-owner-preflight.ts` implements
`createCanvasOwnerPreflight()` for a pinned OS registered
root and active workspace. It returns only `ready` and
safe reason codes. No HTTP RPC or bearer-accessible
provisioning path.

**37 | Readiness denial tests.** Dashboard
`test/canvas-owner-preflight.test.ts` covers missing,
quarantined, foreign, migration-required/incomplete,
paused, invalid and rebound scopes.

**38 | Human pause enforcement.** `CanvasOwnerBridge`
rechecks real OS workspace manifest active status at
the owner effect edge. A paused workspace cannot use
Canvas read or write.

**39 | Agent pause enforcement.**
`CanvasAgentActions` also revokes real canonical agent
Canvas reads/writes while workspace manifest paused,
including during effect-edge checks. Tests verify a real
manifest resumes operation only after it becomes active.

**40 | Real native Data lifecycle proof.**
`scripts/mc2/ci-canvas-data-owner-proof.mjs` tests
`database-missing`, then ONLY disposable CI trusted host
calls the existing Data `create-or-open` on canonical
Personal and Film scopes, and host readiness reports
`ready`. Paused workspace is again refused.
Browser/Cookies never create a Data database.

**41 | Data backup proof.** Existing canonical Data
`backupTo` creates disposable SQLite backup with
authentic binding. Reopen validates document, notes,
version and history. This does not install live backup
schedules or determine retention.

**42 | CI and handoff.** Exact verified Data code SHA
`d1a135a490547890e7ba54d43cf77a71f67f67b1`:
[release smoke 40745957846](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40745957846),
[six-platform CI 40745957240](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40745957240),
[five-component acceptance 40745957276](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40745957276),
all **passed**.
Dashboard verified source
`f92d46ad9cc11a1867ae11f54912044037bccf47`:
[all-platform Dashboard CI 40746877698](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40746877698),
[Chromium QC 40746877403](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40746877403),
[real canonical Gateway/OS/Data integration 40746878006](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40746878006),
all **passed**. Later documentation-only commits
do not change runtime code. False test fixtures with
literal escaped newline manifests were fixed before
final green CI.

Read the new runbook:
`docs/CANVAS-OWNER-ADMISSION-PREFLIGHT-2026-10-28.md`
for precise **not-yet-installed** actor grant, native
scope provisioning, approved owner backup, Gateway
model tool and private owner Mac gates.

**Next Task 43 qualification:** research the actual OS
repository's native actor grant/approval machinery and
create an independently reviewed production owner
contract only where necessary. Do not use Gateway bearer,
browser cookies, manual `agentGrant=true` or an OS
permission floor as identity. If authoritatively
missing, retain denial and explicit blocker.
Never create parallel Data storage/OS policy engines.
Do not auto-merge drafts.

**Progress:** officially accepted roadmap **15/100**,
pending MC2.1 design and Personal-first amendment
independent acceptance; next formal gate **17/100**
if approved. GitHub-first **90–93%** is a future
pre-local target, not actual current completion.
User wants explicit per-task slice count, completion,
next tasks and percentage bar every batch.


## Tasks 43–62: owner-only OS Canvas grants (28 October 2026)

**DO NOT DUPLICATE Tasks 8–62.** Tasks 43–62 introduced a
**new OS owner draft**
[AI-Verse-OS PR #110](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/110)
on branch `codex/canvas-owner-grant-readonly-v1`, plus a
Dashboard trusted host integration on existing
[draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42).
Data [draft PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22)
is unchanged this batch. No PR is merged or installed.

The OS has action-class policies but NO native independent
operator/bot identity issuer or destructive approval receipt
producer. These are not replaced by a Dashboard bearer or
Gateway run/session status. The new OS file
`scripts/canvas-actor-grant.mjs` exposes only
`verifyInstalledCanvasGrant({osRoot,facts})`; it does not
write or mint grants. If a pre-existing, explicitly
owner-controlled, 0600 on Unix, grant file is absent,
it returns null. Strict actor/system/workspace/method/
expiry/run/session/grant-epoch checks, old OS action-permission
active-workspace enforcement, symlink/path/perms schema
denial and cross-platform Node 22 matrix are covered.

Dashboard `apps/gateway/src/canvas-os-grant.ts`
provides `createOsNativeCanvasGrantResolvers(registry,options)`
and requires an injected *separately authenticated* native
human OS session or live canonical Gateway bot session.
It binds the OS grant to the native Data actor and the
pre-existing OS action-permission effect boundary, plus
OS-owned `resolveAdmittedActor` for
`createGatewayStoreCanvasRunVerifier`. No browser grant
issuer or second Data owner was created. Human/bot grant
withdrawal takes effect on the next checked action;
a bot with `edit` but no `duplicate` method grant is
denied at the actual effect edge.

New Dashboard test
`test/canvas-os-grant.test.ts` exercises independent human
and bot session admission, grant revoke, no model/browser
actor authority, actor binding and root rebind. The real
pinned `scripts/mc2/ci-canvas-data-owner-proof.mjs`
now uses actual OS grant-reader module from reviewed OS
source, actual GatewayStore run/session and actual native
Data SQLite. It writes private short-lived grants **only
inside the disposable CI OS host**; this is NOT a production
issuer. It tests absence before grant, human/agent
read/write, human/bot revocation while a Gateway run
is otherwise active, re-grant, method-specific denial,
existing Data effects, backup/restart and OS workspace
protection. The test assertion for denied bot duplicate
expects `CANVAS_ACCESS_DENIED` from OS effect policy,
not `CANVAS_AGENT_ACCESS_DENIED` from run verifier.

See the exhaustive task map in:
`docs/MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md`
and the authority runbook:
`docs/CANVAS-NATIVE-OS-GRANTS-2026-10-28.md`.
The OS reader's own contract lives in
`AI-Verse-OS/docs/CANVAS-ACTOR-GRANTS-2026-10-28.md`.

**Exact reviewed OS code/test SHA** for composition:
`a9b6eaf785c6782fe09f2b99a624d1abb8f520b3`.
Its newest OS readonly grant matrix run:
[40762850957](https://github.com/aiverse-filmmakers/AI-Verse-OS/actions/runs/40762850957),
was queued at the initial tracking check. **Do not claim
green without retrieving the final conclusion.**
OS earlier code `7c9fc63` passed the native matrix
and all established regression suites; this later
change adds OS-side workspace activation and test.

**Latest Dashboard code fix**:
`f0f5e1e42cc6ef13bd18a66f40481b38fd1ed309`,
with Dashboard [CI 40763120455](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40763120455),
[Chromium 40763120327](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40763120327),
and [real Gateway/OS/Data 40763120328](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40763120328)
all queued at initial handoff checkpoint. Check results.
Documentation commits after code do not change runtime
behavior. All project percentages must remain conservative
if any checks are pending or failed.

**Next Task 63 qualification:** OS native session
authentication + *explicit owner-issued* grant issuance/
renewal/revocation with audit, only in the actual OS
owner repository after architectural review. Follow
with human approval receipt issuance/consumption, real
Windows ACL source validation, cross-process cancellation
fencing, production Gateway model tool dispatch, native
Data provision/backup policy and owner Mac testing.
Do NOT enable production actions with CI-only callbacks,
file contents supplied by an HTTP request, fake
`agentGrant=true` or action-policy allow as identity.

Formal roadmap remains **15/100** accepted, pending
independent MC2.1 review and Personal-first amendment.
Next formal gate would be **17/100**, if approved.
90–93% GitHub-first before local acceptance remains
a future target, not measured current project progress.


**Tasks 43–62 implementation-head CI follow-up:** Dashboard
`f0f5e1e42cc6ef13bd18a66f40481b38fd1ed309` is **fully green**:
[CI 40763120455](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40763120455),
[Chromium 40763120327](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40763120327),
[real Gateway+OS+Data 40763120328](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40763120328).
Pinned OS source
`a9b6eaf785c6782fe09f2b99a624d1abb8f520b3`
passed Linux and Windows native grant tests but its
[macOS native grant matrix job 40762850957](https://github.com/aiverse-filmmakers/AI-Verse-OS/actions/runs/40762850957)
was **queued** last check. Verify exact final conclusion
before claiming fully green OS test matrix. Docs-only
commits after code introduce no runtime behavior.


## NEW standing progress reporting contract, 28 October 2026

**The user expressly wants to know when 100% of what is doable in
GitHub/browser alone has been completed.** Do NOT keep reporting
only 15/100 after coding batches.

Read `docs/GITHUB-BROWSER-COMPLETION-SCORECARD-2026-10-28.md`
before the next batch. The scorecard independently defines:

- **GB = GitHub/browser build completion: ~34/100 PROVISIONAL estimate**
  across fixed current-scope remote-capable categories. The preliminary
  estimates require a source/CI subdeliverable audit; never claim it is a
  fully verified 34%.
- **FA = formal accepted roadmap: 15/100**, unchanged until reviewed
  MC2.1 and other gates actually close. Next formal gate 17/100 if approved.
- **LR = local/production acceptance:** list explicit pending native
  owner Mac/account/signing/installation actions, **no invented %**.

**GB=100% is the remote finish line:** no *defined current-scope*
engineering/CI/build/owner-integration task remaining for GitHub
and browser; remaining work genuinely requires private Mac,
credentials, consent, local releases or owner checks. This does not
mean the product has been installed or formally accepted 100/100.

Include GB/FA/LR, a batch scoreboard, remaining remote workstreams
and exact evidence in future results. Do NOT count number of tasks
as percent or award formal points to draft branches. The historic
90–93/100 is a pre-local aspiration under original formal
weighted accounting, **not** a ceiling on GB's separate 100-point
scale. If user expands the film suite's undefined feature scope,
rebaseline GB publicly instead of changing percentage silently.

The new scorecard is committed to the real Dashboard
`codex/dashboard-source-checkpoint` draft PR #42, not main.


## Tasks 63–92: source handoff, 28 October 2026

**Continue from Task 93, not from Task 63.** Completed thirty bounded
source/test/CI/documentation slices enumerated in
`docs/CANVAS-NATIVE-OWNER-LIFECYCLE-TASKS-63-92-2026-10-28.md`.
These slices are NOT a claim of 30 accepted roadmap points or
installed OS ownership.

New OS draft PR #111 (`codex/canvas-owner-grant-lifecycle-v1`) is
stacked on OS read-only grant verifier draft PR #110; read-only
grant verifier has not been replaced. Candidate OS lifecycle
`scripts/canvas-grant-owner-lifecycle.mjs` requires an injected
trusted native owner approval for each exact permission diff
and a verified running GatewayStore bot session. It uses
CAS, lock, atomic private file, before/after revocation, expiry,
workspace and run rechecks, and request deep-copy/freeze.
Windows is intentionally denied until ACL-qualified. A genuine
native Mac owner authenticator, tamper-evident durable audit,
real human destructive approval receipt issuer and private
owner credentials were NOT introduced.

OS code/test commit (latest at handoff):
`d304db51d11f8e4865e9d4dfbd2ceb7e79b7e0f7`,
`tests/canvas-grant-owner-lifecycle.test.mjs`;
[OS lifecycle CI 40772532207](https://github.com/aiverse-filmmakers/AI-Verse-OS/actions/runs/40772532207).
Check the final conclusions, not the queue state.

Dashboard draft PR #42 now has
`scripts/mc2/ci-canvas-native-owner-lifecycle-proof.mjs`
which loads the exact pinned OS source plus actual
canonical GatewayStore and Dashboard OS grant adapter,
proves unapproved grant denial, authorized issuance,
method-specific permissions, one-grant revocation,
canceled run denial and revoke-all. Dashboard CI workflow
has this as an extra real integration step. Last pinned
Dashboard composed code: `dff258f709daa5b4cbf4f9dbbd124f48a9076e7a`,
[real composition 40772577730](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40772577730).
Check exact final run state.

**Progress reporting contract** remains mandatory: machine-readable
`docs/github-browser-progress.json` plus validator/tests and
`docs/GITHUB-BROWSER-COMPLETION-SCORECARD-2026-10-28.md`.
Baseline GitHub/browser **~34/100 provisional** (do NOT count 30 slices
as 30 points). Formal acceptance **15/100**, not moved. Local
production is a list of owner-only blockers, no fictional
percentage. If exact latest CI fully succeeds, reconcile a
limited GB increment in the OS authority category with
audited evidence, then update JSON and the narrative scorecard
together. Keep documentation and new chats in sync.

Next Task 93: qualify real native Mac operator session and
independently authenticated grant/approval issuance audit.
No automatic production grant issuer, no merging draft PRs.
