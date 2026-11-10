# Phase 3A.38: native-lease-bound device-owner review preview, CI denial only

**Scope:** a separately compiled host-side LocalAuthentication preview in the
disposable, ad-hoc-signed 3A.35 XPC test app. Not a production consent
issuer or recorder.

`native-macos-device-owner-host-review.{h,m}` combines the existing
synthetic in-process `AIVerseXPCLeaseFence` with Apple's `LAContext`.
The request is evaluated only if the host proves the exact current
workspace, local session, parent PID, active lease generation, interactive
TTY and valid Apple-issued release signing requirement. The latter is a
compile-time **unmatched placeholder** on CI. It cannot be supplied by
a browser, environment variable or app-server stdout.

The review is unavailable in headless CI. No Touch ID, Apple Watch or
password prompt is performed there. The app's `--ci-device-owner-deny`
diagnostic first proves the real XPC channel still returns only
`CAPTURE_DISABLED`, then tests rejected unattended, wrong-workspace,
wrong-session and revoked lease reviews. A stale asynchronous
`LAContext` callback cannot clear a newer challenge; revocation
invalidates the context. A future successful OS device review would
only report a short-lived local review observation, not a recording
consent capability.

The `recordingConsentIssued` and `archiveWriteAdmitted` accessors
always return false. No API accepts external "consented" fields.
There is no production LAContext success, no signed installed host,
no authenticated Codex child, no writer and no Memory integration.

**Apple references:** [deviceOwnerAuthentication](https://developer.apple.com/documentation/localauthentication/lapolicy/deviceownerauthentication)
and [LAContext](https://developer.apple.com/documentation/localauthentication/lacontext).

**CI result:** [Apple macOS runner #42886984563](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42886984563)
PASS on exact tested source commit
`50846f4c827a87681529b1800a6cc13b8b25a460`.
Documentation-only commits after that do not share the same run.

Next: real device-owner approval in a signed installed host and a separate
explicit prospective-text recording request, independently checked against
the actual Codex event lifecycle. Capture, history import, archival storage
and Memory remain blocked.
