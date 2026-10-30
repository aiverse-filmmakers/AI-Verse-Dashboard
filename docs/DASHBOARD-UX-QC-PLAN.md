# Dashboard UI/UX quality plan

Date: 27 October 2026
Owner: Dashboard interface implementation
Status: Review protocol specified; automated interaction coverage still to implement.
Applies: Every user-facing change, including small feedback fixes, new controls, styling, layout changes, and refactors affecting interaction. Current priority is desktop/MacBook use.

## 1. Problem and intended outcome

The operator has repeatedly found ordinary missing behavior immediately after a design update: dragging over text selects text instead of moving the card; selection leaves stale chat references; empty-space dragging pans instead of selecting; connection creation has no visible temporary line; connection deletion is inaccessible; Delete/Backspace does not remove a selected card; and a new note has no usable empty body field.

These are reported failures from the supplied discussion, not a claim that each still exists at the current head.

The intended outcome is that the implementer checks the completeness of each change before handing it back. The operator should review product direction and feel, rather than discover the first basic create/edit/delete failure.

**Trigger the review for every change, not on a daily schedule and not only before a release.** Think through it before coding, exercise it afterward, and repeat affected checks after repairs.

The perspectives below are review lenses for one implementer. They are not claims that six people, independent agents, or real users tested the product.

## 2. Existing path and smallest change

Inspected on source branch `codex/dashboard-source-checkpoint` at `c59325ee2155eeadd214fdfa569e4e9a40ee08ab`. Refresh affected files before implementation because other work may have advanced the branch.

REUSE:
- `apps/web/preview/app.js`: card rendering and inline editing; `setSelection`, `startNodeDrag`, `finishDrag`, `drawConnections`, `removeSelectedEdge`, undo/redo, wheel and keyboard handling.
- `apps/web/preview/personal-shell.js` and `shared-chat.js`: shared chat controls, active chat, canvas reference and workspace notifications.
- `apps/web/preview/VERIFICATION.md`: existing verification record. Continue that record; do not create a second running QA log.
- `test/personal-shell-preview.test.mjs`: parseability and source-pattern assertions. These establish structural facts, not successful pointer, keyboard, focus, or editing behavior.
- Root `package.json`: `npm run check` runs the existing build and tests.

EXTEND:
- Add the per-change quality rule to repository instructions and use this plan for actual user journeys.
- Replace or supplement selected source-pattern assertions with a small number of meaningful behavior tests using the existing browser tooling if available.
- Reconcile stale README, hints, shortcuts, and verification steps with the final implemented interaction contract.

Preserve the quiet chat/canvas layout, existing preview data, workspace separation, and explicit demo labeling. Routine completeness repairs belong within the current feature. Do not add unrelated product features or reopen the overall Dashboard roadmap under the label of QC.

## 3. Before implementing: finish the feature in thought

For every affected item or control, inspect the real entry point and answer these questions. An existing implementation may already supply the answer; reuse it.

| Area | Questions the implementer must resolve |
| --- | --- |
| First use | How is it discovered? Can a beginner start with no sample content? Does an empty field remain visible and editable? |
| Full lifecycle | Can it be created, selected, opened/used, edited/renamed, moved/reordered where relevant, duplicated where supported, deleted, and recovered? |
| Input | What do click, drag, double-click, keyboard, trackpad, focus, and text-edit mode do? Can two actions accidentally compete? |
| Feedback | Can the user see the current selection/mode, a drag or connection in progress, whether work saved, and why an action failed? |
| State and neighbors | What happens to related connections, chat context, drafts, other panes, and workspace state when it changes? |
| Recovery | Can the user cancel, undo, retry, return, or reopen? Does an interrupted action leave a stuck mode or partial data? |

These questions expose missing steps, not a requirement to add every action to every object. For example, a generated image may need a caption rather than editable pixels. Explain material exceptions in the feature's acceptance notes.

Implement ordinary missing steps without requiring the operator to name each one. Ask only if there is a real product tradeoff or ambiguity that cannot be resolved from confirmed direction and existing behavior.

## 4. Six perspectives, five questions each

Apply the relevant perspectives to the changed journey and the features it touches. Do not multiply these into dozens of ritual reports.

| Perspective | Start/discover | Perform the task | Understand feedback | Make a mistake/recover | Continue elsewhere |
| --- | --- | --- | --- | --- | --- |
| First-time user with an empty workspace | Can I find the starting action? | Can I finish without sample content or hidden knowledge? | Do labels and states make sense? | Can I cancel or fix my first mistake? | Can I return and find the result? |
| Everyday creator working quickly | Are frequent actions close to the item? | Can I edit, move, duplicate, connect, and delete as supported? | Is the selected item/mode unmistakable? | Does undo restore related content too? | Do repeated actions and multiselect stay consistent? |
| MacBook trackpad user | Are gestures discoverable? | Do click/drag selection and two-finger navigation do their agreed jobs? | Is movement or connection preview visible? | Do Escape, release outside, and canceled gestures finish cleanly? | Do gestures still hit the right target after pan/zoom? |
| Keyboard and text-editing user | Can I reach and identify controls? | Can I edit text and use supported shortcuts? | Is focus visible and in the right place? | Does Delete edit text while typing and delete cards only in canvas scope? | Do shortcuts stay scoped after using chat, dialogs, or other panes? |
| Distracted or low-confidence user | Is the first screen calm and clear? | Can I take one useful step without a toolbar full of choices? | Are empty, selected, disabled, busy, and error states understandable? | Can I escape a mode and recover without memorizing steps? | Do labels, placement, and interaction patterns stay consistent? |
| Returning user with multiple chats/workspaces | Is my active scope obvious? | Does the action affect the intended item and chat? | Are selection and pending references accurate? | Can I close/reopen a pane without losing unrelated work? | Do save/reload and workspace changes preserve work and prevent stale context? |

Reviewing a perspective is reasoning, not execution evidence. Each acceptance claim below still needs an appropriate observed result.

## 5. Current canvas acceptance contract

Use the operator's latest feedback as the contract when it supersedes older preview notes. Verify on the latest implementation; do not assume the earlier agent's reported fixes passed.

| ID | User journey and expected result |
| --- | --- |
| C1 — Create and edit | Start from an empty workspace. Create a note; title and empty body are both reachable. Enter text, rename, cancel an edit, save, and reopen/reload. Text is retained, including supported multiline content. |
| C2 — Select versus edit | Click selects a card. Drag starting over its non-editing title/body moves the card without selecting its text. Editing starts through a deliberate, documented action; while editing, normal text selection works. |
| C3 — Select versus navigate | Drag empty canvas to draw a selection rectangle. Use Shift/Cmd/Ctrl selection as supported. Two-finger trackpad scrolling pans the canvas. Check zoom and panning do not break hit targets or rectangle coordinates. Provide a usable pointer alternative for navigation. |
| C4 — Selection and chat | Pending automatic canvas-reference chips reflect the current selected items in the intended active chat. Deselect removes them; reselect does not duplicate them. Rename/delete updates them. Switching workspace clears stale pending context. Sent messages retain their own historical context snapshot. |
| C5 — Multiple panes | Select items after using a second chat; verify the correct target. Close the active chat, then select again; fallback is deterministic or an understandable no-chat state. Closing/reopening panes must not copy another workspace's drafts or lose unrelated messages. If removable automatic chips remain, reconcile removal with selection rather than keeping contradictory states. |
| C6 — Visible connections | Start a connection by dragging its handle. A temporary line follows the pointer and a valid target is identifiable. Release on the target to create one connection. Escape, invalid release, pointer cancellation, and release outside must clear temporary visuals and mode. Prevent accidental self-links or duplicate links according to the existing contract. |
| C7 — Remove connections | Single-click a connection to reveal a remove action. Double-click it to break it as explicitly requested. Keyboard removal works when the connection/canvas has focus. It does not trigger background note creation or remove unrelated cards. Undo restores it. |
| C8 — Delete safely | With canvas focus, Delete/Backspace removes selected card(s) and reconciles their links, selection, and pending chat references. While typing in a note, chat, title, search, or dialog, the same keys edit text without deleting cards. Verify `contenteditable="plaintext-only"` as well as input/textarea. |
| C9 — Recover and repeat | Delete a connected group, undo, and redo. Verify card content, positions, connections, and pending selection/context remain coherent. Repeat create/edit/move/connect/delete several times; catch duplicate listeners, stale selection, and one-time-only success. |
| C10 — State and presentation | Check long titles, empty body, multiline text, many selected cards, zoomed canvas, theme, and narrow desktop layout. Controls stay reachable and text is usable. Reload preserves supported saved work; a storage failure must not falsely report saved. Confirm hover, keyboard focus, and selected controls are understandable. |

Use realistic sequences as well as isolated actions. A useful smoke journey is:

**Empty workspace → create two notes → write title/body → drag from text → select both → move → connect → check chat references → deselect → delete link → undo → edit text with Backspace → leave edit mode → delete a card → undo → switch workspace and back → reload.**

Also exercise the same affected behavior through alternative supported entry points, such as a card button and a keyboard shortcut. Fix shared handlers rather than patching each symptom independently.

## 6. Evidence and completion gate for every change

1. **Define the delta:** Record the intended outcome, affected controls, and relevant acceptance IDs before editing. Identify nearby behaviors that can break.
2. **Inspect/reproduce:** Trace pointer/keyboard/focus/state ownership. For a bug, reproduce it when practical. A report is evidence of a problem, not proof of its current cause.
3. **Implement completely:** Include the necessary editing, empty states, feedback, deletion, cancellation, context synchronization, and recovery for the changed feature.
4. **Verify proportionally:** Run the relevant existing checks and real interaction tests. A text-search assertion that a handler exists cannot prove it works.
5. **Repair and rerun:** If a check fails, repair the cause and repeat that scenario and affected neighbors. Do not weaken the check to declare success.
6. **Record and deliver:** Update the existing verification record with exact revision, environment, actions, expected/observed result, and remaining limits. Publish through the existing preview process and verify its deployed revision before saying it is live.

A required journey that was not exercised stays **unverified**. Do not say “ready to use,” “fully checked,” or “all QC passed” while required interaction evidence is missing. A design update may be published for review with that limitation stated clearly.

Status labels: **Passed in browser**, **Automated behavior passed**, **Source inspection only**, **Failed**, **Unverified**, **Not applicable with reason**. A screenshot proves appearance; it cannot by itself prove dragging, typing, or undo.

## 7. Browser-agent limits and automated coverage

The remote agent can inspect code, implement fixes, run repository checks, and—where its environment supports it—drive a preview browser or run browser interaction tests in CI. It does not need access to the operator's Mac to do most of this.

First inspect available browser tooling and current CI. Reuse it. If there is no interaction runner, implement the smallest justified browser-test path in a bounded follow-up change. Cover the recurring failures first:

- New empty note accepts title and body and retains them after reload.
- Dragging from non-editing card text moves the card; editing text does not drag.
- Selection/deselection updates pending chat references and changing workspace clears them.
- Connection drag shows a preview, creates/removes correctly, and cancellation cleans up.
- Delete removes a selected card while text-edit Backspace leaves cards intact.
- Undo restores deleted cards and connections.

Assert visible results and stored state through user actions, not source strings or a recreated toy version of the implementation. Isolate test data; do not reset the operator's real browser storage. If introducing a runner/dependency, explain why existing tools cannot provide the necessary evidence and follow repository conventions.

Synthetic wheel/pointer events can test event logic. They cannot prove the feel of a physical MacBook trackpad. A Linux WebKit run is not a Safari-on-Mac result. Reserve only actual hardware/browser-specific uncertainty for a short local check; do not offload all basic QA to the operator.

Current scope prioritizes desktop/MacBook. Do not add phone-specific features or a new platform qualification program to every small design edit.

## 8. Execution and handoff

**Q1 — Make the protocol discoverable:** This plan plus the root `AGENTS.md` rule. Documentation delivery is not proof that the interface passed QC.

**Q2 — Apply it to the current feedback:** Refresh the latest branch; compare C1–C10 against actual behavior; repair within the agreed design. Update stale hints and verification steps. Record observed evidence in `apps/web/preview/VERIFICATION.md`.

**Q3 — Add the smallest recurring interaction protection:** Inspect/reuse the available browser runner; cover the repeat failures above and wire the relevant checks into the existing CI path. Keep this bounded; expand only for new changes or defects.

Q2 and Q3 implementation remain for the browser implementer. No Dashboard code or new test tooling was changed by this planning task. No roadmap acceptance points are awarded by publishing this plan.

For future changes, use the same protocol with a small set of relevant scenarios. Do not rewrite the QC plan or run every unrelated test for every edit.

Suggested delivery note:

> Changed: [user-visible result]. Checked: [actual interactions and environment/revision]. Still unverified: [only material gaps]. Preview: [link and deployed revision if verified].

This is an ongoing implementation standard. It helps anticipate missing behavior; it does not guarantee a defect-free product or replace the operator's product judgment.
