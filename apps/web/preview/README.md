# Local creative-shell MVP

Buildless design preview. No dependencies, install or network services required beyond a loopback static server. Serve **only this directory**, never the OS root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory apps/web/preview
```

Open http://127.0.0.1:4173 . Stop with Ctrl+C. It also opens directly as index.html in browsers allowing local module scripts, but HTTP is the supported preview path.

This is sample-data design work, not connected product acceptance. `DESIGN.md` records scope and visual decisions. All browser data uses the isolated `aiverse-design-preview-v1` key on the preview origin. No fetch, model call, telemetry, credential, direct OS write or external script runs. Links open only on explicit click. Image import is PNG/JPEG/WebP under1.5MB. Browser storage may fill; the info dialog exports preview data. No import/reset overwrite flow is included.

Try “Start a film project called The Mountain Within” in chat, then apply the proposal. This is a deterministic demonstration, visibly labelled, not AI. Chat does not claim to perform general work. Real routing requires the canonical Gateway adapter and owner checks in the existing implementation plan.


## Resume remotely

See [remote development checkpoint](../../../docs/REMOTE-DEVELOPMENT-CHECKPOINT-2026-10-27.md). The gallery is at `/inspiration/` on the same static server. Open a gallery image and use Left/Right arrows to move between pictures; Escape closes it. Third-party screenshot attribution is in [inspiration/SOURCES.md](inspiration/SOURCES.md).

The current Personal preview keeps chat available in desktop Focus mode and uses a mobile chat drawer. The interface is still a **static prototype**; no real sign-in or AI connection is wired here.

## Current preview interactions (27 October 2026)

The quiet initial screen is the main chat and canvas, with multiple AI teams under **Teams**. Open another chat with the split control or from a team/member. Each chat has the same demo-model dropdown, `@` team-first multi-recipient chooser and filename-only attachment control. **Every chat can close, including the original first chat.** The header's new-chat icon lets you open a chat again. Selecting a canvas card automatically adds its titled reference as a removable chip to whichever chat you most recently used. Canvas references are *not* manually attached from inside the composer.

Canvas now supports select-first editing (click to select, then click text to edit), Shift/Cmd/Ctrl multiselect, plain click-drag on empty canvas for rectangle selection, trackpad two-finger scrolling to pan, drag-to-connect via each card\'s small connector, group/align/duplicate/delete actions and undo/redo. Delete/Backspace removes selected cards when the canvas is focused. Connection lines show a visible preview while dragging and can be removed with double-click, or single-click then × Remove link. New notes always show a visible empty body placeholder. Selected connections can be removed. **Create** opens a small creative brief for text/image/video/audio, with `Choose for me` default model selection, optional example-model picker and aspect ratios for applicable formats. It creates *editable linked draft cards*, clearly marked as **demo**; it does not generate anything.

Browser-local state uses two preview keys: `aiverse-design-preview-v1` for workspaces, notes and demo chat, and `aiverse-personal-shell-preview-v1` for optional chat/team layouts and draft selections. No preview state is canonical AI-Verse storage. File attachments in chat store labels/metadata only and are never uploaded. Actual image imports into the canvas remain browser-local. Model names, cost and creation states are design examples, not provider capability assertions.

Check the design source in `DESIGN.md` and the new verification checklist in `VERIFICATION.md`. It is not proof of real Gateway, agent teams, AI creation or member release.


## Functional AI-Verse workspace pages (UI/UX preview, 27 October 2026)

**Features** in the top bar or **Explore features** in the app picker opens a full embedded application area alongside existing shared chat. The previous repeated feature-tour panels were replaced and their dead CSS/module removed. Every feature is now a task-shaped interactive workspace based on useful operational patterns from Mission Control and the side-by-side app pattern in holaOS, shaped around real AI-Verse owner APIs.

- **Needs attention:** queue and inspector with example approve/decline controls, Pending/Approved/Declined filters.
- **Activity:** live-run-style timeline, progress, event log, pause/retry examples, and a five-stage **Task board** with drag-to-move and accessible status dropdown.
- **AI team:** assistant roster, task ownership, search, current work and plan-teammate form.
- **Goals:** evidence milestone checkboxes, progress, add/pause/resume.
- **Scheduled work:** weekly calendar, recurring tasks, enable/pause, schedule form and wake receipts.
- **Conversations:** session list, transport/run details and sample transcript next to actual shared chat.
- **Skills:** searchable library, status, generation, usage and learning proposal approval examples.
- **Knowledge:** searchable scoped memory and source/evidence inspector.
- **Project data:** spreadsheet-like **editable production shot-list table** with search, status filters, inline updates, add/edit/remove.
- **Outputs:** artifact library with filters, details, versions and actual authorization boundary.
- **Usage & cost:** token usage chart, seven-/thirty-day switches, attribution, unknown-cost provenance.
- **System health:** component list, readiness differentiation and diagnostic inspector.
- **Connections:** provider/channel list, capability and permissions detail.

All data in these new surfaces is explicitly **sample data** with local-only interactions. Actions modify example records in memory and never call the canonical backend, submit credentials, pay for AI, grant real approvals, install services, or modify user files. The public GitHub Pages preview cannot access a private OS. C1-C6 will replace examples with existing authorized owner projections.

The main Canvas/Notes/References/Activity app picker and shared multi-chat remain; the main chat draft now persists across reloads, matching secondary chat draft behavior. Current app selection remains browser-local. See VERIFICATION.md and the System backend-capability audit for evidence and integration boundaries.
