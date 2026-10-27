# Dashboard implementation instructions

## UI/UX quality for every change

For every user-visible Dashboard change—including each individual feedback fix, interaction, control, layout or styling update—read and apply [the Dashboard UI/UX quality plan](docs/DASHBOARD-UX-QC-PLAN.md).

Before implementing, reason through the complete affected user journey using the plan's user perspectives: first use and empty states, create/use/edit/delete/recover, mouse and trackpad gestures, keyboard and text-edit focus, visible feedback, and related chat/workspace state. Reuse existing behavior. Repair ordinary missing steps within the agreed feature without waiting for the operator to name them; ask only for a material unresolved product decision.

After implementing, exercise the changed journey and affected neighbors, fix failures, and rerun relevant checks before reporting completion. Use observable browser behavior for interaction claims; source-pattern assertions alone do not establish usable editing, dragging, selection, deletion, focus or recovery. Distinguish automated behavior evidence, real browser/hardware observations, source inspection, and unverified cases. Never claim simulated perspectives are independent human/user tests.

Continue the existing verification record in `apps/web/preview/VERIFICATION.md`; do not accumulate parallel QA logs. Verify the deployed revision before claiming the live preview contains a change. If the environment cannot run browser checks, complete available work and explicitly identify the remaining unverified interactions; do not label them passed or transfer all routine QA to the operator.

Apply this proportionally to each change, not as a daily task or a full unrelated audit. Current UI priority is desktop/MacBook. Preserve the calm, simple interface and existing scope; QC does not authorize unrelated features, backend changes, credentials, paid calls, merges or releases.
