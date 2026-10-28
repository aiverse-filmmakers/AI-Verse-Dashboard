# GitHub/Browser Build Completion Scorecard

**Created:** 28 October 2026
**Purpose:** answer the operator's question, "When have we finished 100% of what we can build in GitHub and the browser, before my Mac is needed?"

## Three separate measures: never conflate

1. **GitHub/browser build completion (GB)**: 0–100% of the defined **remote-capable current Personal-first Dashboard implementation scope**, including code, owner integrations, testable functionality, disposable CI, browser interaction testing, CI-based unsigned desktop packaging, acceptance packets and source handoff. This is **not** a fraction of the formal 100-point program. A GB score of 100 means no further *defined remote-capable* engineering/review/preparation is known and the remaining gate is clearly owner/local/account/release acceptance. It is **not** the fully installed application, signing, private user credentials or permission to release.
2. **Formal roadmap acceptance (FA): 15/100 (15%) as of this checkpoint.** This original MC0–MC7 score advances only through its existing approved and evidenced gates. Draft PRs and GitHub source slices do **not** raise FA. MC2.1 independent review + Personal-first scope reconciliation remains its next +2 point gate (17/100 if approved).
3. **Private-machine/release readiness (LR): not numerically scored until there is a verified owner-local checklist and approved installer/release protocol.** Report concrete missing checks instead of inventing a percentage; a disposable Mac/Qwen trial cannot count as private production acceptance.

The historic **90–93/100 formal-roadmap pre-local** ambition was an aspirational ceiling under a DIFFERENT denominator. It is **not GB=90–93%**, not actual progress, and not a target that prevents reaching **GB=100%**. If complete remotely, GB=100% may coexist with FA<100 and unperformed owner-local gates.

## GB scope and the provisional baseline

**Current provisional engineering estimate: ~37/100 GB points (~37%).**
This is a **planning estimate**, NOT a full independent code audit or a formal accepted score. The verified minimum is the older MC0+MC1 15 points, but the Personal Chat, Canvas, Data and actor-grant source/CI since then substantively increase remote work completed. Rounded category partials below represent **estimated** readiness based on the checked 28 October branch, not claims of accepted gates. Do not report decimal precision. Revise category points against pinned source/CI with an explicit audit and record evidence before treating the score as verified.

| Remote-capable current-scope workstream | Fixed GB budget | Provisional earned | Known evidence / main remaining work |
| --- | ---: | ---: | --- |
| Preserved architecture, provenance, OS/Gateway runtime proof | 15 | **15** | MC0/MC1 accepted and recorded; maintain architecture |
| Real Personal Chat, Gateway transport, identity/scope, runs and recovery | 15 | **8** | Actual pinned Gateway chat + restart/reload evidence; finish native provider/model/commands/attachments/control acceptance |
| Personal app + workspace + persistent Canvas + app actions | 15 | **10** | Data-owned Canvas history/notes/edges/undo, host+agent guards and native selected app context; still needs grouping, asset ownership and production model action round-trip |
| Native OS operator/agent identity, grants, approvals | 10 | **2** | Draft OS grant verifier and disposable Gateway integration; no installed human session issuer, grant lifecycle, approval receipts or Windows ACL |
| Real providers/connections, generation jobs and owned creative assets | 10 | **1** | AUTH-1/Connections exploratory source; real connected provider lifecycle and actual image placement unavailable |
| Owner-backed control panels: Brain, Memory, Skills, Automations, Token, Connections, security, agents | 15 | **0** | Do not claim integrated functional owner projections from static reference pages; choose/validate owner interfaces |
| First specifically scoped Filmmaking specialist feature | 5 | **0** | Define minimal testable first film tool, not the undefined complete future filmmaking suite |
| Product UX, accessibility, responsive/focus and regression | 5 | **1** | First-party UI/Chromium tests exist; full reviewed accessibility and usability pass pending |
| CI-built macOS desktop package, supervised Gateway and installer preparation | 5 | **0** | Local launcher is NOT signed/reviewed desktop package; create true installable CI artifact with owner boundaries |
| Independent remote security, release evidence and handoff closure | 5 | **0** | Green component tests and handoffs do NOT equal independent whole-system security/release review |
| **Total** | **100** | **37 (provisional)** | **63 estimated GB points remaining** |

### Progress rules

- Keep **GB budget 100** fixed for this version of the Personal-first scope. Specialist filmmaking's **first narrowly defined feature only** is included, not every future video/3D/editor product concept.
- Award GB points for a **source-backed real capability with verified CI and clear owner contract**, not for a count of chat turns, commits, tasks, mockups, documents or static preview controls. Draft source can earn *engineering* progress if the CI evidence is real; this alone does not earn FA points.
- A new test failing or a security gap changes the relevant GB category to **pending** or reduces its estimate; it does not earn points simply from code churn. Run reports must state green/pending/failed separately.
- When an item is blocked exclusively on owner Mac permissions, account consent, real private identities, signing, installed private credentials or subjective local acceptance **after all remote-code work is done**, record a **local gate**; do not hold GB points for that owner step. When code or CI is still missing, it remains **GB work**.
- Before every batch, check actual branch heads, owner repos, workstream evidence and what can honestly be done remotely. After each completed batch report **GB N/100 (estimate vs independently audited)**, **FA N/100 (accepted)**, **LR blockers**, and **batch slices X/Y**. A new chat MUST NOT revert to showing FA 15/100 as the only progress indicator.
- Show a remaining-GB workstream breakdown and the **next increment that can change GB**, not just "more tasks."
- If user expands scope (e.g., full Film 3D camera/lighting/edit suite), explicitly version this scorecard/rebaseline the denominator; do not silently dilute or falsely preserve percentages.
- The 37/100 provisional estimate is **not an independently audited source-by-source inventory**. The next bounded task should replace the estimates with verified per-workstream subdeliverables and distinguish `green CI`, `draft`, `merged`, and `local-accepted` evidence. In the meantime say **"~37% provisional engineering estimate"**, not "37% verified finished."

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
