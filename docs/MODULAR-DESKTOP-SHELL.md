# AI-Verse Dashboard Modular Desktop Shell

Status: additive architecture amendment

Research/update date: 2026-09-12

This document extends the existing AI-Verse Dashboard architecture without replacing its source-of-truth, security, isolation, Gateway, protocol, runtime-adapter, or six-phase foundations.

The existing rules remain authoritative. In particular:

- the Dashboard owns zero canonical domain truth
- all OS-bound state is scoped by `systemId`
- workspace-scoped state is additionally scoped by `workspaceId`
- canonical writes travel only through the selected AI-Verse OS command boundary
- provider/runtime sessions never leak between registered systems
- Dashboard caches remain disposable
- the Dashboard remains useful even when execution happens in Claude Code, Codex, Hermes, or another harness

This amendment changes how the visual product is composed and how Phase 1 should prepare the frontend for future native desktop behavior.

---

# 1. Product thesis

AI-Verse Dashboard should not be built as one hard-coded dashboard page.

It should be built as a **modular dockable desktop shell** containing independently renderable panels.

A panel may appear:

1. **Docked** inside the primary layout.
2. **Floating** above the primary layout while remaining inside the application.
3. **Detached** into a separate application/window surface.
4. **HUD / compact** as a small always-visible status surface when supported by the native desktop host.

The first released layout may still look conventional. The architecture must not assume that a panel permanently belongs to one column, route, or screen position.

The target mental model is:

```text
AI-Verse Desktop Shell
        |
        +-- Panel Registry
        +-- Layout Manager
        +-- Window Manager
        +-- View / Preset Manager
        +-- Dashboard Client
                |
                +-- ChatPanel
                +-- BotsPanel
                +-- RoomsPanel
                +-- RunningWorkPanel
                +-- AttentionPanel
                +-- UsagePanel
                +-- HealthPanel
                +-- RunsPanel
                +-- AutomationsPanel
                +-- BrainPanel
                +-- FilesPanel
                +-- PreviewPanel
```

The shell owns presentation placement. Panels own presentation behavior. Neither owns canonical OS truth.

---

# 2. Architectural invariants

The modular shell must not weaken the existing architecture.

## 2.1 Panel placement is presentation state

The Dashboard may persist:

- panel visibility
- dock position
- split sizes
- tab groups
- floating bounds
- detached-window bounds
- monitor preference where available
- compact/full/HUD presentation mode
- saved view presets
- whether a detached window is pinned or always-on-top

This is Dashboard-owned presentation state and is disposable/recoverable.

It must never become a second store for:

- tasks
- Bots
- Rooms
- messages
- Memory
- Brain state
- automations
- approvals
- canonical usage records
- provider conversation state
- agent/runtime state

## 2.2 Every OS-derived panel is explicitly scoped

Every panel instance that reads OS state receives a concrete scope:

```ts
interface PanelScope {
  systemId: string
  workspaceId?: string
}
```

A detached window, floating panel, tab group, or HUD does not gain looser access because it is rendered outside the main layout.

Switching the main Dashboard to another `systemId` must not silently re-scope a detached panel. The shell must either:

- keep the detached panel explicitly bound to its original `systemId`, with that identity visible, or
- require an explicit user action to retarget it.

No cross-system state reuse is allowed.

## 2.3 Panels use the typed Dashboard client

Panels must not:

- read arbitrary files
- open canonical SQLite directly
- call runtime processes directly
- bypass the Gateway
- import hidden OS internals
- invent their own write paths

They consume the same typed query/command/event contracts as any other Dashboard client.

---

# 3. Panel contract

Panels should be host-independent UI modules rather than page-specific components.

Suggested contract:

```ts
type PanelPresentation = 'full' | 'compact' | 'hud'

interface DashboardPanelDefinition {
  id: string
  title: string
  icon?: string
  supportedPresentations: PanelPresentation[]
  minWidth?: number
  minHeight?: number
  preferredPlacement?: 'left' | 'right' | 'bottom' | 'center'
  canFloat?: boolean
  canDetach?: boolean
  canPin?: boolean
  systemScoped: boolean
  workspaceScoped?: boolean
}
```

A panel should render from:

- a typed scope
- typed Dashboard client data
- its presentation mode
- transient UI state

It must not rely on being mounted at one fixed route or DOM position.

## Example

`UsagePanel` may render as:

### Full

- tokens by model
- cost by workspace/agent/task
- current request/session statistics
- daily/weekly trend
- provider/model identity
- freshness and provenance

### Compact

```text
671M tokens | $188.43 | 3 active models
```

### HUD

```text
671M | $188 | 3 running
```

The same principle should apply to Bots, Attention, Running Work, Health, Automations, and other panels where a compact mode is useful.

---

# 4. Layout and window states

## 4.1 Docked

Panels can be:

- split left/right/top/bottom
- resized
- reordered
- stacked into tabs
- hidden and restored
- moved between layout zones

The default Phase 1 composition may remain:

```text
OS / Workspace / Search
--------------------------------
Sidebar | Main Surface | Context
--------------------------------
Optional bottom activity/log area
```

but those areas should be produced by the layout system rather than hard-coded as permanent panel ownership.

## 4.2 Floating

A floating panel remains inside the application but sits over the dock grid.

Use cases:

- Preview
- Approval detail
- Task inspector
- small Usage surface
- Brain inspector
- temporary log view

## 4.3 Detached

A detachable panel becomes a separate top-level window while remaining part of the same Dashboard instance and protocol/session model.

Use cases:

- Chat on a second monitor
- persistent Runs/log window
- Brain on a second display
- dedicated Bot/Room window
- detached Usage/Attention surface

The shell must preserve the panel's `systemId` and `workspaceId` boundary.

## 4.4 HUD

HUD is a deliberately reduced detached presentation.

Examples:

```text
3 RUNNING | 1 NEEDS YOU | $1.27
```

or:

```text
Astra     working
Hermes    waiting
Editor    done
```

HUD behavior may support:

- compact/chrome-free window
- lock position
- always-on-top
- opacity where platform-safe
- click-through only if explicitly designed and still operable
- expand on attention
- return/open in main Dashboard
- monitor-specific placement

HUDs must remain understandable even when the main Dashboard is minimized.

---

# 5. Desktop host strategy

The web application remains the primary UI implementation.

The architecture should keep the React/Vite UI capable of running in:

1. a normal browser
2. a desktop wrapper
3. future mobile/native clients through the same Gateway protocol

## Recommended direction

Use the existing React 19 + TypeScript + Vite plan.

For native desktop packaging, prefer evaluating **Tauri 2** first because it can wrap the same frontend while supporting native top-level windows and always-on-top behavior with a smaller desktop footprint.

Electron remains a valid fallback/reference, especially because Hermes Desktop proves that a polished native React agent UI can drive a separate headless backend successfully.

Do not couple the Gateway to Tauri or Electron. The desktop host is another client shell, not the core runtime.

## Docking implementation

Evaluate **Dockview** or an equivalent mature docking engine before inventing a custom docking system.

Current Dockview capabilities include:

- docked groups
- floating groups
- nested layouts
- separate popout browser windows
- redocking popped-out groups

Browser popouts are useful for development and multi-monitor behavior.

Native persistent HUD windows still require the desktop host layer because a browser popout cannot provide the same application-level always-on-top/minimized-main-app behavior reliably.

---

# 6. View menu and saved layouts

The application should expose a conventional View surface.

Example:

```text
View
  Panels
    [x] Bots
    [x] Chat
    [x] Running Work
    [x] Attention
    [ ] Brain
    [x] Usage
    [ ] Timeline
    [x] Health

  Presets
    Control Room
    Focus
    Agent Operations
    Minimal
    Custom...

  Detached Windows
    Usage HUD
    Astra

  Reset Layout
```

Saved presets are Dashboard-owned presentation state.

Presets must not contain canonical domain data. They may reference stable panel IDs and presentation/layout settings only.

---

# 7. Persistent Bots and Rooms

The existing OS/multi-bot architecture remains the source of truth.

Dashboard should make those concepts first-class visually when the selected OS exposes them.

## Bots

Borrow the strongest product lesson from Grok Bot:

- persistent Bot roster rather than treating every session as an unrelated chat
- clear Bot identity
- status/presence directly visible
- idle / thinking / working / waiting / blocked / done states
- current responsibility or last meaningful event
- attention state
- active Routine/automation count where relevant
- selected Bot opens its conversation/context without hiding the persistent identity

Dashboard must not create an independent Bot registry.

## Rooms

Kylon's useful visual lesson is that a shared work unit can contain:

- people
- multiple Bots/agents
- thread/conversation
- files/artifacts
- records/context
- permissions
- approval/execution trail

AI-Verse Dashboard may project a Room-like surface when the canonical Multiple-Bots/OS layer exposes Room/Thread state.

The Dashboard must not become the canonical Room database.

---

# 8. Chat as a heterogeneous timeline

Chat should not assume every meaningful event is prose.

The transcript may render typed objects such as:

- normal messages
- tool-call summaries
- approval cards
- task cards
- Bot handoffs
- Routine/automation creation or execution
- file/artifact cards
- diffs
- preview cards
- run/error/retry events
- graph/knowledge references
- interactive command confirmations

This borrows the strongest Grok Bot interaction idea while preserving AI-Verse command authority.

The typed object in the transcript is a UI projection of canonical or runtime state. It is not an alternate store.

---

# 9. Runtime/computer visibility

When an agent has a browser, remote desktop, shell, cloud computer, or similar runtime surface, use a three-level visibility model:

1. **Status**: show that the runtime is active.
2. **Preview**: show a pinned preview/context rail without displacing the main conversation.
3. **Takeover / full view**: open the full runtime surface when direct intervention is required.

This avoids making users watch autonomous work continuously.

It also fits the existing Dashboard rule that the product is a Control Room, not a replacement IDE.

---

# 10. Mobile and responsive contract

Mobile is not a future redesign. Responsive behavior is a Phase 1 concern.

Desktop may support:

- left navigation
- center primary surface
- right context/preview rail
- dock/floating/detached panels

Mobile should prioritize:

- Chat
- Bots
- Rooms
- Running Work
- Attention/Inbox
- approvals
- lightweight Usage
- Automations/Routines
- task progress

Use sheets/drawers/stacks rather than trying to reproduce a desktop dock grid.

Desktop-first surfaces may remain simplified on mobile:

- large Brain graph
- raw trace explorer
- dense terminal/log output
- multi-panel monitoring

A user should still be able to continue the same scoped Bot/Room/thread from mobile without creating a second context model.

---

# 11. Visual quality contract

The existing visual principles remain valid but are not sufficient as implementation gates.

Phase 1 must establish a reusable design system with explicit rules for:

## Tokens

- typography scale
- spacing scale
- border radius
- elevation/depth
- semantic status colors
- surface/background hierarchy
- density modes
- icon sizing
- focus rings
- motion timing

## Component states

Every reusable component must define:

- default
- hover
- focus
- active
- selected
- disabled
- loading
- empty
- stale
- warning
- error
- unknown where relevant

## Responsive behavior

At minimum define:

- compact phone
- tablet/narrow
- desktop
- large desktop/multi-monitor assumptions

## Motion

Motion must communicate state, not decorate the product.

Use motion for:

- active work
- transitions
- attention
- panel docking/detaching
- Bot presence changes

Avoid constant decorative animation.

## Accessibility

- keyboard navigation
- visible focus
- appropriate contrast
- reduced-motion support
- semantic labels
- non-color-only status communication

## Visual QA gate

A UI slice is not complete until:

- desktop layout reviewed
- narrow layout reviewed
- light/dark behavior reviewed when implemented
- loading/empty/error states reviewed
- no overflow at supported breakpoints
- keyboard focus path works
- screenshots or equivalent visual regression fixtures exist for critical surfaces

This is a product quality gate, not an optional polish phase.

---

# 12. Inspiration adoption map

## Hermes Desktop

Adopt concepts:

- React desktop UI driving a headless backend over a typed/realtime boundary
- chat-first operational center
- multiple simultaneous conversations
- right-hand preview rail
- live tool summaries
- task progress near the composer
- configurable live status bar
- resumable sessions across interfaces
- contributed/extended pages as inspiration for future Dashboard panel extensions

Do not:

- make Hermes the canonical runtime
- require `hermes serve`
- copy Hermes-specific state ownership into Dashboard

Primary reference:
https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/desktop.md

## Grok Bot

Adopt concepts:

- persistent Bot roster
- Bot presence/state
- structured objects in chat
- Routines tied visibly to persistent Bots
- group Bot interaction
- Status -> Preview -> Takeover runtime visibility
- desktop/mobile continuity
- progressive disclosure rather than exposing every agent concept at once

Do not:

- require every AI-Verse agent to have a cloud computer
- replace AI-Verse's canonical Multiple-Bots model with Grok's product model

Primary references:
https://x.ai/news/designing-grok-bot
https://x.ai/news/introducing-grok-bot
https://x.ai/news/grok-bot-more-plans

## Kylon

Adopt concepts:

- Room as a human + agent work surface
- visible scoped permissions
- review/approval trail
- execution provenance
- persistent shared work context as a UI concept

Do not:

- put Kylon-style canonical memory, structured data, integrations, or databases inside Dashboard
- duplicate AI-Verse OS, Data, Memory, Connections, or Multiple-Bots ownership

Primary references:
https://kylon.io/solutions/ai-workspace
https://kylon.io/solutions/ai-employee
https://kylon.io/blog/kylon-privacy-architecture

## TenacitOS

Continue using for:

- Mission Control visual inspiration
- metric/surface ideas
- visual prototyping

Do not use as the AI-Verse shell architecture or canonical data layer.

## Dockview / native host

Dockview is an implementation candidate for dock/floating/popout behavior, not a product dependency decision yet.

Tauri 2 is the preferred native-host candidate to evaluate for detached always-on-top HUD windows. Electron remains a fallback/reference.

Primary references:
https://dockview.dev/docs/core/groups/floatingGroups/
https://dockview.dev/docs/core/groups/popoutGroups/
https://v2.tauri.app/reference/config/

---

# 13. Extension/contributed-panel direction

Future AI-Verse layers may contribute panels through a sanctioned registry.

Example concept only:

```ts
registerPanel({
  id: 'connections',
  title: 'Connections',
  supportedPresentations: ['full', 'compact'],
  systemScoped: true
})
```

A contributed panel must:

- use the typed Dashboard client
- declare capabilities
- obey `systemId` / `workspaceId` isolation
- obey Gateway authorization
- receive no arbitrary filesystem authority
- not register its own canonical write path
- meet the same visual/accessibility contract

Do not implement a plugin marketplace in Phase 1. Build only the internal contract cleanly enough that future extension does not require rewriting the shell.

---

# 14. Six-phase roadmap amendment

The original six phases remain the roadmap.

This amendment changes what each relevant phase must prepare or expose.

## Phase 1: Read-only Control Room

Keep every existing Phase 1 deliverable.

Add:

- panel registry
- shell/layout abstraction
- dockable layout host
- panel visibility controls
- saved/reset layout presentation state
- full/compact presentation contract
- responsive/mobile foundation
- design tokens and core visual primitives
- visual QA fixtures/gate
- `systemId` isolation tests that include multiple panel instances and detached/popout scopes
- architecture ready for later native wrapping

Phase 1 does **not** need production HUD windows yet.

It must avoid hard-coding components so HUD/detach support requires a rewrite later.

## Phase 2: Live agent control

Keep every existing Phase 2 deliverable.

Add:

- persistent Bots panel/roster when the OS exposes canonical Bot state
- Rooms/thread surface when exposed by the Multiple-Bots/OS contract
- heterogeneous Chat timeline
- right preview/context rail
- runtime Status -> Preview -> Takeover interaction model
- detachable/popout support for appropriate live panels
- panel-level full/compact modes for Bots, Running Work, Attention, Usage where data is available

## Phase 3: Automations and approvals

Keep every existing Phase 3 deliverable.

Add:

- Routines/Automations visible in the relevant Bot/Room transcript when canonical events support it
- approval objects usable from full and compact attention surfaces
- approval provenance including target system/workspace/actor/connection when the OS exposes it

## Phase 4: Omnichannel

Unchanged architecturally.

Mobile/remote clients consume the same scoped Gateway protocol and do not inherit desktop window/layout concepts.

## Phase 5: Knowledge Brain

Unchanged architecturally.

Brain becomes another panel-capable surface, with large-graph mode remaining desktop-first.

## Phase 6: Advanced observability

Unchanged architecturally.

Usage, traces, and cost views should support compact/panel presentations where useful.

---

# 15. Phase 1 implementation order

To avoid a throwaway first frontend, build Phase 1 in this order:

1. repository/workspace setup and typed protocol foundation
2. Dashboard client and registered-system scope
3. design tokens and base primitives
4. panel registry + panel host contract
5. dock/layout manager
6. default Control Room layout
7. View menu + visibility/reset/preset skeleton
8. responsive/narrow shell
9. read-only Now/Health/Work/Inbox panels
10. freshness/provenance surfaces
11. shell isolation tests
12. visual regression/QC fixtures

Do not start by copying an entire TenacitOS page and wiring data into it.

If TenacitOS/Hermes components are borrowed, adapt them into panel components that obey this shell contract.

---

# 16. Phase 1 exit criteria

Phase 1 is ready only when all original Phase 1 criteria still pass and:

1. At least three independent read-only panels can be repositioned without changing their data implementation.
2. Hiding/restoring a panel does not destroy canonical state or create a second store.
3. Layout persistence contains presentation metadata only.
4. Two panels bound to different registered `systemId` values cannot share query cache entries or event subscriptions accidentally.
5. A compact presentation exists for at least one operational panel.
6. The shell works at desktop and narrow/mobile widths.
7. A future detached/native host can mount the same panel without requiring the panel to be rewritten.
8. Critical surfaces pass the visual QA gate.
9. No existing zero-truth, read-only, Gateway, command, cache, or isolation rule has been weakened.

---

# Final rule

The Dashboard should become:

> **A composable visual operating surface over AI-Verse OS, where every live capability can be arranged, focused, detached, or reduced without changing who owns the underlying truth.**

The shell may become highly flexible.

The authority model must remain rigid.
