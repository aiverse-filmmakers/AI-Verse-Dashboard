# GitHub-first development: chapters, milestones and flexible tasks

> **Review and acceptance order, effective 30 October 2026:** The operator approved a mandatory sequence: **implement → exact-head automated tests → distinct reviewer/source-security assessment → full milestone acceptance → merge eligible isolated code → private owner/production validation when required**. Follow [the canonical review and catch-up workflow](REVIEW-ACCEPTANCE-WORKFLOW-2026-10-30.md) before awarding any new `verified` milestone, increasing formal MC acceptance or merging a development PR. Review and merge are distinct from private Mac release. No self-approval, green-CI-only acceptance, or task-count-based scoring. Current inventory at adoption: **4 verified, 8 implemented in draft, 6 in progress, 22 planned**; Chat 11/15, provisional GB 47/100, formal MC accepted 15/100, unchanged.

**28 October 2026. Scope:** current Personal-first AI-Verse Dashboard
with the first narrow Filmmaking feature. Full filmmaking/3D
production suite is **not silently counted** in this initial 100%.

## The stable denominators

**10 engineering chapters and 40 outcomes/milestones** are defined in
`docs/github-chapters-milestones.json`, with four milestones per
chapter and names that reflect the current implementation plan.
`scripts/verify-github-milestones.mjs` checks the names, IDs,
source links, state vocabulary, weights, scope and totals. Changes
to chapter totals, milestone IDs or Personal-first scope require
a recorded plan rebaseline, not a silent change after a task batch.

The 10 chapter weights **are exactly the same fixed 100-point GB
budget** in `docs/github-browser-progress.json`. This is a remote
engineering scoring rubric, **not** the formal MC0–MC7 accepted
roadmap. All chapter milestones retain explicit tested source and
named owner requirements before moving to verified.

Milestone states mean:
- `verified`: known checked engineering/source milestone with
  evidence (currently four MC0/MC1 foundation outcomes).
- `implemented`: code/review packet exists but a remaining gate
  (e.g. draft PR, independent architecture review, production
  authority or acceptance) has not been closed.
- `planned`: the acceptance outcome is named but not complete.
- `blocked`: a demonstrated prerequisite blocks closure; report
  the exact owner/dependency and next safe action.

**Task slices** remain flexible and small; their numeric IDs are
permanent and additive. Task counts communicate development activity,
not total program completion. Creating 50 unit cases does not award
50 roadmap or GB points. If a task fails CI, keep its code/task
checkpoint marked `pending verification` until the exact commit
passes. Rework is tracked transparently; do not silently mark failed
code complete.

The separate indicators are:
1. **GB**: GitHub/browser engineering points / 100, provisional
   unless per-workstream source and CI have been audited.
2. **FA**: official originally weighted MC acceptance / 100,
   still **15/100** until reviewed independent acceptance.
3. **LR**: actual native owner Mac/account/release gates,
   list blockers instead of inventing percentages.
4. **Milestones**: verified / 40, plus implemented-in-draft /
   40, planned / 40.
5. **Cumulative task ID**: last source slice ID and number of
   individually recorded verified/pending steps. IDs are
   not completion percentages.

## Reporting after each batch

Report `Chapter G##`, `Milestone G##.#`, exact completed
and pending task slices, pinned CI pass/fail/queued states,
GB estimated/evidence status, FA accepted points, and
owner-local blockers. Link to original tracker/handoff
rather than creating an independent or contradictory plan.

The milestone inventory is a fixed planning baseline, NOT 40
automatic feature completions, and does not authorize merge,
privileged grants, paid provider calls or owner Mac access.


## Progress state extension, 29 October 2026

The finite 10-chapter / 40-milestone denominator did not change.
A fifth state `in-progress` now identifies a *partially delivered
but not milestone-complete* outcome. G03.4 is in progress: Data-owned
grouping and the functional Canvas group editor are committed
and verified in disposable CI, but real workspace lifecycle,
creative assets and production model-tool action dispatch remain.

Current categories: 4 verified, 8 implemented-in-draft,
1 in-progress, 27 planned. The 36/100 GitHub score is an
independently **provisional engineering estimate**; the
15/100 MC formal accepted score has not changed.
