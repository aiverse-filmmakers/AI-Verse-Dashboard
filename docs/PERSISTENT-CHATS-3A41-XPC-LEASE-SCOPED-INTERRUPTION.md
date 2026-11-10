# Phase 3A.41: stale XPC interrupt cannot revoke a newer host session

**Exact tested Dashboard source head:** `a0746a544302311b0ad94c166825e6b760a465a3`.

## Fix

Earlier 3A.36 XPC interruption/invalidation callbacks used a
shared unscoped `[fence revoke]`. A **delayed callback from an old
connection could therefore revoke a newer session's lease** after
host restart or workspace switch.

`AIVerseXPCLeaseFence` now provides
`revokeIfCurrent:generation:workspace:session:processPID:`, which
compares all four exact owner-held values under its existing
`NSLock`. Only the matching active generation is invalidated.
A callback from another session, an old generation, wrong workspace
or different PID cannot consume a new lease.

The actual 3A.36 `NSXPCConnection` interruption and invalidation
handlers now capture **their own** generation/session/scope/PID at
installation and call `revokeIfCurrent`, instead of revoking the
shared fence unconditionally.

## Acceptance tests

- Wrong PID, workspace, session and stale generation are denied
  without altering the still-active lease.
- An earlier connection's late invalidation cannot revoke a
  freshly created replacement session even if both are owned by
  the same test process.
- The old connection's own interruption still cancels its lease.
- Existing 256-cycle replay/revoke regressions and the real
  service-exit tests remain green.
- All `recordingAuthorized`, `archiveAuthorized` and
  `memoryAuthorized` flags remain permanently false.

**Evidence:** [Apple macOS real XPC and lease CI](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42890730321),
PASS on the exact source head above.

This is a **real bug fix within the synthetic native-host CI boundary**.
The fixture's session/PID must not be represented as an authenticated
installed Dashboard or actual Codex event identity. No user
authentication or recording consent has been issued.
