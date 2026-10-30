# Tasks 670–674: G06.2 truthful approval-required activity without authority

**30 October 2026 | Draft Dashboard PR #42 | G06.2 in progress**

| Task | First-party source change and verified boundary |
|---|---|
| **670** | Confirmed existing canonical Gateway statuses in RunEngine, including `awaiting_approval`, `resuming`, `paused_recovery_required`, `paused_no_progress`, `budget_limited`, `parked` and `no_progress`. The existing Agent Activity projection previously labeled these unfamiliar statuses `unknown`. |
| **671** | Extended the strict known-status allowlist for actual persisted Gateway run-history rows. This does not forge or infer a run status, nor does it reveal private messages, tool requests or pending approval instructions. |
| **672** | Read-only Agent Activity now labels `awaiting_approval` as **awaiting owner approval (read-only)**. No Approve/Reject controls, raw tool actions, workspace grant changes or Gateway approval POSTs are introduced. |
| **673** | Added an optional **Approvals** filter over actual locally observed `approval` event kinds, with existing 12-event limit and owner-projected role/timestamp only. |
| **674** | Added exact-status and private-field negative tests, Chromium test of canonical persisted-session approval-required state and verification that no approval action is invoked. Preserved existing OS scope/retarget fences and zero browser transcript storage. |

These are real read-only G06.2 activity improvements. They do **not** implement action approval handling, audited approval receipts, autonomous task execution or scheduled automations. Those are separate owner-granted milestones G04/G06.2, not an implication of a status label or filter.

**Provisional scores unchanged:** Chat+Gateway **11/15**, GitHub/browser engineering **47/100**, formal accepted **15/100**. G06.2 remains **in progress**, not formally verified or deployed to the private Mac.

**Next Task 675:** continue the existing owner approval-receipt read-only path only if canonical OS/Gateway owner contracts supply verified receipts and scope, otherwise move to another existing milestone with real owner-backed source. Never create an arbitrary browser approval/action endpoint.
