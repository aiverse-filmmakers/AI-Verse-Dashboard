# Canvas trusted host / canonical Data integration

**Status:** GitHub-first bounded source slice, 28 October 2026. Draft Dashboard [PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), owner Data [PR #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22). Not merged, installed, owner-accepted or enabled in production.

## One owner, one authenticated transport

The Canvas document schema, notes/links, canonical SQLite versioning, Data idempotency and provenance remain in `@ai-verse/data/canvas`. Dashboard does **not** maintain document state, an index or a second record store.

The trusted Dashboard localhost host accepts only six `aiverse.canvas.*` operations:
- read: `list`, `get`
- write: `create`, `rename`, `edit` (typed note/edge operations), `delete`.

`CanvasOwnerBridge` requires a **host-injected** `ApprovedCanvasOwner` for an exact registered Dashboard system ID. It never accepts an owner adapter, raw filesystem root, actor, access decision, token, secret or principal from the RPC request. The authenticated caller must still pass the existing loopback HTTP/cookie boundary, and a paired browser can act only in the selected system/operator workspace. The bridge independently validates the strict document/action schema, OS root generation lease, workspace manifest identity, and a host/OS permission callback **for each request**, then projects only bounded public Canvas fields back to the browser.

There is **no default owner**: a correctly authenticated request without an injected owner returns `CANVAS_OWNER_UNAVAILABLE`. A write denied by the trusted permission evaluator returns `CANVAS_ACCESS_DENIED`. An approved owner must invoke `facts.assertLease()` again immediately before each canonical effect and use the Data owner with verified actor and scope.

## Evidence and integration

`test/canvas-owner-bridge.test.ts` verifies localhost access denial, trusted cookie pairing, cross-system/cross-workspace denial, explicit read/write permission checks, malformed edits and raw path/principal/authority injection rejection, and sanitization of privileged owner result fields.

`scripts/mc2/ci-canvas-data-owner-proof.mjs` checks out the exact reviewed Data Canvas revision `68f642cee430dc22381033f1338398b635993972` and composes a **real Data SQLite owner** through `CanvasOwnerBridge` and an actual Dashboard localhost RPC server. Disposable CI-only trusted owner authorization is intentionally configured in the test; the real product must use OS authorization/approval before installation. The proof creates and edits a Personal document, confirms canonical Data idempotency and optimistic version conflict, denies a delete through the authority callback, proves workspace isolation, restarts the Dashboard host and reopens the same durable Data document.

The real Data source's pinned CI has previously passed six Linux/macOS/Windows Node matrix jobs. A complete current Dashboard source run must also pass before the host slice is counted as CI-verified; see the tracker for run IDs.

## Explicit remaining gates

1. **Production OS action authorization:** attach an admitted installed Data owner through approved owner lifecycle/configuration, authorized actor/scopes and data init; preserve workspace boundaries, approvals and revocation. A temporary CI adapter is not enough for this.
2. **User-facing Canvas:** add an Apple-like library (create/open/rename/duplicate/delete), canvas note drag/edit and links using the new typed client operations. No browser-only data authority.
3. **Agent action parity:** route AI operations through the exact same admitted typed owner path, with document ID, expected version, idempotency, undo/cancellation/conflict presentation and explicit approvals when required.
4. **Private/macOS owner acceptance:** install/package credentials, real provider integration, graceful restart and final dogfood remain separate.

The score remains the historical **15/100 accepted**, because the living plan's MC2.1 review/amendment and subsequent source acceptance gates are still draft. Next formal acceptance increment is MC2.1's **2 points**, making 17/100, not a forced +1 for each small code slice.

## Task 12: native owner attachment, separate from production admission

Dashboard now exports `createAdmittedCanvasDataOwner()` from
`apps/gateway/src/canvas-data-owner.ts`. It binds the **existing** native Data
`CanvasDocuments`, `TrustedDataRoot`, scope constructors,
`openScopedDataDatabase` and `SqliteStorageDriver` to `CanvasOwnerBridge`.
Only the trusted host provides those installed modules, the OS permission
evaluator and an independent `admittedActor(facts, request)` grant resolver.
A browser cannot supply any of them. The adapter pins the approved OS root
and registry generation, rechecks root/actor grants, and relies on the existing
`withCanvasOsPolicy` to recheck OS policy before the Data effect.

The adapter opens only an **existing** canonical Data SQLite database
(`mode: "open-existing"`). OS/Data initialization and scope provisioning
belong to a separate, owner-admitted installation lifecycle and never happen
implicitly from a Canvas RPC. Data still owns versions, idempotency, provenance
and soft deletion. Every opened database is closed in a finally block.

The disposable CI proof now uses this same native attachment factory rather
than duplicating an owner dispatcher inside the test. Real pinned OS and Data
modules are used. The test provisions throwaway databases **before** opening
Dashboard RPC, and checks scope isolation, restart durability, actor revocation
and refusal of unprovisioned workspace databases. Passing this proof establishes
source integration, not a production Mac installation.

**Deliberate product boundary:** `start-connected` does not auto-install an
unverified native Data owner or mint a human actor. An authenticated browser
cookie is not authorization. A real installed OS actor/grant authority and
Data owner provisioning still need independent production admission before the
private launcher can enable Canonical Canvas. The library UI can be built
against typed RPC with honest unavailable and permission-denied states.

## Task 13: real first-party Canvas library and editor

The authenticated Personal Chat app mounts a separate `CanvasWorkspace`
beside its existing resizable chat panes. Source:
`apps/web/src/canvas-workspace.ts` with first-party styling in
`apps/web/src/personal-chat.css`. The Canvas view is open by default,
including an empty unsaved Scratch area. It never claims Scratch is persisted
until the human adds the first note, which creates a real Data-owned document.

The actual existing typed `DashboardClient.canvas*` operations power:
library refresh/list/open; named document creation, rename, versioned soft-delete
request, duplicate by successive canonical create/note/edge edits, note
add/text/remove, pointer-driven coordinate move, and note links/unlinks.
All saved document snapshots must carry `source:"canonical-data"` and
the currently selected OS workspace, and are checked before rendering.
Workspace retarget drops stale state and invalidates in-flight read results.
No localStorage, sessionStorage, second persistence layer or model-generated
Canvas content is treated as canonical truth.

**Important limitations:** duplication currently uses multiple sequential
owner-authorized mutations. It is not atomic, so an interrupted copy can
remain partial; the app explicitly reports this instead of misrepresenting
success. Canonical version conflicts are surfaced rather than blindly
overwritten. Delete requires a second user click and the existing OS
authorization still rejects destructive actions that require a formal
human approval receipt. Undo and agent action parity need distinct future
Data/OS contracts. Workspace changes through a cookie-bound localhost
session still require the trusted host to authorize and rebind scope.

The browser test in `test/live-personal-chat-ui.browser.mjs` exercises
real DOM controls over a deliberately synthetic Dashboard-shaped server:
Scratch save and reopen across page reload, named Canvas CRUD behavior,
note edits and repositioning, edge creation, canonical duplicate copy,
OS delete denial and workspace isolation. This browser fixture does NOT
replace the separately verified real pinned Data SQLite + OS integration
in `scripts/mc2/ci-canvas-data-owner-proof.mjs`.

**Release gate unchanged:** The browser UI is real and connected to the
existing local RPC client, but the normal production launcher still has
NO trusted installed Canvas owner. Private Mac authorization and actual
owner admission have not happened. PR #42 remains draft, and formal accepted
progress stays 15/100 until roadmap review. Inspect current-head GitHub CI.

## Task 14: host-only verified agent action parity (28 October 2026)

**Scope:** narrow trusted-host source contract, not a live model integration or
production admission. New `CanvasAgentActions` lives in
`apps/gateway/src/canvas-agent-actions.ts` and is exported only by the
native Gateway package. There is **no** `/rpc` agent-route, public Canvas
approval endpoint, model-controlled principal, or browser-level action
impersonation. The real Personal user continues using the existing
`CanvasOwnerBridge` and the six typed Canvas RPC operations.

For an agent-proposed action, the trusted native host first obtains a **fresh
canonical Gateway run authority** from an independently installed
`verifyRun(runId)` callback. The callback must return source
`canonical-gateway`, a running state, actual Dashboard system and workspace,
the owner-admitted agent actor ID, and a revocable lease epoch. The dispatcher
rejects revoked, stopped, forged, retargeted or mismatched scope, and
revalidates the run binding before authorization and effect. It derives
workspace and actor entirely from verified run facts, not model fields.
An operation ID supplied by the host becomes the canonical Data idempotency
key. Strict action schemas come from the same Canvas owner bridge that
validates manual operations. Every saved Data projection is bounded and
redacted by that same source code.

`withCanvasOsPolicy` now requires **separate** `agentAdmitted` and
`operatorAdmitted` callbacks. A permissive operator grant never authorizes
agents by default. The existing native Data owner accepts a bot actor only
for a verified agent principal with a matching actor ID. Data continues to
own record provenance, optimistic versions and idempotent writes. The
host-only agent API permits list/get/create/rename/note/connection edits,
but **never delete** until OS approval receipts have an independently
reviewed, true end-to-end capability. It also cannot change permissions,
create arbitrary files, access provider credentials, or invoke arbitrary
tools through this Canvas action vocabulary.

**Test levels:** a focused agent boundary unit test verifies provenance,
grant separation, revocation, scope changes, malformed model parameters and
destructive-action denial. The pinned disposable OS+Data composition proof
also submits a typed agent note edit into actual Data SQLite and reads
the canonical record's `updatedBy.kind=bot` provenance. This uses a
**disposable trusted run-verifier fixture**, not a real live provider or a
member's Gateway agent run. Check exact current-head CI status before
claiming green.

**Still required for complete agent experience:** actual private Gateway
run-to-agent identity verifier and actor-grant source installed and approved;
a model/tool orchestration binding that invokes this native host action;
approval receipts for destructive actions; agent UI receipts/recovery and
conflict/cancellation handling; private Mac owner acceptance. The standalone
`start-connected` launcher still installs no Canvas Data authority by
default, as required. Never mark AI-driven Canvas as production usable from
this source-only contract, and do not award roadmap acceptance points.
