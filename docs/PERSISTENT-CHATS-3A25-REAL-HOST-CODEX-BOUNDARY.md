# Persistent Chats 3A.25: Real pinned Codex under actual Dashboard host session

**Status: CI-only verified, production capture OFF.** No user content was accessed. No recording grant is issued and no archive/Memory service is connected. This work remains on [Dashboard draft PR #105](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/105).

## Objective and source research

Earlier OS 3A.24 independently demonstrated two pinned real Codex subprocess lifecycles without a native Dashboard owner. Dashboard 3A.23 independently demonstrated an actual trusted `LocalApplicationSession` with a prospective, non-authorizing recording preference and separate synthetic child. This phase exercises **both in one isolated process**, without connecting it to production.

Official references:
- [Codex App Server](https://github.com/openai/codex/tree/rust-v0.167.0/codex-rs/app-server) and [generated v2 schemas](https://github.com/openai/codex/tree/rust-v0.167.0/codex-rs/app-server-protocol/schema/json/v2): `initialize`, `initialized`, `config/read` on a parent-owned local stdio process. Protocol IDs cannot attest OS authorization.
- [Node.js child_process](https://nodejs.org/api/child_process.html): the spawning parent controls its `ChildProcess` object and stdout/stderr streams. `close` and `exit` differ and teardown is bounded.
- [OWASP authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): authentication is not resource permission, and default-deny per-action checks remain mandatory.

## Exact CI evidence

The new [offline native Dashboard/Codex workflow](../.github/workflows/persistent-chats-real-codex-native-host.yml):
1. Compiles the real `LocalApplicationSession`, `SystemRegistry` and local Gateway from the checked-out Dashboard PR.
2. Downloads only official pinned Codex `rust-v0.167.0` asset `codex-x86_64-unknown-linux-musl.tar.gz`, checks exact archive length **122587028** bytes and SHA-256 `9d64836106d5b374e90ee4454c7ebcde7ca7106558bd7e41a34b9f26ebda251a`, then extracts only one expected executable.
3. Runs on immutable official Node `22.23.4-bookworm-slim` Docker manifest digest `sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d`, with `--network none`, read-only rootfs, dropped capabilities, no-new-privileges, resource limits and private ephemeral scratch. Source mounts are read-only; credentials/real HOME are never passed.
4. Executes `scripts/mc2/ci-real-codex-native-session-proof.mjs`: registers a disposable OS root and workspace `operator` with the **actual Dashboard registry**, starts its local Gateway, redeems a one-time pairing code over internal loopback, then uses the host-only prospective request. It launches an actual pinned Codex subprocess **from that physical workspace** with an isolated private `CODEX_HOME`, using only `initialize` / `initialized` and `config/read`.
5. The parent validates the live host request epoch, OS root/workspace identity and direct child handle **before receiving or accepting each stdout frame**. The parser accepts only a bounded number of non-chat startup notices and exact requested read-only RPC replies. No item, turn, thread, tool, approval or server-request notifications are admitted. Responses are inspected transiently; they are never saved or logged.
6. It stops the host request while a read-only response is pending, refuses the revoked promise, refuses the old child after host request restart and workspace rotation, terminates the first child, re-pairs for `film`, and verifies a **new separate real Codex child** in that physical workspace under a fresh host epoch. After final stop, the new child also fails authorization.
7. No `thread/start`, `thread/resume`, `thread/list`, `turn/start`, user prompt, model call, history import, archive write or Memory reader is invoked.

**Verified:** [GitHub Actions no-network native-host/Codex #2](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42722552572) **PASS** on exact code head `dc38331029b42fbe222c62a1f6fecdf6920cc7fc`. Logs explicitly confirmed both real Codex child initializations and both sterile configuration reads, followed by old-child refusal and production-blocked summary. The new test is not an installed Dashboard feature or a production recorder.

## Still not proven

- The first-party interactive **installed host launcher** is not yet the owner of a production Codex process. This CI test instantiates the same real session class in a synthetic local Gateway environment.
- `:chat-intent on` is explicitly a short-lived **preference**, not independently authenticated recording consent. No trusted user-approved recording grant exists.
- The host has not authenticated and attributed every **real model-generated, UI-visible** event, especially invisible/private/streaming messages, restart and scope transitions.
- No production writer, replay/repair, authorized Memory recall or actual user machine acceptance. Even the pinned CLI release is an isolated reproducible reference, not proof of the installed native Codex build.

**No merger or activation is permitted based solely on 3A.25.** Keep both Dashboard PR #105 and OS PR #124 draft and real capture disabled. Continue GitHub-first with a separately audited native consent source and authorized OS process lifecycle.
