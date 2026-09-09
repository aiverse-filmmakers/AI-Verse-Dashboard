# AI-Verse-Dashboard

**Layer 5: the visual Control Room for AI-Verse OS.**

AI-Verse Dashboard is a local-first interface layer for observing and controlling AI-Verse OS without becoming a second source of truth.

The canonical OS remains Markdown, SQLite, runtime state, and the AI-Verse write contracts. The Dashboard reads those sources through strict workspace-scoped projections and sends all mutations back through an explicit AI-Verse OS command boundary.

## Core principles

1. **The Dashboard owns zero domain truth.** Canonical knowledge, tasks, initiatives, schedules, memory, and configuration remain in AI-Verse OS.
2. **Read directly, cache disposably.** Parsed Markdown, graph layouts, thumbnails, and search indexes may be cached only as rebuildable projections.
3. **Never write around the OS.** Chat commands, cron changes, task controls, approvals, and other mutations must go through the core OS command interface.
4. **Workspace isolation is enforced server-side.** Clients send workspace IDs, never arbitrary filesystem roots.
5. **Local-first by default.** The Gateway binds to localhost unless the user deliberately enables a trusted remote path.
6. **Omnichannel is an interface, not an authority.** Telegram, Discord, WhatsApp, and future clients receive the same scoped capabilities as the Web UI.
7. **The Dashboard is not an IDE.** Claude Code, Codex, IDEs, terminals, and other agent harnesses remain valid primary execution environments.

## Core architecture

```text
Canonical AI-Verse OS
Markdown + SQLite + task/runtime state
        |
        | read-only projections
        v
AI-Verse Dashboard Gateway
        |
        +-- Local Web UI
        +-- OpenClaw bridge
        +-- Telegram / Discord / WhatsApp
        +-- future native clients

Commands flow back through the AI-Verse OS command boundary.
The Dashboard never mutates canonical state directly.
```

## Recommended stack

### Web

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Radix/shadcn-style primitives
- TanStack Query + Virtual
- WebGL graph rendering

### Gateway

- Node.js 24
- TypeScript
- Fastify or Hono
- WebSocket realtime protocol
- Zod schemas and versioned protocol
- strict read-only Markdown/SQLite projectors

### Runtime and channel adapters

- ACP where practical
- Claude Code / Codex adapters
- OpenClaw Gateway bridge for mature omnichannel support
- native Telegram/Discord/WhatsApp adapters later if justified

## Mandatory product surfaces

- **Now / Control Room**: current focus, active work, attention queue, compact 4Cs health
- **Chat / Command Center**: talk to the agent with live tool activity
- **Work**: initiatives, tasks, subagents, blocked/waiting state
- **Runs / Timeline**: traces, terminal-style logs, tool calls, errors and retries
- **Automations**: cron/schedules and run history
- **Inbox**: approvals, questions, failures, pairing, security and required review
- **Health**: schema-driven 4Cs with evidence and freshness
- **Knowledge / Brain**: workspace-scoped graph with optional 3D mode
- **Usage**: tokens, cost and machine/resource visibility

## Research and blueprint

- [September 2026 research](docs/RESEARCH-2026-09.md)
- [Architecture blueprint](docs/ARCHITECTURE-BLUEPRINT.md)
- [Reference adoption and fork plan](docs/REFERENCE-ADOPTION-MAP.md)

The benchmark combines the strongest ideas from LifeOS Pulse, OpenClaw, OpenHands Agent Canvas, OpenFang, TenacitOS, Langfuse, Phoenix, and modern WebGL graph tooling.

## North-star rule

> **AI-Verse Dashboard should make the OS visible and controllable without becoming the OS.**
