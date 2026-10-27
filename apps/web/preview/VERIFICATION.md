# Design MVP verification

27 October 2026. Local browser preview, not product acceptance.

## Observed passes

- Personal and Filmmaking navigation: film projects appear in both, backed by the same preview object.
- Deterministic chat proposal: sample input created The Mountain Within only after Apply; new film workspace and empty canvas appeared.
- Note creation and editor: changed title/body to Opening sequence; saved text visible on the new canvas.
- Reload persistence: project, message and note remained in browser storage.
- Direct manipulation: dragged a sample card; connector moved with it.
- Connect two cards: selected endpoints, connection appeared; Cmd+Z reported undo and restored the canvas.
- Link validation: javascript: scheme refused with inline error; https://example.com produced a reference card, subsequently deleted via UI.
- Focus mode: chat/overview hidden, canvas expanded; exit control present.
- Light/dark: both inspected on desktop.
- Desktop rendered widths observed approximately1191,1372,1693 and1834 CSS pixels via live app panel changes; no fixed-width main-screen overflow observed.
- Phone390x844 and tablet768x1024 rendered in fixed-width real iframes; top navigation and horizontally scrollable workspaces inspected. Phone chat drawer tested. Its floating toggle initially overlapped composer, moved to top-right and re-inspected successfully.
- Fit-to-cards tested on desktop; all three personal sample cards visible afterward.
- JavaScript syntax check passed; no dependencies or production package manifests changed.

## Limits / not claimed

- Image chooser/import, export download, full keyboard/screen-reader audit, actual phone touch gestures, reduced-motion emulation, storage exhaustion recovery and multiple-tab synchronization were not exercised in browser. Code paths were inspected only.
- No Gateway/model/OS calls; no backend, authentication, owner-boundary or cross-system acceptance is implied.
- 3D, editing, generation, script breakdown, signing/packaging and member release are absent.
- Browser preview storage is disposable prototype state. Workspaces are separate in this demo, not a security boundary.

The original screenshot is a local verification artifact; the runnable source is the reproducible review surface.


## New Personal/Canvas design slice — source-check record, 27 October 2026

The older "Observed passes" above describe **the original preview**, before the unified chat and direct canvas editing changes. They are not evidence that the newest UI interactions have been manually exercised. In particular, the old focus-mode and inspector behavior is superseded by the new design.

### Static verification

- `test/personal-shell-preview.test.mjs` checks JavaScript parseability, same chat composer components, independent closing/reopening, last-active-chat canvas context, recipient scope, inline editing, multiselect, connections, undo/redo and the explicitly non-generating creation planner.
- Dashboard CI is the source-level acceptance gate, across Node on Ubuntu, Windows and macOS. This is not a substitute for graphical interaction testing.

### Manual browser review still required

1. Open with one chat and canvas. Confirm extra chat/teams/tools remain hidden by default.
2. Open two or three chats; use the second; close the original first; confirm the remaining pane persists with an accessible composer. Close the final pane and reopen from the top-right chat button.
3. Click a canvas note after working in a particular chat. Confirm it is tagged **there**, not globally in the first panel. Click more notes and verify removable, deduplicated, scope-aware chips. Confirm the manual "Attach from canvas" button is absent.
4. Click a card title and note body to edit inline; save with Enter/blur and cancel with Escape; tab to a selected card and press F2 for title editing.
5. Use Shift/Cmd/Ctrl clicks and Shift-drag a selection rectangle; drag multiple cards; group/align/duplicate/delete; undo then redo, and reload.
6. Drag the connector between cards, click a line to remove it and undo. Click the connector to create a linked note.
7. Use Create with default model and optional demo examples, choose aspect ratio for image/video, select multiple reference cards, create editable text/image/video/audio demo draft cards, and verify no real generation is claimed.
8. Check macOS, Windows/browser keyboard differences, phone/tablet responsiveness, focus mode, screen-reader labeling and layout with all chats closed.

No screenshots or interactive browser execution of the latest preview are claimed by this document. Backend Gateway/model/OS execution, credits, authorization, real uploads and release qualification remain out of scope.
