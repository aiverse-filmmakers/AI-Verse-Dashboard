# AI-Verse Dashboard Research

Research date: 2026-09-09

This document benchmarks the strongest practical patterns for a local-first AI operating-system dashboard as of September 2026. The goal is not to build another IDE. The goal is to build a visual Control Room for AI-Verse OS that can observe state, talk to agents, dispatch approved commands, monitor autonomous work, and bridge to messaging channels without becoming a second source of truth.

## Executive conclusion

The strongest design is a synthesis of three systems rather than a clone of one:

1. **LifeOS Pulse** for the read-only dashboard philosophy: dashboard modules are surfaces over canonical files and state. Several Pulse modules explicitly hold zero data and parse their real sources on demand. It also treats data freshness as a first-class UI concept.
2. **OpenClaw** for the headless gateway, typed realtime protocol, omnichannel adapters, task ledger, approvals, chat-first control surface, cron UX, live tool activity, and pairing security.
3. **OpenHands Agent Canvas** for clean separation between a TypeScript UI, a typed client, and interchangeable agent runtimes such as OpenHands, Claude Code, Codex, Gemini, and ACP-compatible agents.

For AI-Verse, the result should be a **thin Control Room plus Gateway**, not a replacement runtime, editor, knowledge base, scheduler, or IDE.

The canonical architecture should be:

```text
AI-Verse OS state
Markdown + canonical SQLite + runtime/task state
        |
        | read only projections
        v
AI-Verse Dashboard Gateway
        |
        +-- Web UI
        +-- Telegram bridge
        +-- Discord bridge
        +-- WhatsApp/OpenClaw bridge
        +-- external clients

All mutations travel the other direction through an explicit AI-Verse OS command boundary.
The Dashboard never writes canonical files or canonical SQLite directly.
```

## Systems researched

### 1. LifeOS Pulse

Repository: https://github.com/danielmiessler/LifeOS

Relevant system document: https://github.com/danielmiessler/LifeOS/blob/main/LifeOS/install/LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md

Pulse describes itself as the visible surface of LifeOS. The OS remains the system; Pulse is how the user watches and interacts with it.

Important architectural patterns worth adopting:

- A single local runtime exposes dashboard APIs and local services.
- Dashboard surfaces include observability, scheduled work, background worker state, chat, system health, goals, projects, memory, usage, and other OS state.
- Multiple modules are explicitly read-only and state that they hold zero data.
- Some modules parse Markdown source files on each request.
- A user indexer walks Markdown, parses frontmatter and body into typed JSON, then uses filesystem watching for live refresh.
- Health surfaces compose independent probes and fail softly rather than pretending missing data equals healthy data.
- A dedicated freshness module tracks where each tab gets its data and how stale it is.
- Pulse runs locally and serves a static Next.js dashboard from the same local service.

The most important lesson for AI-Verse is not the exact Pulse UI. It is the **projection principle**:

> The dashboard may interpret, summarize, index, cache, and visualize canonical state, but it should not silently become another place where canonical state lives.

### What not to copy from Pulse

Pulse also contains write-capable modules and a broad unified daemon. AI-Verse Dashboard should keep a stricter boundary:

- Do not let individual panels edit Markdown directly.
- Do not let the Dashboard own the scheduler.
- Do not make the Dashboard daemon the AI-Verse runtime.
- Do not let a UI convenience endpoint become a hidden second write path.

Commands should be delegated to AI-Verse OS through one explicit command interface.

---

### 2. OpenClaw Gateway and Control UI

Repository: https://github.com/openclaw/openclaw

Control UI feature reference: https://github.com/openclaw/openclaw/blob/main/docs/web/control-ui/feature-reference.md

Gateway protocol package: https://github.com/openclaw/openclaw/blob/main/packages/gateway-protocol/README.md

Control UI package: https://github.com/openclaw/openclaw/blob/main/ui/package.json

OpenClaw is the strongest reference for the part AI-Verse currently lacks: a headless control plane that multiple clients can safely talk to.

#### Gateway pattern

OpenClaw uses a typed WebSocket protocol with request, response, and event frames. Its protocol is separately packaged, validated at runtime, and version-negotiated.

That is a much better model than having the React app call random local endpoints or read files itself.

Recommended AI-Verse equivalent:

```text
Web UI / Telegram / Discord / WhatsApp / CLI
                |
                v
        AI-Verse Dashboard Gateway
                |
        typed protocol + policy
                |
       AI-Verse OS command API
```

The gateway should be independently usable by the Web UI, mobile clients, messaging bridges, and future native apps.

#### OpenClaw Control UI lessons

The current Control UI has several UX patterns that are directly relevant:

- Conversation-first daily surface instead of a permanent wall of dashboard cards.
- Live tool-call streaming with expandable commands and outputs.
- Consecutive tool calls summarized into human-readable activity such as commands run, files read, and files edited.
- Background tasks shown in a compact rail, grouped into running and finished work.
- Detailed task status, transcript, prompt, output, and cancellation available only when opened.
- Sessions support active, archived, and all views.
- Unread and attention state is visible without showing every old session.
- Automations have a dedicated list plus run-history view.
- Channels have health/status/login surfaces.
- Approvals and security decisions are explicit.
- Device and host resource state can be inspected separately from agent work.
- Inbox and Settings keep alerts and setup issues out of the primary workflow.

OpenClaw's August 2026 UI redesign is especially important. It intentionally moved away from an Overview-first experience and toward a conversation-centered interface with live work, files, approvals, and settings close to the conversation.

AI-Verse should not copy that decision literally because the user specifically wants a visual Control Room. The right compromise is:

- Keep a beautiful **Now / Control Room** page.
- Keep **Chat** as the fastest operational surface.
- Keep detailed history, automation, health, and diagnostics one click away.
- Never force the user to stare at a giant NOC-style dashboard to operate the system.

#### OpenClaw channel lessons

OpenClaw normalizes many messaging systems behind channel adapters and applies sender policy such as pairing and allowlists.

This is the pattern to copy for Telegram, Discord, and WhatsApp:

```text
Provider webhook/polling
      |
      v
Channel adapter
      |
Identity normalization
      |
Pairing / allowlist / workspace ACL
      |
Normalized message envelope
      |
AI-Verse command or chat router
```

Do not give Telegram, Discord, or WhatsApp direct filesystem access.

#### OpenClaw Task Brain lesson

OpenClaw's 2026 task control work converged scheduled jobs, background execution, subagent work, parent-child relationships, recovery, and blocked states into a durable task control model.

AI-Verse should have the same conceptual model, but the durable task ledger belongs in the core OS. The Dashboard reads it and sends commands such as start, cancel, retry, pause, or approve through the OS command API.

---

### 3. OpenHands Agent Canvas

Repository: https://github.com/OpenHands/OpenHands

Product: https://www.openhands.dev/product/canvas

OpenHands is the strongest reference for separating an interface from multiple agent runtimes.

Useful boundaries:

- Frontend is TypeScript/React.
- Agent/runtime functionality lives behind a dedicated server and typed API.
- Browser code is expected to use a sanctioned typed client rather than reaching into backend endpoints arbitrarily.
- The system can surface different agent harnesses and backends.
- Parallel agent work can be isolated rather than blended into one terminal.
- Automations and long-running agent work are first-class concepts.

This is highly relevant because AI-Verse may live primarily inside Codex, Claude Code, an IDE, or another harness.

The Dashboard does not need to replace those environments. It needs to **observe and control them through adapters**.

Recommended strategy:

- Prefer ACP-compatible runtime adapters where practical.
- Support Claude Code and Codex as runtime/session sources.
- Fall back to CLI adapters with structured JSONL/stdout when no richer protocol exists.
- Treat the terminal as a read-only or controlled execution view, not as the product itself.

---

### 4. OpenFang

Repository: https://github.com/RightNow-AI/openfang

OpenFang is useful mainly as an information-architecture and autonomous-worker reference.

Its dashboard-oriented concepts include agents, sessions, approvals, communications, workflows, scheduler, channels, skills, autonomous hands/workers, analytics, runtime, and settings.

Useful ideas to borrow:

- Scheduled autonomous workers should have their own visible identity and health.
- Runtime health and agent work should be separate views.
- Approval queues deserve a dedicated surface.
- Autonomous workers need explicit last-run, next-run, success/failure, and output summaries.

AI-Verse should not copy the OpenFang runtime architecture into the Dashboard repo because it would blur Layer 5 with the core OS.

---

### 5. TenacitOS Mission Control

Repository: https://github.com/carlosazaustre/tenacitOS

License: MIT.

TenacitOS is a practical visual reference because it already presents OpenClaw as a Mission Control dashboard. It uses Next.js, React 19, Tailwind CSS v4, Recharts, SQLite, and React Three Fiber. It includes system metrics, agent state, sessions, costs, cron, activity, memory browsing, file browsing, notifications, a terminal, and a 3D office.

It is a good source to borrow visual components and layout ideas from, with license attribution preserved.

It is **not** a good architectural base for AI-Verse without surgery because it also initializes and owns dashboard JSON files for cron jobs, activities, notifications, skills, and tasks, and includes direct file/memory editing. Those choices conflict with AI-Verse's canonical-state rule.

Recommendation:

- Reuse selected MIT UI pieces if useful.
- Do not inherit its local JSON data model.
- Remove direct editors for canonical AI-Verse state.
- Replace its backend reads/writes with the typed AI-Verse Dashboard client.

---

### 6. Langfuse

Docs: https://langfuse.com/docs

Langfuse is one of the strongest references for LLM and agent observability UX.

Useful ideas:

- Trace timelines.
- Session views.
- Nested spans.
- Latency and token/cost views.
- Evaluations and score overlays.
- Drill-down from a summary into one exact model/tool call.

It is not a good base for a local filesystem Control Room because its production stack is intentionally much heavier.

AI-Verse should borrow the trace model and optionally export OpenTelemetry/OpenInference-compatible telemetry. It should not make Langfuse's storage stack a requirement for the dashboard.

---

### 7. Arize Phoenix

Repository: https://github.com/Arize-ai/phoenix

Phoenix is another strong agent observability reference and is particularly useful for OpenTelemetry/OpenInference-style traces and evaluations.

Good ideas to borrow:

- Agent trace trees.
- Tool-call spans.
- Evaluation metadata.
- Framework-neutral instrumentation.
- Local deployment as an optional observability sidecar.

A strong future option is to let AI-Verse export its runtime traces in OpenTelemetry/OpenInference form so Phoenix or Langfuse can consume them, while AI-Verse Dashboard still provides the lightweight native Control Room.

---

## Adoption matrix

| Source | Copy directly | Borrow concept | Avoid copying |
|---|---:|---:|---:|
| LifeOS Pulse | Some MIT parsing/freshness patterns | Read-only surfaces, freshness, fail-soft health, one local daemon | Broad write-capable dashboard modules |
| OpenClaw | Typed protocol patterns, channel/pairing ideas, selected MIT UI/runtime utilities | Gateway, task rail, approvals, automations, channel adapters, chat-first UX | Forking the entire monorepo as AI-Verse Dashboard |
| OpenHands | Typed-client separation patterns | Runtime adapters, ACP, parallel sessions, clean UI/server split | IDE/editor-centric product scope |
| OpenFang | Limited | Nav taxonomy, autonomous worker health | Runtime ownership inside Dashboard |
| TenacitOS | Selected MIT React visual components | Mission Control styling, metrics, 3D inspiration | Local dashboard JSON as truth, direct file editors |
| Langfuse | Usually no | Traces, sessions, cost/eval UX | Heavy backend dependency |
| Phoenix | Usually no | OTEL/OpenInference traces and span UX | Making it the AI-Verse control plane |

## 2026-09-12 research amendment: desktop shell, persistent Bots and shared Rooms

The original research remains valid. Additional review of Hermes Desktop, Grok Bot, Kylon, modern docking libraries, and native webview hosts adds a stronger frontend composition direction without changing the Dashboard's authority model.

### Hermes Desktop

Hermes Desktop demonstrates a production-quality native React agent interface driving the same underlying agent through a separate headless backend. Its documented UI includes multiple simultaneous conversations, live tool activity, a right-hand preview rail, task progress, configurable status information, and session continuity across interfaces.

The relevant lesson for AI-Verse is that the desktop application can be a polished client shell without becoming the agent runtime or canonical state store.

Reference:
https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/desktop.md

### Grok Bot

Grok Bot's September 2026 design write-up explicitly makes persistent Bots, rather than chat sessions, the primary sidebar object. Bots expose identity and state, Routines live with the Bot, group chats allow several Bots to collaborate, and structured widgets/events can appear inside the conversation timeline.

Its computer-use design also uses three levels of visibility:

1. Status
2. Preview
3. Takeover

This is a strong pattern for AI-Verse runtime/browser/computer surfaces because it provides visibility without encouraging constant supervision.

Grok Bot also supports continuing the same text-thread experience between desktop and mobile, reinforcing the need to design responsive/mobile behavior from Phase 1 rather than treating it as a later redesign.

References:
https://x.ai/news/designing-grok-bot
https://x.ai/news/introducing-grok-bot
https://x.ai/news/grok-bot-more-plans

### Kylon

Kylon's workspace model treats a Room as the place where one piece of work lives, including the thread, files, records, people, and agents. It emphasizes scoped permissions, human approval gates, and execution trails.

For AI-Verse, these are valuable Dashboard presentation concepts but not Layer 5 storage responsibilities.

The Dashboard should visualize canonical Room/Thread/Bot state, permissions, approvals, and provenance exposed by the appropriate core layers. It must not recreate Kylon's canonical workspace, memory, integration, or data ownership inside the Dashboard.

References:
https://kylon.io/solutions/ai-workspace
https://kylon.io/solutions/ai-employee
https://kylon.io/blog/kylon-privacy-architecture

### Docking and native desktop feasibility

Dockview currently supports docked groups, floating groups, nested layouts, popout windows, and redocking popouts. This makes a mature docking library preferable to inventing basic panel mechanics.

For true desktop HUD behavior, the browser layout layer is not enough. Tauri 2 exposes native window configuration including always-on-top behavior, making it a strong candidate for wrapping the existing React/Vite application later.

The architecture implication is:

- build panels as host-independent UI modules from Phase 1
- use dock/floating/popout behavior in the web shell
- add native detached/HUD behavior through a desktop host without changing panel data contracts
- keep the Gateway independent of the desktop wrapper

References:
https://dockview.dev/docs/core/groups/floatingGroups/
https://dockview.dev/docs/core/groups/popoutGroups/
https://v2.tauri.app/reference/config/

### Revised synthesis

The best current synthesis is now:

- **LifeOS Pulse** for zero-truth read projections and freshness
- **OpenClaw** for typed realtime control, approvals, tasks, channels and pairing
- **OpenHands** for typed-client/runtime separation
- **TenacitOS** for Mission Control visual inspiration
- **Hermes Desktop** for the operational desktop/chat shell
- **Grok Bot** for persistent Bot and progressive runtime UX
- **Kylon** for Room, permission, approval and provenance UX
- **Dockview/Tauri-style composition** for AI-Verse's own dock/float/detach/HUD shell
- **Langfuse/Phoenix** for trace and observability UX

The AI-Verse-specific differentiator should be the modular shell: live surfaces can be arranged, hidden, floated, detached, or reduced to compact HUDs while the underlying source-of-truth and isolation contracts remain unchanged.

---

## What the market is converging on in 2026

The strongest open-source agent interfaces are converging on several common primitives:

1. **Typed realtime gateway** instead of browser-to-filesystem coupling.
2. **Conversation plus activity stream** as the operational center.
3. **Durable tasks and automations** rather than fire-and-forget prompts.
4. **Approval surfaces** for actions with side effects.
5. **Session and subagent hierarchy** so parallel work remains understandable.
6. **Live traces and tool activity** with aggressive summarization and drill-down.
7. **Workspace/project identity** shown prominently.
8. **Omnichannel adapters** separated from the agent itself.
9. **Explicit freshness and health** instead of pretending every data source is current.
10. **Typed clients and runtime adapters** so the UI does not care which agent harness is underneath.

## Recommended AI-Verse position

AI-Verse Dashboard should position itself as:

> A local-first visual control plane for AI-Verse OS. It observes canonical workspace state, talks to agents, routes approved commands to the OS, monitors autonomous work, and exposes the same control surface through web and messaging clients without owning the user's knowledge.

That makes it complementary to Claude Code, Codex, IDEs, and terminal-native workflows instead of competing with them.

## Final recommendation on copying vs building

Do not start by forking OpenClaw or OpenHands wholesale.

A more efficient path is:

1. Use a modern React/Vite shell for AI-Verse's own visual identity.
2. Copy selected MIT UI primitives or interaction patterns from TenacitOS/OpenClaw where they save real time.
3. Copy the **protocol architecture** from OpenClaw rather than its entire UI.
4. Copy the **typed-client boundary** from OpenHands.
5. Copy the **zero-truth/freshness discipline** from LifeOS Pulse.
6. Make OpenClaw an optional omnichannel bridge initially so AI-Verse does not need to maintain WhatsApp, Telegram, Discord, pairing, and every messaging edge case on day one.
7. Add native channel adapters later only if AI-Verse needs independence from OpenClaw.

## Primary references

- LifeOS: https://github.com/danielmiessler/LifeOS
- LifeOS Pulse system: https://github.com/danielmiessler/LifeOS/blob/main/LifeOS/install/LIFEOS/DOCUMENTATION/Pulse/PulseSystem.md
- OpenClaw: https://github.com/openclaw/openclaw
- OpenClaw Control UI reference: https://github.com/openclaw/openclaw/blob/main/docs/web/control-ui/feature-reference.md
- OpenClaw Gateway protocol: https://github.com/openclaw/openclaw/blob/main/packages/gateway-protocol/README.md
- OpenClaw Control UI package: https://github.com/openclaw/openclaw/blob/main/ui/package.json
- OpenHands: https://github.com/OpenHands/OpenHands
- OpenHands Agent Canvas: https://www.openhands.dev/product/canvas
- OpenFang: https://github.com/RightNow-AI/openfang
- TenacitOS: https://github.com/carlosazaustre/tenacitOS
- Langfuse: https://langfuse.com/docs
- Arize Phoenix: https://github.com/Arize-ai/phoenix
- Hermes Desktop: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/desktop.md
- Grok Bot design: https://x.ai/news/designing-grok-bot
- Grok Bot launch: https://x.ai/news/introducing-grok-bot
- Kylon AI workspace: https://kylon.io/solutions/ai-workspace
- Kylon privacy architecture: https://kylon.io/blog/kylon-privacy-architecture
- Dockview popouts: https://dockview.dev/docs/core/groups/popoutGroups/
- Tauri 2 configuration: https://v2.tauri.app/reference/config/
- 3D Force Graph: https://github.com/vasturiano/3d-force-graph
- Cytoscape.js: https://js.cytoscape.org/
- Cytoscape large-graph performance work: https://github.com/cytoscape/cytoscape.js/issues/3486
