# Tasks 649–660: G06.1 owner-backed Control Center run diagnostics

**30 October 2026 | Draft Dashboard PR #42 | G06.1 in progress**

## Roadmap decision

Task 648 verified that real G02.4 binary assets and G02.3 physical model selection remain blocked on missing native owner admission contracts. The next source-backed work was selected from the **fixed plan**, not to make Chat reach 12/15: G06.1, **Systems, workspaces and Gateway health/diagnostics**, already in progress.

A first attempt to add diagnostic methods to the Chat module was **reverted** after the user reiterated roadmap priority. This batch instead integrates the actual canonical Gateway's `GET /v1/runs/:id/diagnostics` into the existing **Workspace Status / Control Center** panel. This is read-only and makes no AI inference, grant, approval or OS effect.

## Engineering slices

| Task | Scope |
|---|---|
| 649 | Rechecked fixed G06.1 milestone and real Gateway `src/server.mjs` authenticated per-run diagnostic endpoint; no invented UI endpoint. |
| 650 | Added workspace-scoped `aiverse.gateway.run.diagnostics` as an explicitly **read-only** typed Dashboard protocol query. |
| 651 | Added host-only bearer-bound canonical diagnostic GET, using existing origin allowlist, size limit, no redirects and cancellation. |
| 652 | Added exact run+session input with strict shape validation. The trusted bridge obtains a canonical run through owner GET first. |
| 653 | Added a narrow host projection that verifies canonical run/session/status, principal, system, workspace and required raw-content safety flags, then emits only finite bounded context/retrieval/archive/fold counts and booleans. Raw prompts, source refs, fingerprints, trace requests, full scope and private tokens never cross browser RPC. |
| 654 | Verified the registered OS root and generation **after** owner diagnostics, before responding. Changed workspace/owner binding invalidates the result. |
| 655 | Included the exact read-only named method in the paired browser's already-authenticated RPC allowlist; no general diagnostic URL proxy. |
| 656 | Added a two-ID **Inspect run** control in the existing Workspace Status panel, not in Chat. User explicitly requests observation; browser never stores run diagnostics or submits a new model request. |
| 657 | Added state, read-only observation and unavailable codes, with responsive controls, keyboard focus and no exposure of private source/credential data. |
| 658 | Hardened UI scope transitions, panel close, new input and overlapping requests: delayed prior results cannot repaint another selected run or workspace. |
| 659 | Added unit, Gateway-like HTTP, full Chromium and actual pinned Gateway composition proofs including hostile data, wrong session, scope root-rebind and real owner Store-run diagnostics. |
| 660 | Updated pinned native browser proof to distinguish five existing health cards from the optional run-inspection card without changing its real owner health requirements. Recorded G06.1 evidence and preserved score acceptance boundaries. |

## What this does and does not prove

This is an actual first-party diagnostic workflow using the canonical Gateway owner source. The pinned composition invokes the real Gateway's authenticated diagnostics endpoint for a genuine deterministic run and asserts private source material is absent from the Dashboard projection. Browser tests run against a Gateway-shaped disposable server for UI details, including delayed response and scope retargeting.

**Not implemented:** approving/denying Gateway tool actions, any binary attachment, physical model choice, provider permission or user credential setup. Diagnostics explicitly do **not** confirm real LLM inference or native owner Mac deployment.

**Score policy:** Chat remains **11/15** provisional; GitHub/browser remains **47/100** provisional; formal accepted remains **15/100**. G06.1 remains **in progress** because the complete multi-system owner-backed Control Center and private Mac acceptance are not finished. Fixed chapters/milestones and counts remain unchanged.

**Next roadmap decision:** continue G06.1/G06.2 if existing authenticated OS owner interfaces support it, or resume G02.3/G02.4 only when Gateway+Connections/Data+OS owner contracts are approved. Do not invent a generic action executor to make progress.
