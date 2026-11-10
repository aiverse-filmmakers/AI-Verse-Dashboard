# Persistent Chats 3A.49: pinned real macOS Codex child under native XPC owner

**Result: PASS on exact Dashboard source commit**
`0b1c67c7a3cae8bc0627cb77e2c41f13d73ae5b8`.
[Apple macOS acceptance](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963616).

## Real improvement

The existing Linux Dashboard CI already ran the real pinned Codex App
Server through the Node launcher, but the separate native macOS XPC owner
still launched `/bin/sleep`. This phase connects those two *offline
lifecycle proofs* on an Apple runner without enabling event capture.

The new `ci-macos-pinned-codex-owner.sh` fetches the official
`rust-v0.167.0` macOS Codex archive and verifies its exact pinned
release size and SHA-256 from GitHub release metadata:

- ARM64 asset size 108379331 bytes, SHA-256:
  `4b22a2a971be2791c3e31f912f3e77a88ebd64a65812a7289ccba65dd6425fe9`
- x86_64 asset size 117941240 bytes, SHA-256:
  `d8eb4a865a0b17319cde10347523e5bab0978d01725b39f4a639f40905e01221`

Extraction requires exactly one expected executable. Only this pinned
macOS release is executed. This is a **reproducibility pin**, not an
assertion that 0.167.0 will always be the newest Codex version.

The disposable, ad-hoc-signed XPC host directly launches
`codex app-server --listen stdio://` as a real parent-owned
`NSTask` child. The process receives a fresh 0700 workspace and
separate temporary HOME/CODEX_HOME. It has no ChatGPT login, API
key, Gateway credential or inherited user HOME.

Crucially, the parent **does not initialize the Codex App Server or
send thread/start or turn/start**, does not read stdout, discards
stderr, and never reads or stores transcripts. An open stdin pipe
is retained only to keep the service alive during its brief lifecycle
check. The host:

1. Verifies the live real Codex child PID, parent PID, generation and
   kernel-reported cwd.
2. Opens the existing launchd-managed XPC helper and receives only
   `CAPTURE_DISABLED`.
3. Rechecks the real Codex process/workspace lease at the observation.
4. Terminates the child and proves the prior lease cannot revive.
5. Deletes only its disposable scratch directory.

The original 3A.44/45 silent-child tests remain running separately.

**Exact-head CI verification, all five Dashboard workflows passed:**
[Apple macOS](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963616),
[Dashboard CI three-platform](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963879),
[Linux pinned Codex](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963758),
[Native browser](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963876),
[Personal Chat browser](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963720).

**Unproved:** No actual production-signed Dashboard app, LocalAuthentication
success, independently authorized original Codex notification,
separate affirmative recording consent, data writer, archives, or
Memory. All production capture stays disabled. Both PRs remain drafts.
