# Persistent Chats 3A.30: macOS in-process device-owner review, never a capture grant

**Status: draft, test-only identity-state prototype.** Recording of user conversations, historical import, archive writing, and Memory discovery remain **OFF**. The code is not wired to the installed Dashboard, the production Gateway, or an OS consent issuer.

## Why this phase matters

3A.29 compiled a standalone Apple LocalAuthentication prototype. A command-line program's text response can be imitated by a different local process and **cannot** be treated as a trusted authorization token by the Node Dashboard. The next layer must keep review state inside the same trusted native process and make its validity contingent on the current original host session, exact physical workspace and directly owned Codex process. Device-owner authentication and permission to record are distinct issues.

## Actual changes

- `scripts/mc2/native-macos-owner-review-state.swift` contains a **same-process**, `@MainActor` state machine with a private pending challenge, monotonic `ContinuousClock` expiration, unique local review generation, and irreversible revocation. It records only a synthetic `NativeReviewBinding` with workspace ID, host-session UUID and child-start generation. These identities are **fixture values**, not yet verified host facts.
- Wrong-binding observation cannot clear a legitimate review or reopen the generation. A successful review remains **one-use per generation**, even after expiry. Revocation clears any review and calls `LAContext.invalidate()` on pending authentication.
- A fresh `LAContext` is created for a manual device-owner check. Touch ID reuse is disabled, the prompt identifies future-only Codex text and the active workspace, and an async callback is accepted only if the exact original challenge and generation are still current. A host session change, process change or cancellation while the prompt is pending makes the old result invalid.
- The 3A.29 manual helper now calls the in-process state machine. It still has only a forgeable informational console marker and **never** authorizes capture. It remains standalone and disconnected from production services.
- `scripts/mc2/native-macos-owner-review-tests.swift` runs only when compiled with `-D AIVERSE_CI_AUTH_FIXTURE`. It simulates approvals **without** invoking biometric/password authentication, exercising duplicate requests, same-ticket replay, wrong session, same workspace/new subprocess, workspace switching, logout during pending review, cancellation, expiry, and 128 repeated revoke cycles. It also checks the actual Apple path refuses unattended test execution. All these operations must leave `authorizeConversationCapture() == false`, `captureAuthorized == false`, `hostOriginAttested == false`, `recordingConsentIssued == false`, `archiveWriteAdmitted == false`, and `historyImportAdmitted == false`.
- `.github/workflows/persistent-chats-macos-auth-preview.yml` compiles both real Swift sources against Apple's SDK and builds the synthetic test suite as a **separate binary**. This test cannot create a production consent issuer, and an authenticated local Mac action has not been performed.

## Upstream design references

- [Apple LAContext and its asynchronous policy evaluations](https://developer.apple.com/documentation/localauthentication/lacontext).
- [`LAContext.invalidate()` cancels pending evaluations](https://developer.apple.com/documentation/localauthentication/lacontext/invalidate%28%29).
- [Touch ID reuse duration defaults to 0 and can be set explicitly to 0](https://developer.apple.com/documentation/localauthentication/lacontext/touchidauthenticationallowablereuseduration).
- [Apple `LAPolicy.deviceOwnerAuthentication`](https://developer.apple.com/documentation/localauthentication/lapolicy/deviceownerauthentication), which supports Touch ID, Apple Watch or Mac password.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): authenticate the actor separately from authorization of each resource access.

## Verified evidence and limitations

The initial [real macOS Swift CI run #](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42835243207) **caught a valid replay-state bug**: observing a different binding was inadvertently clearing a valid review and reopening its generation. The implementation was corrected by introducing an irrevocably consumed generation and making wrong-binding queries side-effect free. Do not represent the initial failing run as successful.

The corrected implementation and tests are on branch `feature/persistent-chats-prospective-host-intent-only`; runner-backed checks must pass on the final commit before closing the phase.

**Still missing:**
1. A trusted, signed native app or service with an authenticated host-identity path. The standalone Swift preview and all supplied binding IDs are not trustworthy issuers for Node or Gateway. There is no IPC/XPC authorization bridge yet.
2. Verified manual Mac user authentication in the actual installed application (CI cannot perform Touch ID or password).
3. Authorization tied to the host-owned actual Codex child and **each original event**, with a complete coverage/privacy contract.
4. A separate approved writer, retention, deletion/recovery and Memory retrieval policy.

All existing production hard-denies remain. Dashboard PR #105, OS PR #124 and Memory PR #37 remain draft and unmerged.
