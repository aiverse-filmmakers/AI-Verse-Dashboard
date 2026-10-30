# Tasks 481–495: Persistent canonical activity + OS workspace owner hardening

**29 October 2026**. Dashboard draft PR #42, branch `codex/dashboard-source-checkpoint`. Fifteen small development, test, review and handoff slices after Task 480; two integrated work packages, not fifteen new independent features.

- **481:** Audit actual canonical Gateway session/run transport and existing strict system/workspace binding.
- **482:** Preserve the Dashboard-local and persistent canonical Gateway activity owners as distinct truth sources.
- **483:** Use the existing authenticated Gateway `session.list` and `session.runs` RPCs, not a duplicate query or data store.
- **484:** Bound the canonical page to three sessions and run status pages to two sessions × three runs.
- **485:** Validate canonical source, workspace and session IDs, preserve scope, restrict status/date render and strip prompts/outputs.
- **486:** Update the first-party Agent Activity panel to show independent persisted Gateway summary and local SessionStore summary.
- **487:** Render honest partial availability if either owner or a run history page is unavailable, preserving stale-result fencing.
- **488:** Extend projection unit tests for private transcript exclusion and hostile cross-session/workspace responses.
- **489:** Extend the real Gateway paired Chromium proof to check canonical history read-through and existing local filter controls.
- **490:** Correct the browser test to count only local event rows after the new persistent source added independent rows.
- **491:** Audit OS `listWorkspaces` and `getWorkspace` for symlinked manifest and directory alias traversal.
- **492:** Require real files and real workspace directories, reject symlinked manifest paths and mismatched manifest ID in the read-only catalog.
- **493:** Add real outside-manifest symlink, directory-alias and mismatched-id regressions without exposing private file contents.
- **494:** Verify source, Chromium and real pinned canonical Gateway composition against the exact source revision.
- **495:** Update project handoff, owner runbook, scorecard and fixed milestone ledger, preserving original formal acceptance.

## Verification

Functional canonical activity source: `93397cad32e709b27115ef853fc2d8de3cd4cb6c`.
Current OS hardening source: `7fb93973766964a3c8cf98a73a5af47cb24607e2`.

At `7fb93973766964a3c8cf98a73a5af47cb24607e2`:
- Dashboard CI, Linux/macOS/Windows: [40880147089](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147089), SUCCESS.
- Chromium browser interaction: [40880147102](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147102), SUCCESS.
- Real canonical Gateway / OS / Data composition: [40880147101](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147101), SUCCESS.
- Progress integrity: [40880147139](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147139), SUCCESS.

**GitHub/browser ~41/100 provisional engineering** (+1 Control Center for independent persisted Gateway status), **formal FA 15/100 accepted**, unchanged. Full production Mac owner state and release acceptance still unmeasured. G06.2 remains **in progress**, never verified/accepted. 10 chapters/40 milestones, 4 verified, 8 implemented draft, 4 in-progress, 24 planned.

**Next Task 496:** Reconcile actual native owner authentication/grants/approvals and workspace selection lifecycle, or narrow provider/asset source work. Preserve OS/Gateway/Data ownership and prior tests; do not elevate the paired browser to global listing or write approvals.
