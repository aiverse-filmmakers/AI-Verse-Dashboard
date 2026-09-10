# AI-Verse-Dashboard

**Layer 5: the visual Control Room for AI-Verse OS.**

AI-Verse Dashboard is a local-first interface layer for observing and controlling AI-Verse OS without becoming a second source of truth.

The Dashboard may register one or more compatible AI-Verse OS installations on the same machine. Each registered OS is a separate security, context, runtime, memory, and provider-session boundary. The canonical state for each OS remains its own Markdown, SQLite, runtime state, and AI-Verse write contracts.

## Core principles

1. **The Dashboard owns zero domain truth.** Canonical knowledge, tasks, initiatives, schedules, memory, and configuration remain in the selected AI-Verse OS.
2. **Read directly, cache disposably.** Parsed Markdown, graph layouts, thumbnails, and search indexes may be cached only as rebuildable projections.
3. **Never write around the OS.** Chat commands, cron changes, task controls, approvals, and other mutations must go through the selected OS command interface.
4. **Registered OS installations are isolated.** Every OS-bound query, command, event, cache entry, runtime session, Bot context, chat history, and provider conversation is scoped by `systemId`. One registered OS must not read, write, or inherit context from another.
5. **Workspace isolation is enforced server-side.** Clients send `systemId` and workspace IDs, never arbitrary filesystem roots.
6. **Multiple windows and in-app OS switching are supported by design.** Each Dashboard window or tab may select its own registered OS, and switching OS restores only that OS's own Dashboard and AI state.
7. **Local-first by default.** The Gateway binds to localhost unless the user deliberately enables a trusted remote path.
8. **Omnichannel is an interface, not an authority.** Telegram, Discord, WhatsApp, and future clients receive the same scoped capabilities as the Web UI.
9. **The Dashboard is not an IDE.** Claude Code, Codex, IDEs, terminals, and other agent harnesses remain valid primary execution environments.

## Core architecture

```text
Registered AI-Verse OS A ----\
                              \
Registered AI-Verse OS B ------> AI-Verse Dashboard Gateway
                              /            |
Registered AI-Verse OS C ----/             +-- Local Web UI
                                           +-- OpenClaw bridge
                                           +-- Telegram / Discord / WhatsApp
                                           +-- future native clients

Each request is bound to exactly one registered OS through systemId.
Within that OS, workspace-scoped operations are also bound to workspaceId.
Commands flow back through that selected OS command boundary.
The Dashboard never mutates canonical state directly.
```

A registered OS connection stores only Dashboard-owned connection metadata such as a stable `systemId`, display label, compatible OS type/version, and an approved local root selected by the user. The browser never supplies arbitrary roots during normal operation.

Using the same AI provider or model in two registered OS installations does not create shared context. Provider conversations and runtime sessions must remain separate per `systemId`, so switching OS never carries chat history or memory across the boundary.

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

- **Now / Control Room**: selected OS and workspace, current focus, active work, attention queue, compact 4Cs health
- **Chat / Command Center**: talk to the agent with live tool activity inside the selected OS context only
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

The multi-OS isolation amendment extends the original architecture without changing that research baseline or the six implementation phases.

## North-star rule

> **AI-Verse Dashboard should make one or more isolated AI-Verse OS installations visible and controllable without becoming the OS or allowing state to leak between them.**
