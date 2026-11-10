# Persistent Chats 3A.23: host intent epoch and disposable child stdout boundary

**Status:** a real Dashboard session change and a test-only, no-content child-process exercise. This is **not** recording consent, an authenticated Codex source, a recorder, or Memory integration. Production recording remains hard-denied.

## Official sources and meaning

- [Codex App Server protocol](https://learn.chatgpt.com/docs/app-server): the stable local `stdio` transport emits JSONL responses and notifications. Thread IDs are conversation identities, **not evidence of OS host ownership**. A proper client must establish an `initialize` / `initialized` handshake before starting threads. This test does not call `thread/start`, `turn/start` or history APIs.
- [Node.js child_process documentation](https://nodejs.org/api/child_process.html): `spawn()` returns a direct parent-owned child object, whose `stdout` is a readable pipe only if stdout was configured as `pipe`. OS process exit and stream close are distinct. Receiving a chunk from a test child is evidence of the parent's direct pipe connection, not proof that the process is authenticated Codex.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): authentication, session scope and operator *intent* must not be confused with per-action permission.

## Implementation

`LocalApplicationSession.prospectiveRecordingIntentForHost()` now returns a **local generation counter** in addition to the prior false-by-design security flags. The counter changes on each trusted host `on` or `off`, every session revocation, and expiry. It is not secret, not a bearer, cannot be requested by a browser and must never authorize storage.

This prevents a stale observer from passing a check merely because the same workspace was reselected or the preference was restarted in the same wall-clock millisecond. The existing owner registry/physical workspace checks and two-minute TTL still run at every status check. `captureAuthorized`, `hostOriginAttested`, `userRecordingConsentVerified`, `historyImportAuthorized` remain **false**.

### Direct child proof

The extended `test/local-app-session.test.ts` launches a **disposable Node.js child using the parent process's exact `process.execPath`**, with a direct pipe for stdout and no shell. It produces only a fixed synthetic marker, and the parent immediately discards each stdout chunk after bounded, metadata-only checks. No chat text, model call, personal file, conversation history, or transcript digest is recorded.

The same child is first accepted only as a **synthetic preview** under the original in-process generation. A host `off` then `on` within the same workspace must not reauthorize that old child. A host project switch, fresh browser pairing, and new prospective request must not reauthorize it either. A fresh Codex child would require a **separate host-verified ownership lifecycle**, not simply a new snapshot assigned to an old process.

Other assertions verify that expired or OS-rebound scopes invalidate old generations, and the generation is absent from the browser's `/local-app/session` payload.

## Scope that still blocks real recording

This is a **test fixture child, not the actual Codex App Server binary**. The parent-owned pipe alone does not prove that a system-installed Codex binary was started by the authorized OS owner, and a source event still cannot be assumed to be the exact UI-visible message. There is no real per-record consent issuer, no original provider provenance, no full UI coverage or authorized writer.

Before production: the trusted native host must own the **actual Codex process handle and original stdout JSONL stream**, bind them to the OS root+workspace and unique consent generation at process start, recheck on **every event**, fail closed on disconnect, lifecycle ambiguity, restart, login rotation and consent stop, then independently review storage/Memory. No historical import.

## CI

The branch's Dashboard CI on Windows, Ubuntu and macOS runs the new direct-child and epoch tests. The existing native-host browser proof continues to verify the interactive `:chat-intent on/off/status` path, project switching and fail-safe stop. **Do not mark release-ready while any required CI check is unverified or until native-host event provenance and privacy signoff are complete.**

Draft PR #105 remains unmerged; OS PR #124 and Memory PR #37 remain unchanged.
