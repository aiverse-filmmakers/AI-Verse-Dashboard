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
