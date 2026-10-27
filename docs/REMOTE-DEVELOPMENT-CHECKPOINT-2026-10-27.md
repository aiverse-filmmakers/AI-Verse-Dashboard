# Resume Dashboard development — 27 October 2026

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
