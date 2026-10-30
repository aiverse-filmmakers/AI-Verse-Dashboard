# Development Tasks 607–627: Real canonical Pause/Resume and externally controlled run reconciliation

**30 October 2026.** [Dashboard draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), branch `codex/dashboard-source-checkpoint`. No merge, deployment, access to private Mac secrets, or changes to the independent upstream Gateway/Connections repositories.

## Outcome

The first-party authenticated Chat application can now **Pause**, **Resume**, **Stop a paused run**, and **Check run status** without creating a second model run or provider adapter. Pause and Resume are existing, durable, authenticated canonical Gateway operations, exposed through a **separate, default-deny, interactive-operator opt-in** at the trusted Dashboard host. Confirmed output and future AI context remain canonical.

The native trust boundary differs from browser button visibility: the host independently authorizes each action, checks exact run + session + owner + workspace, and rechecks the OS root/generation immediately after run GET and before mutating POST. The canonical Gateway owns persistence, approval, principal binding, idempotency and audit.

## Completed slices

| Task | Concrete engineering change |
|---|---|
| **607** | Inspected canonical Gateway `src/server.mjs` run-control endpoint and actual RunEngine `pause()` / `resume()` implementations; found a verified persisted-checkpoint contract. Physical model/provider selection still lacks approved entitlement and catalog ownership. |
| **608** | Added only `aiverse.gateway.run.pause` and `aiverse.gateway.run.resume` to named command protocol with required system + workspace scope. |
| **609** | Added the two methods to paired local browser's exact RPC allowlist; generic approval and arbitrary control are still denied. |
| **610** | Added separately trusted `allowRunPauseResume` host binding; default is false and does not inherit `allowRunCancel`. |
| **611** | Strictly validate exact canonical run ID, session ID and unique operation ID; reject injected actions, principal, provider overrides and arbitrary extra data. |
| **612** | Before POST, verify owner-GET session binding, admissible source state, registered workspace, root identity and OS generation; reject stale grant and terminal-run mutation. |
| **613** | Added typed `DashboardClient.pauseGatewayRun` and `resumeGatewayRun`, no browser token storage or new run.create. |
| **614** | Added controller `checkpoint(pause|resume)` with stream fencing, exact IDs, one canonical operation and GET-only race/uncertainty reconciliation. |
| **615** | Added first-party per-chat Pause/Resume controls, gated by actual authenticated workspace-scoped Gateway status capability. |
| **616** | Added separate `AIVERSE_DASHBOARD_ALLOW_RUN_PAUSE_RESUME=1` interactive TTY+Personal UI host opt-in. Plain headless or noninteractive launch is rejected before Gateway preflight. |
| **617** | Added protocol, local pairing, host allowlist and default-denial regression tests, proving Stop opt-in does not grant Pause and Pause opt-in does not grant Stop. |
| **618** | Added Gateway-shaped authenticated HTTP tests for positive Pause → Resume, invalid session, extra fields, invalid source state, and exactly one control POST per action. |
| **619** | Added controller tests for same-run Pause/Resume with no repeated inference, no unverified context and no false completion. |
| **620** | Added real Chromium click test for operator-authorized Pause/Resume and refusal when switching to a workspace without the grant. |
| **621** | Hardened SSE restart behavior: old partial `assistant.delta` replay must not be shown as *fresh* generation until the actual canonical `run.resumed` event. |
| **622** | Extended replay safety across multiple Pause/Resume cycles by counting needed canonical resume markers. Unknown restored cycles show final canonical GET rather than inventing fresh partials. |
| **623** | Enabled independently granted Stop of paused/recovery-required runs and validated that no implicit Resume is needed. |
| **624** | Reorganized cluttered pane controls: navigation and run controls are separate rows with compact keyboard-accessible actions, explicit disabled states. |
| **625** | Added read-only **Check run** control to detect remote Pause/Resume/Completion from a different trusted client, retaining live stream when still running; GET never creates, pauses or resumes a run. |
| **626** | Extended actual pinned canonical Gateway CI: create a genuine queued run in the **disposable Gateway Store**, pause via authenticated Dashboard RPC, reject foreign-session Resume, resume same run, verify the actual deterministic Runtime and Store finish. Separately prove headless launcher refuses checkpoint opt-in without leaking bearer. |
| **627** | Added browser/UI/controller and OS-root-rebind regression tests, verified four full CI suites on exact functional head, recorded progression and remaining owner gates. |

## Verified CI and limitations

**Exact functional-source head: `bc9a171ad691e6f5cab3551f897b15deb7c5f4dd`.**

- [Dashboard CI: Linux/macOS/Windows, run 41035390400](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41035390400): **success**.
- [Chromium real browser interaction, run 41035390419](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41035390419): **success**.
- [Pinned real canonical Gateway composition, run 41035390399](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41035390399): **success**.
- [Source-vs-formal progress integrity, run 41035390437](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/41035390437): **success**.

The pinned Gateway proof uses a **disposable deterministic runtime and operator fixture**, not the user's Mac installation or a real GPT/Claude subscription. The Chromium browser uses a Gateway-shaped fixture for interactive controls and browser state; actual canonical service persistence is verified separately in the pinned Gateway composition job. **CI passing does not mean signed native production integration or private owner approval.**

**Provisional Chat + Gateway 10→11/15**, **overall GitHub/browser engineering 46→47/100**: one genuine new persistent run-control capability plus remote state reconciliation. **Formal accepted stays 15/100**. Fixed 10 chapters / 40 milestones, 4 verified, 8 implemented in draft, 5 in progress, 23 planned. G02.3 stays **in progress**; physical model selection and owner-approved credentials/entitlements remain unimplemented. Chat attachments/Skills still need canonical Data/OS owner admission. No merge/deploy.

## Next Task 628

Establish a **canonical Gateway + Connections owner-issued, revocable workspace-scoped physical model catalog and run-admission contract** before allowing a provider picker. If upstream owner's contracts are not yet writable/approved, continue real canonical Data attachment references or OS-backed Skills/commands rather than representing an unavailable provider as selectable. Confirm owner Mac operational deployment and consent separately.
