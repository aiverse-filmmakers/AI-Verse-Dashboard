# G02.3 owner contract: actual physical AI model choice

**Status:** implementation design / dependency request only, **NOT** a shipped provider selector. **30 October 2026.** Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42).

## Confirmed owner source facts

1. Canonical Gateway `src/server.mjs` currently advertises a single virtual `aiverse` via authenticated `GET /v1/models`. This advertises runtime **kind** but neither an authorized per-owner physical model roster nor approved provider credential state.
2. Canonical Gateway `src/runtime.mjs` supports `deterministic`, `openai-compatible` and `json-subprocess` runtimes. In the openAI-compatible branch, `model: !input.model || input.model === "aiverse" ? config.model : input.model` can pass a specified model name through to an upstream runtime. The **Dashboard** presently rejects any `model` and `provider` keys on browser-originated run creation, but the canonical **Gateway itself** still needs model admission for any future physical picker. A UI dropdown does **not** enforce safe selection.
3. Connections v1 owns connection identity, opaque secret handles, live verification, authorized/healthy/approved status, capabilities, revocation and execution. It does **not** currently provide a Gateway-enforced physical model catalog with per-workspace run permissions. Token owns cost truth and usage telemetry; cost unknown is not zero.
4. A canonical Gateway run already stores `principal`, `system_id`, `workspace_id`, `runtime`, immutable run identity, idempotency evidence and audit. Those are the appropriate authorization boundaries. Owner MAC consent and provider login remain private; never move bearer, OAuth code, API key or OS root into a browser frame.

Source inspection: `aiverse-filmmakers/AI-Verse-Gateway/src/server.mjs`, `src/runtime.mjs`, `src/config.mjs`; `aiverse-filmmakers/AI-Verse-Connections/README.md`; `aiverse-filmmakers/AI-Verse-Token/README.md`. Model selection is still blocked in Dashboard.

## Proposed owner-authored v1 admission contract

**The Gateway and Connections maintain actual authority.** Browser can display **only** scoped capabilities returned by authenticated Dashboard host; it must not be permitted to invent model/provider IDs.

### 1. Read-only model inventory, behind existing Gateway bearer

Candidate owner endpoint: `GET /v1/models?workspace_id=<workspace>`; **the upstream owner must approve/version the shape** before Dashboard code uses it. A reply may contain physical choices only after authenticated `principal + system_id + workspace_id` and actual Connections authorization / healthy capability admission have been checked.

Each option should include an opaque Gateway-minted **choice ID**, human-readable provider+model label, supported input modalities/context/tooling, cost estimate status `actual/calculated/unknown`, authoritative readiness evidence timestamp, and a short-lived **authorization generation**. No raw upstream endpoint, secret handle, provider access token, OAuth state, untrusted workspace override or private installation paths.

The existing `aiverse` virtual model remains the explicitly supported fallback. If owner catalog fails or reports zero physical choices, Dashboard must show virtual model only and state that physical switching is unavailable. Never synthesize choices from public model lists, Token tariffs, generic Gateway configuration, or model names found in the prompt.

### 2. Canonical run admission and revocation

A selected physical model must be an **explicit Gateway-owned run-create parameter** or opaque choice receipt, not a browser forwarding arbitrary `model` strings. Server MUST:
- resolve the authenticated principal, exact system, workspace and owner-granted Connections permission at the **final dispatch boundary**;
- validate the opaque choice ID against an authorized, unexpired catalog generation, model allowlist and provider-specific capability scope;
- bind the immutable selected provider/model to the canonical run record, idempotency payload and audit (never expose the underlying credential);
- reject cross-workspace reuse, revoked connection, expired catalog generation, disabled model, unsupported modality/tool use, budget exceeded, credential error and direct `model`/origin/body injection;
- keep provider selection read-only until owner explicitly authorizes the user to spend/route to a specific provider. A connected provider alone is not a grant to incur charges.

If a provider is revoked between catalog discovery and dispatch, revocation wins. No silent fallback to a different *paid* model; a re-route requires new owner permission unless the canonical owner establishes an explicit approved fallback policy.

### 3. Dashboard integration after the contract exists

Only then should Dashboard add a typed `aiverse.gateway.models.authorized` read path, a per-pane model chooser using the exact owner-supplied choices, and a run.create field containing the approved opaque ID. The Dashboard host must revalidate live scope/registration before each dispatch, and the controller must save the selected ID in the run's known state without treating the UI display label as authority.

Different split panes may select different approved models if the owner grants that capability, but no pane may inherit another pane's pending choice across workspace retarget, OS root rebind, logout or host epoch rotation. The user's confirmed Chat history remains canonical and model-agnostic; restart retrieves selection from Gateway, not localStorage.

### 4. Required acceptance tests before saying real switching works

- Authentic owner with two approved connected model choices can select each, create runs, and inspect Gateway-signed provider/model receipts and owner-bound Token cost/usage.
- A disconnected, unhealthy, unapproved, unpaid or revoked model is omitted or marked unavailable and rejected **at run creation**, even if the browser replays an old ID.
- Workspace A choice rejected in B; same for foreign user/principal, changed OS root/generation, missing scope and forged catalog response.
- Direct arbitrary `model` in upstream Gateway client and Dashboard frame rejected unless explicitly admitted by Gateway policy.
- Idempotency key cannot be reused to switch physical models, model choice receipts are immutable, and retries never duplicate billable inference.
- Browser, logs, WebSocket, crashes and source control never contain raw provider token, key handle, OAuth code, internal network destination or credential path.
- Capability catalog expiry/revocation during a run is handled according to an **owner-documented** execution policy, without asserting a canceled result is a completed answer.
- Signed native owner Mac acceptance with a real permitted provider, and negative tests using a real revoked permission. Synthetic CI cannot replace this step.

## Decisions and blockers

**Dashboard-only work can proceed safely** on first-party controls (now Pause, Resume, Stop, Check run) and canonical session UI. **Owner dependency:** change canonical Gateway's physical model admission and connect to Connections capability resolution. Do not write an unsafe Dashboard-specific model-router around this dependency or mutate provider credentials from the browser. Obtain upstream owner review of endpoint and receipt schemas before implementing Task 628.

**Progress impact of this specification: zero.** This is a security and integration contract, not a physical model selector or formal roadmap acceptance. At the latest verified checkpoint: Chat **11/15 provisional**, GitHub/browser **47/100 provisional**, formal accepted **15/100**. G02.3 remains in progress.
