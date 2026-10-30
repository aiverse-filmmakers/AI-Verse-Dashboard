# Tasks 628–647: Canonical run evidence, loaded-transcript tools and user-initiated Canvas-to-Chat references

**30 October 2026** | [Draft Dashboard PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) | `codex/dashboard-source-checkpoint`

## Architecture and completed integrated slices

| Task | First-party source change and tested boundary |
|---|---|
| **628** | Reconfirmed the [G02.3 physical model owner dependency](G02-3-PHYSICAL-MODEL-OWNER-CONTRACT-2026-10-30.md). Canonical Gateway advertises only virtual `aiverse`; Connections authorizes credential capabilities, Token owns cost truth. No direct model picker or invented provider identity. |
| **629** | Inspected actual canonical Gateway Store/run records and Token cost-truth contract. Identified narrow factual execution metadata safe to project: input/output token counts, action count, timestamps, runtime **kind**. |
| **630** | Added host-only `safeRunReceipt()` to the authenticated Gateway bridge. Strictly whitelist bounded nonnegative integer counters and validated timestamp/runtime kind, never spread raw runtime/checkpoint/messages/principal/credential. |
| **631** | Deliberately excluded canonical Gateway's raw `usage.cost` from browser: Token's ACTUAL/CALCULATED/UNKNOWN ledger is the owner of billable cost truth. |
| **632** | Added typed `ChatRunReceipt` to the client, strict structural validation and propagation through run create/get/reconcile/pause/resume/stop/reconnect. |
| **633** | Added per-pane **Run details** UI with exact run ID, session/workspace, canonical status, creation/completion timestamps, runtime kind and verified source label. Never call zero raw cost `$0 billed`. |
| **634** | Added synthetic Gateway credential/cost/model injection tests proving raw private fields cannot enter /rpc, plus malformed receipt rejection from client; caught and fixed ISO timestamp digit-regex validation. |
| **635** | Corrected close/new chat state to clear previously verified run receipt and canonical status, avoiding stale cross-conversation metadata. |
| **636** | Extended actual pinned Gateway composition proof: bounded Dashboard receipt usage equals the **real persisted Store's counters**, timestamps and runtime kind, while full runtime config/raw cost/private messages stay omitted. |
| **637** | Added per-pane **Find messages** over the already-loaded canonical conversation, only in memory. Literal case-insensitive matching, previous/next, keyboard Enter/Shift+Enter/Escape, selected match highlight and loaded-only count. |
| **638** | Preserved scroll while a user reads older messages: new live Chat rendering does not force scroll-to-bottom unless already near bottom. |
| **639** | Chromium coverage of 78-run history: find 50 then 75 then 78 loaded user turns, never claim unloaded history is searchable. No extra Gateway inference or browser storage. |
| **640** | Added explicit **Export loaded** TXT download of authenticated resolved conversation. No server-side export, localStorage/sessionStorage or raw cost. Status-only UI messages and incomplete stream drafts are excluded. |
| **641** | Browser proof verifies local export excludes genuinely unloaded older pages, then includes all 78 runs in original chronological order after the user loads the remaining pages. |
| **642** | Manual **Recover run** no longer mixes another canonical session's answer into an existing pane. Requires empty chat and removes failed/unverified blank reply placeholder; reusing same run in empty pane is GET-only. |
| **643** | Inspected real canonical Data/OS/Skills owner contracts and existing Canvas read authorization; did not implement fictitious binary attachments or grant Skill permissions. |
| **644** | Added `CanvasWorkspace.selectedNoteForChat()`: user-selected **saved** Canvas note is re-fetched through canonical Data `canvas.get`; exact document ID, version, workspace, current selection and OS epoch must still match. |
| **645** | Added per-chat **Insert Canvas note** composer action, explicit click only. Inserts a labeled copy of that verified saved reference; preserves the user's existing draft; does **not** send to the Gateway until the user independently clicks Send. |
| **646** | Refuses stale/changed workspace or version, absent selection, removed note, uncommitted editor draft as authority, and overflowing 1,200-character composer without silent trimming. |
| **647** | Browser tests verify user-triggered Data re-read, draft preservation, no run.create on insert, stale-version denial, over-limit denial, scope revocation, and actual user Send after review. Full independent CI and roadmap evidence checks required before claiming completed. |

## Real implementation vs owner work remaining

- Gateway receipt is an **owner-backed projection**, not Token-verified billing. The real pinned Gateway CI tests persisted usage against actual canonical Store state.
- Search and export operate only on **already loaded** canonical messages. The history index may truncate old user/output text; the UI and export disclose this. They never create another conversation database.
- Canvas-to-Chat is a **user-reviewed text reference**, **not a file upload**. No binary image/video/audio, MIME handling, content hash, file object, asset admission, Data artifact grant, vision model input or Skills/command execution is implied.
- G02.4 (attachments, commands, Skills) is now **in progress** on the explicit Data-backed text reference only, not accepted or complete. G02.3 stays in progress for physical model admission.

## Evidence, score and next task

Latest functional implementation head to verify: `e3a161ec4e38c932be53a95d89366afcfa2aa8f8` (or newer if CI-driven fixes). Test in all four workflows on the final exact head before final reporting. Positive browser fixtures are disposable authenticated Dashboard + canonical Data/Gateway-shaped fixture; real persisted Gateway Store receipt is tested separately in pinned Gateway CI. The user's private Mac has not been installed or tested.

**No percentage inflation for UI-only improvements or partial attachment work:** Chat/Gateway **11/15 provisional**, GitHub/browser engineering **47/100 provisional**, formal accepted **15/100** unchanged. Fixed 10 chapters, 40 milestones: G02.4 moves from planned to in progress on source evidence, making **4 verified, 8 draft implemented, 6 in progress, 22 planned**. No merge, deployment or live provider consent.

**Next Task 648:** define and implement an approved canonical Data asset-reference/attachment admission route in the trusted host (owner-scoped, revocable, size-limited, explicit user consent and verified content provenance) or the canonical Gateway+Connections physical model entitlement contract. Do not implement fake file chips, arbitrary filesystem reads or direct browser credential forwarding.
