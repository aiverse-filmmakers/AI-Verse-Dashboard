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


## Dashboard UX QC plan execution — 27 October 2026, latest verification

**Source revision:** `99513960a610f45939cd4b66249b05deba801eeb` (branch `codex/dashboard-source-checkpoint`). **Live static preview revision:** `900dc11dfb83c7d9b6777dbcf5288895f059f0c1` (same unchanged preview app files; later commits updated tests only). Live Pages deployment [run #40490145129](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40490145129) **success**. Preview https://aiverse-filmmakers.github.io/AI-Verse-Dashboard/ .

### Passed in browser — executable interaction evidence

**Runner:** GitHub-hosted Ubuntu 24.04, Node 22, Playwright 1.58.2 headless Chromium, fresh and isolated browser context per journey, desktop viewport 1680×1150. The tests load the **actual static preview** from a local no-cache HTTP server with its real `app.js`, `personal-shell.js`, `shared-chat.js`, CSS and DOM, not a re-created interaction model. They assert visible outcomes, data persistence and page exceptions. [Browser QC run #40490470748](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40490470748): **10 tests passed, 0 failed**, around 8 seconds of test time. [Full Dashboard CI run #40490479163](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40490479163): **passed**.

- **C1/C2/C8:** Empty workspace → new note with visible empty body → select then edit title and body → reload retained text → drag from card title without selecting text → Backspace edits text while in editor → Escape edit → Delete removes selected card → Undo restores it.
- **C3/C4:** Mouse press-and-drag empty canvas → visible marquee → mouse release selects precisely the cards inside (both a 2-card box and a 3-card box verified); selected cards appear as chat canvas chips; clicking empty canvas removes selection **and** chips; repeated click does not duplicate chips. Synthetic browser wheel moved the canvas transform.
- **C4/C5:** A second chat receives the current canvas selection if it was last active; closing that pane redirects subsequent context to the remaining chat; creating/switching workspace removes stale chip context.
- **C6/C7:** Dragging from connector → temporary connection visible during gesture → release links cards → preview line disappears → single click selects link and reveals removal → clicking remove breaks it → Undo restores → double-click breaks it again.
- **C1/C9/C10:** Three repeated create → select → Delete → Undo cycles, followed by reload; all three cards remain.
- **C5:** Last chat minimizes rather than permanently disappearing and shows a **restore rail**; opening second chat, closing original first, minimizing/restoring second, and restoring its **unsent draft** all work.
- **C10:** Primary and secondary chat resize by pointer drag or keyboard arrows. Widths survive reload.
- **Cross-chat parity:** Close original first, continue with second, split it into another pane, close and restore without losing the Split action or shared controls. All panes expose the same `@` team-first picker, model dropdown, file input, send, Split and new-conversation controls. Actions tested: multiple team/individual tags, full team breadcrumb, model change, file-name-only attachment label, sample suggestions, send and independent new-chat clearing, with the original chat's recipient/model state unaffected.

**Root cause repaired from actual failing browser evidence:** The canvas marquee and connector hit tests used `Array.from($(selector))`, where `$` returns only one HTMLElement; `Array.from` silently produced an empty collection. Replaced both with `document.querySelectorAll`. Earlier source-pattern tests could not detect this. Another failure, a secondary chat losing its unsent draft during pane rerender, was fixed through explicit `paneDrafts` state. Both were retested in real Chromium.

### Automated source/CI evidence

`npm run check` / Dashboard CI passed for Node on Ubuntu, macOS and Windows. `test/personal-shell-preview.test.mjs` remains source-level structural coverage; it **does not** establish browser behavior. `.github/workflows/preview-browser-qc.yml` now runs `test/preview-browser-interaction.browser.mjs` on relevant Dashboard preview changes. Browser dependency was installed in CI without committing a new runtime/production dependency or granting external service access.

### Still unverified / limits

- **Physical MacBook trackpad and Safari/macOS interaction feel** (especially two-finger panning inertia and multitouch), beyond the synthetic Chromium wheel and pointer behaviors.
- **Narrow desktop and mobile for these new chat-resize/lifecycle interactions**, detailed visual styling/readability, native accessibility/screen-reader behavior, and actual touch hardware. Historical responsive checks above apply to an older preview revision.
- **Storage exhaustion, concurrent tabs, cross-browser differences**, and edge-case file chooser behavior outside the tested filename-only demo.
- **Real AI provider model selection, file processing, agent dispatch, paid creative generation, canonical OS filesystem, authorization** are not connected and were not tested. These previews do not supply backend acceptance.

The browser suite and exact tested behaviors are part of **every future relevant UI change** as required by `AGENTS.md` and `docs/DASHBOARD-UX-QC-PLAN.md`. Run applicable behavior journeys and check neighbors before a change is presented as complete. Do not use the source-pattern checks in place of actual interactions.


## Calm focus styling and chat composer parity, 27 October 2026

Operator screenshots exposed a bright blue rectangular focus treatment on the chat composer and canvas, plus a native border/resize handle in the secondary chat textarea. The canvas also used the same blue for its temporary marquee rectangle.

- CSS revision `086452d83a69eae2e0bafd924310fc7e65716ffa` replaces the global blue focus outline with a restrained neutral keyboard focus treatment. Both the primary and secondary chat composers now suppress textarea-native borders, resizing and rectangular focus outlines, while their existing rounded composer border subtly indicates focus. The canvas viewport does not draw a second focus frame; focused nodes use the selected-card accent. The drag marquee remains usable but is faint neutral gray instead of blue and disappears after release.
- Browser regression added in `4ef2b2e71f3f28ae4c26e293d0cc6393c05ad10d` checks the actual focused composer computed styles, secondary/primary parity, focused viewport, selected node accent, marquee appearance and release cleanup.
- **Automated behavior passed:** 11/11 real Chromium interaction tests on Ubuntu, including the new visual-focus behavior test ([run #40491412161](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40491412161)). **Repository CI passed** for the same source revision ([run #40491412060](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40491412060)). Static-preview Pages deployment passed for the CSS source revision ([run #40491328612](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40491328612)).
- **Still unverified:** a manual Safari/MacBook visual and hardware trackpad test of this styling. A computed-style browser assertion is not a human visual review. No backend, real AI, workspace data, credential, or release change.


## Feature explorer UX design handoff, 27 October 2026

**Scope:** existing Personal design preview only, on `codex/dashboard-source-checkpoint`. Implemented `apps/web/preview/feature-explorer.js` (illustrative data and selected-feature detail UI), one extra app-picker entry, a quiet topbar Features entry, Activity shortcut, responsive styling and browser regression tests. **No canonical AI-Verse backend, Core, Distribution, credential, approval or actual schedule action was added.** The feature tour is discoverable in both Personal and Filmmaking areas because the workspace app picker is shared.

**Browser QC evidence:** `test/preview-browser-interaction.browser.mjs` executed in Playwright headless Chromium at [run #40503363677](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40503363677), revision `296740ea658ef9efeb9b3032cb7d787966b536eb`: **13 tests passed, 0 failed**, including two new real-browser feature-explorer journeys and all 11 existing canvas/chat/focus regressions. The new checks confirm 13 feature options, truthful example notices, detail switching, 3-way priority filters (3 essentials, 5 AI work, 5 advanced), search, empty result and Escape to reset, the next-feature control, persisted feature view after reload, return to original Canvas with intact node count, Activity-to-Features path, preserved unsent main chat draft while navigating, and a 760px-width layout without horizontal overflow. The test serves the actual static preview files without mocking DOM handlers. **Dashboard CI** passed across Ubuntu, macOS and Windows ([run #40503363682](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40503363682)); the static Pages workflow for the unchanged source file set last ran successfully at CSS revision `661f9dea95de573872228a208a537f07ef092771` ([run #40503243375](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40503243375)). Later commit `296740ea65` added tests only. Check actual live deployment whenever the source changes further.

**QC views used:** first-use discoverable Features entry, examples explicitly non-live, keyboard-search/escape and button navigation, restoring canvas/app switch, returning browser layout after reload, split chat/draft regressions via existing browser suite, narrow view and dark-theme-independent CSS variables. CSS depends on existing color tokens to avoid blue selection frames or dense monitoring on the initial screen.

**Remaining limits:** this is a **designed feature tour**, not user-accepted art direction or production UI/backend integration. No physical Safari/MacBook trackpad, screen reader or mobile touch hardware test; no actual private Mac OS, live provider, paid request, owner approvals, cross-service orchestration, persisted owner sessions or release artifact test. The source audit is a roadmap for later owner-backed replacement of example content. The standalone UI preview cannot assert service readiness or working scheduler from its sample cards.


## Superseding UI/UX correction: operational application pages instead of repeated feature-tour panels, 27 October 2026

**Operator report:** The previous "Explore features" tour was not an actual usable dashboard: the same three fake text rows appeared for every feature. The requested correction was to inspect the real patterns of Builderz Labs Mission Control and holaOS and design **each AI-Verse feature as a task-appropriate, functioning screen**. Retiring the uniform feature cards was explicitly required.

**Source and scope:** Implemented entirely in the current Dashboard preview review branch (no Core, Distribution, Gateway or other backend changes). Introduced functional-workspaces.js and functional-workspaces.css, reused the existing top-bar Features button, app picker, Personal shell, split chats and Canvas. Removed the previous feature-explorer.js and its unused styling. The CSS uses the existing restrained system color tokens rather than a new theme/framework. The new application area is an embedded sidebar with separately shaped operational pages, rather than a full replacement of Personal.

**Working local-only UI interactions and data shapes:**
- Needs attention: selectable pending/approved/declined requests with real inspector layout; Approve/Decline alters only the sample record.
- Activity: running/blocked/review/completed timeline, progress, event log, pause/resume/retry examples; added five-stage **Task Board** with draggable cards and a keyboard-selectable stage control, plus detailed task inspection.
- AI team: searchable roster, tasks and workload, new assistant planning form.
- Goals: milestones with checkboxes/progress, add goal, pause/resume preview.
- Scheduled work: weekday grid, next/last run table, pause/enable, add schedule and sample wake receipt.
- Conversations: session list with Gateway run/state and transcript example next to real existing shared chat.
- Skills: searchable library, readiness/generation, learning proposal queue and approval examples.
- Knowledge: scoped search and memory source/evidence detail.
- Project data: dense shot-list table with inline status changes, filter/search, add/edit/delete.
- Outputs: artifact gallery and detail/filter views; safe separation between metadata and actual file bytes.
- Usage: seven-/thirty-day token usage bars, attribution and UNKNOWN cost treatment.
- System health: component list, per-service inspector, missing runtime guidance.
- Connections: provider/channel list and explicit authorization/scope inspector.

**Truth and permission:** These records are intentionally realistic **sample fixtures** in memory, NOT the user's personal OS, external provider/account, an installed service, a connected cost API or real file. Nothing in these pages invokes an external model, authorizes a request, changes OS workspaces, grants credentials, schedules a wake, moves a real Bot task or persists canonical Data. The UI is a prototype for the existing owner contracts until C1-C6 integration. The action feedback explicitly says "sample" or "example". No mock owner effect is represented as success from a canonical service. Editing sample records is interactive, but resetting or reloading restores examples; the real apps will need their own authenticated persistence adapters.

**Actual browser interaction proof:** 14/14 headless Playwright Chromium tests passed at branch revision **082a6ec95fff11add0e913c0f57ea965aeca3e0c** on [Dashboard browser interaction QC run 40507672053](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40507672053) (14 pass, zero fail). Includes 11 pre-existing canvas/chat/focus regressions and three replacement/added journeys:
1. Interact with all 13 app-specific pages: approve a sample decision, inspect/pause run, search teams, toggle goal checklist, edit schedule, approve proposed Skill, search Memory, edit/add shot records, filter Outputs, switch chart timeframe and inspect Health/Connections.
2. Preserve draft while navigating, reload, restore Canvas with unchanged nodes, switch via existing app picker, use Activity-to-Features route and maintain no horizontal document overflow at 760px width.
3. **Task Board**: move a task through native select from Running to Review, drag the exact same task into Done via a genuine browser drag/drop gesture onto the destination column header, verify task identity and reopen its detail inspector.
**Dashboard cross-platform CI** also passed for the same exact commit on [run 40507676961](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40507676961). Older intermediate browser runs failed while this behavior was being corrected: main-chat unsent draft loss was fixed in personal-shell.js; a brittle drag target in the browser test was changed to the stage header with exact-task identity assertions; capitalization-only assertions were corrected. Passing results above are on the latest fully exercised runtime revision, not on those earlier failed revisions.

**Pages publication:** The actual UI source had already been successfully deployed in [Publish Dashboard design preview run 40507343871](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40507343871) at source revision **03dd47ed63956d595a4ea6dfad62f8dc354868a3**; the later **082a6ec95f** commit changed only browser tests, so the publicly hosted UI files are unchanged. Preview: https://aiverse-filmmakers.github.io/AI-Verse-Dashboard/ . New docs/QA edits after this section do not change the live behavior.

**Remaining limitations:** No physical Safari/Mac trackpad or screenshot-based aesthetic/user evaluation was completed; Chromium interaction assertion is not owner visual acceptance. No live owner/Gateway/Core/Automations/Bots/Token/Connections integration is implied; no Mac install or provider secrets touched. C1 real Gateway chat and subsequent owner-backed surfaces remain separately gated and unimplemented. Clean UI examples do not substitute for those authenticated runtime contracts.


## Canvas library and always-open Personal scratch, 27 October 2026

**Design correction from owner screenshots:** The original Canvas selector only opened a single spatial workspace; it did not provide multiple named canvases. The Teams chip row visibly escaped the Teams popup on small widths, and the Features grid icon had no reliable sizing/gap. These were defects in the UI, not reasons to build new Core or Distribution logic.

**Result on current Dashboard review branch:** A workspace now owns **one or more independent canvases**, each with its own notes/cards, images, references, connections and viewport positioning. Existing saved \`w.nodes/edges/view\` values are migrated to a named board in \`w.canvases\`; the original live \`w.nodes/edges/view\` remains a backward-compatible projection of the active board so the existing editor, mutations and chat context are reused instead of rebuilt. Old canvas content is not overwritten during migration. Undo/redo is board-scoped and reset on board switches.

**Always-open canvas rule:** The first fresh Personal session displays an **empty Scratch canvas beside the main chat**, with the previously seeded demo Personal canvas kept intact in the library. Existing installations keep their active board content. Opening Filmmaking selects its existing board; returning to Personal selects the Personal workspace again. A saved user's deliberate choice to display the library is not overridden on every reload; legacy default-library state is migrated once to the editor.

**Library workflow:** The Canvases app-picker choice or “All canvases” in the editor opens searchable cards for the current workspace with a miniature preview, card and link counts. Actions include **New canvas, Open, Rename, Duplicate, Favorite, Move to another space, Delete**. Delete requires the exact canvas name; the last board cannot be deleted. Moving to a target workspace/Film project transfers the same board ID and original content; a replacement empty scratch board is automatically created if it was the only board remaining in Personal. There is a maximum of 60 boards per workspace. The move destination is a real existing OS **preview workspace**, not a fictional project category; a new film project can first be created with existing “New film project” UI.

**Notes/References:** The app picker now removes the duplicate “Explore features” entry while the separate dedicated topbar Features control remains. Notes and References list actual browser-persisted cards from **all canvases in the selected workspace**, display the source canvas name, open the correct board and select the requested item. “New note,” “Add link” and “Upload image” use the existing canvas editor handlers rather than new domain stores. Teams popup chip row now wraps and interactive controls cannot stretch its container. Features icon is constrained to 17px with an explicit gap and consistent baseline.

**Security and persistence boundaries:** This functionality is real browser-local interaction persisted in the design preview storage, not a connected canonical OS/Gateway/AI system. A page reload restores canvases. No writes, token access or release changes in Distribution or any of the five shipped Core repositories. LocalStorage quota can limit large data/image payloads, already surfaced in the current editor. Cross-space move is browser-preview state only; backend integration remains gated in C1-C6.

**Testing:** \`test/preview-browser-interaction.browser.mjs\` now traverses the library to enter the seeded board for existing 14 canvas/chat/tool regressions; additional suites exercise fresh empty Personal scratch, per-board isolation, duplicate/rename/favorite/delete, movement into Filmmaking with the same board ID/content, return to Personal, reload, popup bounds, Features icon and removal from app picker. The newest commit has GitHub browser and cross-platform CI **queued at the time this note was authored**; do not describe the updated suite as passing until the current-head results confirm it. Manual real Safari/trackpad and physical Mac owner testing remain separate.

**Release guard:** No canonical backend, Distribution, Core code, provider keys, member package or publicly hosted SaaS features changed. This is source in the existing Dashboard PR #42; read the new deploy SHA and actual CI result before describing it as live or fully accepted.

## Stage 1 eleven essentials and return to MC2.1, 27 October 2026

**Source scope:** `apps/web/preview/app.js`, `personal-shell.js`, `functional-workspaces.js`, `functional-workspaces.css` and the existing Chromium browser suite were updated on PR #42. The Essentials landing page shows all eleven functions, links to their existing views, and distinguishes browser-local working interactions from unavailable canonical services. Connected provider sign-in, real model/chat/Stop, private Memory/Skills, owner usage and health are NOT active.

**New user journeys under test:** (1) all 11 Essentials entry points plus disabled/non-misleading connection and unknown-usage/health UI; (2) main conversation create, local persist, reopen, rename, archive and restore per workspace; (3) valid JSON backup download and rejected malformed import without overwriting active preview data. Existing multi-chat and canvas regressions remain in the same test file.

**Important separate demo boundary:** The original Activity, agent roster and other illustrative feature examples continue to exist for UX exploration. They are not evidence of live runs or actual owner-backed actions. The new Connections, Usage and Health default pages intentionally show not connected/unknown/not checked.

**CI note:** The latest browser and Node runs must be read from the final committed head before claiming this slice is passed or publicly deployed. Older green runs do not certify the new behavior. The next plan gate is still MC2.1 pending (15 accepted historical MC0/MC1 points).

### Stage 1 completed automated browser gate

**Latest verified head:** `eee403ed0f3afae5cd5a11cbdd81985af007cdb4`. Real Chromium interaction workflow [run 40518393498](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40518393498) completed **19/19 passed, 0 failed**, including the three new Stage 1 journeys and retained chat/canvas/workspace/task-board interactions. Cross-platform Node CI [run 40518403285](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40518403285) passed on the same head. The first Stage 1 UI deployment build uses source commit `47fd6c5f61c15f5b13f5b230823161fac50f85cc`, but **its Pages result was still pending at this checkpoint**; do not assert the live website updated until publication succeeds.

Failures caught during the slice were corrected: the feature navigation count was updated for the new Essentials entry, a saved feature page now persists on reload, and the asynchronous backup-validation test waits for its actual toast before asserting. Those are not ignored historical red runs. Only the browser-local UX slice is verified; no real AI/runtime/OS/Stop/credential action.

## MC2.2 host transport note, 27 October 2026

The Dashboard host now includes source for an **opt-in** canonical Gateway bridge (status, run creation, run read) and separate system-bound WebSocket run events. Browser-facing methods are in the typed `DashboardClient`, not in the published static Personal demo. New Node tests use the real Dashboard localhost server with a **synthetic** upstream localhost HTTP/SSE fixture; this is an integration contract test, not a real private AI execution. The feature pages and public preview continue to show their earlier disconnected states. Don't count this host transport as one of the 11 connected features or advertise real model selection/Stop. See the canonical tracker for exact MC2.2 status and remaining binding/control gates.
