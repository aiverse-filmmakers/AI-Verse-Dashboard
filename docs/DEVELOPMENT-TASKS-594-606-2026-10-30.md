# Tasks 594–606: Canonical Chat transcript navigation and verified model authority boundary

**30 October 2026** | [Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) | Branch: `codex/dashboard-source-checkpoint`.

The work here is **real first-party Chat source**, not the GitHub Pages sample preview or a new browser message store. This is an integrated, test-backed improvement to the already implemented G02.2 conversation library; it does **not** pretend to finish G02.3 provider selection.

## Real code and regression slices

| Slice | Work and acceptance evidence |
|---|---|
| **594** | Inspected current canonical Gateway server/config/runtime source: `GET /v1/models` advertises only the `aiverse` virtual model, status advertises runtime **kind** but not a physical per-workspace model entitlement list. |
| **595** | Examined AI-Verse Connections and Token contracts. Connections owns external provider authorization/capability admission; Token owns usage/cost evidence. Neither a stable model-choice entitlement list nor a Gateway-owned enforcement contract is available for browser use. No invented provider dropdown or direct provider login. |
| **596** | Implemented `PersonalChatRunController.loadOlderSessionRuns()` for authenticated, workspace/session-scoped `aiverse.gateway.session.runs` pages beyond the first 50. |
| **597** | Bounded viewed run history to **200** per open session. Earlier records are kept by Gateway; no localStorage/sessionStorage/chat duplication or eager 200-run request. |
| **598** | Made older transcript pages **display only**, never silently appended to the model's admitted `confirmedTurns`. Only canonical completed/verified pairs from the original recovery window can affect subsequent prompting. |
| **599** | Reject invalid history source, workspace, session ID, malformed pagination, duplicate IDs within or across pages, noncanonical row shapes and stale workspace epochs. A rejected page does not advance the cursor. |
| **600** | Added first-party `Load older messages` inside a historical chat with explicit loading, error/retry and end-of-history states. |
| **601** | Preserved transcript scroll position when older turns prepend and during the spinner transition. Restored reader focus stays near previously visible content. |
| **602** | Added controller tests for 50+25+3 ordered runs, stable offsets 0/25/50/75, duplicate page rejection with safe retry, and A→B→A workspace-change invalidation. |
| **603** | Added Chromium test with **78 actual Gateway-shaped run-history records**; validates 156 user/assistant turns in chronological order, no second model invocation, and no browser persisted chat. |
| **604** | Historical sessions now open in an empty pane or create another split. Existing active or completed chats are never silently replaced. |
| **605** | When all three panes are occupied, opening historical chat displays a real no-room message and preserves all three. Opening in the sole minimized, empty pane restores it visibly. |
| **606** | Added Chromium regression for split preservation, full-capacity refusal and minimized-pane restoration. Verified cross-platform Node and browser CI and recorded the outstanding owner contract. |

## Honest owner dependency for Task 607

The **canonical Gateway itself** must produce an authenticated, exact-scope, revocation-aware *list of physical models allowed for this owner and workspace*, and **enforce model choice on each run**. Its present `src/runtime.mjs` allows a non-`aiverse` `input.model` to be forwarded to the upstream openAI-compatible runtime. Dashboard hardcodes only the virtual `aiverse` identity and has strict browser frame schemas, but that is **not** a substitute for Gateway-owned physical model admission.

Required before claiming working model switching:
1. Connections-authorized provider credential/consent binding to the owner/system/workspace, with revocation generation and safe display metadata;
2. Gateway-owned authenticated model catalogue and capability/readiness verification, not an untrusted public provider discovery response;
3. Canonical run creation binding a selected model to approved provider/model/owner/workspace and rejecting arbitrary model overrides;
4. Per-run idempotency, cost/usage attribution through Token, safe fallback/unsupported state, and immutable auditable selection;
5. Native/owner acceptance tests with real permitted models, expired permissions, revoked credentials, cross-workspace attempts and no raw credential leakage.

Until those exist, the visible model inventory remains a factual **single virtual model**, not a fake selector.

## Verification and progress

Functional-code head: `6d7289562f6d7c2be994f73badb84366acfb0702` (later documentation commits add no runtime change). Verify full CI on that head and on the terminal documentation head before claiming four green.

**Scores remain unchanged:** Chat/Gateway **10/15 provisional**, GitHub/browser **46/100 provisional**, formal accepted **15/100**. These history/split improvements improve draft G02.2 evidence but are not a completed new milestone or real provider selection. 10 chapters, 40 milestones, 4 verified, 8 draft implemented, 5 in progress, 23 planned. PR is still draft/unmerged; no owner Mac installation, signing or real provider consent performed.

**Next Task 607:** implement an owner-approved physical model authorization/discovery contract in canonical Gateway+Connections; meanwhile continue safe OS-backed attachments/Skills admission without implying unavailable provider capabilities.
