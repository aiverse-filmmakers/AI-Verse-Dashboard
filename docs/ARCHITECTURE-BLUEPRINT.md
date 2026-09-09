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

The governing rule is:

> **The Dashboard may own presentation state and disposable caches. It may not own domain truth.**

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

---

# 3. Data flow: Query path vs Command path

The most important boundary is a strict separation between observing state and changing state.

## Query path

```text
Canonical AI-Verse workspace
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
        v
Dashboard Gateway
        |
        | authenticated intent
        v
AI-Verse OS command boundary
        |
        | validates workspace, policy and write contract
        v
Canonical Markdown / SQLite / scheduler / agent runtime
        |
        | filesystem/runtime events
        v
Dashboard projection refresh
```

A successful command is not complete merely because the Gateway returned 200. The ideal UI model is:

1. submit command
2. OS acknowledges command
3. OS performs canonical write/action
4. read model observes the resulting canonical state
5. UI reconciles to the new state

This prevents the UI from lying about state before the OS actually committed it.

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
  "workspaceId": "film-project-x",
  "params": {}
}
```

```json
{
  "type": "res",
  "id": "01J...",
  "ok": true,
  "result": {},
  "observedAt": "2026-09-09T08:00:00Z",
  "sourceVersion": "..."
}
```

```json
{
  "type": "event",
  "event": "task.updated",
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
- explicit `workspaceId` on every scoped operation
- monotonic event sequence where practical
- event source and freshness metadata
- bounded payload sizes
- request cancellation for long queries
- reconnect and resync semantics
- capability discovery so older clients can gracefully hide unsupported controls

## Suggested query methods

```text
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

## Suggested command methods

These do not modify canonical state themselves. They forward to the core OS command boundary.

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

Each command should return a core command ID that can be traced through execution and eventual canonical-state change.

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
GET /api/workspaces/x/sources/state
```

The server resolves `x` through the canonical workspace registry.

## Rule 2: Workspace registry defines allowed roots

For every workspace, the Gateway receives or reads a canonical record like:

```json
{
  "id": "project-x",
  "root": "/canonical/path/project-x",
  "sqlite": ["/canonical/path/project-x/index.sqlite"]
}
```

The client may send only `workspaceId`, never an arbitrary root.

## Rule 3: Resolve real paths server-side

Before reading any file:

1. resolve canonical workspace root
2. resolve requested logical source to an absolute real path
3. reject path traversal
4. reject symlinks that escape the workspace
5. apply file-type and size policy
6. read only

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
workspaceId + relativePath + mtime + size
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
- recently used workspace IDs

Forbidden cached data as authority:

- canonical tasks
- canonical goals
- canonical memory
- canonical cron definitions
- agent instructions
- user notes
- approval decisions
- knowledge facts that do not exist in canonical state

Deleting the Dashboard cache must never damage AI-Verse OS.

## Rule 7: Every panel displays provenance and freshness

Every projection should be able to report:

```json
{
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
  "workspaceId": "project-x",
  "command": "cron.create",
  "payload": {},
  "requestedAt": "..."
}
```

The core OS owns:

- validation
- workspace boundary enforcement
- write contracts
- authorization
- canonical transaction
- audit event
- failure/retry semantics

The Dashboard owns:

- request UX
- progress visualization
- approval UX
- displaying the resulting canonical state

---

# 8. Core UI panels

## A. Now / Control Room

This is the visual signature page.

It should answer five questions in under five seconds:

1. Which workspace am I in?
2. What is the AI currently trying to achieve?
3. What is actively running?
4. What needs me?
5. Is the system healthy?

### Recommended composition

```text
+--------------------------------------------------------------+
| Workspace Switcher        Global Search / Cmd-K     Presence |
+--------------------------------------------------------------+
| CURRENT FOCUS                                                 |
| Initiative / objective / next important action                |
+----------------------------+---------------------------------+
| RUNNING                    | NEEDS YOU                        |
| max 3 to 5 parent items    | approvals / blocked / questions |
| compact child count        | max 3 to 5 items                |
+----------------------------+---------------------------------+
| 4Cs HEALTH STRIP                                             |
+--------------------------------------------------------------+
| RECENT SIGNALS / NEXT AUTOMATION / COST SNAPSHOT              |
+--------------------------------------------------------------+
```

Do not make this a 30-widget telemetry board.

## B. Chat / Command Center

Capabilities:

- talk to selected AI-Verse agent/runtime
- selected workspace always visible
- model/runtime badge
- live tool activity
- stop/abort
- attach references if supported
- open background tasks from the conversation
- command suggestions
- contextual drawer for task, source, approval, or graph node

The composer should support both natural language and explicit commands.

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

Controls such as create, pause, resume, run now, or delete must call the core OS command boundary.

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

The OS should expose schema-driven health dimensions:

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

The Dashboard renders whatever the OS declares.

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

Workspace-scoped graph and semantic exploration.

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
- channel connection metadata where the Dashboard Gateway is the canonical owner

Core AI-Verse settings must be surfaced through core commands, not duplicated into Dashboard config.

---

# 9. Preventing information overload

Use three information horizons.

## Horizon 1: Now

Only:

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
  capabilities(): Promise<RuntimeCapabilities>
  listSessions(workspaceId: string): Promise<SessionSummary[]>
  getSession(sessionId: string): Promise<Session>
  send(sessionId: string, message: string): Promise<CommandAck>
  abort(sessionId: string): Promise<void>
  subscribe(sessionId: string): AsyncIterable<RuntimeEvent>
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
            v
    AI-Verse OS command API
```

OpenClaw should receive only a narrow AI-Verse tool/API surface, not unrestricted access to the AI-Verse filesystem.

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

### Workspace ACL

Each authenticated identity is granted explicit workspace access:

```text
Telegram user 123
  -> Personal workspace: query + chat
  -> Client-A workspace: query only
  -> Client-B workspace: no access
```

A channel conversation must never be able to switch to a workspace the sender is not authorized to access.

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

### Audit

Every remote command should record:

- channel
- sender identity
- workspace
- command
- timestamp
- approval path
- resulting core command ID

The canonical audit event belongs to the core OS/runtime contract.

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
- preserve layout coordinates in disposable Dashboard cache
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

The OS or a sanctioned read adapter should supply it.

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

The Dashboard can merge multiple read-only sources into one Inbox projection, but resolving an item always calls the source-owning core command.

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

The normalized model is a projection. The canonical task IDs and state remain in AI-Verse OS.

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

- workspace
- task/initiative
- agent
- runtime session
- parent span
- cost/tokens where applicable

This makes it possible to render a Langfuse/Phoenix-style trace without requiring either product.

Future option: export OTEL/OpenInference so advanced users can attach Phoenix or Langfuse.

---

# 17. Visual design system

The Dashboard should feel like an AI operations environment, not a SaaS admin template.

Recommended visual principles:

- dark-first but excellent light mode
- high information density with restrained motion
- large workspace identity
- clear status colors used semantically
- subtle depth/glass only where it improves hierarchy
- live glow/pulse only for genuinely active processes
- compact monospace for runtime detail
- normal UI font for summaries and decisions
- animated graphs and agents remain optional

Core primitives:

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

---

# 18. Security architecture

## Threat model priorities

1. Cross-workspace data leak
2. Messaging sender impersonation
3. Arbitrary filesystem path reads
4. Dashboard process gaining write access to canonical state
5. Remote execution through a chat message
6. Secret leakage in logs or UI
7. Stale approval replay
8. WebSocket hijack/cross-origin access

## Required controls

- loopback bind by default
- authentication on every privileged connection
- strict WebSocket origin checking
- CSRF protection for HTTP mutations if cookies are used
- explicit workspace ACL per connection/session
- server-side workspace path resolution
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

If practical, run the Dashboard Gateway with OS-level read permission only on workspace roots.

Examples:

- container bind mounts marked read-only
- dedicated local user with filesystem ACLs
- separate writable cache directory

Then even a Dashboard bug cannot directly modify canonical state.

---

# 19. Recommended build phases

## Phase 1: Read-only Control Room

Ship:

- Vite/React shell
- Gateway and protocol package
- Workspace Switcher
- Now page
- 4Cs health projection
- active initiatives/tasks read model
- Inbox read model
- live filesystem invalidation
- read-only SQLite adapter
- provenance/freshness metadata

No mutation features until the core command boundary exists.

## Phase 2: Live agent control

Ship:

- chat
- runtime adapter interface
- Claude Code/Codex/ACP adapters as available
- live activity stream
- task/subagent rail
- Runs/Timeline
- terminal-style log drawer
- cancel/abort through core command API

## Phase 3: Automations and approvals

Ship:

- Automations page
- run history
- create/pause/resume/run-now through core
- approval Inbox
- command audit visibility

## Phase 4: Omnichannel

Ship OpenClaw bridge first:

- Telegram
- Discord
- WhatsApp
- pairing state surfaced in Inbox
- workspace ACLs
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

- canonical workspace registry
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

- projection
- interaction
- realtime transport
- visual control
- user attention
- channel presentation/ingress policy

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

Do not add a database to the Dashboard repo by default.

If local cache persistence becomes useful, use SQLite only under the Dashboard cache directory and explicitly label it disposable/derived.

---

# 22. Non-negotiable invariants

These should become architecture tests or CI checks where possible.

1. Dashboard code never performs canonical workspace writes.
2. Dashboard SQLite connections to canonical databases are read-only.
3. A client cannot provide a raw path that escapes workspace policy.
4. Every query is scoped to an authorized workspace.
5. Every mutation goes through the AI-Verse OS command interface.
6. Dashboard cache can be deleted safely.
7. Missing data never silently renders as healthy/zero.
8. Messaging senders are paired/allowlisted before access.
9. High-risk commands require explicit policy/approval.
10. Runtime adapters cannot bypass workspace isolation.
11. The Dashboard remains useful even when AI-Verse agents run primarily in Claude Code, Codex, or another harness.
12. 3D visualization is optional and never required to understand or operate the system.

---

# 23. Final architecture recommendation

Build **AI-Verse Dashboard as a React/Vite Control Room plus a TypeScript local Gateway**.

Borrow:

- LifeOS Pulse's read-only, zero-truth, freshness-aware projection model
- OpenClaw's typed realtime gateway, channel security, background task UX, automations, approvals, and activity compression
- OpenHands' typed client and runtime-adapter separation
- Langfuse/Phoenix trace UX
- TenacitOS visual components where useful and license-compliant
- WebGL graph techniques for a performant Brain view

The decisive design principle is simple:

> **AI-Verse Dashboard should make the OS visible and controllable without becoming the OS.**
