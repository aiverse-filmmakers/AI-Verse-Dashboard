# MC2.1 — AI-Verse Gateway client contract

> **27 October Personal-first amendment:** the transport findings below remain the reviewed baseline. The new [living plan](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md) adds persistent shared chat, app context/actions and real capability selection. This contract is not yet sufficient for those additions. Complete its owner/API and action-envelope design before accepting the amended MC2.1 gate. No app-control, attachment, dynamic model/reasoning or image API is implied by the routes below.

**Status: DESIGN DRAFT / source-reviewed locally; acceptance pending.** No client,
API endpoint, credential or UI behavior is implemented by this document.

Owner: AI-Verse-Dashboard. Reviewed Dashboard `016da5fda319c94bda6704859acc5b12d23ad4ed`
and Gateway `ceb8849ec062f0d3997ceb0207e42c25aedd20c6`; its candidate descriptor pins
executable revision `386ff40135a841c27bfd106531b38a7f37c1c227`.

Parent: [living implementation plan](CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md),
R01–R03; [tracker MC2.1](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md).

## 1. Current caller and bounded decision

`packages/client/src/client.ts:DashboardClient.query()` sends authenticated
Dashboard envelopes to `/rpc`. `apps/gateway/src/query-router.ts` serves local
read models and legacy session projections. Its `protocol.capabilities` describes
that projection service, not canonical Gateway or provider readiness.

The real Gateway is the separate Node service in `AI-Verse-Gateway`. Its
`src/server.mjs` routes HTTP requests, `RunEngine` owns execution and controls,
and `GatewayStore` owns runs/events/checkpoints. Current `/rpc` `run.get` and
`run.list` are legacy local-entry projections, not canonical run API calls.
`CliJsonlAdapter` also uses a different `{reply}` protocol from Gateway's runtime
envelope. Neither may be relabeled as the completed MC2 adapter.

**Decision:** extend the existing client package with a typed canonical-Gateway
transport and narrow host bridge. Reuse registry identity checks, envelope
validation and presentation contracts. Preserve existing read-only callers and
return shapes until explicitly migrated. No new service, domain database,
runtime executor, provider adapter or dependency is required by this design.

Intended flow:

```text
Mission Control-derived AI-Verse panels
  -> authenticated Dashboard host bridge (selected system/workspace + epoch)
  -> canonical Gateway HTTP/SSE (host-resolved bearer)
  -> canonical OS/runtime/owner authorization
  -> scoped results and rebuildable UI projections
```

MC2.2 builds the adapter; MC2.3/MC2.4 wire source identity and selection; MC2.5
connects real main Chat/events/controls. MC3 imports the application presentation.

The current HTTP and WebSocket request handlers call the synchronous
`QueryRouter.handle()`. Keep that path for existing projections. MC2.2 adds an
awaited canonical-Gateway branch at those same authenticated entry points;
network calls must not be hidden inside a synchronous return value. Proposed
facade methods are `aiverse.gateway.health`, `.status`, `.models`,
`.run.create`, `.run.get`, `.run.events`, `.run.diagnostics` and `.run.control`.
The latter validates one of the four existing control actions and translates
its decision/reason/operation ID. Events are delivered through the existing
authenticated WS connection as scoped projections of the upstream SSE stream.
Neither transport becomes an additional public service.

## 2. Binding and authentication

The trusted host resolves a Dashboard registry `systemId` to its existing approved
root identity, a configured Gateway origin, expected canonical Gateway system ID
and an opaque credential reference. Extend the existing registered connection
metadata; do not create a competing OS registry. The browser supplies the
registered ID and selected workspace, never filesystem roots, upstream origins,
bearers, principals or executable commands.

The two system IDs are distinct fields. `SystemRegistry` can generate a local
Dashboard ID such as `aiverse-01`; Gateway derives `system_id` from its own
installation config. Require an explicitly approved mapping, then compare the
authenticated `/status.system_id` and each run response against that canonical
ID. A browser label or copied ID does not establish the mapping.

Validate the existing registry filesystem identity before privileged use. A
missing/replaced root, changed connection/credential or failed identity check
invalidates the binding. Scope a connection lease by Dashboard system ID,
canonical system ID, selected workspace and a host-generated epoch. Retargeting
or invalidation aborts requests/subscriptions; late replies from the previous
epoch are discarded. Server-side checks remain necessary even if the UI hides
another workspace.

Use Gateway wire workspace IDs `operator` or a validated bare workspace ID;
`workspace:<id>` is the OS host scope form, not the HTTP metadata value. Every
workspace-bound request sets it explicitly. If unavailable, report failure; do
not omit it and silently inherit the session/default workspace. An owner-directed
workspace change is a binding change requiring fresh validation and visible UI
context, never a silent fallback.

Gateway bearer resolution stays in the trusted host and out of browser bundles,
localStorage, URLs, diagnostics and package installs. The browser's Dashboard
authentication is separate. Use the current Dashboard authenticated transport;
do not replace its bearer/WS checks with an unreviewed cookie/auth system. Native
secure storage and install/supervision remain MC6 responsibilities. Default
connections are approved local loopback origins. Remote/proxy use remains a
separate explicit scope, not an automatic fallback when localhost fails.

## 3. Preflight and truthful capability discovery

1. Resolve the authorized host binding and its supported installation compatibility
   profile. Version text alone is not an attestation of source revision or owners.
2. `GET /health` is an unauthenticated lifecycle observation. It grants no access.
3. Authenticate `GET /status`; verify component, expected system ID and ready
   lifecycle. Record its runtime kind, remote flag and observation time safely.
4. Authenticate `GET /v1/models`; require the Gateway model `aiverse` for this
   adapter. Gateway maps it to the configured provider model. Do not configure
   Qwen or a provider account by writing Dashboard state.
5. Return a typed capability/readiness projection with provenance from the
   supported compatibility profile and observed preflight. Protocol support,
   current lifecycle, current run affordance and owner/model readiness are
   separate facts. `goal_owner_configured` or a model listing proves neither
   the owner handshake nor successful inference.

There is no current `/capabilities` HTTP route. Do not probe invented endpoints
or create a run merely to discover features. Baseline chat/run/event/control
support comes from the tested API profile; unknown profiles remain unavailable
until verified. Unsupported owner features remain unavailable, with no local
replacement. A live model proof is separate explicit execution.

## 4. Canonical API mapping

All authenticated requests use the host-resolved bearer. The following names
are proposed adapter operations, not claims of already implemented Dashboard RPC.

| Adapter operation | Actual Gateway endpoint / payload | Required interpretation |
| --- | --- | --- |
| `health` | `GET /health` | 200 only when ready, otherwise 503; unauthenticated observation only. |
| `status` | `GET /status` | Match component/system/lifecycle; no private root or token in UI output. |
| `models` | `GET /v1/models` | `aiverse` is a virtual Gateway identity, not the physical provider name. |
| `createRun` | `POST /v1/runs`, `model: aiverse`, `messages`, explicit `metadata.workspace_id`, optional canonical `session_id`, stable `Idempotency-Key` | HTTP202 and canonical `run_id`, `session_id`, `system_id`, `workspace_id`, status. Validate scope before routing to a panel. |
| `getRun` | `GET /v1/runs/:id` | Canonical state/result, not a transcript API. Verify its scope against the active binding. |
| `subscribeRun` | `GET /v1/runs/:id/events` | Authenticated Gateway event SSE, replay plus follow; see section5. |
| `diagnostics` | `GET /v1/runs/:id/diagnostics` | Scoped advanced diagnostics; project explicitly allowed fields and redact errors. |
| `cancel`, `pause`, `resume` | `POST /v1/runs/:id/<action>`, stable `operation_id`, optional `reason` | Preserve canonical state checks and idempotency. A repeated transport request is the same operation, not a new action. |
| `resolveApproval` | `POST /v1/runs/:id/approval`, `decision: approve|deny`, stable `operation_id` | Explicit user decision for the currently pending action; Gateway rechecks owner authorization. No model/text/transport-derived approval. |
| `chatCompatibility` | `POST /v1/chat/completions`, role/content messages, optional `stream` and explicit workspace metadata | Retain for compatibility/proof callers. The run API plus event stream is the product Chat path because it supplies a canonical run ID and controls. |

For the main Chat UI, use `createRun` plus `subscribeRun`/`getRun`; represent its
assistant text in the existing heterogeneous timeline. Do not simultaneously
submit the same user message via both Chat and Run APIs. Gateway owns canonical
session/run IDs. Dashboard's display history and session index are projections,
and cannot become a second conversation/Memory store.

Creation retry preserves the exact key/body/scope for one user submission. A
timeout with an unknown result is not permission to mint a second key and repeat
the effect. Control retries likewise retain `operation_id` and payload; changed
payload/key reuse must surface the upstream conflict. Use cancellation signals
and existing request/body/resource bounds; implementation chooses only the
timeouts/reconnect limits actually needed, without inventing a performance SLA.

The canonical service has no general run-list, session-list or workspace-list
route. Existing owner-backed workspace projections remain separate. A list of
runs observed by this UI may be presented as recently observed, not as exhaustive
canonical history. Never fill this gap by reading Gateway's state directory or
Mission Control SQLite.

## 5. Events, controls and recovery

Canonical run SSE uses `event: <type>` and JSON `data` containing
`event_id`, `run_id`, `type`, `at`, `data`. It does **not** carry system/workspace
IDs, a numeric sequence or an SSE `id`/resume-cursor contract. OpenAI Chat SSE
instead carries `data` chunks and `[DONE]`; it is not the approval/control stream.

The host opens the authorized upstream stream using fetch/streaming with its
bearer, not browser EventSource query-string credentials. Bind each event to the
verified run and current connection epoch, then add scope to the Dashboard
presentation envelope from that trusted binding. Check `run_id` and recognized
envelope shape; render event text as untrusted data. Never infer scope from
model/tool text or invent an upstream numeric sequence.

Reconnect currently replays history; `Last-Event-ID` and incremental cursors
are not implemented server behavior. Rebuild a bounded disposable run projection
instead of appending the full replay to the old text. Deduplicate live/replay
overlap by event ID within that projection and refresh canonical run status.
The special `gateway.replay_overflow` transport event is not a completed domain
run: reconnect/reconcile under the existing limits, or display an explicit
connection failure. Closing/retargeting a view must unsubscribe; a terminal run
does not by itself promise the upstream SSE socket closes.

Show pause/resume/cancel/approval only when supported and applicable to the
fresh canonical state. `paused_recovery_required` means manual recovery, not
transparent provider-process resume. `awaiting_approval` stays a pending action;
`RUN_NOT_COMPLETED`, failed, blocked, budget-limited, parked and unknown states
must not become a successful assistant message.

Before control, verify the selected binding and returned run's system/workspace.
Gateway's control endpoint authenticates the principal/run, but does not accept
an atomic expected-workspace condition from the client. A GET check alone cannot
prove atomicity if an owner-driven workspace rebind can race the POST. MC2.5 must
characterize this actual scenario before enabling the affected control: either
prove the existing owner behavior preserves the invariant, narrow/disable that
case, or propose a minimal separate Gateway-owned guard. Do not invent the missing
precondition or treat Dashboard text as upstream authority. This is a named
downstream integration dependency, not a reason to rewrite the finished Gateway.

## 6. Failure and unavailable cases

| Observation | Dashboard behavior |
| --- | --- |
| 401 / wrong credential | Stop upstream requests, invalidate readiness, request authorized local reconnection; never send a different system's credential. |
| 403 / disallowed Origin or scope | Surface denial; no proxy/CORS bypass or automatic remote bind. |
| 409 / idempotency, session or run state conflict | Preserve original operation reference and refresh canonical state; no new effect disguised as retry. |
| 429, replay overflow, timeout or dropped stream | Bounded backoff/reconciliation under the existing contract; show interrupted/unknown until authoritative state is read. |
| Disabled/uninstalled/reconfigured Gateway or root identity drift | Stop the binding and all streams; explicit approved rebind/restart as required. |
| Unknown version/profile, missing owner/Goal interface or absent runtime | Unavailable with provenance; no shadow owner, guessed success, zero-cost default or automatic Goal loop. |
| Wrong system/workspace/run or stale epoch | Reject/discard before display or control; no cross-system fallback. |

## 7. Implementation handoff and design review

| Existing surface | Disposition / next work |
| --- | --- |
| `packages/client` | EXTEND in MC2.2 with a host-only canonical HTTP/SSE adapter, proposed `src/canonical-gateway-client.ts`. Preserve `DashboardClient.query()` compatibility; do not export credential-resolving implementation from the browser entry point. |
| `packages/protocol` | REUSE validation/scope patterns. Add an explicitly named `aiverse.gateway.*` host facade only when implemented; do not silently change legacy `run.get` result shapes or advertise future methods. |
| `packages/registry` and authenticated host | EXTEND registered connection metadata/lookup, distinct system-ID mapping and binding epoch. Upstream secret reference remains host-only. |
| `apps/gateway` | Add a bounded async canonical bridge, proposed `src/canonical-gateway-bridge.ts`, at existing HTTP/WS handlers; no new canonical execution engine or direct Gateway-state access. |
| `packages/live`, panel/layout contracts | REUSE presentation/timeline patterns; RETIRE echo/local session execution as product truth only after canonical equivalents pass. |
| Mission Control main Chat/UI import | MC2.5/MC3 integrate using the accepted adapter; do not raw-fork the repository or import domain authority. |

Source walkthrough checked endpoint routing, `publicStatus`, `sanitizeRun`,
`createRun`, `controlRun`, `sseRun`, run/session binding, runtime model mapping,
Dashboard registry identity, query routing, protocol and existing client/session
implementations. The wire examples above were compared to those symbols. Older
Gateway prose calling issue60 open or MC1.4 blocked is dated evidence, superseded
by the accepted closeout for its specific scope; it does not redefine these APIs.

Design review against the PRD preserves all canonical owners, separate browser/
upstream authentication, system/workspace boundaries, staged Mission Control
adoption and unchanged desktop/release responsibility. No owner writes, new
server routes, model test or implementation tests ran for this documentation
slice. Planned MC2.2 verification must exercise real HTTP/SSE caller behavior,
identity mismatch, wrong token, scope switching/late events, replay, idempotent
retry/conflict and explicit unavailable cases. Reuse existing regressions; do not
duplicate accepted whole-system audits.

**MC2.1 local task checkpoint:** source characterization, contract draft and
source/PRD review are prepared. Normal PR acceptance remains pending; current
accepted progress is15/100. On accepted MC2.1, add its existing2 points to17/100
and continue MC2.2. This design does not accept MC2.2–MC2.6 or a finished UI.

## 27 October continuation: Stage 1 UI consumers and owner gaps

The operator selected **11 first visible features**. The static Essentials/Conversations/Recovery views in PR #42 are not owner-backed proof. Use the **existing canonical Gateway** transport as the first real integration rather than building another run engine or silently connecting the browser directly to Core storage.

| Stage 1 feature | Existing preview | Real authority and missing integration |
| --- | --- | --- |
| Personal shell | Chat + workspace + canvas browser layout | Dashboard presentation; authenticated local host for scoped context |
| Contextual chat | Canvas chips, team tags, selected app | Gateway authenticated run envelope; bounded target context, revision and cancellation policy not yet admitted |
| AI connection | Setup detail and disabled Connect | Trusted provider auth/exchange, credential owner, actual runtime model capability status, logout/reconnect |
| Conversations | Per-workspace local create/open/rename/archive and messages | Gateway-owned session/run lifecycle; canonical conversation-list, rename/archive/recovery endpoint **not established** |
| Workspaces | Manual create/switch in localStorage | OS canonical workspace create/list/reuse and permission checks; **not** provided by reviewed Gateway |
| Files and notes | Canvas notes, images, filename-only chat attachments | Canonical Data/file and asset ownership, authenticated file byte ingress/egress and scoped note actions **unconfirmed** |
| Memory and Skills | Searchable example views | Their existing Core owners' approved read/invoke APIs, scoped to caller |
| Agent control of app | Preview proposal approval | Typed allowlisted edit commands with identity, document revision, idempotency, approval and undo receipt |
| Live activity and Stop | Example run timeline | Gateway run/event/control routes **exist**; authenticated host adapter, selected run identity, reconnect and stop race proof pending |
| Usage and health | Unknown/not checked empty states | Token owner status/usage read projections; Gateway diagnostics and owner checks; no invented zeros |
| Save/recovery | Browser local reload, backup/restore and undo | Canonical storage, authenticated session recovery, restart/replay and conflict-resolution contracts **unconfirmed** |

### MC2.1 minimal host facade to accept before coding MC2.2

1. **Trusted host binding:** resolve canonical system/workspace identity from authenticated host state, not browser request or prompt text. Keep OAuth/verifiers/Gateway bearer secret. `operator` is the legitimate general chat scope where supported, not a substitute for tenant authorization.
2. **Only verified canonical Gateway methods:** authenticated `GET /status`, `GET /v1/models`, `POST /v1/runs`, `GET /v1/runs/:id`, run event SSE, explicit control and approval routes in the existing transport contract. Treat `aiverse` as the virtual Gateway model; do not represent physical model-family selection as working without a verified capability route.
3. **Events and Stop:** treat stopped/completed/interrupted/reconnecting as distinct. Bind every control to the exact run/system/workspace/session and current epoch. Prove replay/races and permission denials; a UI button click alone never proves a stop.
4. **Owner-specific pending APIs:** no guessed session list, archive, workspace inventory, file asset owner, generic Skills/Memory endpoint or app-action API. For every missing path, identify the current owner contract and write a narrow host adapter only once authorized. Browser storage stays explicit preview state until replaced.
5. **Connections:** consume the already qualified `ConnectionsService` local read-only methods from an authenticated host. `status()`, `doctor()` and `listConnections()` supply bounded evidence. Verified/authorized/admitted/approved are different states. No direct browser secret collection, credential handles, fake HTTP routes or auto-grant.
6. **Token:** consume the existing `@ai-verse/token/dashboard`/bounded owner projections, preserving `ACTUAL`, `CALCULATED`, `UNKNOWN`. Missing usage is unknown, not zero. Telemetry labels are not permission.
7. **Scope changes and UI actions:** navigation must not change chat's authority silently. Selected canvas IDs are hints and must be checked against authenticated workspace/document revision. Typed reversible edit operations share the same validation as manual actions; destructive/external work needs owner approval and replay-safe receipts.

**MC2.1 acceptance evidence required:** a reviewed concrete host/boundary matrix with source pins for the Gateway, OS, Memory, Skills, Data, Token and Connections relevant methods; verified request/response samples for supported Gateway endpoints; explicit unsupported-route list; a negative security-test design for cross-workspace events and Stop controls; and a resolved credential owner for AUTH-2. Stage 1 browser tests do not qualify this gate. Preserve MC0/MC1 and the 15-point accepted baseline.
