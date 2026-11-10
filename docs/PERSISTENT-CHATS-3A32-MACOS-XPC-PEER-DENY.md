# Persistent Chats 3A.32: macOS XPC peer code-signing rejection, not consent

**Scope: offline/CI-only deny-by-default proof.** No signed installed Dashboard
application or XPC helper was created. No operator authenticated. No Codex
conversation or original event was read or persisted. All history import,
recording, archive writing and Memory retrieval remain **disabled**.

## Objective

Previous 3A.30/3A.31 milestones retained a review state and a genuinely
parent-owned silent child inside a synthetic Swift test process, without an
authenticated boundary to the actual Node Dashboard launcher. Phase 3A.32
tests the **OS-enforced peer-code-signing rejection mechanism** that a
future native XPC bridge can use. A browser cookie, random session UUID,
claimed PID, app-server stdout line or JSON body is not evidence of peer
identity or human consent.

Apple documents
[`NSXPCConnection.setCodeSigningRequirement`](https://developer.apple.com/documentation/foundation/nsxpcconnection/setcodesigningrequirement(_:))
for enforcing a signing requirement on the other executable; similarly,
[`NSXPCListener.setConnectionCodeSigningRequirement`](https://developer.apple.com/documentation/foundation/nsxpclistener/setconnectioncodesigningrequirement(_:))
can enforce it on incoming connections.

## Implementation and negative acceptance

- `scripts/mc2/native-macos-xpc-peer-deny.swift` exists only under the
  `AIVERSE_CI_AUTH_FIXTURE` compile flag, enforced alongside
  `CI=true` and `AIVERSE_MACOS_XPC_DENY_FIXTURE=1`.
- The unconfigured native listener refuses incoming connections. The fixture
  permits a **deny-only test listener** to set an intentionally unmatched
  Apple code-signing identity requirement before accepting any messages.
  It does **not** accept a caller-supplied requirement, signer, PID, token,
  workspace or review result.
- The exported `AIVerseDeniedXPCSink` always replies `false` even if it
  were reached. `recordingAuthorized`, `hostOriginAttested` and
  `eventAdmissionEnabled` are **always false**.
- `scripts/mc2/native-macos-xpc-peer-deny-tests.swift` exercises an
  anonymous XPC listener in a disposable macOS CI process. It checks
  rejection without configuration, installation of the deliberately
  unmatched signing requirement, no message delivery into the protected
  sink, no approved reply from a forged claimed consent value, and no
  admission in either case.
- This is **not** an independently signed two-process native-host test and
  does not claim positive signer acceptance. The diagnostic probe has no
  real transcripts, credentials, model turns, archive or Memory API.

## CI evidence, exact tested source head

**5/5 GitHub workflows passed** on Dashboard code commit
`1a878ca55f90b492a9ce9646cf41a75443854133`:

1. [Apple Swift LocalAuthentication, parent-owned silent child and XPC rejection](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42873169711): PASS, including the new XPC step
2. [Dashboard CI matrix](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42873170016): PASS
3. [Pinned Codex offline native TTY](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42873169664): PASS
4. [Personal Native Owner Browser Proof](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42873169556): PASS
5. [Personal Chat Browser QC](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42873169724): PASS

## Next security and acceptance gates

The **actual installed native host** needs a designated bundle identifier,
verified Apple Developer Team signature, an appropriately packaged native
service, peer identity verification in both directions where required, and
per-connection revocation tied to the exact host session and owned Codex child.
The code-signing requirement must be pinned to reviewed application identity
rather than supplied from environment variables or user input. The eventual
native-host path must also verify the real Mac OS authentication result
without serializing a forgeable "approved" marker over stdout or HTTP.

Separate and explicit approval to record prospective conversation text is
still required **after** authenticated human action. Event admission must
independently prove the original Codex child, active workspace, event
lifecycle, coverage exclusions and retention policy before granting any
archive write. A signed peer is necessary for secure IPC; it is never, by
itself, consent to record. Real Touch ID/password, installed launcher,
storage, Memory retrieval, interruption and crash acceptance remain for
later local Mac evaluation.

Both [Dashboard draft PR #105](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/105)
and [OS draft PR #124](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/124)
remain unmerged. This report only documents CI-verified code on the exact
source SHA above; subsequent documentation-only commits are not asserted
to have been re-tested.
