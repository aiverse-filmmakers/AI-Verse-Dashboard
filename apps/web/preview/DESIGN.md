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
