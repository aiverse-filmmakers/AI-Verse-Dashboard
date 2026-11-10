# Persistent Chats 3A.33: CI-only signed native app and nested XPC packaging

**Status: CI-verified integrity/packaging proof, NOT a production identity bridge.**
Exact tested Dashboard code head: `6b6e85f8f39d389a84d05d80398c228f8350c6d1`.
No human approval, transcripts, provider secrets, recording, history import,
storage, archive admission or Memory retrieval was enabled.

## What is new

The `scripts/mc2/ci-macos-packaged-xpc-signing-deny.sh` fixture
assembles two distinct Swift Mach-O binaries into a disposable macOS bundle:

- Outer app: `AIVerseCIOnlyOwner.app` with bundle identifier
  `com.aiverse.ci-only.persistentchat.owner`
- Nested service: `Contents/XPCServices/com.aiverse.ci-only.persistentchat.denied.xpc`
  with bundle identifier `com.aiverse.ci-only.persistentchat.denied`,
  package type `XPC!` and an `XPCService` property-list dictionary.

The nested helper is signed **first** and then the enclosing app. The test
uses **ad-hoc signatures only** (`codesign --sign -`) and verifies both
components with strict and deep macOS code-signature checks. This validates
packaging and resource-envelope integrity, not a trusted developer identity:
anyone with access to the bundle can re-sign an ad-hoc package. This is not
an installed application, notarized release, or signed Developer ID app.

Both packaged executable entrypoints only expose `--ci-deny` when run in a
headless GitHub runner with the narrow fixture opt-in. Other invocation paths
exit with denial. Neither starts a real XPC listener nor sends a request to
the Codex App Server. Code from Phase 3A.32 already separately checked that
an unknown peer cannot satisfy the test XPC signing requirement.

## Negative tests

The Apple runner checks all of the following:

1. App and XPC service Info.plists parse and have exact expected bundle
   identifiers and `APPL` / `XPC!` package types.
2. Both sign individually using ad-hoc code signatures, with the inner
   service signed before the outer bundle; strict and deep verification passes.
3. Both separately signed executable entrypoints deny any non-fixture
   invocation and all recording actions.
4. Mutating the outer app's signed bundle ID in a *valid* property list
   invalidates the signature.
5. Mutating the nested XPC service's signed bundle ID in a *valid* property
   list invalidates deep verification of the enclosing bundle.
6. Deleting the entire signed nested service invalidates the outer app seal.

There is no successful proof of XPC communication, LocalAuthentication,
signed host-identity acceptance, peer revocation against a real Codex event,
or cross-process consent. The synthetic signing checks do not fulfill those
future requirements.

## GitHub CI evidence

All **5/5 GitHub workflows passed** on exact code SHA
`6b6e85f8f39d389a84d05d80398c228f8350c6d1`:

- [Apple Swift and nested signed XPC package, including deletion/tamper cases](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42878056494): PASS
- [Dashboard CI on Windows, macOS and Ubuntu](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42878056523): PASS
- [Real pinned Codex offline native host](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42878056627): PASS
- [Native owner + Chromium](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42878056635): PASS
- [Personal Chat browser QC](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42878056469): PASS

Apple guidance:
[Creating XPC Services](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)
and [Code Signing In Depth, TN2206](https://developer.apple.com/library/archive/technotes/tn2206/).

## Remaining gate and next phase

A real release needs a consistently provisioned and independently verified
Developer ID/Apple Team code signature, hardened executable identity,
properly installed launchd-managed XPC service, and an active two-process
connection with explicit peer validation and interruption/invalidation tests.
A production host must bind that connection to its own authenticated native
action, the selected OS workspace, and an actual parent-owned Codex child
generation without trust in caller-supplied identity/child stdout.

Only after these checks can separate, explicit prospective recording consent
and **per-original-event** authorization be designed and tested. No storage,
recording, archives, Memory discovery or history import may be enabled
merely because a binary or XPC endpoint is correctly signed.

Dashboard PR #105 and OS PR #124 remain draft, open and unmerged.
This report is a later documentation-only commit; five green workflows
apply to the exact earlier **code** SHA above.
