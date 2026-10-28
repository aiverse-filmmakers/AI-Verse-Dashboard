# Native Canvas selection context: source qualification and host contract

**28 October 2026. Dashboard draft PR #42; not a production model tool.**

## Purpose

The user's Personal-first requirement is that an agent can understand which
Canvas/document/nodes are currently selected, and edit the intended item
without gaining unrelated workspace access. Dashboard must not store a second
canonical Canvas document or trust a model/browser-supplied actor, scope,
root, approval or grant.

`apps/gateway/src/canvas-context.ts` implements a **host-only**
`CanvasContextReader` for already-authenticated native
`CanvasHostFacts`. It invokes `ApprovedCanvasOwner.authorize` and
`execute` for `aiverse.canvas.get` through the *existing* Data owner,
with OS workspace activity and registered-root generation rechecks
before and after asynchronous boundaries.

The bounded context snapshot includes canonical system/workspace,
document ID/title, current document revision, selected notes/edges
(up to 16 each) and non-content aggregate board counts. Only
explicitly selected note texts are exposed; each is capped at 1000
characters, marked `untrusted-canvas-text`, and tagged for truncation.
Unselected text, other workspaces' documents, raw owner records,
filesystem roots, credentials, grant contents and OS policy decisions
are **never included**. Stale expected-version and removed selection
IDs fail closed. Revoked grants or canceled requests deny.

## Selected action path

`CanvasContextReader.capture` issues a frozen in-process snapshot,
tracked by a module-private `WeakSet`. The snapshot is intentionally
**not portable across processes, browser JSON, a model prompt or a
restart**. A model cannot serialize an object and gain the host-issued
marker; it must request a fresh read through the trusted host.

`CanvasAgentActions.invokeSelectedNoteEdit` accepts a real minted
snapshot, the exact selected note, a typed operation ID and proposed
text. It verifies the **live canonical Gateway run** matches the
snapshot's system and workspace, then delegates to the already
existing `invoke` action path, which revalidates canonical
run/session, OS grant, Data owner permission, idempotency and
`expectedVersion` at effect edge. It never sends arbitrary
model-provided filesystem paths or actor identities to Data.

This code enables a narrow **owner-backed app context primitive**,
not generalized automatic agent UI control. It is NOT connected
to a production model tool dispatcher, image generation engine,
or desktop shell yet. Real operator and bot grant issuance/approval
remain separate OS/host ownership gates.

## Regression and real-component evidence

- `test/canvas-context.test.ts`: 30 native context scenarios and
  8 selected-note action scenarios. Includes forged selection keys,
  wrong system/root/workspace, duplicate/missing selections,
  stale revisions, bounded text, hidden unselected contents,
  revocation, workspace pause, cancellation, root rebind,
  immutable snapshots, JSON forgery and selected-note restrictions.
- `scripts/mc2/ci-canvas-data-owner-proof.mjs`: actual
  pinned OS grant verifier, actual canonical GatewayStore,
  actual Data scoped SQLite owner, selected text context,
  immediate grant revoke, and selected-note action through
  a running canonical Gateway run. A stale minted revision
  cannot silently overwrite a later Data version.
- `.github/workflows/mc2-real-gateway.yml` now reruns when
  context or action code changes.
- Do not claim new exact-head proof until its GitHub Actions
  workflows are **completed successfully**. Linux/Windows and
  macOS job outcomes must be distinguished.

## Explicit next production work

A real first-party model/runtime host must be given this trusted
context through a bounded, consent-aware tool contract. Browser UI
selection and chat scope must be mapped through the approved OS
owner **without letting the model assert the selected document**.
Then wire the resulting authorized action receipt/progress back to
the same Canvas with stale/conflict UX. This requires native
human-session authentication, OS owner grant issuance, Gateway
model-tool dispatch and owner Data scope provisioning. The
current code must not be represented as those integrations.
