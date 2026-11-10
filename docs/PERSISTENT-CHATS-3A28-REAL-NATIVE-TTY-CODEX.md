# Persistent Chats Phase 3A.28: actual native TTY launcher drives real pinned Codex, offline

**Status:** validated CI-only process/transport proof. Production conversation recording, historical import, archive writing and Memory retrieval remain **disabled**. This is not authorization to record, and no member's own machine or provider login is used.

## Actual components exercised

This phase closes the earlier test-only architecture gap between:

- **3A.27**: the actual first-party interactive native launcher (`scripts/mc2/start-personal.mjs` importing `start-connected.ts`) owning a silent synthetic Node subprocess.
- **3A.25**: a separate test harness constructing a real `LocalApplicationSession` which controlled a pinned real Codex child, but was not the native interactive launcher.

The new `scripts/mc2/native-codex-readonly-tty-proof.ts` is dynamically imported **only** by `:codex-child-proof real-readonly` when `CI=true`, a second test-only flag is set, the process has a genuine Linux interactive terminal, and the **exact path** `/test/codex` contains the executable. It will not run in a normal member installation, browser, RPC or WebSocket.

The native launcher rechecks the existing OS-owned registry, canonical physical workspace, active paired session, prospective intent generation, and current 45-second scope review. It **also requires the recording authority flags to remain explicitly false**. Review/intent are still *not* verified human recording consent. No persisted authorization credential or issuer was created.

## Pinned real Codex and isolation

- Official Codex release **`rust-v0.167.0`**, downloaded by the existing workflow, verified by release-archive SHA-256 `9d64836106d5b374e90ee4454c7ebcde7ca7106558bd7e41a34b9f26ebda251a` before extraction.
- [Codex app-server](https://github.com/openai/codex/blob/rust-v0.167.0/codex-rs/app-server/README.md) documents local JSONL stdio, `initialize` then `initialized` before subsequent requests. The test uses only those and **`config/read`**, never `thread/start`, `turn/start`, `thread/list`, resume, inferred history, model prompts or event recording.
- [Node child process](https://nodejs.org/api/child_process.html) supplies the direct parent-owned `spawn()` process and stdin/stdout pipes. The parent continuously checks the actual process status, host intent generation and the original physical cwd identity. Only bounded, narrow read-only RPC responses or non-chat startup notices can be accepted. Frame contents are never logged, hashed, forwarded or stored. Every subprocess receives a unique disposable, owner-private `CODEX_HOME`, removed after termination.
- The [pinned Gateway owner source](https://github.com/aiverse-filmmakers/AI-Verse-Gateway/tree/9748dd0d5473b65ad95ef92df62fe0a13575e378) supplies a **deterministic disposable fake-host** with a synthetic OS root and ephemeral bearer. This is the genuine canonical Gateway implementation in deterministic test mode, **not** the user's production Gateway.
- `scripts/mc2/ci-real-native-tty-codex-offline.mjs` launches the **original first-party `start-personal.mjs`** through the `script` pseudo-terminal utility, uses one-time pairing at a loopback-only endpoint, and drives the original terminal commands. All terminal text, including pairing codes, is held in bounded volatile test memory, never printed.
- The workflow runs the real Codex binary and first-party launcher in a Docker container with `--network none`, read-only root, no Linux capabilities, no-new-privileges, private `/scratch` and `/tmp`, no member HOME, and no provider credentials. It checks the immutable Node base-image manifest. A throwaway test-only derived image installs `bsdutils`/`util-linux` to allocate a real PTY. This derived fixture image is not a runtime distribution.

## Proof sequence

1. A real TTY command is refused before pairing, then again before the prospective host request and before the separate exact-workspace scope acknowledgment.
2. In `operator`, the paired host issues `:chat-intent on`, `:chat-review confirm operator future-text-only`, then `:codex-child-proof real-readonly`. Its direct child completes the pinned app-server handshake and sterile configuration read before teardown.
3. `:chat-intent off` invalidates any future use of that request, and a subsequent native proof command is denied.
4. `:use film` rotates the pairing code, revokes the old browser cookie, and leaves no prior host scope or consent-like review. Old pairing returns **401**.
5. After a **new** pairing and `film`-specific host intent/review, the native TTY launches a **second real pinned Codex process** in the different physical workspace with a separate disposable home. Only read-only handshake/config is accepted, then the host stops it.
6. No chat records or Memory records are emitted.

## Verifiable GitHub CI

The initial two-workspace attempt on head `2d6144fa33487ad15bf5c1f75fb9f854e60a8cd1` timed out on the second Codex start because the diagnostic had reused its temporary Codex home. The child now receives a **fresh private home per launch**, with cleanup, at corrected head `969fa6eca6a50c7eee155ef0918edcbabfbe5599`.

[Corrected offline native TTY + pinned real Codex workflow](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42815436589) **PASS**. Its logs explicitly confirm two separate app-server initializations and the two-workspace read-only handshake, old-cookie revocation, no-network execution and no chat, history, archive or Memory. Other cross-platform and browser results must be checked for the final head separately; do not infer their status from the focused CI.

## What is still missing

- A trusted, separately audited and **authenticated operator consent grant**. The current TTY scope review is only a short-lived acknowledgment, not a recording authorization source.
- Real installed macOS native host / Codex process integration and user acceptance. A GitHub-hosted disposable Linux PTY is **not** evidence that a member Mac is configured correctly.
- Exact per-event provenance, message rendering/completeness, privacy handling for special event types, bounded production storage, recovery/undo, authorized Memory recall and end-to-end security review.

Keep Dashboard PR #105 and OS PR #124 draft and unmerged. Production capture stays off, regardless of this CI result.
