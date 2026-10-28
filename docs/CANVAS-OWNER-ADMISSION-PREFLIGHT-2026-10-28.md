# Tasks 33–42: Owner Admission & Data Lifecycle Qualification

Date: 28 October 2026. Status: **source implementation and CI only**, pending native owner admission and MC2.1 review.

## Authoritative stop-check

The reviewed OS `scripts/action-permission.mjs` (pinned
`0dc744057199970a34a60c11dff192e407ad64ed`) answers action-class
policy questions, including `modify_canonical_state` and
`delete_data`. It **does not** issue actor identities, live grants,
human approval receipts or bot leases. The real canonical Gateway
`GatewayStore` owns authenticated run and session state, not a
Canvas bot identity. The real Data root/scope owner owns
`openScopedDataDatabase`, binding, SQLite migration, backups and
record versions. **Do not treat a local Dashboard cookie, token, or
successful policy result as an agent/operator authorization grant.**

## Implemented boundary

- Data exposes `inspectScopedDataDatabase(driver,scope)` using a
  genuinely trusted scope and readonly native `inspectMigration`.
  Missing/unbound/foreign/quarantined scopes and symlinks fail closed.
  No Data file, directory, schema or migration is created.
- Dashboard exports `createCanvasOwnerPreflight(registry,systemId,native)`
  for **trusted host code only**. It pins canonical registered root
  generation; validates active OS workspace manifest before asking
  Data, maps only safe status reasons, and verifies the underlying
  Data scope's binding and migration state. It does not expose paths,
  a browser RPC route, admin bearer, provision call or credential.
- The existing Dashboard Canvas host route and verified agent
  dispatcher now reject **paused workspaces** immediately instead
  of treating a merely present manifest as active. Tests confirm
  no owner read/write effect while paused and reactivation only
  after the real manifest returns to active state.
- Disposable CI uses Data's **existing** `create-or-open` interface
  on two host-approved test scopes, never an unadmitted Dashboard RPC.
  The preflight checks `database-missing` beforehand and
  `ready` after initialization. It also checks paused workspace
  denial. Live browser requests still use Data `open-existing` only.
- Disposable CI exercises the **existing** Data
  `DataStorageDatabase.backupTo()` method on an actual Canonical
  Canvas SQLite database, inspects the backup's original scope
  binding using Data's own readonly migration inspector, and
  reopens the backup to check the document, version, board and
  full archived revision history. This is a smoke test, **not**
  production backups, retention or disaster recovery policy.

## Do not cross this boundary

No production Data scope is initialized by this work. There is no
operator or bot grant source connected on the owner's machine, no
authorization service minted here, no new agent tool transport, no
human approval receipts and no canonical record copy in Dashboard.
The Dashboard owner must be installed explicitly by the real OS
or another independently authorized host. The preflight is
diagnostic-only; it cannot make a missing grant or Data scope
available. Runtime cancellation and DB-write atomicity across
separate Gateway/Data processes still require native owner review.

A production owner-run sequence would require, **separately and with
explicit owner authorization**, to (1) validate the OS root and
workspace, (2) provision/backup a Data scope using the existing Data
owner and migration/recovery plan, (3) inspect the exact binding and
migration status, (4) install native human/bot actor-grant
resolvers and live Gateway verifier, (5) attach the admitted
Canvas owner, then (6) run Mac integration/dogfood tests.
This is a release requirement, not an automated installer.

See `docs/MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md`
for exact tested commit SHAs and GitHub Actions evidence. Both
Dashboard PR #42 and Data PR #22 remain draft and unmerged.
Formal accepted roadmap score remains 15/100; next independent
MC2.1 acceptance is 17/100 if approved.
