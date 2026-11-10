# Persistent Chats 3A.29: macOS LocalAuthentication owner step-up preview

**Draft and disabled.** This is a macOS API integration and **negative security proof**, not authenticated consent for recording. It does not access real sessions or approve any Codex event, file write, archive, or Memory read.

## Why this exists

Phase 3A.26 introduced an explicit TTY acknowledgment of future-only text and workspace. Phases 3A.27 and 3A.28 established that the first-party launcher can own test-only children and actual pinned Codex subprocesses in offline GitHub CI. Neither TTY input nor a paired browser cookie establishes that the **device owner** made an authenticated choice about conversation recording. Treating either as a recording grant would be unsafe.

Apple's [LocalAuthentication `LAContext`](https://developer.apple.com/documentation/localauthentication/lacontext) provides an OS-managed user-authentication policy. [`LAPolicy.deviceOwnerAuthentication`](https://developer.apple.com/documentation/localauthentication/lapolicy/deviceownerauthentication) can prompt for macOS Touch ID, Apple Watch or the device user's password. It provides a result, **not** an application-specific recording authorization. Apple's [authentication policy evaluation](https://developer.apple.com/documentation/localauthentication/lacontext/evaluatepolicy%28_%3Alocalizedreason%3Areply%3A%29) may be canceled, unavailable or otherwise fail, and earlier successes must not be presumed to authorize later actions.

## Actual implementation

`scripts/mc2/native-macos-owner-auth-preview.swift` is an **unconnected standalone Swift prototype**, not packaged or called by the Dashboard or installed OS. It:
- Compiles directly against the real macOS `LocalAuthentication` framework, using a new `LAContext` with Touch ID reuse disabled for each manual test.
- Accepts only the explicit `--manual-preview <workspace-id> future-text-only` contract, with a strict canonical workspace-ID grammar. Paths, arbitrary actions, history requests, malformed or missing arguments fail closed.
- Requires two terminal file descriptors, explicit `AIVERSE_MACOS_OWNER_AUTH_PREVIEW=1`, and the **absence** of the CI environment before even evaluating the OS policy. CI always fails closed without opening an interactive prompt.
- Uses a short, action-specific macOS prompt identifying **future-only Codex text, exact workspace, recording still disabled**. The underlying password, Touch ID information and device credentials are never exposed to our code.
- Emits only a fixed local Boolean preview marker upon a manual success, not a token, signature, user identity or file path. No production component consumes that marker. It can be forged by another local process and **must not be treated as security evidence**.
- Never loads Codex, Gateway or private OS files, calls any model, captures an event, reads a transcript, authorizes a writer, or enables recording.

## CI verification

[Dedicated macOS device-owner-auth preview workflow](../.github/workflows/persistent-chats-macos-auth-preview.yml) compiles the Swift file on `macos-latest` against Apple's real SDK. It runs only the explicit `--ci-deny` and malformed/unattended **negative cases**, including a valid workspace request with a CI environment and even a manually supplied test opt-in variable. It verifies that all return **BLOCKED** and do not mint recording permission. It cannot verify an actual Touch ID/password success on a headless GitHub runner.

Initial code head `0dbfb9f40dd18bb18e40e4aa7ef8f3df92cc5105`: [macOS compile and denial workflow](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42819331324) **PASS** under Apple Swift 6.3.3, with all negative checks passing.

## Missing authorization chain

This prototype intentionally does **not** issue real consent and is not integrated into the native launcher. Before any event can be captured, a separately reviewed authenticated host integration must prove all of the following from **independent OS-owned source state**, not caller-supplied booleans or a Swift subprocess stdout claim:

1. Trusted native app identity and authenticated device-owner confirmation for the precise prospective text-recording purpose.
2. Binding to the original native-host session, immutable host intent/review generation, OS workspace identity and directly spawned Codex process/pipe. Never bind only by PID, thread ID or JSON.
3. Short bounded validity and fail-closed rechecks before **every** event admitted to capture; immediate stop on logout, cancellation, app exit, owner change, workspace switch, restart, approval expiry, process replacement, source gaps and missing UI coverage.
4. Explicit exclusion of private/sensitive channels, tool output, historical import and source events that cannot be attributed to visible user messages.
5. Separate secure storage/retention/undo/Memory read authorization after independent privacy review and member Mac acceptance.

An Apple LocalAuthentication success is a necessary candidate for native device-owner authentication, **not sufficient by itself** to grant event capture. Per [OWASP Authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), permission still must be enforced at the protected operation and checked per request.

**Production capture, historical import, archiving and Memory discovery remain OFF.** Dashboard PR #105, OS PR #124 and Memory PR #37 remain draft, unmerged.
