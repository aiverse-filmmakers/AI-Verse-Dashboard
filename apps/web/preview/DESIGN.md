# AI-Verse creative shell: review draft

Local visual MVP, 27 October 2026. Not accepted production UI, the implementation direction is proposed in Dashboard PR #41. Published as a review checkpoint with operator authorization; no product acceptance implied.

## Brief and reference boundary

Inspired adaptation of the operator's six supplied references. Preserve top-level tabs, scene/canvas composition and advanced tools as contextual surfaces. Deliberately remove reference chrome, permanent inspectors, neon orange outlines, dense toolbars and simultaneous specialist tools. The references are not bundled or published.

Personal includes all workspaces. Filmmaking filters the same workspace objects to films; it is not a duplicate storage tree. The underlying Core remains domain-neutral. Chat remains visible beside the working surface. A future owner-backed conversation may propose creating/updating a project; this browser sketch demonstrates an explicitly applied proposal, not inference or OS execution.

## Visual grammar

- System sans, platform-native feel. 34px medium title, 13px body, restrained hierarchy.
- Light base #f5f5f7, white surfaces, ink #252528, muted #75757d, dividers #e5e5e9, accent #bd5429. Orange denotes intentional selection/action, not every outline.
- Chat 300px, remaining width devoted to workspace/canvas. Top tabs 76px high; whitespace separates areas. 8/12/20/38px spacing rhythm. Compact controls have distinct labels or accessible names.
- Notes read as notes; workspace cards read as navigation, not metrics. Inspector appears only after selection. Focus mode removes navigation clutter around the canvas.
- User-triggered state changes only; reduced-motion disables transitions. Light and dark are supported. Mobile has the same top tabs and a labelled Chat toggle; canvas controls remain available.

## Design fingerprint

1. Information architecture: Personal as inclusive overview, Filmmaking as focused view over the same projects.
2. Navigation: two top area tabs plus a horizontal workspace selector.
3. Layout: persistent conversational left pane beside one spatial working surface.
4. Density: quiet shell, content-driven canvas, contextual editing.
5. Typography: platform system type, medium weight, limited scale.
6. Materials: flat neutral surfaces, softly tinted paper notes, restrained borders.
7. Interaction: drag/pan/zoom canvas, edit via inspector; chat-to-workspace proposal.
8. Motion: small state transitions; no ambient movement.
9. Primary composition: conversation alongside a spacious board.
10. Signature: a conversation opens a project in the same working space.

Compared with the supplied refs, navigation is simplified to two areas, the tool rail becomes a small canvas toolbar, and no inspector is permanently open. These are structural changes, beyond a palette reskin. No cross-product/private design sources used.

## Working vs deferred

Working: area/workspace switching, canvas notes/links/images, editing/deletion/undo, connections, pointer/keyboard movement, pan/zoom, theme/focus, local persistence/export, deterministic demo chat proposals. Workspace data and messages remain separate per selected sample workspace.

Deferred: real Gateway/AI/OS data, canonical ownership/authentication, real project inference, native packaging, 3D blocking/camera simulation, generation, editing, script breakdown and multiuser sync. Browser localStorage is only a design-preview store, not an admitted production domain owner. No credentials or private OS data loaded.


## Reference feedback, 27 October 2026

Direct operator feedback during review: HolaOS was the initial strongest visual preference, superseded by the later Kylon preference below. TenacitOS is also appealing, especially tabs and icons, but is too colourful and feels generated/crowded. Preserve visibility into automations, tokens, spend, sessions, agents and fleet status, drawing on TenacitOS and Mission Control. Combine this operational visibility with a calm interface and progressive disclosure; this is design input, not proof those features are connected or an instruction to expose every metric on the default canvas.

Additional requested visual references: the real xAI Grok Bot (distinct from Gawkbot), Kylon and Cursor. Official published demonstrations were captured and added to the local inspiration gallery. Do not infer a settled filmmaker-only audience pivot from this feedback.


## Updated reference preference: Kylon first, 27 October 2026

The operator now explicitly prefers Kylon most for this Dashboard: clean presentation, multiple Bots and potential human collaborators, two or three chat tabs/panes, and an application panel alongside conversations. Kylon supersedes HolaOS as the leading visual/interaction reference; HolaOS remains useful secondary inspiration.

Keep Grok Bot’s roster/presence panel as a reference for the later multiple-agent surface, alongside Kylon’s people/agent organization. Preserve the earlier wish for restrained operational visibility into automations, tokens, spend, sessions, agents and fleet status.

This records design preferences for later iteration. It does not implement multi-agent execution or shared-user accounts, expand the minimum MVP to multiuser infrastructure, replace backend owners, or amend the accepted Mission Control roadmap. Exact chat arrangement and application-panel placement remain design choices to test.


## Workspace creation and chat placement, 27 October 2026

Operator requirement: workspaces support both automatic and manual creation. Ordinary standalone chat and chat associated with a workspace are supported without requiring workspace selection before first chat. The earlier workflow terminology was ambiguous; the operator subsequently challenged it, so a distinct workflow container or workflow UI is not an established requirement.

Implementation interpretation to review: start a general conversation in the selected OS's personal/operator context; when a substantial project is clearly established, use the canonical OS workspace creation/routing path, reuse an existing matching workspace and make any active context change visible. Ask a brief clarification only when project identity or intended scope is genuinely ambiguous. A casual mention should not create a workspace per message. Manual creation remains available.

A chat's attachment or link to a project/workflow does not authorize copying its entire history, accessing another workspace or silently expanding permissions. Moving/linking existing conversation context requires explicit scoped semantics in the connection design. These are desired behaviors, not implemented capabilities of the deterministic preview.


### Terminology correction

The operator challenged the assistant's introduction of “workflow” as an extra product concept. Do not treat the earlier wording as approval for a separate workflow layer. Explain a workflow only as steps for doing something when relevant; retain the minimal confirmed chat/workspace model. No workflow feature was implemented or added to the accepted roadmap.


## Confirmed direction — Personal foundation, 27 October 2026

Personal comes first. Chat must stay visible across Personal, workspace/canvas and Filmmaking views, understand bounded current app/selection context, and perform scoped app actions through the same validated operations as manual edits. Focus mode must preserve chat. Add real supported provider/model/reasoning selection, attachments, commands and skill mentions; keep conversations, capabilities and usage consistent across tabs without leaking private workspace content. Canvas arrangement/connections and real image creation are separate verified action gates. These are product requirements, not claims that the current demo implements them. See the Dashboard living plan for the local scope amendment and pending backend contracts.


## Personal progressive-disclosure design checkpoint, 27 October 2026

Operator refinement: **Teams must not replace or overtake chat.** The default Personal view remains the original quiet two-column composition: persistent AI-Verse chat plus current workspace/canvas. Advanced options are discoverable rather than permanently visible.

- A small **Teams** button in the top bar opens an anchored popover only when requested. The user can select among three example teams, create additional teams (up to 20 for the demo), add example assistant members and remove a team with explicit name confirmation. The team menu starts closed. Selecting a team does not change the chat's scope or enable a real Bot.
- A small split-chat icon in the chat header opens a second or third **independent demo chat pane**, each with its own local sample conversation and close control. It does not replace the original chat and starts with zero extra panes.
- A discreet **Canvas** picker within the workspace header opens the optional **Notes**, **References** and **Activity** app panels. Canvas stays the default and retains drag/edit/pan/zoom; note/reference cards can return to the relevant canvas item. Activity honestly says it is not connected.
- The prototype saves only extra demo presentation/team state under \`aiverse-personal-shell-preview-v1\`, separate from the pre-existing \`aiverse-design-preview-v1\` store. It does not create canonical Bots, teams, rooms, chat sessions, assets, spend, connection auth or real provider actions. A menu selection does not grant authority.
- Focus mode continues to show the main chat on desktop. On narrow screens the original chat drawer remains because two permanently open columns do not fit.
- The preview remains publicly hosted, sample-only and no provider calls/secret input are introduced. The existing canvas and original workspace/chat source are preserved.

This is reviewable visual design work, not connected product acceptance. The team selector reflects the product owner's **multiple teams**, not a single hardwired global team. Team management, chat continuity and app context need trusted owner-backed contracts before the real product can claim to run those capabilities.


## Per-team, individual and @ chat targeting, 27 October 2026

Operator clarification: from any AI team the user must be able to start a conversation with the **whole team** or an **individual agent**, and from the persistent main chat they must be able to **tag a team or agent directly** without visiting a separate settings page. The selected message recipient must be visible before sending. Extra controls stay hidden until requested to preserve the clean Apple-like first-load composition.

Implemented as **preview interactions only**:

- The optional Teams popover contains **Chat with team**, and each individual row has a **Chat** action. This opens a named, independent demo conversation in an optional secondary pane; it never takes over the main chat.
- Team and individual target identities use stable `team:<teamId>` and `agent:<teamId>:<memberId>` keys, not display names. Each target's separate demo history is kept under the existing optional Personal shell browser storage key, independent from the original workspace-based chat.
- The original chat composer now has a small **@** control and typed-`@` suggestions. Select a team or individual to show a removable **Team: ...** or **Agent: ...** recipient chip. Addressed demo messages appear in both the original sample chat (annotated visibly) and that target's preview history; an unselected raw mention is rejected rather than silently routed.
- The `@` picker and optional additional chat panes start closed, with Escape/outside click behavior and keyboard Enter to select a suggestion.
- All text is local DOM text, not external AI output. **No real agent receives any message.** Real-team routing must later go through owner-verified Multiple Bots/Rooms/Threads/Team Runs and Gateway, with correct user/system/workspace scope, authority, membership, approvals, concurrency and receipts; this visual design is not proof of that backend path.

Do not treat one message tagged to a team as a request to create a new AI team, grant permissions, or copy private chat history to every member. That requires explicit, verified policy and recipient resolution by the canonical owner.


## Team-first @ mention refinement, 27 October 2026

The operator clarified that a flat list of every agent across every team creates too much scrolling and visual noise. The @ picker must **show only team names by default**, with all team member lists collapsed. Clicking one team reveals **Entire team** as the first recipient choice, followed by individual agents from **that team only**. Provide a simple **Back to all teams** action. Typing after @ filters **team names**, not a global flattened roster. Keep the existing explicit recipient chip, standalone chat path, and demo-only limitations unchanged.

This is a progressive-disclosure change in the static prototype only. No canonical Bots state, team creation, permissions, conversations or Gateway dispatch changes. Default interface remains the persistent chat plus the current workspace.


## Unified advanced chat panels and multiple recipients, 27 October 2026

Operator review of three side-by-side preview chats established a parity requirement: the main AI-Verse chat is the **visual and interaction standard** for every conversation. Opening a chat from a team/agent must not yield a less capable or differently styled panel. A user can address multiple agents or teams in the *same* conversation, and individual recipients must visibly include their parent team, e.g. **Socials / IG Editor**. Preserve the restrained default and opt-in panes.

### Implemented static preview design

- All additional chats now use the same `chat-panel`, `chat-heading`, `chat-scope`, `conversation`, `chat-message`, `chat-bottom`, `composer-bottom` and `send-button` visual structures as the main panel. The reusable `shared-chat.js` enhances the original chat and all spawned panes through one component path.
- Every pane receives the same **team-first @ mention selector**, with entire-team or individual selection, **multiple removable recipient chips** (up to 12 example recipients), and full team/agent breadcrumb on each individual chip and targeted chat title.
- Every pane also has a model-family dropdown (Auto, GPT, Claude, Gemini, Local, **all demo choices, not connected models**), a file attachment control (filename/size/type *labels only*: no file upload or file contents), and a picker for current-canvas item references (*IDs/titles only*, no copied workspace files).
- Tagged sample messages retain structured recipient/file/canvas metadata for presentation in either the main demo conversation or additional demo threads, rather than prepending a fake command string into the message text.
- Existing standalone chat's local proposal -> apply demo flow remains when there are no advanced selections; contextual chat operates entirely as browser-local sample output. Opt-in team/individual pane histories continue under the original preview-only Personal shell storage key; this is **not** a replacement session or agent thread owner.
- There are no model calls, uploads, spend, worker routing, Gateway requests or actual canvas reads beyond the current local preview. Production must derive models, reasoning capabilities, attachments/assets and tool actions from their admitted providers/owners and must use canonical session scope/permissions for multiple recipients.
- Existing 3-pane limit is only a layout-demo constraint and not the product's permanent chat concurrency policy.

This is design implementation and review evidence only; not accepted real runtime, agent team coordination, file processing, model selection or persistence.


## Agentic canvas review checkpoint — 27 October 2026 (latest)

Research input: [Canvas and AI Creation Research](../../../docs/CANVAS-AGENTIC-CREATION-RESEARCH-2026-10-27.md). This checkpoint implements static browser design interactions only, not vendor integrations or accepted owner-backed roadmap work. It **supersedes earlier instructions to manually attach canvas items from a chat composer**.

### Confirmed product behavior

- **Canvas selection automatically feeds the last-active chat**, rather than a global main chat or a dedicated Attach-from-canvas picker. One or more clicked/selected cards become removable scoped chips in the last conversation the user interacted with; duplicate clicks do not duplicate chips. Changing the viewed workspace clears old-workspace pending chip context instead of silently carrying it across scopes.
- **Every chat panel can close, including the originally permanent main pane.** The remaining pane(s) stay open and expand into available room, and a small top-bar chat control can reopen a chat even when all panels are closed. The main pane retains its sample content while hidden; this is a reversible UI state, not canonical deletion.
- **Direct card editing:** click a title or note text, type, Enter or blur to save, Escape to cancel. F2 focuses title editing from the keyboard. Drag from the card body/grip instead of editable text. A small contextual card row provides Connect, Duplicate and Delete. The connector nub creates a linked note on click or links cards by dragging; existing lines are selectable and removable.
- **Multiselect and bulk actions:** Shift/Cmd/Ctrl-click, Shift-drag rectangle, move selected cards together, align, group, duplicate, delete. Groups move together; Undo and Redo cover reversible card/link edits (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z or Ctrl+Y).
- **Creation planning:** one compact Create button supports text/image/video/audio ideas, prompt and selected canvas references. Defaults to **Choose for me**, with an optional demo-model picker and Auto/Landscape/Portrait/Square shape choices only for visual formats. Creates editable, connected **demo draft** nodes retaining prompt, settings and reference IDs. Variations duplicate the draft without destroying the previous card. No provider, real model, generation job, spend, approval bypass or inferred price is implied.
- **Progressive disclosure:** contextual tools appear on selection/hover, creation details are behind More choices, and the original white, Apple-like layout is preserved. Existing two-key browser-local sample state remains disposable, with no new shadow data owner.

### Deferred / acceptance boundary

The real Canvas must use canonical asset/workspace authority, typed actions, revisions, undo consistency and scoped agent context before any agent manipulates it. Image/video/audio jobs need admitted provider capabilities, job state, cost receipts and explicit paid-action approval. Team chat requires Gateway and Multiple Bots/Rooms/Threads authorization. The static preview's demo model names are never an availability claim.

**Review checklist:** Close the first chat with another pane open; select a canvas card and confirm its chip lands in the last chat used; remove a chip; multiselect and group cards; edit a note inline; drag between connector handles; unlink and undo; open Create and add a text/image/video/audio **demo draft**, then reload without losing the sample. Test focus and mobile layout separately. Source checks do not substitute for browser acceptance.
