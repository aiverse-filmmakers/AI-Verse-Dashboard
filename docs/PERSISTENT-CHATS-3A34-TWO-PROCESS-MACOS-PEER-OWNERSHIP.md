# Persistent Chats 3A.34: real two-process macOS peer identity and revocation

**Status: verified in isolated macOS CI only.** This is an intermediate Darwin
IPC ownership proof, **NOT** an installed XPC service, trusted Developer ID
identity, human authentication, recording consent, event writer or Memory.

## Exact code and processes

- `scripts/mc2/native-macos-two-process-peer-proof.m`: Objective-C/macOS
  fixture whose parent owns an `NSTask` executable, unique lease generation,
  and a private 0700 temporary directory with a 0600 Unix domain socket.
  Two distinct real signed binaries run as separate child processes in
  sequence, not as a one-process simulation.
- `scripts/mc2/ci-macos-two-process-peer-ownership.sh`: compiles two
  test binaries on Apple Swift/Clang GitHub CI and seals them using
  **ad-hoc signatures** with separate CI-only identifiers.
- The host compares the kernel-provided `getpeereid` UID and
  `getsockopt(SOL_LOCAL, LOCAL_PEERPID)` PID with its own retained
  `NSTask.processIdentifier`. Neither JSON nor subprocess stdout,
  caller-supplied PID, browser cookie or terminal string contributes to
  peer identity.
- The verified kernel PID is queried through Apple's
  `SecCodeCopyGuestWithAttributes` with `kSecGuestAttributePid`, then
  checked dynamically with `SecCodeCheckValidity` against the expected
  *test identifier*.
- **Critically, the parent-owned current generation AND child PID are
  rechecked at each lease validation**. An old generation is not accepted
  after child replacement even when it provides the currently active
  new process ID. This was added in code head `9628a28` after an
  independent review identified a missing epoch-equality check.
- Revocation invalidates the held lease while the connected socket
  still exists. Child replacement terminates the old process and uses a
  separate owner generation. No event storage, authorization token or
  authenticated consent is produced.

## Negative and positive CI tests

1. A real direct child launched by the parent presents kernel-matched
   peer PID/UID and an ad-hoc signature matching the allowlisted CI
   identifier, proving the *identity-check mechanism* works.
2. A forged PID or zero generation is denied.
3. A revoked lease is denied even while the underlying socket is open.
4. A second real child with a different ad-hoc identifier is denied
   under the first child's code-signing requirement.
5. The second child can match only its own *test* signature identifier.
6. A stale generation using the new child's valid PID is denied.
7. The second child is denied immediately after its lease is revoked.
8. Non-fixture/unauthorized CLI invocation is denied.

An ad-hoc signature is an integrity seal, **not a trusted signer**:
anyone may produce the same identifier with a fresh ad-hoc signature.
Apple explicitly documents that an ad-hoc code signature has no
identity. Therefore the positive test must NEVER be interpreted as
authentication of a real production host.

## Exact-head GitHub results

All **five workflows PASS** on code head
`9628a28af88c5427915900ecdfe2d6e29e43707d`.

- [macOS native peer identity + previous Apple suites](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42880845246): PASS
- [Dashboard CI Windows/macOS/Ubuntu](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42880845540): PASS
- [Offline real pinned Codex under native launcher](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42880845290): PASS
- [Real native owner and Chromium](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42880845216): PASS
- [Personal Chat browser QC](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42880845370): PASS

Apple sources:
[Code Signing Services](https://developer.apple.com/documentation/security/code-signing-services/),
[Guest attribute keys](https://developer.apple.com/documentation/security/guest-attribute-dictionary-keys),
[SecCodeCopyGuestWithAttributes](https://developer.apple.com/documentation/security/seccodecopyguestwithattributes(_:_:_:_:)),
[NSXPCConnection](https://developer.apple.com/documentation/foundation/nsxpcconnection),
[Ad-hoc signature identity limitation](https://developer.apple.com/documentation/security/seccodesignatureflags/adhoc).

## What this does NOT establish

This CI proof uses `AF_UNIX` sockets rather than `NSXPCConnection`.
It does not demonstrate launchd-managed XPC or an actual embedded XPC
service exchanging authenticated messages. It has no Developer ID/Team
requirement or notarized installed Dashboard; no direct link to the live
Codex child, OS workspaces or actual host session; no consent verified
through LocalAuthentication; and no per-original-event provenance.

Production recording, historical import, archival storage and Memory
retrieval must remain OFF. A signed transport peer does not itself
authorize transcript capture. The next phase should test the *actual*
embedded XPC service's connection/invalidation lifecycle in a real
signed host, using a **pinned trusted developer requirement** and
locally accepted Apple authentication before any consent issuer is
introduced.

Dashboard PR #105 and OS PR #124 remain draft/unmerged. This document
is a documentation-only addition after the tested code commit.
