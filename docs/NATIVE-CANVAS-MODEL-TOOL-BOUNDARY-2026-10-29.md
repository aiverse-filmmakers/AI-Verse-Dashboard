# Trusted host Canvas model-tool context (v1 candidate)

**29 October 2026.** Draft Dashboard PR #42. Source and disposable CI only,
NOT a production API, authenticated Mac owner session, provider model tool
registration, host grant issuer, or user account integration.

## Threat model and trust boundary

The user chooses an active Canvas **in the trusted native host**. The
host must separately authenticate a real human account, bind the exact
system/workspace, and hold a real canonical Gateway bot run. A model,
browser-origin JSON object or chat message is not allowed to choose a
filesystem root, grant, actor, workspace, run/session or authorization
receipt. The installed owner must independently authorize read and edit
through the existing OS grant verifier and canonical Data scope.

`CanvasAgentToolCoordinator.open` uses two separate checks:

1. Canonical running Gateway bot read via
   `CanvasAgentActions.invoke(aiverse.canvas.get)`. This validates the
   live GatewayStore run/session, OS bot grant, active workspace and
   Data owner's database scope.
2. Owner-authorized human Canvas selection via
   `CanvasContextReader.capture`. This validates native human host
   lease, active workspace, bounded selected note/edge/group IDs and
   the same current Data document version.

No model-visible selection handle exists unless both checks match the
document, version, system and workspace. Handles are frozen in-process
objects retained in a module-private WeakMap, not strings, tokens,
HTTP headers or locally stored client permissions.

## What a model can see

`describe(handle)` returns a frozen bounded data object with
source/trust, document ID/title/version, up to 16 explicitly selected
notes/edges/groups, selected note content capped at 1000 characters,
untrusted labels and selected group member IDs. It does **not**
include unselected note text, raw SQLite records, filesystem roots,
bearer credentials, grant receipts or actor verification claims.

**Treat selected note/label text as untrusted prompt data.** It is not
system instruction, a tool schema, owner confirmation or permission.

The opaque handle stays inside the native host. Only the host may call
`execute(handle,typedProposal)` with a narrowly typed proposal:
- `selected-note.replace-text`: selected note ID and text (max 5000).
- `selected-group.rename`: selected group ID and short label.
- `selected-group.move`: selected group ID and finite dx/dy.

The actual executable typed Canvas edit goes through
`CanvasAgentActions`, which checks fresh canonical Gateway run,
workspace, actor, lease, OS grant, Data owner authorization and
optimistic document `expectedVersion` again at the effect edge.
A stale selection never automatically overwrites a new edit.
`close(handle)` invalidates future native writes. In-flight effects
still rely on the canonical owner's own cancellation and transaction
boundary; closing cannot undo a committed transaction.

No generic arbitrary Canvas mutation, deletion, revert, cross-workspace
copy or owner permission issuer is exposed to proposed model input.

## Source/test evidence

- `apps/gateway/src/canvas-agent-tool-coordinator.ts`
- `apps/gateway/src/canvas-context.ts`
- `apps/gateway/src/canvas-agent-actions.ts`
- `test/canvas-agent-tool-coordinator.test.ts` (205 registered named
  unit tests including 129 intentionally malformed/hostile variants)
- `scripts/mc2/ci-canvas-data-owner-proof.mjs` (actual pinned
  GatewayStore + native OS grant reader + scoped Data SQLite + host-selected
  note and group typed writes, forbidden JSON handles, stale revisions).
- `docs/DEVELOPMENT-TASKS-213-412-2026-10-29.md` maps exactly
  4 source implementation slices plus 196 named test cases.

A green Dashboard Node22 job includes synthetic host contract tests,
NOT a model invocation with real provider credits or native Mac approval.
A green real composition job proves correct actual **disposable**
Gateway+OS+Data integration, not private owner installation.

## Separate release blockers

Independently authenticated macOS owner session, consent UI,
durable tamper-evident owner approvals, audited grant issuer,
verified provider-model tool dispatch and accepted parameters,
actual native app invocation, reauth on model tool consent,
provider/billing approvals and on-Mac dogfood remain release
conditions. Do not claim they were installed or merged.
The original MC2.1 formal acceptance score remains 15/100.

For future work, keep this native source locked away from any
generic HTTP, browser, model JSON or tool-call endpoint until a
reviewed authenticating host dispatcher binds user selection.
Never substitute a fake `approved:true` or a screenshot for
real OS/Data authority.
