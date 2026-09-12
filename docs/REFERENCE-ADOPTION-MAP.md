# Reference Adoption Map

This document answers the practical question: **what should AI-Verse Dashboard actually copy, adapt, integrate, or ignore?**

Research baseline: 2026-09-09

## Recommended starting strategy

Do **not** fork one giant project and rename it.

Use AI-Verse Dashboard as the clean integration repository, then selectively adopt MIT-licensed pieces and patterns from the best systems.

Why:

- OpenClaw's Control UI is deeply coupled to the OpenClaw Gateway and its RPC surface.
- OpenHands includes substantial IDE/developer-workspace behavior that AI-Verse does not need.
- LifeOS Pulse is architecturally close to the desired read-only model, but its dashboard/runtime is specific to LifeOS.
- TenacitOS is visually close to a Mission Control dashboard, but its local JSON and direct editing model violates the AI-Verse source-of-truth contract.

The best result comes from curating the strongest layer from each project.

---

# Priority 1: LifeOS Pulse

Source: https://github.com/danielmiessler/LifeOS

License: MIT

## Adopt directly or closely

Study these Pulse concepts first:

- `Assets` module: read-only inventory that holds zero data
- `Projects` module: read-only grouping over project source files
- `UserIndex`: Markdown/frontmatter indexer with filesystem watching
- `TabFreshness`: per-surface source freshness
- `Doctor`: health surface built from advisory probes without pretending to own truth
- `Scheduled`: reconcile declared jobs with actual installed/runtime state

Relevant system document:

https://github.com/danielmiessler/LifeOS/blob/main/LifeOS/install/LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md

## AI-Verse adaptation

Create equivalent projectors:

```text
packages/os-read-adapter/
  markdown-projector.ts
  sqlite-projector.ts
  workspace-projector.ts
  health-projector.ts
  task-projector.ts
  freshness.ts
```

The Dashboard equivalent should be stricter than Pulse: these projectors expose reads only. Any write-capable behavior belongs behind the core OS command interface.

## Do not copy

- LifeOS-specific DA logic
- broad unified-daemon responsibilities that belong to AI-Verse core
- panel-specific direct write endpoints

---

# Priority 2: OpenClaw Gateway

Source: https://github.com/openclaw/openclaw

License: MIT

## Adopt directly or closely

### Protocol structure

Study:

- `packages/gateway-protocol`
- Gateway request/response/event framing
- protocol negotiation
- runtime validation
- typed clients

AI-Verse should create its own smaller equivalent rather than importing the whole OpenClaw protocol.

Target:

```text
packages/protocol/
packages/client/
```

### Channel policy

Study OpenClaw's channel plugin and security patterns:

- sender normalization
- pairing
- allowlists
- group policy
- channel status
- provider-specific adapters behind a normalized contract

### Task and automation UX

Copy interaction patterns from the current Control UI:

- active/recent task ledger
- parent/child subagents
- cancellation
- compact background-work rail
- task detail drawer
- cron summary cards
- filterable automation list
- run history

### Activity compression

OpenClaw's live tool stream is one of the best patterns to copy:

- group consecutive calls
- show a short human-readable purpose
- collapse raw arguments/output by default
- show shell output as terminal-style content
- show diffs only when relevant

## Integrate rather than rebuild on day one

Create an **OpenClaw bridge** so AI-Verse can inherit mature channels immediately.

The OpenClaw side should receive only scoped AI-Verse query/command tools. It should not receive unrestricted write access to the AI-Verse workspace tree.

Target:

```text
bridges/openclaw/
```

This is the fastest practical route to Telegram, Discord, WhatsApp, and other channels.

## Do not copy

- the complete OpenClaw monorepo
- every Control UI setting
- OpenClaw's own agent/config domain model
- filesystem permissions broader than AI-Verse's command API

---

# Priority 3: OpenHands Agent Canvas

Source: https://github.com/OpenHands/OpenHands

License: MIT

## Adopt the boundary, not the IDE

The best part to copy is the separation:

```text
frontend
  -> typed TypeScript client
     -> agent/runtime server
        -> interchangeable runtimes
```

AI-Verse should preserve the same rule:

> Browser components never call random runtime endpoints directly.

All runtime communication goes through `packages/client` and normalized runtime adapters.

## Adopt

- typed client boundary
- runtime capability discovery
- parallel session model
- ACP-compatible adapter philosophy
- isolated agent session identity
- automation/run concepts

## Do not copy

- full coding workspace
- source editor
- IDE file-explorer product scope
- git-worktree UX unless a particular runtime genuinely needs it

AI-Verse should be able to observe a worktree-based coding agent without becoming the worktree manager itself.

---

# 2026-09-12 adoption amendment: modular shell and persistent-agent UX

This amendment is additive. It does not replace Priorities 1-4 or any source-of-truth rule.

## Hermes Desktop

Source:
https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/desktop.md

Hermes Desktop is now a strong implementation and interaction reference because it combines a native React desktop surface with a separate headless Hermes backend over JSON-RPC/WebSocket.

### Adopt

- chat-first desktop composition
- multiple simultaneous agent conversations
- right-hand preview rail
- live tool summaries
- task progress near the composer
- configurable live status bar
- session continuity across interfaces
- contributed-page idea as inspiration for future panel extension

### Do not adopt

- Hermes as the required AI-Verse runtime
- Hermes-specific state ownership
- any dependency that would force Dashboard panels to talk directly to `hermes serve`

AI-Verse should borrow the boundary and interaction quality, not bind Layer 5 to Hermes.

## Grok Bot

Sources:
https://x.ai/news/designing-grok-bot
https://x.ai/news/introducing-grok-bot
https://x.ai/news/grok-bot-more-plans

Grok Bot adds several product primitives not explicit enough in the earlier Dashboard plan.

### Adopt

- persistent Bot roster rather than organizing everything around disposable chat history
- Bot identity and presence/status
- structured interactive objects in the conversation timeline
- Bot-visible Routines
- group Bot interactions
- desktop/mobile thread continuity
- three-level runtime visibility: Status -> Preview -> Takeover
- progressive disclosure that keeps low-level agent machinery hidden until needed

### Do not adopt

- Grok's canonical Bot/runtime model
- the requirement that every AI-Verse agent has a dedicated cloud computer
- any UI assumption that weakens AI-Verse's own Multiple-Bots ownership boundaries

## Kylon

Sources:
https://kylon.io/solutions/ai-workspace
https://kylon.io/solutions/ai-employee
https://kylon.io/blog/kylon-privacy-architecture

Kylon is most useful as a collaboration, permissions, and provenance reference.

### Adopt

- Room as a shared work surface containing people/agents/thread/files/context
- clear scoped-permission visibility
- human approval and review surfaces
- execution trail/provenance
- agents treated as members of a shared work context rather than isolated chat windows

### Do not adopt

- canonical workspace data inside Dashboard
- canonical Memory inside Dashboard
- integration ownership inside Dashboard
- Kylon's backend/runtime architecture as Layer 5 infrastructure

Those belong to AI-Verse OS, Data, Memory, Connections, Multiple-Bots, and runtime layers. Dashboard only projects and controls them.

## Docking and native-window layer

Implementation references:
https://dockview.dev/docs/core/groups/floatingGroups/
https://dockview.dev/docs/core/groups/popoutGroups/
https://v2.tauri.app/reference/config/

Dockview is a strong candidate to evaluate for docked, floating, nested, and popout panel behavior.

Tauri 2 is the preferred native-host candidate to evaluate for separate desktop windows and always-on-top HUD surfaces while preserving the React/Vite application.

Neither is a canonical-state dependency.

The detailed contract is in [MODULAR-DESKTOP-SHELL.md](MODULAR-DESKTOP-SHELL.md).

---

# Priority 4: TenacitOS visual shell

Source: https://github.com/carlosazaustre/tenacitOS

License: MIT

Stack:

- Next.js 15
- React 19
- Tailwind CSS v4
- Recharts
- React Three Fiber + Drei
- SQLite

## Good candidates to borrow

- Mission Control visual language
- status cards and metric surfaces
- agent presence components
- activity views
- cost charts
- system-monitor ideas
- 3D Office inspiration
- notification center patterns

If code is copied, retain the required MIT attribution/license notice.

## Replace immediately

TenacitOS creates dashboard-local JSON files for cron jobs, activities, notifications, skills, and tasks. AI-Verse must not inherit those as domain stores.

Replace them with calls to:

```text
@aiverse/dashboard-client
```

Also remove direct canonical memory/file editing.

## Should AI-Verse fork TenacitOS?

**Only as a visual prototype.**

A full fork is acceptable if the first job is to delete/replace its data layer. Do not build new AI-Verse functionality on top of its local JSON stores because that would make migration harder later.

For the long-term codebase, a clean Vite/React application is preferable.

---

# Priority 5: Langfuse and Phoenix

Langfuse: https://langfuse.com/docs

Phoenix: https://github.com/Arize-ai/phoenix

## Adopt UX and telemetry conventions

Use them as the benchmark for:

- trace trees
- spans
- sessions
- latency
- token usage
- cost
- evaluations
- error drill-down

## Recommended interoperability

Normalize AI-Verse runtime activity internally to an OTEL/OpenInference-friendly model.

Later add optional exporters so users can attach Phoenix or Langfuse without making either one mandatory.

## Do not copy

- their heavy production data platforms into Layer 5
- prompt-management ownership
- separate truth stores for AI-Verse domain state

---

# Priority 6: Graph tooling

3D Force Graph: https://github.com/vasturiano/3d-force-graph

Cytoscape.js: https://js.cytoscape.org/

Cytoscape performance roadmap: https://github.com/cytoscape/cytoscape.js/issues/3486

## Recommended stack

### Real navigation

- Sigma.js
- Graphology
- ForceAtlas2 in Web Worker

### Visual 3D Brain mode

- Three.js
- `3d-force-graph` or `react-force-graph-3d`

### Optional custom 3D environment

- React Three Fiber
- Drei

## Copy the performance principles

- typed/compact graph payloads
- worker layout
- progressive rendering
- level of detail
- cluster proxies
- label budgets
- edge sampling/aggregation
- visible-neighborhood queries
- GPU-friendly rendering

Do not try to draw every edge in the user's entire AI-Verse at once.

---

# Practical build recommendation

## If the goal is fastest visual prototype

1. Fork TenacitOS privately or into an experimental branch.
2. Rebrand the shell as AI-Verse.
3. Delete its local JSON domain stores.
4. Disable canonical file/memory editing.
5. Replace the backend with a mock `@aiverse/dashboard-client`.
6. Use the prototype to decide the final visual system.
7. Port the approved components into the clean AI-Verse Vite app.

This gets a high-quality visual prototype quickly without locking the architecture to TenacitOS.

## If the goal is cleanest production foundation

Start directly with:

```text
React 19 + Vite + TypeScript
Node 24 + TypeScript Gateway
Zod protocol
TanStack Query/Virtual
Tailwind v4
```

Then selectively copy MIT components and patterns.

This takes slightly more initial assembly but produces the cleanest Layer 5 boundary.

---

# Suggested implementation order by borrowed source

## Milestone A: zero-truth read surface

Borrow mainly from LifeOS Pulse.

Deliver:

- workspace discovery
- Markdown projection
- SQLite projection
- freshness
- health
- Now page

## Milestone B: realtime control plane

Borrow mainly from OpenClaw.

Deliver:

- protocol package
- typed client
- WebSocket events
- task rail
- Inbox
- automations
- approvals

## Milestone C: multi-runtime agent control

Borrow mainly from OpenHands.

Deliver:

- runtime adapter contract
- ACP adapter
- Claude Code adapter
- Codex adapter
- normalized events

## Milestone D: visual polish

Borrow selectively from TenacitOS.

Deliver:

- Mission Control shell
- metrics
- presence
- system monitor
- optional 3D visual identity

## Milestone E: observability

Borrow concepts from Langfuse/Phoenix.

Deliver:

- trace tree
- nested spans
- model/tool latency
- cost/tokens
- optional OTEL exporter

## Milestone F: Brain

Use WebGL graph tooling.

Deliver:

- 2D graph
- provenance inspector
- cluster/LOD
- 3D mode

---

# License rule

Before copying source code from any reference project:

1. confirm the exact source repository and license at the commit being copied
2. preserve copyright/license notices required by that license
3. record copied/adapted files in `THIRD_PARTY_NOTICES.md`
4. prefer adapting small isolated components over importing a project's identity or domain model

LifeOS, OpenClaw, OpenHands, and TenacitOS are MIT at the research baseline used for this document.

---

# Final call

The best AI-Verse Dashboard is not a clone.

It should be:

- **LifeOS underneath the panels:** zero-truth projections and freshness
- **OpenClaw underneath the connection layer:** realtime gateway, tasks, channels, pairing, approvals
- **OpenHands underneath runtime integration:** typed client and interchangeable agent harnesses
- **TenacitOS in the visual inspiration:** Mission Control styling and 3D ideas
- **Hermes Desktop in the operational shell:** chat, previews, session/status interaction and headless-backend separation
- **Grok Bot in persistent-agent UX:** Bots, presence, Routines, structured transcript and progressive runtime visibility
- **Kylon in shared-work UX:** Rooms, scoped permissions, approval and execution provenance
- **AI-Verse modular shell as the composition layer:** dock, float, detach, compact/HUD and saved layout behavior
- **Phoenix/Langfuse in the observability details:** trace clarity and drill-down

That combination gives AI-Verse a modern visual OS surface without duplicating the core OS or rebuilding an IDE.
