# MC2.2: Final owner-security acceptance boundaries

**Checkpoint:** 1 November 2026. **Scope:** Dashboard source only. This record is not a release grant, an independent audit or a change to the accepted 100-point roadmap.

## Newly closed source/CI risks

| Risk and source slice | Status | Evidence |
| --- | --- | --- |
| Timed-out/uncertain canonical run create must not automatically retry | Merged | [PR #70](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/70) / `8b0b7253cbf1309d7789d5a9d3d62df0b89dad1a`; [exact-head Dashboard CI 41329051483](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329051483); [main CI 41329213192](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329213192) |
| OS owner revokes during run-create preflight or bearer resolution | Corrected and merged | [PR #71](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/71) / `6a6154fc08eb0d1d35603df5d9f16c854b1bf142`; final host lease check immediately before Gateway POST; negative tests reject old owner with `GATEWAY_MAPPING_STALE` |
| Old owner consent/control request after asynchronous credential resolution | Corrected and merged | PR #71; final lease guard added to cancel, pause, resume and approval POSTs; explicit negative tests for Stop and post-consent approval |
| Credential resolver outlives request deadline | Corrected and merged | PR #71; abort state checked before any outbound fetch, even when adapter ignores an already-aborted signal |
| Pinned real Gateway + native paired browser after patch | Exact-head passed | [real Gateway 41329741473](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329741473), [native owner/Chromium 41329741472](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329741472), [Chromium QC 41329741489](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329741489), [cross-platform CI 41329741474](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329741474) |

Reviews on #70 and #71 were operator-delegated **AI-assisted self-review COMMENT** events, with actual CI verification. They cannot be described as independent non-author security signoff.

## MC2.2 acceptance checklist, not yet closed

| Owner/contract acceptance item | Evidence and result | Remaining gate |
| --- | --- | --- |
| Typed models/runs/events/cancel/pause/resume/approval transport | Merged host/browser source, pinned actual Gateway composition, tests and safe projections | Source is available; independently validate the complete original client/owner contract against current released owner revisions |
| Gateway scope identity and authorized run creation | Registry root/generation and selected workspace checks now cover async preflight and final outbound dispatch | Separately authorized OS/Gateway security owner must validate the actual actor/principal and final effect authorization contract |
| Privileged Stop/Pause/Resume/approval | Default-deny host grants, current owner lease and pending tool identity checks in source | Confirm actual owner effects remain atomic and revocable after Dashboard hands the request to Gateway; host cannot grant itself a privileged decision |
| Secrets, data provenance and costs | No browser Gateway bearer; no Token-verified cost fabricated; Data Canvas is unavailable without an admitted owner | Private user-Mac configuration and Connections/Token/Data owner admission are not exercised by disposable CI |
| Deployment and recovery | Actual native terminal launcher and real pinned Gateway Chromium pass disposable tests | Private Mac owner installation, secure credential acquisition, restart/recovery, human usability/security and signed distribution remain independent gates |

**Decision:** Code/CI hardening is merged, but **MC2.2 remains 0/3** and formal program **17/100**. Do not infer approval from test count or these comments. Dashboard PR #42 remains draft; do not bulk merge it. The next review should independently assess released OS/Gateway owner authority and source compatibility, then record a separate explicit acceptance decision before raising formal points. Private Mac and paid-provider grants require their own authorized steps.

**Verified post-merge CI for PR #71** at `main@6a6154fc08eb0d1d35603df5d9f16c854b1bf142`: [Dashboard CI 41329957607](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329957607), [pinned Gateway CI 41329957645](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329957645), [native owner browser 41329957649](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329957649), and [Personal browser QC 41329957654](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41329957654), all succeeded. This verifies remote source integration only, not the independent owner-security or Mac installation gate.
