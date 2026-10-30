# Native OS Canvas actor grants: Tasks 43–62

Date: 28 October 2026
Status: **draft source implementation; no production owner admission**

## Why this work belongs to OS, not Dashboard

The real OS source `scripts/action-permission.mjs` evaluates policy classes,
but issues no human identity, bot grant, or approval receipt. The real
GatewayStore owns authenticated running run/session facts, not a bot
permission to write canonical Data. The Data owner already stores
actor provenance and enforces scoped SQLite optimistic mutations.
Building a second permission service or letting an HTTP bearer mint
native actor identity would be an authority escalation.

New independent draft
[OS PR #110](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/110)
provides a **read-only OS-owned grant verifier**. It does not issue grants.

## Owner-controlled native grant contract

`AI-Verse-OS/scripts/canvas-actor-grant.mjs` verifies the exact
owner-private (Unix 0600) file
`.aiverse/os/canvas-actor-grants.json` under a canonical OS v2 root.
This is a pre-existing grant record, not a Dashboard-managed file.
The module does not create it or expose grant changes to a browser.

It requires exact actor ID and kind, system ID, workspace, principal,
Canvas method allowlist, bounded ISO expiry (maximum 24-hour lease),
grant file generation and lease epoch. Bot grants also bind canonical
Gateway run and session IDs. No wildcard method, unknown fields,
duplicate matches or fake scope accepted. It rejects nonregular or
symlinked file/path components, wrong Unix owner/perms and malformed
OS roots. The verifier asks the **existing native OS action-permission
evaluator** whether the workspace is active, so paused/archived
workspaces are denied before an actor grant is returned.

All reads are fresh; removal of a grant record revokes its next
use. A generation change updates the lease epoch returned to the
canonical Gateway verifier. The file is OS owner authority at the
native host trust boundary; it is not a portable signed identity token.

## Dashboard trusted host adapter

`apps/gateway/src/canvas-os-grant.ts` exports
`createOsNativeCanvasGrantResolvers(registry,options)`.
It demands two **independent host-installed** callbacks:

1. `authenticateHuman` resolves a live native OS session principal,
   never a Dashboard cookie or `local-operator` literal
2. `authenticateBot` resolves a running, authenticated Gateway
   session/run/principal/actor, never a model-supplied session

Both the Dashboard registered root generation and the host lease are
rechecked after each asynchronous admission. OS grant source,
actor kind, ID, scope, method, principal, session and run are checked
against the native projection. The adapter returns an authenticated
Data actor only if *both* an independent session and OS-installed
grant exist. It also exposes the existing `CanvasOsPolicy`
operator/agent admission hooks, and a run grant resolver for
`createGatewayStoreCanvasRunVerifier`. The run verifier requires
a method-specific `aiverse.canvas.get` minimum, while the actual
Data effect checks its **own exact method** again.

This is exported solely from the **trusted gateway module**,
not from Canvas browser RPC. There is no network install/issue
endpoint, API to create OS grants, or bypass of OS action policy
and the canonical Data owner.

## What real CI proves

The new OS draft PR has a Node 22 cross-platform grant-verification
matrix covering exact human/bot matching, expiry, revocation,
generation, malformed entries, file permissions and symlink denial,
plus native active workspace enforcement. Dashboard has unit tests
for missing human session, missing bot session, absent grant, live
revoke, method scope, actor mismatch and root generation changes.

In the disposable MC2 composition, the exact pinned real OS source
is loaded along with the pre-existing canonical GatewayStore
and Data SQLite. The **CI-only trusted host** writes short-lived
private test grants; the OS module only reads them. The canonical
Gateway run/session remains the source of truth for running state.
The owner is wired to the new OS grant adapter for every Data
read and write. Tests verify a human operation, an agent edit,
immediate human and bot grant revocation, subsequent re-admission,
and refusal of an unauthorized bot duplicate. Existing Data
history, undo, backup, scope, cancellation and restart proofs
continue to apply. No real user files or credentials are touched.

All source CI claims require matching *exact commit* workflow
confirmation, not assumption from a previous code head.

## Not yet a production grant issuer

The local OS has no independently reviewed, owner-authenticated
grant issuance/renewal/revocation lifecycle or audit receipt
creation command. The new readonly file verifier is a **staged
contract** only. Dashboard's human-session resolver currently
has only CI fixture authentication; a real installed native
operator session must still be provided. Bot session callback
is tested with the actual GatewayStore, not a deployed model
tool host.

The current OS action evaluator requests human confirmation for
destructive actions, but there is **no owner-approved human receipt
issuer/consumption** in this batch. Agents therefore remain
unable to perform destructive delete/revert. No real Windows ACL
ownership verifier was added; Unix owner/mode security is not
an interchangeable Windows ACL. Do not enable Windows native
OS grants without separately reviewed ACL admission.

Gateway run cancellation and Data writes occur in distinct owner
processes. A strong cross-process atomic cancel/write boundary
is not claimed. Approval receipts, owner Mac installation, Data
scope provisioning/backup policy, model tool host, credential
rotation, PR review and rollout remain separate gates.
All PRs stay draft/unmerged unless the user explicitly authorizes
release.

See tracker for the 20 individual source-task entries and CI run
links. The independently accepted roadmap score stays 15/100,
next MC2.1 accepted point 17/100 (not yet approved).
