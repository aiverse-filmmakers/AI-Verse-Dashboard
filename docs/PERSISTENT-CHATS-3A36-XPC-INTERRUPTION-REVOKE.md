# Phase 3A.36: XPC interruption, stale callbacks and host-side revocation

**Exact tested code commit:** `790d38473c3729c884ad38a73d5b378738d26bad`.

## Implemented

- `native-macos-xpc-lease-fence.{h,m}` adds a **CI-only** locked host-local monotonic epoch state for a synthetic workspace, session UUID and process PID. New starts, invalid input and explicit revoke cannot restore an earlier generation. Reads recheck scope/session/PID, bounded system uptime (rather than wall clock), and epoch identity.
- `native-macos-xpc-lease-fence-tests.m` runs an independent negative suite: uninitialized denial, unsafe scope, absent process, wrong workspace/session/PID, same-PID new epoch, delayed/stale callback, and **256 repeated start/revoke cycles**. `recordingAuthorized`, `archiveAuthorized` and `memoryAuthorized` always return false.
- The real `NSXPCConnection` client now supports a fixture-only `--ci-revocation` test:
  1. Submit a delayed synthetic denial.
  2. Revoke the old epoch and invalidate its connection before reply.
  3. Reject the old reply regardless of whether the transport still delivers it.
  4. Open a new XPC connection with a fresh lease. Only a denial response can be observed.
  5. Command the service to exit without returning; verify the real interruption handler revokes the lease. Never let a restarted service inherit the previous epoch.

The service sends only a short constant status and PID in this fixture, with no Codex frames, user content or archive writes.

## Verified result

[Apple runner #42883842524](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842524) **PASS**, including BOTH the real XPC interruption regression and isolated epoch tests. Additional same-head results: [Dashboard CI](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883843074), [real pinned Codex offline](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842493), [native owner Chromium](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842756). The [Personal Chat browser run](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842647) is independently checked before a final 5/5 claim.

## Limitations

The lease fixture uses a synthetic host-owned scope/session and the test owner's PID. It **does not claim to identify the actual Codex child or provide original-event provenance**. It is an XPC lifecycle and stale-response proof, not recording consent or production authority. Apple may auto-restart interrupted XPC services; an interruption callback must revoke any previous lease, never silently promote a replacement. The test explicitly exercises that denial. A trusted developer signature, installed native service identity, human-authenticated operator approval, separately explicit future-only recording consent, per-event validation, storage and Memory remain blocked.

Apple references: [NSXPCConnection interruption handler](https://developer.apple.com/documentation/foundation/nsxpcconnection/interruptionhandler) and [invalidation handler](https://developer.apple.com/documentation/foundation/nsxpcconnection/invalidationhandler).

Both PRs remain draft and unmerged.