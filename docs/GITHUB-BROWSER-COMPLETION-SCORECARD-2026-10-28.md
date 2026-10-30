# GitHub/Browser Build Completion Scorecard

**Created:** 28 October 2026
**Purpose:** answer the operator's question, "When have we finished 100% of what we can build in GitHub and the browser, before my Mac is needed?"

## Three separate measures: never conflate

1. **GitHub/browser build completion (GB)**: 0–100% of the defined **remote-capable current Personal-first Dashboard implementation scope**, including code, owner integrations, testable functionality, disposable CI, browser interaction testing, CI-based unsigned desktop packaging, acceptance packets and source handoff. This is **not** a fraction of the formal 100-point program. A GB score of 100 means no further *defined remote-capable* engineering/review/preparation is known and the remaining gate is clearly owner/local/account/release acceptance. It is **not** the fully installed application, signing, private user credentials or permission to release.
2. **Formal roadmap acceptance (FA): 15/100 (15%) as of this checkpoint.** This original MC0–MC7 score advances only through its existing approved and evidenced gates. Draft PRs and GitHub source slices do **not** raise FA. MC2.1 independent review + Personal-first scope reconciliation remains its next +2 point gate (17/100 if approved).
3. **Private-machine/release readiness (LR): not numerically scored until there is a verified owner-local checklist and approved installer/release protocol.** Report concrete missing checks instead of inventing a percentage; a disposable Mac/Qwen trial cannot count as private production acceptance.

The historic **90–93/100 formal-roadmap pre-local** ambition was an aspirational ceiling under a DIFFERENT denominator. It is **not GB=90–93%**, not actual progress, and not a target that prevents reaching **GB=100%**. If complete remotely, GB=100% may coexist with FA<100 and unperformed owner-local gates.

## GB scope and the provisional baseline

**Current provisional engineering estimate: ~38/100 GB points (~38%).**
This is a **planning estimate**, NOT a full independent code audit or a formal accepted score. The verified minimum is the older MC0+MC1 15 points, but the Personal Chat, Canvas, Data and actor-grant source/CI since then substantively increase remote work completed. Rounded category partials below represent **estimated** readiness based on the checked 28 October branch, not claims of accepted gates. Do not report decimal precision. Revise category points against pinned source/CI with an explicit audit and record evidence before treating the score as verified.

| Remote-capable current-scope workstream | Fixed GB budget | Provisional earned | Known evidence / main remaining work |
| --- | ---: | ---: | --- |
| Preserved architecture, provenance, OS/Gateway runtime proof | 15 | **15** | MC0/MC1 accepted and recorded; maintain architecture |
| Real Personal Chat, Gateway transport, identity/scope, runs and recovery | 15 | **8** | Actual pinned Gateway chat + restart/reload evidence; finish native provider/model/commands/attachments/control acceptance |
| Personal app + workspace + persistent Canvas + app actions | 15 | **10** | Canonical Data-owned Canvas notes/edges, version history/undo, grouping, host-selected context and guarded note/group actions; still needs creative assets, real workspace lifecycle and installed production model action dispatch |
| Native OS operator/agent identity, grants, approvals | 10 | **2** | Draft OS grant verifier and disposable Gateway integration; no installed human session issuer, grant lifecycle, approval receipts or Windows ACL |
| Real providers/connections, generation jobs and owned creative assets | 10 | **1** | AUTH-1/Connections exploratory source; real connected provider lifecycle and actual image placement unavailable |
| Owner-backed control panels: Brain, Memory, Skills, Automations, Token, Connections, security, agents | 15 | **1** | Real host-paired Personal OS/Gateway/Canvas/history diagnostics with exact scoped registry admission; remaining Brain, Memory, Skills, Automations, Token, Connections, audit and fleet panels |
| First specifically scoped Filmmaking specialist feature | 5 | **0** | Define minimal testable first film tool, not the undefined complete future filmmaking suite |
| Product UX, accessibility, responsive/focus and regression | 5 | **1** | First-party UI/Chromium tests exist; full reviewed accessibility and usability pass pending |
| CI-built macOS desktop package, supervised Gateway and installer preparation | 5 | **0** | Local launcher is NOT signed/reviewed desktop package; create true installable CI artifact with owner boundaries |
| Independent remote security, release evidence and handoff closure | 5 | **0** | Green component tests and handoffs do NOT equal independent whole-system security/release review |
| **Total** | **100** | **38 (provisional)** | **62 estimated GB points remaining** |

### Progress rules

- Keep **GB budget 100** fixed for this version of the Personal-first scope. Specialist filmmaking's **first narrowly defined feature only** is included, not every future video/3D/editor product concept.
- Award GB points for a **source-backed real capability with verified CI and clear owner contract**, not for a count of chat turns, commits, tasks, mockups, documents or static preview controls. Draft source can earn *engineering* progress if the CI evidence is real; this alone does not earn FA points.
- A new test failing or a security gap changes the relevant GB category to **pending** or reduces its estimate; it does not earn points simply from code churn. Run reports must state green/pending/failed separately.
- When an item is blocked exclusively on owner Mac permissions, account consent, real private identities, signing, installed private credentials or subjective local acceptance **after all remote-code work is done**, record a **local gate**; do not hold GB points for that owner step. When code or CI is still missing, it remains **GB work**.
- Before every batch, check actual branch heads, owner repos, workstream evidence and what can honestly be done remotely. After each completed batch report **GB N/100 (estimate vs independently audited)**, **FA N/100 (accepted)**, **LR blockers**, and **batch slices X/Y**. A new chat MUST NOT revert to showing FA 15/100 as the only progress indicator.
- Show a remaining-GB workstream breakdown and the **next increment that can change GB**, not just "more tasks."
- If user expands scope (e.g., full Film 3D camera/lighting/edit suite), explicitly version this scorecard/rebaseline the denominator; do not silently dilute or falsely preserve percentages.
- The 38/100 provisional estimate is **not an independently audited source-by-source inventory**. The next bounded task should replace the estimates with verified per-workstream subdeliverables and distinguish `green CI`, `draft`, `merged`, and `local-accepted` evidence. In the meantime say **"~38% provisional engineering estimate"**, not "38% verified finished."

### Current authority/CI caveat

Source continuation Tasks 8–62 is real implementation. Dashboard code at `f0f5e1e42cc6ef13bd18a66f40481b38fd1ed309` passed Dashboard CI, Chromium and real pinned Gateway+OS+Data composition; OS draft PR #110's last Node 22 macOS grant job was queued at last check, so do not silently mark that **entire** matrix green. Data and Dashboard PRs #22/#42 remain drafts and unmerged; OS #110 is a draft. None of those implies private Mac installation, account authorization or production model tools.

**Next engineering qualification:** OS native human session and grant lifecycle; independently reviewed human-approval receipts; real provider/connection/asset jobs; functional owner-backed operational panels; macOS packaging. **Next scoreboard task:** audit and ratify the above GB weights and baseline from exact GitHub code, rather than counting implemented slices as accepted roadmap points.


### Canvas context evidence increment, 28 October 2026

After Tasks 93–142 added a trusted host-only Canvas selection reader
and guarded selected-note action, exact Dashboard code
`fb85aa4c6af92416b8f2e6c21d19632a5c4a62ca` passed
[real Gateway/OS/Data CI 40775792089](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40775792089)
and [real Chromium browser CI 40775791985](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40775791985).
Linux and Windows jobs of that code's ordinary CI and progress ledger
passed; macOS jobs were queued at last check. The provisional Canvas
category increased **7 to 8**, bringing GB to **~35/100 at that checkpoint**, not a
new formal acceptance point. G03.3 is **implemented in draft**,
not production accepted. Grouping and production model/app dispatch
remain in G03.4. The milestone inventory now has 10 chapters and
40 named milestones. Source-by-source GB estimate ratification
still remains a separate review.

### Grouping milestone source increment, 29 October 2026

Tasks 143–212 added canonical note grouping to the actual Data owner
and usable first-party Canvas group controls: create/rename/change
members/move together/ungroup, with unchanged old revision checksums,
persistent scoped SQLite, idempotent retries, atomic clone and undo.
Data's 35 focused cases passed all three Node 22 platforms in
[Data CI 40781700269](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40781700269);
the corresponding exact Data owner was pinned and exercised through
[Dashboard real Gateway/OS/Data CI 40781907477](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40781907477).
The Dashboard boundary has 33 separate typed/projection/security cases,
and the real first-party editor also passed ordinary CI. Subsequent
CSS-only/layout and documentation commits have their own runs.

This supports a **one-point provisional Canvas category increase**
8→9, bringing **GB to ~36/100 provisional at that checkpoint**; it does not accept MC2.1,
clear local Mac gating, or close the entire G03.4 milestone
(workspace lifecycle, assets and production model-tool dispatch are
still missing). The original formal acceptance stays **15/100**.

### Native host selected Canvas tool increment, 29 October 2026

The 200 small source/test slices of Tasks 213–412 map to four
source/integration changes and 196 distinct registered regression
scenarios. Source `b2e5920cd2998c929eba3345379b7a45761fbc54`
passed [Dashboard Node22 Linux/macOS/Windows CI 40788246223](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40788246223),
[Chromium QC 40788246028](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40788246028),
[progress CI 40788246082](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40788246082),
and the [real pinned Gateway+OS+Data composition 40788246113](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40788246113).
In-process native host-only model context now supports a
selected note edit and selected-group rename/move, verified against
the real GatewayStore run and scoped Data owner, rejecting JSON
handle forgery, revoked leases and stale document revisions.

This supports **one new provisional engineering point**
Canvas 9→10, making **GitHub/browser ~37/100 provisional**.
It does NOT close G03.4, register a real provider model tool,
install on macOS or pass independent MC2.1 acceptance.
Formal accepted FA remains **15/100**. Test/task count is
never used as the score denominator.

### Real first-party Personal diagnostics, 29 October 2026

A new native-host-authenticated Personal **Workspace status** panel
reads four genuine owner sources using the existing localhost
`DashboardClient`: public registered `system.get`, canonical
`aiverse.gateway.status`, scoped Data `aiverse.canvas.list`
and bounded canonical Gateway conversation history. OS root/identity
and private bearer credentials never enter browser responses.
A missing Data owner is **unavailable**, not a fabricated healthy
metric. Selection changes and reloads discard stale responses.

Exact code `0f276bae960f98b0082bad4a7e1fe7685009e6b4`
passed full [Dashboard Node22 CI 40832818420](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40832818420)
and [real canonical Gateway + paired Chromium browser
40832818224](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40832818224).
The real browser checks all four sources, strict
origin-bound HttpOnly session, denied cross-system read and
no authorization bearer in browser RPC. The public `system.get`
exception is restricted to the **exact paired system/workspace**;
`system.list`, `workspace.list` and other systems remain denied.

This evidence supports a **one-point provisional Control
Center increment (0→1/15)**. Current GB estimate **~38/100
provisional**, formal accepted FA **15/100 unchanged**.
G06.1 is **in progress**, not fully achieved: complete
fleet/system selection, workspace lifecycle, historical
run diagnostics, Brain/Memory/Skills/Token/Connections and
native installed owner sign-off remain outside this slice.


## Tasks 454–461: Real chat resizing and verified owner diagnostics, 29 October 2026

Task ledger: [454–461](DEVELOPMENT-TASKS-454-461-2026-10-29.md). Dashboard draft PR #42 now has a fifth real paired-scope workspace manifest diagnostic, an explicit future-safe browser RPC method allowlist and real pointer/keyboard chat pane resizing with mobile full-width layout. Native first-party UI and Browser CI, Node 22 all platforms, and pinned real Gateway composition are **green** at source `0e915209fe2d151c2d9306ab156d05522460d4bf`, runs 40874888256, 40874888550 and 40874888319. The restart harness `5c371568` also passed real composition run 40874360134. These are tested draft source, not a member installation.

The finite plan remains 10 chapters/40 milestones, now 4 verified, 8 implemented-in-draft, 3 in-progress (G03.4, G06.1, G08.2), 25 planned. **GB ~39/100 provisional**, UX category +1 for verified functional resizing; **FA 15/100 formally accepted**, unchanged. Local Mac/account/release gates remain separate.

**Next Task #462:** prefer owner-backed native workspace lifecycle and system selection (G06.1) or a scoped provider/asset capability (G05), subject to existing authority contracts; no broad cookie permission expansion, no mock panels and no duplicate databases.


## Tasks 462–480: Scoped local Agent Activity, 29 October 2026

[Task ledger](DEVELOPMENT-TASKS-462-480-2026-10-29.md) and [activity owner runbook](PERSONAL-AGENT-ACTIVITY-2026-10-29.md). Dashboard draft PR #42 adds a first-party, host-cookie authenticated **Agent activity** panel backed by the existing *Dashboard-local in-memory* SessionStore with exact OS/system/workspace scope, redacted status and event kinds, refresh, all/tool/error filters. It does not claim the persistent canonical Gateway agent fleet and is unavailable when the local owner is missing. A new `operator.activity` read-only query is explicitly allowlisted for the paired browser; other methods and other workspaces remain denied.

Exact source `9e9930805800482a843cee4ea95ee83a73cc4193` passed [Dashboard Linux/macOS/Windows 40878839555](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40878839555), [Chromium 40878839278](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40878839278), [real canonical Gateway + paired browser 40878839529](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40878839529), and [progress integrity 40878839235](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40878839235). New documentation head must pass its own exact CI.

**GB ~40/100 provisional** (+1 Control Center for source+CI real constrained feature), **FA 15/100 formally accepted**, unchanged. 10 chapters/40 milestones: 4 verified, 8 implemented in draft, **4 in progress** (G03.4, G06.1, G06.2, G08.2), 24 planned. Native owner Mac, provider sign-in and releases remain not accepted. **Resume Task 481**, prioritize canonical persistent agent activity and native owner system/workspace lifecycle, preserving approved OS/Gateway/Data authority.


## Tasks 481–495: canonical Gateway activity and workspace manifest security, 29 October 2026

[Task ledger](DEVELOPMENT-TASKS-481-495-2026-10-29.md), [Agent Activity runbook](PERSONAL-AGENT-ACTIVITY-2026-10-29.md). The real first-party Agent Activity panel now displays two independent sources: ephemeral Dashboard-local sessions, and bounded persistent canonical Gateway session/run statuses, never raw prompts/outputs. A separate OS-adapter improvement rejects external symlinked workspace manifests/directory aliases and mismatched listing IDs. Last exact source `7fb93973766964a3c8cf98a73a5af47cb24607e2` passed [Dashboard Linux/macOS/Windows CI 40880147089](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147089), [Chromium 40880147102](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147102) and [real Gateway composition 40880147101](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147101). Check the final documentation commit CI separately.

**GB ~41/100 provisional**, formal accepted **15/100** unchanged, 10 chapters/40 milestones (4 verified, 8 implemented draft, 4 in-progress, 24 planned). This is draft source, not user Mac install or approvals. **Next Task 496.**


## Tasks 496–519: trusted TTY host workspace selection, 29 October 2026

[Ledger](DEVELOPMENT-TASKS-496-519-2026-10-29.md) and [owner runbook](TRUSTED-HOST-WORKSPACE-SELECTION-2026-10-29.md). Existing `mc2:local-app` interactive trusted terminal now supports `:workspaces` and `:use <workspace-id>` using real OS registry + workspace manifest, pins registered root/generation and workspace realpath/device/inode, rotates pairing secrets and HttpOnly cookie, revokes all previous browser WS connections, and the first-party browser automatically clears private chats on host revocation. No browser route or RPC can switch workspace; no arbitrary system switch, native login, provider login or user Mac installation is claimed. Canonical run-stream delivery checks active scope before forwarding. The change is source-verified at `4c269f411ee0990e8a784f6542c1f2c13da3283e`, [Dashboard CI 40886502087](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502087), [Chromium 40886502368](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502368), [real Gateway composition 40886502198](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502198), all success; check current docs-head CI separately.

**GB 42/100 provisional**, **FA 15/100 formal accepted**, 10 chapters/40 milestones unchanged: 4 verified, 8 implemented-draft, 4 in-progress, 24 planned. **Next Task 520**, G06.1 native graphical owner selection/approval lifecycle or a different actual owner-backed milestone after source review.


## Tasks 520–548: real owner-approved graphical workspace switching, 29 October 2026

[Task ledger](DEVELOPMENT-TASKS-520-548-2026-10-29.md) and [owner approval runbook](PERSONAL-WORKSPACE-OWNER-APPROVAL-2026-10-29.md). Real first-party **Workspaces** panel displays actual limited OS manifest catalog and submits strictly scoped, time-bound proposal. Only explicitly opted-in trusted TTY can `:approve <id>` or `:deny <id>`, with `:pending` inspection. Invalid request IDs, extra JSON keys, wrong origin, stale OS manifests, cookie replay and self-authorization fail closed; old browser secrets/sockets/turns are revoked and re-pair required. Browser/catalog reads remain separate from privileged RPC. Pinned real canonical Gateway composition executes a genuine `film` run after owner approval, and film persisted session history excludes operator conversations. Async UI state/chooser is fenced across logout, request denial and selection.

Source `072afb8dfb428b57fce7c8c0d126f029d887a7df`: [Dashboard CI 40960567285](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567285), [Chromium QC 40960567514](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567514), [real canonical Gateway composition 40960567259](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567259), [progress 40960567232](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567232), all success. Check the docs-head CI separately.

**GB engineering ~44/100 provisional**, **formal acceptance 15/100 unchanged**. 10 chapters, 40 fixed milestones: 4 verified, 8 draft implemented, 4 in progress, 24 planned. G06.1 is still **in progress**. No private Mac native login, durable owner approval grants/audit trail, signed packaging or production acceptance. **Next Task 549.**


## Tasks 549–554: Scoped canonical Chat library pagination, 30 October 2026

[Task ledger](DEVELOPMENT-TASKS-549-554-2026-10-30.md). The actual authenticated Personal Chat UI can browse canonical Gateway conversation history beyond the initial 20 rows in bounded pages. Exact source `4b6289f8f768052d7e455259532941fccf8434f1` passed [Dashboard Linux/macOS/Windows CI 40970666207](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40970666207), [Chromium 40970666312](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40970666312), [real Gateway composition 40970666397](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40970666397), and [progress integrity 40970666540](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40970666540). Browser QC checked 47 records, exact 0/20/40 offsets, no repeats, and workspace reset without browser-persisted conversation data.

This is incremental hardening of the already implemented G02.2 milestone, **not** independent completion of G02.3 or G02.4: Chat/Gateway remains **8/15 provisional**, overall GitHub/browser **44/100 provisional**, formal accepted **15/100**. Next Task 555 must inspect canonical Gateway/Connections/Token contracts before promising model/provider choice. Owner-granted Stop, attachment/asset ingestion and Skills commands remain separate source/acceptance gates. The source stays a draft PR; the final documentation head needs its own CI result.


## Tasks 555–573: Canonical model inventory and replay-safe reconnect, 30 October 2026

[Task ledger](DEVELOPMENT-TASKS-555-573-2026-10-30.md). The paired first-party Chat now reads the **real canonical Gateway virtual model `aiverse`** via the explicit read-only owner-scoped `aiverse.gateway.models` facade. It clearly states physical provider switching and inference proof are unavailable. Browser cannot inject model/provider IDs, credentials, owner scope or unapproved RPC fields. The real Chat also offers **Reconnect run** only for an interrupted known canonical run, does a live authenticated GET before replay, never creates another run, discards unverified deltas and fences old callbacks by stream generation. Chromium deliberately drops a WebSocket and verifies recovery and absence of duplicate run.create.

Exact functional commit `e94b2fbb7c4d7494525c55e8711a43cc6d167956` passed [Dashboard Node22 Linux/macOS/Windows 40977323923](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323923), [Chromium browser 40977323908](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323908), [real pinned canonical Gateway composition 40977323926](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323926), and [progress integrity 40977323901](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323901), **all success**. Two earlier failed suites revealed and led to fixes for a lingering broken-stream listener and an obsolete event replay race. Documentation-head CI must still be checked independently.

This supports **one provisional Chat/Gateway category increment 8→9/15**, and **overall GB 44→45/100 provisional**. G02.3 becomes **in progress** because authenticated model capability discovery now works, but its physical model switching and run controls are **not complete**. Historical formal acceptance **FA 15/100 remains unchanged**. Milestones remain fixed at 40: 4 verified, 8 implemented in draft, 5 in progress, 23 planned. User Mac, provider login, signed packaging and independent human acceptance remain pending. **Next Task 574:** real owner-qualified provider/model selection contract via Gateway and Connections, then safe run controls, attachments and Skills; never simulate physical options.


## Tasks 574–593: Owner-gated real Stop and canceled-session continuation, 30 October 2026

[Task ledger](DEVELOPMENT-TASKS-574-593-2026-10-30.md). Personal Chat can now **Stop** an active canonical Gateway run by invoking a real authenticated, session-bound and idempotent cancel RPC. This is explicitly **default-deny** at the trusted host. A local interactive TTY operator may opt into `AIVERSE_DASHBOARD_ALLOW_RUN_CANCEL=1` only while the Personal UI has been enabled. The first-party pane only unlocks Stop after an authenticated and scoped Gateway capability response. Underlying Gateway audits the cancellation. Browser cannot pass a generic action, provider key, arbitrary URL, principal or wider command grant. A just-completed run wins correctly over a late Stop by canonical GET reconciliation.

After canonical cancellation the user can send the next message **inside the same Gateway session**, but the unfinished user/assistant pair and streamed partials are never promoted to model context. Tests cover exact-run binding, session mismatch, unauthorized host, denied unapproved pause/approval, malformed payload, OS root rebind between GET and POST, stale A→B→A response, cancel-vs-completion races, interrupted cancel GET recovery, and actual Chromium Stop/continue behavior. The installed connected launcher is tested to refuse the cancel flag when headless, without leaking its bearer.

Exact functional head `f8571dd32630c69a0534ac3d0a2d0684739eafbc` passed [Dashboard CI 41023718870](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718870), [Chromium QC 41023718799](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718799), [pinned real canonical Gateway 41023718875](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718875), and [progress integrity 41023718779](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41023718779), all **success**. Final documentation-head CI requires independent verification.

This is **one provisional engineering category increment**, **Chat/Gateway 9→10/15**, overall **GitHub/browser 45→46/100**; **formal roadmap acceptance stays 15/100**. G02.3 stays **in progress**, not completed: physical provider/model switching, canonical Data attachment admission, Skills/commands, real native owner grants and private Mac release acceptance are still missing. Next Task 594 must establish enforceable Gateway/Connections provider and model entitlements before enabling physical model choice. The PR is draft and unmerged.


## Tasks 594–606: Canonical transcript pages and non-destructive Chat splits, 30 October 2026

[Task and architecture ledger](DEVELOPMENT-TASKS-594-606-2026-10-30.md). Existing G02.2 real Chat history now opens a saved canonical conversation and can request earlier messages **past the previous 50-run limit** through 25-row `aiverse.gateway.session.runs` pages, up to 200 displayed runs. No browser-local transcript persistence. A strict cursor, run-ID deduplication, authenticated workspace/session binding, invalid-page rejection and switch-epoch fencing prevent fabricated or cross-scope history. Older pages are **display-only** and cannot silently become future AI prompt context.

A saved conversation opens into an empty pane or a newly split chat without erasing another live conversation. All three panes in use produces an explicit no-room message rather than overwriting content. The sole minimized idle pane is restored on historical open. Scroll position is maintained when prepending older turns. The actual Chromium browser suite includes a 78-run, 156-message transcript plus split/no-room/minimized regression; controller tests include repeat pages and workspace switching.

Functional source `6d7289562f6d7c2be994f73badb84366acfb0702`; see the GitHub CI jobs at that exact SHA. This is improved implemented-draft **G02.2**, not new formal acceptance or completed G02.3 model selection. **Chat 10/15 provisional, overall GitHub/browser 46/100 provisional, formal acceptance 15/100 all unchanged**. True physical model choices remain blocked by the canonical Gateway/Connections per-model entitlement and run-admission contract, rather than an invented UI switch.
