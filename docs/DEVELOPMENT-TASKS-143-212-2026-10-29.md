# Development tasks 143–212: canonical Canvas grouping and real editor

Date: 29 October 2026 (source branch prepared 28 October, local time).

**70 small implementation/testing slices.** This ledger explicitly counts each individual named regression scenario as a small task, as agreed with the operator. That is a valid *task-activity* count, NOT 70 independent features or roadmap points. Do not use it as a percent or claim all 70 are formal milestone acceptance.

**Chapter:** G03 Personal, Workspace & Canvas.
**Milestone:** G03.4 (partial: real canonical note grouping; workspace lifecycle, asset ownership and production app dispatcher still outstanding).
**Repositories:** Data staged draft [PR #23](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/23) stacked on Data PR #22; Dashboard draft [PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42). No merge/install.

## Data canonical grouping, 36 slices

- **Task 143.** Implement owner-authoritative group storage and five typed edit actions, keeping old board digests stable and the existing SQLite owner/idempotency/history/undo isolation. This includes the focused CI and replay/validation fixes.
- **Task 144.** Native Data regression: original ungrouped Data board keeps exact v1 revision shape.
- **Task 145.** Native Data regression: create group persists canonical IDs, label and multiple members.
- **Task 146.** Native Data regression: group labels trim surrounding whitespace when saved.
- **Task 147.** Native Data regression: legacy notes and edges remain intact after grouping.
- **Task 148.** Native Data regression: groups survive closing and reopening canonical scoped SQLite.
- **Task 149.** Native Data regression: adding group does not change original archived digest or history.
- **Task 150.** Native Data regression: one group edit is one new version and idempotent on replay.
- **Task 151.** Native Data regression: different group operation with same idempotency key is rejected.
- **Task 152.** Native Data regression: group cannot have a single node.
- **Task 153.** Native Data regression: group cannot have duplicate node IDs.
- **Task 154.** Native Data regression: group cannot reference missing nodes.
- **Task 155.** Native Data regression: group ID cannot collide with note ID.
- **Task 156.** Native Data regression: two groups cannot share group ID.
- **Task 157.** Native Data regression: two groups cannot claim one note simultaneously.
- **Task 158.** Native Data regression: independent groups can coexist on separate notes.
- **Task 159.** Native Data regression: rename changes only selected group label.
- **Task 160.** Native Data regression: empty group label is rejected without committing.
- **Task 161.** Native Data regression: unknown group cannot be renamed.
- **Task 162.** Native Data regression: group.members swaps a membership set atomically.
- **Task 163.** Native Data regression: group.members rejects one member and retains old board.
- **Task 164.** Native Data regression: group.members cannot steal nodes from another group.
- **Task 165.** Native Data regression: group.move shifts every member atomically by a validated delta.
- **Task 166.** Native Data regression: group.move validates coordinates and rolls back overflow.
- **Task 167.** Native Data regression: group.move rejects nonfinite deltas.
- **Task 168.** Native Data regression: group.move fails on nonexistent group without any write.
- **Task 169.** Native Data regression: group.remove clears grouping but preserves notes and edges.
- **Task 170.** Native Data regression: group.remove rejects unlisted group.
- **Task 171.** Native Data regression: removing a note dissolves a now-singleton group.
- **Task 172.** Native Data regression: removing a member keeps group when at least two remain.
- **Task 173.** Native Data regression: group revision can be reverted to pre-group v1 board.
- **Task 174.** Native Data regression: group revision can be restored from history after group deletion.
- **Task 175.** Native Data regression: grouped board atomic duplicate preserves group identity and members.
- **Task 176.** Native Data regression: grouped board mutating actor is recorded in canonical Data provenance.
- **Task 177.** Native Data regression: stale group modification denies, leaving existing groups unchanged.
- **Task 178.** Native Data regression: bad group key and malformed group members do not create records.

## Dashboard Canvas grouping, 34 slices

- **Task 179.** Wire strict group Canvas RPC validation, safe projections, real group controls and visual selection in the first-party Personal Canvas UI; prove actual Gateway/OS/SQLite create/retry/agent move/clone/history/undo.
- **Task 180.** Dashboard boundary regression: group.create is a typed write action.
- **Task 181.** Dashboard boundary regression: group.rename accepts bounded text label.
- **Task 182.** Dashboard boundary regression: group.members accepts exact canonical note IDs.
- **Task 183.** Dashboard boundary regression: group.move accepts finite signed displacements.
- **Task 184.** Dashboard boundary regression: group.remove accepts an exact target ID.
- **Task 185.** Dashboard boundary regression: group.create rejects missing members.
- **Task 186.** Dashboard boundary regression: group.create rejects one-member groups.
- **Task 187.** Dashboard boundary regression: group.create rejects duplicate member IDs.
- **Task 188.** Dashboard boundary regression: group.create rejects unknown principal field.
- **Task 189.** Dashboard boundary regression: group.create rejects arbitrary path input.
- **Task 190.** Dashboard boundary regression: group.create refuses malformed IDs.
- **Task 191.** Dashboard boundary regression: group.create refuses forged workspace scope.
- **Task 192.** Dashboard boundary regression: group.members rejects empty membership.
- **Task 193.** Dashboard boundary regression: group.members rejects unbounded membership arrays.
- **Task 194.** Dashboard boundary regression: group.rename rejects whitespace-only title.
- **Task 195.** Dashboard boundary regression: group.rename rejects excessively long title.
- **Task 196.** Dashboard boundary regression: group.move rejects nan displacements.
- **Task 197.** Dashboard boundary regression: group.move rejects infinite displacements.
- **Task 198.** Dashboard boundary regression: group.move rejects excessive displacement.
- **Task 199.** Dashboard boundary regression: group.move rejects browser-supplied approval.
- **Task 200.** Dashboard boundary regression: group.removal rejects unsupported cascade flag.
- **Task 201.** Dashboard boundary regression: old ungrouped boards preserve their original projection shape.
- **Task 202.** Dashboard boundary regression: grouped board projects only public graph fields and group labels.
- **Task 203.** Dashboard boundary regression: invalid group member IDs block projection.
- **Task 204.** Dashboard boundary regression: projection denies overlapping group membership.
- **Task 205.** Dashboard boundary regression: projection denies duplicate group identifiers.
- **Task 206.** Dashboard boundary regression: projection denies group ID collision with note.
- **Task 207.** Dashboard boundary regression: projection denies malformed member list.
- **Task 208.** Dashboard boundary regression: projection refuses unexpected group private field.
- **Task 209.** Dashboard boundary regression: projection denies over 50 groups even if all IDs unique.
- **Task 210.** Dashboard boundary regression: projection refuses non-array groups.
- **Task 211.** Dashboard boundary regression: grouped projection respects document revision.
- **Task 212.** Dashboard boundary regression: Canvas host still rejects group writes without an owner installation.

## Source and verification

- Canonical Data: `src/canvas/index.ts` + `test/canvas-groups.test.ts`, branch `codex/canvas-canonical-groups-v1`, reviewed Data commit `35ebd098fbd809d75ba3727c1c3ead61f2f2f8d3`. 35 named tests; all existing Data tests included in [Linux/macOS/Windows grouping CI 40781700269](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40781700269), **all three green**.
- Dashboard: `apps/gateway/src/canvas-owner-bridge.ts`, `apps/web/src/canvas-workspace.ts`, `apps/web/src/personal-chat.css`, `test/canvas-group-boundary.test.ts`, and `scripts/mc2/ci-canvas-data-owner-proof.mjs`. 33 typed group boundary scenarios. Full actual [Gateway/OS/Data composition CI 40781907477](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40781907477) **green**, plus Dashboard CI/browser QC at that commit **green**. Later UI styling commit requires its own CI results, see latest Action.
- The real composition test proves group create/retry, missing member denial, running canonical bot move, grouped Data clone, old-format history compatibility and historic undo. No second document DB, client-granted permission, or fake group authorizer introduced.
- Desktop installation, native authenticated owner session, production model action dispatcher, provider-owned asset storage and final private Mac acceptance remain pending.

## Progress after these slices

- **Cumulative task IDs:** 8–212 (205 numbered source slices), with Tasks 1–7 retained as historical, not reconciled.
- **GitHub/browser GB:** ~36/100 *provisional estimate* (Canvas category 8→9 based on new functional owner-backed grouping with green source and real integration CI), subject to unchanged broad audit limits.
- **Formal FA:** 15/100 *accepted*, unchanged; MC2.1 independent review pending.
- **Local readiness:** no numeric percentage. Owner-only checks remain.
- **Milestones:** 10 chapters, 40 planned outcomes, existing 4 verified / 8 implemented-in-draft / 28 planned statuses unchanged because G03.4 includes additional owner integrations.

**Next Task 213:** prioritize native owner-authenticated model/app action dispatch or the next genuinely ready owner-backed capability, inspect exact CI/source first, and do not rebuild grouping or counted regressions.


## Final native and composed verification

The latest exact Data grouping code `35ebd098fbd809d75ba3727c1c3ead61f2f2f8d3`
passed native [CI 40781700269](https://github.com/aiverse-filmmakers/AI-Verse-Data/actions/runs/40781700269)
on Ubuntu, macOS and Windows. Dashboard real composition
[40781907477](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40781907477)
passed with the pinned actual Data source and OS Gateway.
First-party UI compiled/tested and browser QC passed at
[40782054673](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40782054673)
and [40782054681](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40782054681).

Final fixed milestone states: **4 verified; 8 implemented
in draft; 1 in progress (G03.4); 27 planned**. No
new formal accepted points were awarded. GB **~36/100
provisional**. Task #213 is next. This proof does not
establish private installed Mac owner identity, approved
model-tool dispatch or account consent.
