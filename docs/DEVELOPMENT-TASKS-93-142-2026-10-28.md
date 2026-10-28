# Development slices 93–142: milestones and owner-backed Canvas context

**28 October 2026.** Dashboard branch `codex/dashboard-source-checkpoint`, draft [PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42). These are **50 individually described source/test/documentation slices**, not 50 major features and not 50 GB or formal roadmap points. No production Mac session or model-tool dispatcher was installed.

**Chapters:** 10 defined. **Milestones:** 40 named in `docs/github-chapters-milestones.json` (four in each chapter). Chapter/GB weights fixed to the earlier 100-point scorecard. Milestone acceptance is independent of code slice count.

## Milestone architecture (G01–G10; 10 chapters and 40 named outcomes)

- **Task 93:** Reviewed existing OS/Dashboard/Data draft heads and exact unfinished CI.
- **Task 94:** Preserved separate GitHub engineering, formal acceptance and Mac gates.
- **Task 95:** Defined 10 fixed remote engineering chapters.
- **Task 96:** Named 40 upfront milestone outcomes, four per chapter.
- **Task 97:** Linked implemented/verified milestones to exact existing source.
- **Task 98:** Added machine-readable chapter and milestone ledger.
- **Task 99:** Enforced immutable chapter identifiers and ordering.
- **Task 100:** Bound chapter budgets to the existing fixed GitHub 100-point ledger.
- **Task 101:** Enforced four milestone IDs per chapter.
- **Task 102:** Defined distinct verified/implemented/planned/blocked milestone states.
- **Task 103:** Required evidence for every claimed implemented or verified milestone.
- **Task 104:** Rejected path traversal or absolute paths in evidence references.
- **Task 105:** Verified linked evidence files exist in the repository.
- **Task 106:** Separated milestone counts from formal accepted points and GB weights.
- **Task 107:** Added 15 regressions and Linux/macOS/Windows progress-integrity CI.

## Canonical Canvas context (G03.3; host-only selection)

- **Task 108:** Defined bounded host-only CanvasContextReader interface and snapshot types.
- **Task 109:** Validated exact selection request fields without browser-supplied actor/scope.
- **Task 110:** Pinned target to registered canonical OS root and generation.
- **Task 111:** Denied paused/archived workspace context before owner reads.
- **Task 112:** Required trusted host principal and structurally valid bot-run identity.
- **Task 113:** Reused approved Canvas Data owner authorize(get) for reads.
- **Task 114:** Reused actual canonical owner execute(get), no Dashboard storage.
- **Task 115:** Projected strictly bounded public Data board schema.
- **Task 116:** Checked returned canonical document ID matches intended document.
- **Task 117:** Bound optional expectedVersion to current Data document revision.
- **Task 118:** Refused selected note IDs absent from canonical board.
- **Task 119:** Refused selected edge IDs absent from canonical board.
- **Task 120:** Refused duplicate selections to prevent ambiguity.
- **Task 121:** Limited selected note and edge lists to 16 each.
- **Task 122:** Limited selected untrusted note content to 1,000 characters.
- **Task 123:** Labelled selected note text as untrusted instructions/data.
- **Task 124:** Excluded unselected note text, owner roots and credential fields.
- **Task 125:** Frozen selected context snapshots and nested selected entries.
- **Task 126:** Denied aborted operations before/after asynchronous owner steps.
- **Task 127:** Denied root rebind or unregistration during asynchronous steps.
- **Task 128:** Denied revoked host identity and newly paused workspace.
- **Task 129:** Added 30 context regression scenarios and controlled registry-denial normalization.

## Bounded context-to-agent action (G03.3 / G04)

- **Task 130:** Minted non-serializable in-process context capability using WeakSet.
- **Task 131:** Rejected JSON/model-forged or out-of-process context snapshots.
- **Task 132:** Limited selected action target to a note actually selected by host.
- **Task 133:** Matched selected context system and workspace against a freshly verified Gateway run.
- **Task 134:** Validated model-proposed operation IDs and maximum note text length.
- **Task 135:** Delegated selected text edits to pre-existing typed CanvasAgentActions owner path.
- **Task 136:** Reused Data owner idempotency and optimistic document expectedVersion at effect edge.
- **Task 137:** Added eight selected-note action regression scenarios.
- **Task 138:** Normalized revoked/unregistered agent root to controlled denial.
- **Task 139:** Proved real OS-granted selection through actual Data SQLite owner in disposable CI.
- **Task 140:** Proved real running GatewayStore bot selected-note edit and stale/forged context denial.

## Evidence and handoff

- **Task 141:** Updated pinned real Gateway+OS+Data CI trigger paths and documented selection authority boundary.
- **Task 142:** Recorded chapters/milestones, task ledger, exact CI states and next Task 143.

## Source evidence

- `docs/github-chapters-milestones.json` with 40 upfront milestone outcomes and source evidence refs.
- `scripts/verify-github-milestones.mjs` and `test/github-milestones.test.mjs`; cross-platform `.github/workflows/github-browser-progress.yml`.
- `apps/gateway/src/canvas-context.ts`, trusted host-only Canvas context and in-process minted snapshots.
- `apps/gateway/src/canvas-agent-actions.ts`, selected note write bound to canonical Gateway run/workspace and Data revision.
- `test/canvas-context.test.ts`, 30 Canvas context and eight selected-action regression scenarios.
- `scripts/mc2/ci-canvas-data-owner-proof.mjs`, actual disposable canonical Data SQLite, OS grant reader, GatewayStore bot action and negative controls.
- `docs/CANVAS-HOST-SELECTION-CONTEXT-2026-10-28.md` and `docs/GITHUB-CHAPTERS-MILESTONES-2026-10-28.md`.

## Important acceptance distinction

All 50 **source tasks are committed** but their newest exact-head integration/CI conclusions must be checked. A new test failing and then corrected is not a verified milestone until the corrected source passes. The code is draft/unmerged. Do not award 50/100 GitHub engineering points merely from task count.

Formal roadmap remains **15/100 accepted**; GitHub engineering baseline was **~34/100 provisional** pending exact successful checks and per-workstream audits; owner-local/production still requires real Mac human sessions, grants, connected providers, build/install, approvals and sign-off.

**Task 143:** qualify native installed owner-session authority and real bounded model-to-app context dispatch based on owner contracts. Start by checking current exact CI and reviewing these chapter milestones, then choose the next genuinely blocked/ready milestone. Do not duplicate the context reader, OS grant lifecycle, owner Data persistence or separate progress ledger.


## CI follow-up and provisional GB increment

Source/code `fb85aa4c6af92416b8f2e6c21d19632a5c4a62ca`
passed [real canonical Gateway/OS/Data composition 40775792089](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40775792089)
and [real Chromium browser QC 40775791985](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40775791985).
The final selected-note action tests and context denial
were included. Linux/Windows Dashboard CI passed; corresponding
macOS jobs remained queued last checked. The progress ledger/tests
were reconciled after this commit and require new exact-head
green integrity proof.

We moved the provisional Canvas engineering score **7→8**, making
GitHub/browser progress **~35/100 provisional**. Original MC formal
acceptance remains **15/100**. G03.3 implemented in draft
(not production accepted), while grouping and production app
dispatch remain G03.4. Overall: four verified milestones,
eight implemented/draft, 28 planned. Flexible tasks are
exactly through **#142**; the next new task is #143.
