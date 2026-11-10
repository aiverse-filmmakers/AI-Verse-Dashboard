# Phase 3A.35: actual launchd-managed macOS XPC service, denial-only

**Exact tested code commit:** `790d38473c3729c884ad38a73d5b378738d26bad`.

## Implemented

- `scripts/mc2/native-macos-actual-xpc-protocol.h` declares a tiny, CI-only `NSXPCInterface` with **no authorization or recording API**.
- `native-macos-actual-xpc-service.m` uses `NSXPCListener.serviceListener` and an `NSXPCListenerDelegate`, running as an **actual separate launchd-managed XPC service process**.
- `native-macos-actual-xpc-owner.m` opens `NSXPCConnection(serviceName:)` to the embedded helper, applies a hardcoded test-only code-signing requirement before resuming, and makes a synthetic request. The service responds `CAPTURE_DISABLED` plus its own PID. The test checks that PID is distinct from the owner process.
- `ci-macos-actual-xpc-lifecycle.sh` builds a disposable `.app` containing the `.xpc` under `Contents/XPCServices`, signs the nested service first, then the enclosing app, with **ad-hoc** signatures.
- The test also checks unauthorized CLI input is denied. All execution is on the macOS GitHub runner, with no provider credentials or real conversations.

This is materially beyond the previous AF_UNIX socket: the two processes communicate using Apple's real `NSXPCConnection` and launchd-managed service discovery.

## Exact CI evidence

[Mac Apple runner #42883842524](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842524) **PASS**, including the actual XPC connection test. This same head also passed [Dashboard matrix](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883843074), [real Codex offline](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842493), and [native owner + Chromium](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842756). [Personal browser QC](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42883842647) must be checked separately before a 5/5 final-head claim.

## What it does not prove

This is **not** a production Dashboard process. Its code signatures are ad-hoc, and an ad-hoc signing identifier does not establish a trustworthy developer identity. The helper does not authenticate a real operator, and the test neither uses Apple Touch ID/password nor binds approval to the current actual Codex child or any original event. There is **no consent issuer, recording, historical import, writer, archive or Memory discovery**. The test-only XPC service does not grant permissions on successful communication.

Next steps: a trusted Developer Team/code-signing requirement in an installed native service, authenticated host/session/physical workspace and process lifecycle, explicit future-text recording consent and per-original-event admission.

Apple references:
[NSXPCConnection init(serviceName:)](https://developer.apple.com/documentation/foundation/nsxpcconnection/init%28servicename%3A%29),
[Creating XPC Services](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html).

All PRs remain draft and unmerged.