# Persistent Chats 3A.31: macOS real child ownership on the trust side

**Scope: isolated, CI-only proof. NOT a recording bridge or real authentication.**
All real capture, archive writing, history import, Memory retrieval and per-event
authorization remain disabled. Dashboard PR #105 and OS PR #124 remain draft.

## What this adds

Phase 3A.30 kept macOS LocalAuthentication review state in a Swift process,
but the host session UUID and process generation were fixture inputs. Phase 3A.31
gives one **Swift parent process** responsibility for launching a real, silent,
non-Codex subprocess and creating the host-session UUID and generation itself.
The parent owns the actual Foundation `Process` handle and tracks the physical
directory identity (canonical path, filesystem device/inode, owner and
non-group/world-writable permissions).

The new `MacOwnedChildReviewFixture` is available **only** when compiling
a separate Swift binary with `-D AIVERSE_CI_AUTH_FIXTURE` and when
`CI=true` and `AIVERSE_MACOS_CHILD_OWNER_FIXTURE=1` are present. It
rejects the interactive preview environment. It starts fixed `/bin/sleep`
with discarded stdin/stdout/stderr, in a newly-created disposable workspace
with no provider credentials or network. There is no Codex client or event
processing at this boundary.

The in-process review state accepts ONLY the binding created by this Swift
owner. Every observation and synthetic completion rechecks the current live
Process object and the physical workspace identity. Stopping, a project change,
a new child/session, child exit, unsafe permission mutation or directory
replacement irrevocably invalidates the previous review. The reviewer still
has no recording-authorizing method.

## Verification contract

The Apple runner compiles and executes `native-macos-owned-child-boundary.swift`
with `native-macos-owned-child-tests.swift` and the existing review-state file.
Tests check:

- No review without an owned child; no duplicate child start
- Path alias, traversal-like workspace ID, absent directory and world-writable
  directory all reject before spawning
- A genuine parent-owned child permits only a synthetic review observation
- A different session UUID or child generation cannot reuse that observation
- Wrong-binding observations do not consume an otherwise valid review
- Process stop, workspace switch, pending approval replay and unsafe permission
  mutation invalidate the boundary, including through repeated start/stop
- All cases, including synthetic success, leave capture and storage disabled

## Security boundary and nonclaims

This is **not yet** the production native-host authentication bridge.
The Swift test parent does **not** authenticate the installed Dashboard
launcher, Node process, or human user. The fixture-generated session UUID is
private to one test process; it is not a signed identity credential.
The CI child is deliberately `/bin/sleep`, not Codex, and macOS tests
do not perform genuine Touch ID, Apple Watch or password approvals.

Do not serialize the Swift review result to stdout, JSON, HTTP, a named pipe
or a browser cookie and accept it as a Node/Gateway recording grant. A local
process could forge such a claim. No IPC attestation, signed app/XPC peer
verification, Codex event provenance, writer or Memory admission exists.

## Future gate

The installed native Mac owner must establish a trustworthy local process
identity and authenticated user interaction in its **actual** launch path,
and either own the Codex process/event admission in the same trusted
process or use an OS-authenticated IPC channel with verified peer
identity and narrowly scoped, one-use capabilities. Recording must also
require separate affirmative consent for prospective text, bound to each
original event, reviewed independently before enabling persistence.

Reference: [Apple LAContext](https://developer.apple.com/documentation/localauthentication/lacontext),
[Apple evaluatePolicy callback semantics](https://developer.apple.com/documentation/localauthentication/lacontext/evaluatepolicy%28_%3Alocalizedreason%3Areply%3A%29),
[Apple code-signing guest services](https://developer.apple.com/documentation/security/seccodecopyguestwithattributes%28_%3A_%3A_%3A_%3A%29).

CI status and exact head must be added only after the real runner finishes.
