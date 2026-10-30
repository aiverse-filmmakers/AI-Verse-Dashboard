# Development Tasks 439–453: Scoped workspace diagnostics and browser admission

**29 October 2026.** Dashboard draft PR #42, branch `codex/dashboard-source-checkpoint`.

**Milestone:** G06.1, still **in progress**. This is one real owner-backed feature and a narrow security repair, not 15 separate product features or 15 accepted points.

## Exact task slices

- **439:** Re-read current Dashboard PR #42 head, task ledger, original execution tracker and exact-head Actions runs.
- **440:** Reuse the existing canonical OS `workspace.get` adapter rather than creating another workspace store.
- **441:** Audit the paired-browser RPC boundary and identify broad future-method prefix admission.
- **442:** Replace the `aiverse.gateway.*` and `aiverse.canvas.*` prefix permissions with a finite list of currently implemented methods.
- **443:** Preserve the existing exact paired system/workspace checks for every method, including read-only workspace lookup.
- **444:** Add `workspace.get` only for the already paired scope; do not permit `workspace.list` or system switching.
- **445:** Validate manifest ID, name and status shapes before rendering the selected workspace.
- **446:** Bound display strings and omit filesystem roots, internal manifests, credentials and private attributes.
- **447:** Add a fifth genuine `Workspace manifest` observation to the native-host Personal Workspace Status panel.
- **448:** Preserve independent per-source failure and manual refresh behavior without inventing healthy states.
- **449:** Preserve epoch-based A→B→A stale-result fencing and scoped retargeting for the fifth source.
- **450:** Add seven shape, confidentiality, scope and label-bound unit regressions.
- **451:** Add a genuine localhost cookie-paired HTTP test against a real disposable film WORKSPACE.yaml. Deny another system, operator workspace, global lists, source preview and unreviewed future Gateway/Canvas methods.
- **452:** Extend the actual paired Chromium Gateway composition proof to require the fifth scope-bound request, with honest missing-manifest display and no browser bearer.
- **453:** Investigate repeatable existing full-process restart proof failure. Repair unhandled closed-IPC cleanup and add redacted phase/error-class diagnostics without printing child output or credentials.

## Source and evidence

- Functional source: `apps/web/src/personal-diagnostics.ts`.
- Scope security: `apps/gateway/src/local-app-session.ts`.
- Native tests: `test/personal-diagnostics.test.ts`, `test/local-app-session.test.ts`.
- Paired Chromium: `scripts/mc2/ci-authenticated-browser-proof.mjs`.
- Process restart witness: `scripts/mc2/ci-process-restart-proof.mjs`.
- Functional/security source commit: `aea7544ffe4f2af909df7c75fcdefc117308348b`.
- Hardened restart proof commit: `5c371568dd380440343844bc281766eccb07d124`.
- At initial source commit: Dashboard Node 22 CI [40873533004](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40873533004) success; browser QC [40873532919](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40873532919) success; progress [40873532998](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40873532998) success.
- Real Gateway composition [40873533217](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40873533217) **failed twice** in the process-restart witness due to unhandled closed child IPC, masking the primary error. Task 453 improves diagnostic integrity. **Do not claim exact-head full composition green until later CI verifies it.**

## Current gates

**GB ~38/100 provisional, unchanged pending independent workstream audit and complete new-source composition evidence. FA 15/100 formally accepted, unchanged.**
G06.1 remains in progress. This is **not** native OS system switching, production login, private Mac installation, broad workspace enumeration, full agent control, or production owner acceptance.

**Next Task 454:** Inspect exact source-head GitHub CI, use the newly emitted safe restart phase to fix only the demonstrated defect, and re-run tests. Close the checkpoint and then continue G06.1 or next source-backed milestone. Do not add more mock data.
