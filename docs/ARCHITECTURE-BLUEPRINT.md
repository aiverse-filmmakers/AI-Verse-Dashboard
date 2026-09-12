# AI-Verse Dashboard Architecture Blueprint

Status: proposed Layer 5 architecture

Research baseline: 2026-09-09

## 1. Product definition

AI-Verse Dashboard is the **visual and interface layer** for AI-Verse OS.

It is not:

- the source of truth
- a new IDE
- a replacement for Claude Code, Codex, or terminal workflows
- a second memory system
- a second scheduler
- a second task database
- a filesystem editor with agent branding

It is:

- a local Control Room
- a realtime read model over canonical OS state
- a chat and command client for the OS
- an observability surface for agents, jobs, subagents, tools, and health
- a secure omnichannel gateway surface
- a workspace-scoped knowledge visualizer
- a connection surface for one or more compatible, strictly isolated AI-Verse OS installations

The governing rule is:

> **The Dashboard may own presentation state, OS connection metadata, and disposable caches. It may not own domain truth.**

---

# 2. Architectural decision

## Recommended shape

Use two primary applications in one repository:

```text
AI-Verse-Dashboard/
|
+-- apps/
|   +-- web/                  # React/Vite visual Control Room
|   +-- gateway/              # local authenticated control/read gateway
|
+-- packages/
|   +-- protocol/             # versioned request/response/event schemas
|   +-- client/               # typed TypeScript SDK used by all UIs
|   +-- ui/                   # reusable visual primitives
|   +-- shell/                # panel registry, layout/window/preset contracts
|   +-- os-read-adapter/      # read-only Markdown/SQLite projectors
|   +-- runtime-adapters/     # Claude Code/Codex/ACP/OpenClaw adapters
|   +-- channel-core/         # normalized channel contracts + policy
|   +-- graph/                # knowledge graph projection and LOD logic
|   +-- observability/        # trace/event normalization
|
+-- bridges/
|   +-- openclaw/             # optional omnichannel bridge
|   +-- telegram/             # later native adapter
|   +-- discord/              # later native adapter
|   +-- whatsapp/             # later, if actually needed
|
+-- docs/
    +-- RESEARCH-2026-09.md
    +-- ARCHITECTURE-BLUEPRINT.md
```

The browser never receives arbitrary local paths and never opens SQLite itself.

## Registered OS connection model

The Gateway must not be permanently bound to one hard-coded AI-Verse OS root. It may register one or more compatible local AI-Verse OS installations selected explicitly by the user.

Each registered installation receives a stable Dashboard-local `systemId` and connection record such as:

```json
{
  "systemId": "aiverse-01",
  "label": "AI-Verse OS",
  "type": "ai-verse-os-v2",
  "root": "/approved/local/path/to/AI-Verse-OS"
}
```

The root is privileged Gateway configuration. Normal browser requests use `systemId`; they never provide or override arbitrary filesystem roots.

The hierarchy is:

```text
Dashboard
  |
  +-- registered systemId
       |
       +-- workspaceId
            |
            +-- Brain / Memory / Bots / tasks / knowledge / runtime state
```

Multiple Dashboard windows or browser tabs may be open simultaneously. Each window or tab keeps its own selected `systemId` and `workspaceId`. One Dashboard may also expose several registered OS installations as switchable tabs or a system switcher.

### Hard system isolation

A registered OS installation is a complete context and authority boundary.

The following must be scoped by `systemId` and must never leak implicitly between systems:

- canonical filesystem roots
- workspace registries
- Brain state
- Memory
- Bot, Room, Thread, Task, Team Run, and approval state
- chat history
- provider conversation IDs
- runtime/session IDs
- automations and run history
- WebSocket subscriptions
- search and graph projections
- logs and observability spans
- Dashboard caches
- access grants and channel/session scope

Using the same provider or model for two registered systems does not create shared context. A runtime adapter must maintain separate provider conversations and runtime sessions for each `systemId`.

Switching from system A to system B must restore only B's own state. Returning to A restores A's own state. No chat, memory, runtime context, or model conversation from A may be sent to B.

System A must not read or mutate system B through normal operations. Any future cross-system artifact transfer must be a separate explicit export/import operation with its own authorization and provenance, not shared filesystem authority.

---

# 3. Data flow: Query path vs Command path

The most important boundary is a strict separation between observing state and changing state.

## Query path

```text
Registered AI-Verse OS selected by systemId
        |
Canonical workspace
Markdown + canonical SQLite + runtime state
        |
        | read-only
        v
Projection adapters
        |
        v
Dashboard Gateway
        |
        +-- HTTP snapshots
        +-- WebSocket events
        |
        v
Web UI / messaging clients / native clients
```

## Command path

```text
Web UI / Telegram / Discord / WhatsApp
        |
        | systemId + optional workspaceId
        v
Dashboard Gateway
        |
        | authenticated intent
        v
Selected AI-Verse OS command boundary
        |
        | validates system, workspace, policy and write contract
        v
Canonical Markdown / SQLite / scheduler / agent runtime
        |
        | filesystem/runtime events
        v
Dashboard projection refresh for that same systemId
```

A successful command is not complete merely because the Gateway returned 200. The ideal UI model is:

1. submit command
2. selected OS acknowledges command
3. selected OS performs canonical write/action
4. read model observes the resulting canonical state in that same `systemId`
5. UI reconciles to the new state

This prevents the UI from lying about state before the OS actually committed it and prevents one system's command from reconciling against another system's state.

---

# 4. Recommended technology stack

## Frontend

### Recommended

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS v4**
- **Radix UI or shadcn-style primitives**
- **TanStack Query** for server state
- **TanStack Virtual** for logs, sessions, traces, and long lists
- **TanStack Router** or a small typed router
- **Zustand** only for transient UI state if needed
- **Lucide** icons
- **ECharts or Recharts** for small operational charts
- **ghostty-web or xterm.js** for terminal-style output
- **CodeMirror** only for read-only source inspection where syntax rendering helps
- **Mermaid** for agent plans and diagrams

### Why Vite rather than Next.js

The Dashboard is local-first and does not need SEO or server-rendered marketing pages. A Vite SPA gives:

- smaller conceptual surface
- easier static packaging
- clean separation from Gateway
- excellent realtime behavior
- simpler future desktop wrapping with Tauri if wanted

OpenClaw's modern Control UI uses Vite and a typed Gateway. TenacitOS demonstrates that Next.js also works, but AI-Verse gains little from coupling its server API and web application into one Next.js process.

If the team strongly prefers Next.js, it is viable, but the architectural rule must remain: Next server actions/API routes are clients of the AI-Verse Gateway, not a second backend with its own truth.

## Gateway

### Recommended

- **Node.js 24**
- **TypeScript**
- **Fastify or Hono** for HTTP
- **WebSocket** for bidirectional realtime events and commands
- **Zod** for runtime validation
- **chokidar** or native filesystem watchers for invalidation
- SQLite driver opened strictly read-only
- structured JSON logging

### Bun?

Bun is viable and LifeOS Pulse proves that a single Bun daemon can work well. Node 24 is the safer default for broad compatibility with channel SDKs, filesystem libraries, tracing libraries, native modules, and future contributors.

### FastAPI?

Do not make Python FastAPI the primary Dashboard backend unless AI-Verse core already exposes most of its runtime through Python.

If the core OS is Python-heavy, use a narrow Python adapter or core service, then keep the Dashboard Gateway protocol stable above it. The browser should not care whether the underlying runtime is Python, TypeScript, Rust, or shell.

---

# 5. Versioned Gateway protocol

Copy the structural lesson from OpenClaw: the protocol should be its own package.

## Frame model

Example only:

```json
{
  "type": "req",
  "id": "01J...",
  "method": "task.list",
  "systemId": "aiverse-01",
  "workspaceId": "film-project-x",
  "params": {}
}
```

```json
{
  "type": "res",
  "id": "01J...",
  "ok": true,
  "systemId": "aiverse-01",
  "result": {},
  "observedAt": "2026-09-09T08:00:00Z",
  "sourceVersion": "..."
}
```

```json
{
  "type": "event",
  "event": "task.updated",
  "systemId": "aiverse-01",
  "workspaceId": "film-project-x",
  "seq": 18293,
  "observedAt": "2026-09-09T08:00:01Z",
  "payload": {}
}
```

## Protocol requirements

- protocol version negotiated during handshake
- Zod schemas for every method and event
- generated/inferred TypeScript types
- explicit `systemId` on every OS-bound operation and event
- explicit `workspaceId` on every workspace-scoped operation
- object identity, subscriptions, dedupe, and cache keys are namespaced by `systemId`
- monotonic event sequence where practical within each system/event stream
- event source and freshness metadata
- bounded payload sizes
- request cancellation for long queries
- reconnect and resync semantics that restore the selected system independently
- capability discovery so older clients can gracefully hide unsupported controls

## Suggested query methods

```text
system.list
system.get
system.info
workspace.list
workspace.get
workspace.health
workspace.inbox.list
initiative.list
initiative.get
task.list
task.get
task.children
run.list
run.get
run.logs
cron.list
cron.history
agent.list
agent.sessions
usage.summary
graph.query
graph.node
source.preview
```

System registration and removal are Dashboard-local connection-management operations. They alter only Dashboard-owned connection metadata and must not modify the registered OS itself.

## Suggested command methods

These do not modify canonical state themselves. They forward to the selected core OS command boundary.

```text
chat.send
chat.abort
task.start
task.cancel
task.retry
cron.create
cron.pause
cron.resume
cron.runNow
approval.resolve
initiative.activate
inbox.resolve
```

Each command should return a core command ID that can be traced through execution and eventual canonical-state change in the same `systemId`.

---

# 6. The read-only contract

This is the most important implementation contract in the repo.

## Rule 1: Browser never sees filesystem paths as authority

Clients operate on stable IDs.

Bad:

```text
GET /file?path=/Users/bogdan/AI-Verse/workspaces/x/STATE.md
```

Good:

```text
GET /api/systems/aiverse-01/workspaces/x/sources/state
```

The server resolves `systemId` through the Dashboard's approved connection registry and resolves `workspaceId` through that selected OS's canonical workspace registry.

## Rule 2: System registry defines allowed OS roots, then workspace registry defines scope

A Dashboard-local connection record maps a stable `systemId` to one approved compatible OS root:

```json
{
  "systemId": "aiverse-01",
  "type": "ai-verse-os-v2",
  "root": "/canonical/path/to/AI-Verse-OS"
}
```

Within that selected OS, the Gateway receives or reads canonical workspace records such as:

```json
{
  "id": "project-x",
  "root": "/canonical/path/to/AI-Verse-OS/workspaces/project-x",
  "sqlite": ["/canonical/path/to/AI-Verse-OS/runtime/indexes/project-x.sqlite"]
}
```

The client may send only registered `systemId` and appropriate `workspaceId`, never an arbitrary root. Two systems may contain identical workspace or object IDs without collision because Dashboard identity is namespaced by `systemId`.

## Rule 3: Resolve real paths server-side

Before reading any file:

1. resolve the registered real OS root from `systemId`
2. verify the connection is compatible and currently authorized
3. resolve canonical workspace root inside that selected OS when workspace-scoped
4. resolve requested logical source to an absolute real path
5. reject path traversal
6. reject symlinks that escape the selected system/workspace boundary
7. apply file-type and size policy
8. read only

A request bound to system A must never fall back to or search system B when a source is missing.

## Rule 4: Markdown projection

Use a projection pipeline:

```text
Markdown file
   |
mtime/size/hash check
   |
frontmatter parser
   |
Markdown AST or structured parser
   |
typed projection
   |
API response
```

Cache only the parsed projection in memory or the Dashboard cache directory.

Recommended cache key:

```text
systemId + workspaceId + relativePath + mtime + size
```

For stronger invalidation, add a BLAKE3/content hash when the file changes.

## Rule 5: SQLite must be physically opened read-only

For canonical SQLite databases:

- use SQLite URI `mode=ro`
- set `PRAGMA query_only=ON`
- use short queries
- set a sensible busy timeout
- do not run migrations
- do not create indexes
- do not create dashboard tables
- do not attach writable databases to the canonical connection
- never attach or query canonical databases from a different `systemId` in the same scoped operation

Be careful with `immutable=1`. It is appropriate only for a database that is genuinely immutable for the life of that connection. A live WAL database should use normal read-only mode so new committed state can be observed correctly.

## Rule 6: Dashboard cache is disposable

Allowed location example:

```text
~/.aiverse/dashboard-cache/
```

Allowed cached data:

- parsed Markdown projections
- search index derived from canonical state
- graph layout coordinates
- thumbnails
- source mtimes/hashes
- UI preferences
- registered-system display metadata
- recently used system and workspace IDs

All OS-derived cache entries must be partitioned by `systemId` so switching systems cannot reuse another system's projection, search result, graph layout, chat/runtime state, or recent object identity.

Forbidden cached data as authority:

- canonical tasks
- canonical goals
- canonical memory
- canonical cron definitions
- agent instructions
- user notes
- approval decisions
- knowledge facts that do not exist in canonical state

Deleting the Dashboard cache must never damage any registered AI-Verse OS.

## Rule 7: Every panel displays provenance and freshness

Every projection should be able to report:

```json
{
  "systemId": "aiverse-01",
  "source": "workspace://project-x/STATE.md",
  "observedAt": "...",
  "sourceModifiedAt": "...",
  "freshness": "fresh",
  "canonical": true
}
```

Derived summaries should report both the canonical source and that the displayed value is derived.

## Rule 8: Missing is not healthy

If a source is missing, unreadable, stale, or malformed:

- show unavailable or stale
- do not silently substitute zero
- do not infer that nothing is wrong
- do not search another registered system for a substitute

This is one of the best lessons from LifeOS Pulse.

---

# 7. Command boundary with AI-Verse OS

The Dashboard should not ship until there is one supported mutation path.

Preferred order:

1. **Local Unix domain socket or named pipe** exposed by AI-Verse OS
2. versioned localhost RPC
3. stable `aiverse` CLI with structured JSON input/output
4. MCP/ACP adapter where the command maps naturally to an agent runtime

Avoid panel-specific shell commands spread across the frontend backend.

## Core command envelope

Example:

```json
{
  "commandId": "01J...",
  "actor": {
    "kind": "dashboard-user",
    "channel": "web",
    "identity": "local-owner"
  },
  "systemId": "aiverse-01",
  "workspaceId": "project-x",
  "command": "cron.create",
  "payload": {},
  "requestedAt": "..."
}
```

The Gateway resolves `systemId` to exactly one registered OS command boundary before forwarding the command. A command accepted for one system must never be rerouted to another system because of missing state, matching IDs, reconnect behavior, or adapter fallback.

The core OS owns:

- validation
- workspace boundary enforcement
- write contracts
- authorization
- canonical transaction
- audit event
- failure/retry semantics

The Dashboard owns:

- system connection selection
- request UX
- progress visualization
- approval UX
- displaying the resulting canonical state

---

# 8. Core UI panels

## A. Now / Control Room

This is the visual signature page.

It should answer six questions in under five seconds:

1. Which registered OS am I connected to?
2. Which workspace am I in?
3. What is the AI currently trying to achieve?
4. What is actively running?
5. What needs me?
6. Is the system healthy?

### Recommended composition

```text
+--------------------------------------------------------------------------+
| OS Switcher | Workspace Switcher     Global Search / Cmd-K     Presence |
+--------------------------------------------------------------------------+
| CURRENT FOCUS                                                            |
| Initiative / objective / next important action                           |
+--------------------------------+-----------------------------------------+
| RUNNING                        | NEEDS YOU                               |
| max 3 to 5 parent items        | approvals / blocked / questions        |
| compact child count            | max 3 to 5 items                       |
+--------------------------------+-----------------------------------------+
| 4Cs HEALTH STRIP                                                        |
+--------------------------------------------------------------------------+
| RECENT SIGNALS / NEXT AUTOMATION / COST SNAPSHOT                         |
+--------------------------------------------------------------------------+
```

The OS switcher may represent one or more registered installations. Selecting another system changes the entire context boundary, not just a visual filter. Multiple Dashboard windows/tabs may select different systems at the same time.

Do not make this a 30-widget telemetry board.

## B. Chat / Command Center

Capabilities:

- talk to selected AI-Verse agent/runtime
- selected system and workspace always visible
- model/runtime badge
- live tool activity
- stop/abort
- attach references if supported
- open background tasks from the conversation
- command suggestions
- contextual drawer for task, source, approval, or graph node

The composer should support both natural language and explicit commands.

### Chat and provider-session isolation

Each chat, provider conversation, and runtime session belongs to exactly one `systemId`.

If the same provider and model are used in system A and system B, they must still use separate conversation/session state. Switching system tabs must not forward previous messages, summaries, hidden runtime context, memory, tool results, or provider conversation identifiers from the previous system.

Returning to a previously selected system may restore that system's own conversation history and runtime session, but only from that system.

## C. Work

One surface for initiatives, tasks, and subagents.

Recommended filters:

- Active
- Waiting
- Blocked
- Done
- All

Each parent work item shows:

- objective
- owning agent
- workspace
- status
- start time
- elapsed time
- child subagent count
- last meaningful event
- token/cost indicator if useful
- attention state

Children should stay collapsed by default.

## D. Runs / Timeline

This replaces the temptation to expose a full developer terminal permanently.

Show:

- chronological trace
- nested agent/tool spans
- shell commands
- tool calls
- model calls
- files read
- files changed by the core runtime
- approvals
- errors/retries
- duration
- token/cost

The default view should summarize routine activity. Expand for raw logs.

### Terminal log UX

Use:

- virtualized rendering
- bounded in-browser live buffer
- older logs loaded on demand
- ANSI support
- search/filter
- pause autoscroll
- severity filter
- copy exact command/output

Do not keep every historical log line in DOM.

## E. Automations

Show:

- active/paused
- schedule in human terms
- raw cron expression on detail view
- workspace
- owner/agent
- next run
- last run
- last result
- failure streak
- run history

Controls such as create, pause, resume, run now, or delete must call the selected core OS command boundary.

## F. Inbox

The Inbox is the system's attention queue.

Sources can include:

- approvals
- agent questions
- failed jobs
- blocked tasks
- stale critical state
- proposed high-impact actions
- channel pairing requests
- security warnings
- important completed work if explicit review is required

Inbox items should include:

- severity
- age
- workspace
- source
- actor
- required action
- expiration if relevant

Routine successful completions should not fill the Inbox.

## G. Health / 4Cs

The Dashboard should not define the meaning of the 4Cs.

The selected OS should expose schema-driven health dimensions:

```json
{
  "dimensions": [
    {
      "id": "...",
      "label": "...",
      "status": "healthy",
      "summary": "...",
      "evidence": [],
      "freshness": {},
      "source": []
    }
  ]
}
```

The Dashboard renders whatever the selected OS declares.

This keeps the 4Cs doctrine canonical in AI-Verse OS and prevents Layer 5 from becoming a shadow specification.

### Health UX

- compact strip on Now
- full drill-down in Health
- green/amber/red/unknown
- reason always available
- evidence/source available
- freshness visible
- unknown is distinct from healthy

## H. Knowledge / Brain

Workspace-scoped graph and semantic exploration inside the selected `systemId` only.

Details in section 12.

## I. Usage

Optional but useful:

- tokens by model
- cost by workspace
- cost by agent
- cost by initiative/task
- daily/weekly trend
- context-window pressure
- local machine utilization

Keep billing metrics separate from system health.

## J. Settings

Dashboard settings may own:

- appearance
- sidebar arrangement
- graph visual preferences
- notification preferences
- local Gateway connection
- registered OS connection metadata and labels
- channel connection metadata where the Dashboard Gateway is the canonical owner

Core AI-Verse settings must be surfaced through core commands, not duplicated into Dashboard config.

---

# 9. Preventing information overload

Use three information horizons.

## Horizon 1: Now

Only:

- selected system/workspace identity
- current focus
- 3 to 5 meaningful running items
- 3 to 5 items needing attention
- compact health strip
- next important automation

## Horizon 2: Context rail

When a task/chat/initiative is selected, show:

- children/subagents
- recent meaningful activity
- relevant files/sources
- current plan
- approval state

## Horizon 3: Full history

Work, Runs, Automations, and Usage hold detailed history.

## Activity compression

Copy OpenClaw's best idea: compress repetitive tool streams.

Instead of:

```text
read file
read file
read file
shell
shell
shell
read file
```

show:

```text
Read 4 files, ran 3 commands
```

Expand to see exact calls.

## Status priority

The main UI should elevate only:

- Running
- Waiting for user
- Blocked
- Failed

Finished routine work fades into history automatically.

---

# 10. Runtime and IDE integration

AI-Verse Dashboard should remain useful even when the agent is primarily running inside Claude Code, Codex, an IDE, or another harness.

Create a runtime adapter interface:

```ts
interface RuntimeAdapter {
  capabilities(systemId: string): Promise<RuntimeCapabilities>
  listSessions(systemId: string, workspaceId: string): Promise<SessionSummary[]>
  getSession(systemId: string, sessionId: string): Promise<Session>
  send(systemId: string, sessionId: string, message: string): Promise<CommandAck>
  abort(systemId: string, sessionId: string): Promise<void>
  subscribe(systemId: string, sessionId: string): AsyncIterable<RuntimeEvent>
}
```

Possible adapters:

- ACP
- OpenHands
- Claude Code
- Codex
- OpenClaw Gateway
- generic CLI/JSONL

The Dashboard converts provider-specific events into one AI-Verse runtime event model.

Runtime adapters must treat `systemId` as an isolation boundary, not merely metadata. They may reuse provider credentials across systems when authorized, but must not reuse provider conversation IDs, hidden chat context, runtime sessions, tool result history, or model-side continuation state across different systems.

## Do not build a code editor

The Dashboard may preview files and diffs because those are essential for understanding agent activity.

Do not add:

- full project explorer intended for coding
- language server ownership
- source control IDE workflows
- terminal multiplexing as the primary experience
- autocomplete/editor features

Users can open the actual IDE or terminal when they need that depth.

---

# 11. Headless and omnichannel architecture

## Recommended day-one strategy

**Use OpenClaw as an optional channel bridge first.**

This immediately gives AI-Verse a mature path to Telegram, Discord, WhatsApp, and other channels without making AI-Verse responsible for every login, QR code, reconnect, provider API, pairing edge case, and messaging policy.

### Bridge pattern

```text
Telegram / Discord / WhatsApp
            |
            v
       OpenClaw Gateway
            |
       AI-Verse bridge
            |
            v
 AI-Verse Dashboard Gateway
            |
      systemId + ACL
            |
            v
 Selected AI-Verse OS command API
```

OpenClaw should receive only a narrow AI-Verse tool/API surface, not unrestricted access to any AI-Verse filesystem.

Later, native adapters can replace any channel independently.

## Native channel contract

```ts
interface ChannelAdapter {
  id: string
  start(): Promise<void>
  stop(): Promise<void>
  status(): Promise<ChannelStatus>
  send(target: ChannelTarget, message: OutboundMessage): Promise<void>
}
```

Normalized inbound message:

```ts
interface InboundMessage {
  channel: 'telegram' | 'discord' | 'whatsapp' | string
  accountId: string
  senderId: string
  conversationId: string
  messageId: string
  text?: string
  attachments?: AttachmentRef[]
  receivedAt: string
}
```

## Security defaults

### Binding

- Gateway binds to `127.0.0.1` by default.
- Never default to `0.0.0.0`.
- Remote Web UI should use Tailscale, WireGuard, or SSH tunnel.

### Pairing

Unknown messaging senders should be blocked or placed into pairing state by default.

Recommended modes:

```text
closed
pairing
allowlist
```

Avoid public/open DMs as a default.

### System and workspace ACL

Each authenticated identity is granted explicit registered-system access first, then workspace access within that system:

```text
Telegram user 123
  -> System aiverse-01
       -> Personal workspace: query + chat
       -> Client-A workspace: query only
  -> System aiverse-02: no access
```

A channel conversation must never be able to switch to a `systemId` or workspace the sender is not authorized to access.

### Action policy

Separate operations by risk:

- Read/query
- Reversible low-risk command
- External side effect
- Destructive/high-risk command

High-risk actions should require stronger confirmation. For early versions, resolve destructive approvals only in the local Web UI unless a trusted remote approval mechanism is explicitly configured.

### Credentials

Store provider credentials in:

- OS keychain
- encrypted secret store
- environment injected by service manager

Never write bot tokens, API keys, or WhatsApp secrets to workspace Markdown.

Shared credentials do not imply shared provider conversations or shared OS context.

### Audit

Every remote command should record:

- channel
- sender identity
- systemId
- workspace
- command
- timestamp
- approval path
- resulting core command ID

The canonical audit event belongs to the selected core OS/runtime contract.

---

# 12. Knowledge graph and 3D Brain

A graph should help the user understand a workspace. It should not be a decorative hairball.

## Canonical graph rule

Do not introduce a graph database as a new knowledge source merely to power the UI.

Build an ephemeral graph projection from canonical state such as:

- Markdown links
- frontmatter relations
- explicit entity IDs
- task-to-file relations
- initiative-to-task relations
- memory/document references
- SQLite relationship/index tables
- agent/run provenance

A graph DB can be added later only if the core OS itself adopts it as an official derived index with a rebuild contract.

## Default experience: 2D first

For actual navigation, a WebGL 2D graph is usually clearer and cheaper.

Recommended:

- Sigma.js + Graphology for the production 2D explorer
- ForceAtlas2 or similar layout in a Web Worker

## Optional 3D Brain mode

For the high-impact visual experience:

- `3d-force-graph` or `react-force-graph-3d`
- Three.js/WebGL
- optional React Three Fiber for custom scene composition

3D should be a mode, not the only way to access knowledge.

## Browser performance rules

Never stream the whole knowledge universe into the browser.

### Query budget

Example starting limits:

```text
max nodes initial: 500
max edges initial: 1,500
hard interactive ceiling: 2,000 to 5,000 visible nodes depending on device
initial neighborhood depth: 1
expand-on-demand depth: 1 additional hop
```

These are product budgets, not claims about renderer theoretical limits.

### Level of detail

- labels only for selected, hovered, and high-priority nodes
- cluster distant nodes
- aggregate repeated edge types
- hide/degrade edges while camera is moving
- render low-detail nodes when zoomed out
- load metadata only when selected

### Layout

- compute heavy layout in a Web Worker or server-side
- freeze physics after stabilization
- preserve layout coordinates in disposable Dashboard cache partitioned by `systemId`
- incrementally place new nodes rather than restarting the entire simulation

### Interaction

The graph should answer:

- What is this connected to?
- Why are these connected?
- Where did this fact/relation come from?
- Which active work touches this node?
- Which documents support it?
- What changed recently?

Every edge detail panel should expose provenance.

## Recommended graph endpoint

```text
POST graph.query
```

Example parameters:

```json
{
  "systemId": "aiverse-01",
  "workspaceId": "project-x",
  "seedIds": ["initiative:launch"],
  "depth": 1,
  "maxNodes": 500,
  "maxEdges": 1500,
  "types": ["document", "task", "entity", "initiative"]
}
```

The server enforces budgets regardless of client request.

---

# 13. System health and 4Cs data model

The 4Cs health view should be generic enough to survive changes in OS doctrine.

Suggested projection:

```ts
type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

interface HealthDimension {
  id: string
  label: string
  status: HealthStatus
  summary: string
  evidence: HealthEvidence[]
  checks: HealthCheck[]
  observedAt: string
  sourceModifiedAt?: string
  freshness: 'fresh' | 'aging' | 'stale' | 'unknown'
}
```

Do not calculate the doctrinal meaning of a C inside React.

The selected OS or a sanctioned read adapter should supply it.

---

# 14. Inbox data model

The Inbox becomes the universal attention mechanism.

```ts
type InboxKind =
  | 'approval'
  | 'question'
  | 'failure'
  | 'blocked'
  | 'stale'
  | 'pairing'
  | 'security'
  | 'review'

interface InboxItem {
  id: string
  systemId: string
  workspaceId: string
  kind: InboxKind
  severity: 'info' | 'warning' | 'critical'
  title: string
  summary?: string
  createdAt: string
  expiresAt?: string
  source: SourceRef
  availableActions: CommandDescriptor[]
}
```

The Dashboard can merge multiple read-only sources from the selected system into one Inbox projection, but resolving an item always calls the source-owning core command for that same `systemId`.

---

# 15. Task and subagent model

The UI needs one normalized work model even if underlying runtimes differ.

```ts
type WorkStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'succeeded'
  | 'failed'
  | 'cancelled'

interface WorkItem {
  id: string
  systemId: string
  workspaceId: string
  parentId?: string
  kind: 'initiative' | 'task' | 'subagent' | 'automation-run'
  title: string
  status: WorkStatus
  agentId?: string
  runtime?: string
  startedAt?: string
  completedAt?: string
  lastMeaningfulEvent?: string
  attentionRequired: boolean
}
```

The normalized model is a projection. The canonical task IDs and state remain in the selected AI-Verse OS. The pair `systemId + id` is the Dashboard identity boundary, so matching IDs in another system are unrelated objects.

---

# 16. Observability model

Adopt a trace structure compatible in spirit with OpenTelemetry/OpenInference.

Suggested span types:

```text
agent.run
model.call
tool.call
shell.command
file.read
file.write
approval
subagent.spawn
subagent.join
external.request
cron.run
```

Every span should be linkable to:

- systemId
- workspace
- task/initiative
- agent
- runtime session
- parent span
- cost/tokens where applicable

Trace/session identity must be partitioned by `systemId` so one system's logs or provider/runtime continuation state cannot appear in another system's timeline.

This makes it possible to render a Langfuse/Phoenix-style trace without requiring either product.

Future option: export OTEL/OpenInference so advanced users can attach Phoenix or Langfuse.

---

# 17. Visual design system

The Dashboard should feel like an AI operations environment, not a SaaS admin template.

Recommended visual principles:

- dark-first but excellent light mode
- high information density with restrained motion
- large system and workspace identity
- clear status colors used semantically
- subtle depth/glass only where it improves hierarchy
- live glow/pulse only for genuinely active processes
- compact monospace for runtime detail
- normal UI font for summaries and decisions
- animated graphs and agents remain optional

Core primitives:

- system chip/switcher
- workspace chip/switcher
- status dot
- health strip
- attention badge
- command palette
- task row
- agent avatar/status
- run progress row
- trace tree
- tool-call group
- terminal drawer
- approval card
- source provenance chip
- freshness badge
- graph node inspector
- right context rail
- bottom log drawer

## Modular shell composition contract

The visual system must be implemented as host-independent panels rather than permanent page furniture.

The authoritative detailed contract is in [MODULAR-DESKTOP-SHELL.md](MODULAR-DESKTOP-SHELL.md).

The key rules are:

- a panel may be docked, floated, detached, hidden, restored, or rendered in a compact presentation without changing its canonical data ownership
- panel placement and saved layouts are Dashboard-owned presentation state only
- every OS-derived panel remains explicitly scoped by `systemId` and, where applicable, `workspaceId`
- a detached/popout/HUD panel does not gain broader filesystem, runtime, cache, provider-session, or command authority
- panels consume the typed Dashboard client and must not bypass the Gateway
- the initial Phase 1 layout may remain conventional, but components must not assume a permanent column/route position
- responsive/mobile behavior is designed from Phase 1 rather than postponed as a later redesign
- critical panels should be capable of full/compact presentation where useful; native HUD presentation is a later host capability, not a new data path

The shell should support a View surface for panel visibility, reset, and saved layout presets. Future native wrapping may expose selected panels as separate application windows, including always-on-top HUDs, while keeping the same Gateway and isolation model.

### Persistent Bots and Rooms

When the selected OS exposes canonical Bot/Room/Thread state, the Dashboard should render those concepts as first-class surfaces rather than maintaining a second registry.

Useful UI patterns include:

- persistent Bot roster
- visible Bot state such as idle, thinking, working, waiting, blocked, or done
- Room/thread surfaces containing the relevant Bots, conversation, files/artifacts, permissions and execution trail
- Bot/Room-scoped routines and automation events when exposed canonically
- structured timeline objects for approvals, tasks, files, tool activity, handoffs and automations instead of forcing every event into prose

### Runtime visibility

For an agent runtime with a browser/computer surface, prefer progressive disclosure:

1. status
2. preview/context rail
3. full takeover/intervention view

The Dashboard should not encourage continuous babysitting of autonomous work.

### Visual quality gate

The design system must define reusable tokens, responsive breakpoints, component loading/empty/error/stale states, keyboard/focus behavior, reduced-motion behavior, and visual regression fixtures for critical surfaces.

A frontend slice is not complete merely because it renders. It must pass desktop and narrow-width visual QC without breaking the existing accessibility or information-hierarchy rules.

---

# 18. Security architecture

## Threat model priorities

1. Cross-system data or context leak
2. Cross-workspace data leak within one system
3. Messaging sender impersonation
4. Arbitrary filesystem path reads
5. Dashboard process gaining write access to canonical state
6. Remote execution through a chat message
7. Secret leakage in logs or UI
8. Stale approval replay
9. WebSocket hijack/cross-origin access
10. Provider conversation/session reuse across systems

## Required controls

- loopback bind by default
- authentication on every privileged connection
- strict WebSocket origin checking
- CSRF protection for HTTP mutations if cookies are used
- explicit system ACL per connection/session
- explicit workspace ACL within the selected system
- server-side system root and workspace path resolution
- one `systemId` bound to every OS-derived request/event/runtime session
- provider conversation IDs and runtime continuation state partitioned by `systemId`
- cache, search, graph, logs, subscriptions, and dedupe state partitioned by `systemId`
- no fallback from one system to another when data is missing
- rate limiting
- attachment size/type limits
- log redaction
- short-lived approval tokens
- approval replay prevention
- protocol payload size limits
- channel pairing or allowlist by default
- no arbitrary shell endpoint
- terminal commands via core-controlled capability only

## Strong filesystem hardening

If practical, run the Dashboard Gateway with OS-level read permission only on registered OS roots.

Examples:

- container bind mounts marked read-only
- dedicated local user with filesystem ACLs
- separate writable cache directory

Where stronger multi-user separation is required on a shared computer, OS-level user permissions or separately launched Gateway processes can provide an additional boundary beyond Dashboard `systemId` isolation.

Then even a Dashboard bug cannot directly modify canonical state through its read path.

---

# 19. Recommended build phases

The original six-phase implementation plan remains intact. Multi-OS support is a foundational scoping rule added to Phase 1 and inherited by later phases, not a new phase or redesign.

## Phase 1: Read-only Control Room

Ship:

- Vite/React shell
- Gateway and protocol package
- Dashboard-local registered OS connection registry
- compatible AI-Verse OS folder validation before registration
- stable `systemId` for every registered OS
- OS Switcher supporting multiple registered installations in one Dashboard
- independent selected `systemId` and `workspaceId` per Dashboard window/tab
- Workspace Switcher within the selected OS
- Now page
- 4Cs health projection
- active initiatives/tasks read model
- Inbox read model
- live filesystem invalidation partitioned by system
- read-only SQLite adapter partitioned by system
- provenance/freshness metadata including `systemId`
- isolation tests proving system A cannot read, resolve, cache, subscribe to, or collide with system B
- panel registry and shell/layout abstraction
- dockable panel host with visibility controls and resettable/savable presentation layout
- full/compact panel presentation contract
- responsive/mobile shell foundation
- design tokens, component state rules, and visual QA fixtures
- isolation tests covering multiple panel instances and popout/detached scopes

No mutation features until the core command boundary exists. Production native HUD windows are not required in Phase 1, but Phase 1 components must not be hard-coded in a way that requires rewriting them to support detachment later.

## Phase 2: Live agent control

Ship:

- chat
- runtime adapter interface
- Claude Code/Codex/ACP adapters as available
- system-scoped chat history and provider conversation/session lifecycle
- tests proving the same provider/model can serve several systems without sharing conversation or runtime context
- live activity stream
- task/subagent rail
- Runs/Timeline
- terminal-style log drawer
- cancel/abort through core command API
- persistent Bots panel/roster when canonical Bot state is available
- Rooms/thread surface when canonical Room/Thread state is available
- heterogeneous Chat timeline for typed events and interactive objects
- right-side preview/context rail
- runtime Status -> Preview -> Takeover interaction model
- detachable/popout support for appropriate live panels

## Phase 3: Automations and approvals

Ship:

- Automations page
- run history
- create/pause/resume/run-now through core
- approval Inbox
- command audit visibility
- Bot/Room-visible Routine/Automation events when canonical events support them
- approval surfaces usable from full and compact attention panels
- approval provenance showing target system/workspace/actor/connection when the selected OS exposes it

## Phase 4: Omnichannel

Ship OpenClaw bridge first:

- Telegram
- Discord
- WhatsApp
- pairing state surfaced in Inbox
- system and workspace ACLs
- remote command risk policy

Add native adapters later only when justified.

## Phase 5: Knowledge Brain

Ship:

- graph projection API
- 2D WebGL graph first
- neighborhood expansion
- provenance panel
- cluster/LOD
- optional 3D Brain mode
- disposable layout cache

## Phase 6: Advanced observability

Ship:

- trace tree
- token/cost overlays
- OTEL/OpenInference export
- optional Phoenix/Langfuse integration

---

# 20. What should live outside this repository

To preserve Layer 5 discipline, these belong elsewhere:

## AI-Verse OS core

- canonical workspace registry for each OS installation
- canonical Markdown
- canonical SQLite
- task ledger
- cron definitions and scheduler
- write contracts
- workspace policy
- memory writes
- audit truth

## AI-Verse Skills

- operational tools
- workflows
- reusable capabilities

## AI-Verse Brain / intelligence layer

- strategy
- reflection
- gap analysis
- initiative generation
- evaluation

## AI-Verse Dashboard

- registered OS connection metadata
- active system/workspace selection per UI session/window
- projection
- interaction
- realtime transport
- visual control
- user attention
- channel presentation/ingress policy

The Dashboard's connection registry may remember approved roots and labels, but it must not become a cross-system store for domain data, chat memory, Brain state, or canonical runtime state.

---

# 21. Day-one repository choices

Recommended initial dependencies:

```text
Frontend
  react
  react-dom
  vite
  typescript
  tailwindcss
  @tanstack/react-query
  @tanstack/react-virtual
  zod
  lucide-react

Gateway
  fastify or hono
  ws
  zod
  chokidar
  gray-matter
  unified/remark or equivalent Markdown parser
  a read-only-capable SQLite driver

Visualizations
  echarts or recharts
  sigma + graphology
  graphology-layout-forceatlas2
  three
  3d-force-graph or react-force-graph-3d

Testing
  vitest
  playwright
```

Do not add a domain database to the Dashboard repo by default.

If local cache or connection-registry persistence becomes useful, use a small Dashboard-owned local store only under the Dashboard config/cache area and explicitly label OS-derived content disposable/derived. Registered root metadata is Dashboard configuration, not AI-Verse domain truth.

---

# 22. Non-negotiable invariants

These should become architecture tests or CI checks where possible.

1. Dashboard code never performs canonical workspace writes.
2. Dashboard SQLite connections to canonical databases are read-only.
3. A client cannot provide a raw path that escapes registered-system or workspace policy.
4. Every OS-derived operation is scoped to exactly one registered `systemId`.
5. Every workspace operation is scoped to an authorized workspace inside that `systemId`.
6. A request, cache lookup, WebSocket subscription, runtime adapter, or missing-data fallback for system A cannot read or resolve data from system B.
7. System A cannot mutate system B through normal Dashboard commands.
8. Dashboard cache can be deleted safely and OS-derived caches are partitioned by `systemId`.
9. Matching workspace, task, Bot, conversation, or runtime IDs in two systems do not collide.
10. Switching OS in one Dashboard restores only the selected system's own UI, chat, runtime, Memory, Brain, Bot, and projection state.
11. Multiple Dashboard windows/tabs can select different systems concurrently without sharing scoped state.
12. Provider credentials may be reused when authorized, but provider conversations, chat history, hidden runtime context, and continuation/session IDs may never be reused across different systems.
13. Every mutation goes through the selected AI-Verse OS command interface.
14. Missing data never silently renders as healthy/zero or causes a lookup in another system.
15. Messaging senders are paired/allowlisted before access and are authorized for the requested `systemId` and workspace.
16. High-risk commands require explicit policy/approval.
17. Runtime adapters cannot bypass system or workspace isolation.
18. The Dashboard remains useful even when AI-Verse agents run primarily in Claude Code, Codex, or another harness.
19. 3D visualization is optional and never required to understand or operate the system.
20. Cross-system sharing, if added later, must use an explicit export/import or transfer contract and never implicit shared context.

---

# 23. Final architecture recommendation

Build **AI-Verse Dashboard as a React/Vite Control Room plus a TypeScript local Gateway** that can register one or more compatible AI-Verse OS installations while preserving a complete context and authority boundary around each one.

Borrow:

- LifeOS Pulse's read-only, zero-truth, freshness-aware projection model
- OpenClaw's typed realtime gateway, channel security, background task UX, automations, approvals, and activity compression
- OpenHands' typed client and runtime-adapter separation
- Langfuse/Phoenix trace UX
- TenacitOS visual components where useful and license-compliant
- WebGL graph techniques for a performant Brain view

The multi-OS amendment does not change the research baseline or six-phase roadmap. It adds one missing scope above workspace: `systemId`.

The 2026-09-12 modular-shell amendment also preserves the six-phase roadmap. It changes the frontend composition contract so Phase 1 does not create a throwaway fixed dashboard that would later need to be rebuilt for docking, detachment, native HUDs, responsive/mobile use, persistent Bots, or Room surfaces.

The decisive design principle is simple:

> **AI-Verse Dashboard should make one or more isolated AI-Verse OS installations visible and controllable without becoming the OS or allowing state to leak between them.**
