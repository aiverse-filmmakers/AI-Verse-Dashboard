# Dashboard review, acceptance and merge workflow

**Operator decision: 30 October 2026.** Applies to the existing Personal-first Dashboard roadmap, 10 chapters, 40 G## milestones, and historical MC0–MC7 100-point acceptance ledger. **This is a process change, not a scope rebaseline, new feature, or award of points.**

## Mandatory order for every completed slice

**30 October operator clarification:** The project owner explicitly prefers an AI Code Review skill to perform reviews instead of an externally assigned collaborator for every change. This changes the *technical-review workflow*, not the factual independence of a reviewer, GitHub's self-approval rules, or protected owner/release permission requirements.

1. **Implement** against the current roadmap acceptance criteria and actual owner contract. Record source commit, related owner PRs and explicit unsupported behavior. Do not add work solely to increase progress.
2. **Run tests** on the precise immutable head: relevant unit/security/negative tests, browser flows where visual/interactive, and real pinned canonical Gateway/OS/Data composition where relevant. Record CI run URLs and unfinished matrix jobs; passing fixtures are not equivalent to production authorization.
3. **Code Review skill**: run the pinned AI-Verse Skills `change-review` skill (`code-review` alias) in an explicit reviewer role against the actual diff, surrounding code, exact head CI, negative tests and owner dependencies. Record its P0–P3 findings, disposition, source SHA and reviewer provenance. AI-assisted review **is permitted for the technical review gate by operator delegation**, but when run by the author it is labeled `AI-assisted self-review`, never `independent review`. High-risk auth/permissions/credential/data-loss/paid-provider or release changes additionally need a separately authorized non-author or owner-domain assessment before production authority is granted. Green CI is evidence, not a reviewer.
4. **Accept milestone** only when **its full existing criteria** are met, including any explicitly required independent/owner signoff. Record an explicit acceptance decision in the canonical tracker with accepted SHA, reviewer/owner, supporting PR/CI and any deferred *local-only* gates. Formal MC points increase only if the matching MC gate closes, including required review/merge. G## milestone statuses and provisional GB points follow their separate unchanged rubric. A partially finished milestone cannot be approved by renaming it.
5. **Merge eligible code** to the correct intended base after the documented AI-assisted code review, any additional required independent/owner checks, branch/dependency and test checks. Prefer small, independent PRs; verify the merge commit and post-merge checks. Never merge an entire stacked draft because some of its slices pass tests. Never self-approve via an alternate account or mistake a comment for an approval.
6. **Production/local validation** is a separate, later gate when required: private Mac install, credentials, signed distribution, real provider spend/consent, actor-grant authority and manual usability/owner acceptance. A remotely merged implementation may be disabled or unavailable until this succeeds. Do not relabel remote engineering completion as production acceptance.

**For each status report:** feature state `implemented / tested / reviewed / accepted / merged / owner-local-accepted`, exact SHA, CI status, reviewer status, blockers, next action. Never conflate these states or inflate GB, MC formal, or local readiness.

## Review and merge decision rules

- **Ready for review** requires a narrow diff, pinned CI, known owners and acceptance checklist. Unresolved upstream dependencies must be disclosed. A review packet may be ready even if its dependent feature is incomplete; that does not make the feature ready for acceptance.
- **Accepted** requires scope-appropriate code-review evidence and separately verified owner authority where necessary. AI self-review may clear a low-risk bounded documentation or test gate by explicit operator delegation, but never impersonates an independent reviewer or authorizes privileged effects. The owner may authorize a release/local permission but cannot replace evidence required for a security or contract check.
- **Merge** follows acceptance only for that bounded change, with any owner-specific prerequisite already merged or explicitly isolated. Avoid giant all-or-nothing PR #42; split or reconstruct reviewable incremental changes without rewriting history, dropping scope, or violating the current stack.
- **Hold** on incomplete implementation, failing/missing CI, mismatched branch base, unknown permission boundary, missing owner contract, unreviewed dependent PR, lack of reviewer or unperformed required local acceptance. State the actual cause, not a generic `waiting for approval`.
- **Post-merge check** records merged SHA and green target-branch CI. If this fails, reopen a corrective change and revoke the affected acceptance claim.
- **No feature automatically advances** based on task/commit count. Refresh the status matrix after every reviewed PR and reconcile both `docs/github-chapters-milestones.json` and `docs/github-browser-progress.json` only if source evidence justifies it.

## 30 October catch-up audit

**Audit scope:** existing checkpoint ledgers and milestone inventory, live PR metadata/reviews, exact-head Dashboard CI and owner PR statuses. This is **inventory and evidence triage**, *not* a line-by-line independent security review or private Mac test.

- Dashboard PR [#42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42) is **draft**, stacked on the Dashboard plan branch, with 873 commits/152 changed files as checked, **no requested reviewer and no recorded review**. Exact pre-process-change head `dfa41a9b56a35d1deac015c20e3983e3507dabb8` passed all four workflows: Dashboard CI 41059494224 (Linux/macOS/Windows), browser 41059494331, real Gateway 41059494319 and ledger 41059494375. This is not a review approval.
- **First gate, MC2.1 design (2 historical points):** [Dashboard PR #43](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/43) is ready-for-review, focused on three files against `main`; head `e402febc7304cdda3942019db999d2d61342cdcf`; Dashboard CI 40711556090 successful; **zero reviews** at audit. Independent design review against current owner pins, resolution of findings, merge and canonical acceptance entry are required before formal 15/100 can become 17/100. Approving #43 does not approve #42's code.
- **Review dependency queue:** [Gateway #80](https://github.com/aiverse-filmmakers/AI-Verse-Gateway/pull/80) (session history), [Data #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22) and [Data #23](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/23) (Canvas owner/grouping), [OS #110](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/110) and [OS #111](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/111) (grants) are separate upstream or stacked drafts; verify their own exact-head CI, reviews, merge bases and permission contracts before dependent Dashboard acceptance. Some other connected owners may have additional prerequisites; this list is not a claim of exhaustive cross-repo release qualification.
- **Historical completed baseline:** MC0 and MC1 remain previously accepted **15/100**. Four G01 foundation milestones retain `verified` status with recorded source history, without new points.
- **All 40 G milestones triaged:** 4 verified, 8 implemented in draft (review packets needed), 6 in progress (not eligible for full acceptance) and 22 planned (not eligible). No new independent reviewer exists in the observed PR metadata; do not fabricate one.
- **Recorded scores unchanged:** Chat/Gateway 11/15 provisional, GitHub/browser 47/100 provisional (`sourceAuditComplete=false`), MC formal 15/100 accepted. No private Mac production acceptance.

### Backlog disposition for all 40 milestones

| State | Milestones | Next review action |
| --- | --- | --- |
| Previously verified (4) | G01.1, G01.2, G01.3, G01.4 | Retain historical acceptance; check existing merge/source evidence if challenged, no duplicate credit. |
| Implemented in draft (8) | G02.1, G02.2, G03.1, G03.2, G03.3, G04.1, G04.2, G08.1 | Prepare narrowly-scoped source/diff security and UI review packets; pin owner dependencies, rerun exact-head CI, obtain actual separate reviewer decisions and merge only eligible pieces. |
| In progress (6) | G02.3, G02.4, G03.4, G06.1, G06.2, G08.2 | Evaluate completed sub-slices for independently reviewable PRs; do not mark milestone fully accepted. Physical model admission, binary asset/Skills, native approvals and broader Control Center/UX coverage remain unfinished. |
| Planned (22) | G04.3, G04.4, G05.1–G05.4, G06.3–G06.4, G07.1–G07.4, G08.3–G08.4, G09.1–G09.4, G10.1–G10.4 | No approval claim. Execute when owner contract and roadmap order allow. |

### Cross-repository CI and reviewer verification, same-day follow-up

PR metadata was inspected for Dashboard #41, #43, Gateway #80, Data #22/#23 and OS #110/#111. **All their reported exact-head workflows were successful** at the checked PR heads; none had an independent approval recorded at the time of inspection. #43 is the only focused **ready-for-review** PR in this set; the others remain drafts. CI success does not change their status.

| PR | Checked head | Review state / prerequisite |
| --- | --- | --- |
| Dashboard #41 | `c28b2ec` | Draft Personal-first plan; requires scope review. |
| Dashboard #43 | `e402febc` | Focused MC2.1 design, green 3-platform CI, preliminary non-approving COMMENT review #5718426884 submitted; independent review outstanding. |
| Gateway #80 | `9748dd0d` | Draft, green workflows, session-history owner acceptance pending. |
| Data #22 / #23 | `a62cb730` / `9834e734` | Draft base-plus-stacked Canvas group source, green workflows; owner contract review and merge order pending. |
| OS #110 / #111 | `a9b6eaf` / `d304db51` | Draft base-plus-stacked Canvas grant source, green workflows; security review and merge order pending. |

**Reviewer assignment attempt:** requesting `pkbannutz` for Dashboard #43 failed (GitHub HTTP 422: user is not a repository collaborator). The operator has now delegated the **technical review gate** to the canonical `change-review` Code Review skill. Record AI-assisted self-review and its findings, without pretending it is an independent GitHub APPROVE. High-risk owner/prod gates still require their actual owner-authorized decisions. A GitHub comment can capture the technical verdict even when the author cannot approve their own PR.

### Required near-term execution sequence

1. **Review PR #43 / MC2.1** with the new Code Review skill against actual owner API and Personal-first scope, capture findings and label AI-assisted self-review. An explicitly required independent owner gate remains separate; merge only on the verified applicable scope gates. The reviewer is unassigned as of this audit.
2. **Reconcile PR #41 plan stack with PR #42** and identify small reviewable Dashboard source slices, beginning with the eight `implemented` milestones; validate downstream Data/Gateway/OS stacks and target bases. Do not merge PR #42 wholesale.
3. **Close each independently eligible review**, updating both ledgers and merged source refs in order; retain honest blocked/partial states. Maintain source + signed-off architecture and anti-regression tests rather than merely changing status labels.
4. **Return to Task 675 and the next admissible G06.2 work** after this catch-up review, or continue another already-defined unblocked milestone. Do not bypass G02.3/G02.4 contracts to reach 12/15.

**This audit itself awards no new points or approvals.** Actual reviewer actions and target-branch CI must be observed before later documentation says otherwise.
