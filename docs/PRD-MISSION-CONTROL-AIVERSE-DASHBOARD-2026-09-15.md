# AI-Verse Dashboard Mission Control PRD

**Date:** 2026-09-15  
**Status:** CANONICAL PRD FOR IMPLEMENTATION  
**Parent plan:** `docs/CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`  
**Execution tracker:** `docs/MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md`  
**Upstream shell reference:** `builderz-labs/mission-control@5483a0e1eef15b467c167e95796791112cedbb7c`

## 1. Product objective

Turn AI-Verse into a usable visual operating system without replacing the architecture already built.

The product must open into a simple AI-Verse experience quickly, while retaining a deep Mission Control view for advanced operation.

The Dashboard is not a new intelligence owner. It is the product surface over AI-Verse.

The final experience should combine:

- Mission Control's mature system/operator shell;
- GawkBot's job-oriented simplicity;
- OpenHands-style workspace/runtime visibility;
- Hermes-style Gateway/system controls;
- AI-Verse's existing canonical owners underneath.

## 2. User outcome

A normal user should be able to:

1. open AI-Verse;
2. choose or reopen an AI-Verse system;
3. choose a workspace;
4. ask AI-Verse to do something;
5. see what is happening without understanding the internal architecture;
6. approve or intervene when needed;
7. inspect deeper system detail only when desired.

An advanced user should be able to inspect:

- Gateway status;
- active runs;
- Bots/Workers;
- tasks;
- approvals;
- Automations;
- Memory;
- Skills;
- Connections;
- Token/cost;
- component health;
- logs;
- security/audit evidence;
- Brain state;
- Apps/Data.

## 3. Product principles

### 3.1 Simple outside, rigorous inside

The default experience should feel closer to a polished AI workspace than an infrastructure console.

The advanced Control Center can expose the full depth.

### 3.2 Projection, not duplicate ownership

Every canonical domain stays with its current AI-Verse owner.

Dashboard may aggregate and render. It must not silently become the owner of domain truth.

### 3.3 Prototype before deletion

No Mission Control feature is removed until it is explicitly classified and either replaced, adopted, deferred or rejected.

### 3.4 One product, two hosts

Browser and macOS desktop use the same product UI.

Desktop adds trusted local capabilities such as folder picking, Gateway supervision and secure secret storage.

### 3.5 Reversible migration

The Mission Control adoption must be staged so the existing AI-Verse Dashboard code and tests remain recoverable until the replacement path is proven stronger.

### 3.6 Evidence before claims

A feature is not considered integrated because a panel renders.

Acceptance requires real owner-backed data/control, tests and a documented path.

## 4. Architecture invariants

These are non-negotiable unless the product owner explicitly changes them in a later canonical plan.

### A. Canonical Gateway

AI-Verse Gateway remains the canonical client/runtime edge.

Dashboard must not create a second runtime Gateway.

### B. Canonical ownership

The following remain canonical:

| Domain | Owner |
|---|---|
| workspace/system authority | AI-Verse OS |
| goals/strategy/verification/learning | Brain |
| semantic/persistent memory | Memory |
| structured data | Data |
| skills/capabilities | Skills |
| Bots/Workers/Rooms/Threads/Team Runs | Multiple Bots |
| schedules/triggers | Automations |
| external connections/credentials/effects | Connections |
| usage/pricing/cost truth | Token |
| sessions/runs/checkpoints/runtime events | Gateway |
| installation/release composition | Distribution |
| presentation/layout/local UI state | Dashboard |

### C. No shadow databases

Mission Control SQLite may exist only as temporary compatibility state during migration.

It must not become canonical AI-Verse state.

### D. No synthetic truth

If an owner does not expose a value, Dashboard shows unavailable/unknown.

It must not invent health, task, Bot, approval, cost or readiness meaning from private files.

### E. Explicit system/workspace scope

Every owner-backed request must carry explicit system/workspace context where applicable.

No silent fallback to another registered system is allowed.

### F. Permission boundary

Runtime adapters are connectors, not permission authorities.

Every privileged action still passes the canonical owner/OS/Gateway permission and approval boundaries.

### G. Existing active Gateway work is protected

Dashboard work must not modify AI-Verse Gateway merely for convenience while other Gateway work is active.

If an integration gap is discovered:

1. document the missing contract;
2. prove it cannot be solved correctly in Dashboard;
3. make a separate Gateway PR;
4. preserve current Gateway acceptance.

## 5. Source adoption strategy

### Do not raw-fork over the existing Dashboard repository

The current Dashboard repository contains useful protocol, registry, isolation, panel/layout and live-event work.

Replacing it wholesale would create unnecessary regression risk.

### Approved approach

Use stock Mission Control as the reference/proof application first.

Then build the AI-Verse shell inside this repository as a separate application surface, while reusing existing AI-Verse Dashboard packages.

Target repository shape:

~~~text
AI-Verse-Dashboard/
  apps/
    control-center/      # Mission Control-derived product shell
    web/                 # existing contracts/model code until migrated or absorbed
    gateway/             # historical Dashboard projection scaffold, not canonical Gateway
  packages/
    protocol/
    registry/
    client/
    live/
    ...
  docs/
  test/
~~~

The exact folder name may change only if implementation proves a concrete reason.

### Import rule

Prefer, in order:

1. reuse an existing AI-Verse implementation;
2. adapt an MIT Mission Control UI/presentation component;
3. implement a small AI-Verse-specific bridge;
4. write new code from scratch only where necessary.

Do not copy Mission Control domain ownership simply because a UI component expects it.

## 6. Upstream provenance

The initial upstream pin is:

`builderz-labs/mission-control@5483a0e1eef15b467c167e95796791112cedbb7c`

Before the first source import:

- verify the pin still resolves;
- preserve the MIT license and notices;
- create/update `THIRD_PARTY_NOTICES.md`;
- record imported/adapted paths;
- do not silently update upstream during an active phase.

Upstream upgrades are separate reviewed tasks, never incidental dependency bumps.

## 7. Scope

### In scope for the first usable product

- launchable Mission Control-derived shell;
- canonical AI-Verse Gateway connection;
- explicit system/workspace context;
- Chat;
- Runs/live activity;
- Gateway status;
- basic work/attention surfaces;
- first owner-backed Mission Control panels;
- browser app;
- macOS desktop host;
- existing-system selection;
- automatic local Gateway supervision on desktop;
- secure local Gateway token handling;
- Distribution-backed install flow after existing-system dogfood works.

### In scope later in the same program

- Bots/Workers/Rooms;
- Automations;
- Token/cost;
- Memory/Skills;
- Connections/integrations;
- Security/Audit;
- alerts/notifications;
- unified quality review;
- backup/maintenance;
- global search;
- Brain;
- Apps/Data;
- configurable overview widgets.

### Explicitly not required for first dogfood

- SaaS multi-tenancy;
- full RBAC;
- Google sign-in;
- virtual office;
- remote compute fleet;
- Tailscale one-click access;
- internationalization;
- signed public release/notarization;
- all optional Mission Control features.

## 8. Success criteria

### Product success

A user can open AI-Verse, select a real system/workspace and use Chat without touching a terminal after setup.

### Architecture success

Deleting Dashboard presentation state cannot delete or corrupt canonical AI-Verse state.

### Isolation success

Two registered systems remain fully isolated.

### Runtime success

All live Chat/Run execution goes through canonical AI-Verse Gateway.

### Ownership success

Every Mission Control-derived surface has a named AI-Verse owner or is explicitly presentation-only.

### Desktop success

The same UI works in browser and macOS host.

### Migration success

Mission Control-specific canonical stores can be removed without losing AI-Verse truth.

## 9. User involvement policy

We optimize for the assistant doing as much work as possible through GitHub, CI and reproducible scripts.

### Assistant-owned work

The assistant can perform:

- repo audits;
- architecture decisions;
- PRD/task planning;
- code changes;
- tests;
- CI;
- documentation;
- source adaptation;
- PR creation/review/merge;
- owner-boundary checks;
- integration harnesses;
- browser build work;
- Tauri code;
- macOS CI builds where GitHub runners are sufficient;
- regression analysis.

### Human-required work

Only local/security-sensitive steps should require the user.

Expected human checkpoints:

**H1 - MC1 real local proof**
- Gateway bearer token is local secret material.
- A real local AI-Verse installation/workspace must be selected.
- User runs one provided command/script and returns the result if remote tooling cannot access the machine.

**H2 - provider login acceptance**
- If official ChatGPT/Codex login requires interactive browser/account approval, user completes that sign-in once.

**H3 - macOS permissions/signing**
- User may need to approve macOS permissions.
- Apple Developer signing/notarization credentials require user-controlled secrets if public distribution is desired.

**H4 - final owner dogfood**
- User performs final visual/product acceptance on the real Mac.

Everything else should be automated or handled by the assistant.

## 10. Branch and PR discipline

### One phase, bounded PRs

Do not create giant "convert everything" PRs.

Each PR must:

- name the phase/task IDs it implements;
- state canonical owners touched;
- state canonical owners explicitly not changed;
- contain acceptance evidence;
- avoid unrelated cleanup.

### Recheck current main before every new PR

Other agents may be modifying repositories.

Never rely only on the tracker snapshot.

### Merge gates

A PR may merge only when:

- relevant tests pass;
- no ownership invariant is violated;
- no active sibling work is accidentally overwritten;
- docs/tracker are synchronized when the phase changes.

### No silent scope growth

New feature ideas go into the disposition map/backlog first.

Do not expand the active phase merely because upstream Mission Control contains an attractive feature.

## 11. Context-bloat protection

The canonical continuity files are:

1. this PRD;
2. `CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`;
3. `MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md`;
4. `MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md`.

A future chat should be able to continue by reading those four files plus the current PR/CI state.

Do not require reconstruction from conversation history.

Every completed task updates the tracker with:

- status;
- accepted commit/PR;
- evidence;
- next task;
- current completion percentage.

## 12. Phases

## MC0 - Governance, preservation and build safety

Goal: create a safe base before implementation.

Deliverables:

- canonical PRD;
- canonical execution tracker;
- upstream pin/provenance;
- CI for current Dashboard code;
- baseline current tests;
- no runtime feature changes.

Exit gate:

- current Dashboard main builds/tests in CI;
- upstream pin recorded;
- old architecture work preserved;
- tracker identifies MC1 as the only active implementation phase.

## MC1 - Real runtime proof

Goal: prove stock Mission Control can execute through canonical AI-Verse Gateway without changing ownership.

Deliverables:

- automated lab bootstrap script;
- preflight script;
- secret-safe local configuration path;
- direct Gateway smoke test;
- Mission Control task dispatch through `local/aiverse`;
- captured acceptance evidence;
- no Mission Control domain store treated as AI-Verse truth.

Exit gate:

- real task result returns through Gateway;
- intended system/workspace is proven;
- no cross-system leakage;
- stock Mission Control remains disposable.

Human checkpoint: H1.

## MC2 - First-class AI-Verse adapter

Goal: stop disguising AI-Verse as a generic local model.

Deliverables:

- explicit `aiverse` runtime/source;
- Gateway capability discovery;
- system/workspace selection;
- Gateway status;
- Chat through canonical Gateway;
- Runs/events;
- cancel/pause/resume/approval capability detection;
- authentication/account readiness projection.

Exit gate:

- main Chat UI works through AI-Verse Gateway;
- no generic-local workaround is required for normal usage;
- Dashboard does not own run/session truth.

Potential human checkpoint: H2 if provider login is interactive.

## MC3 - Mission Control shell adoption and disposition freeze

Goal: turn the Mission Control-derived application into the official AI-Verse shell without deleting useful features.

Deliverables:

- Mission Control-derived `control-center` app inside Dashboard repo;
- AI-Verse branding boundary;
- preserved third-party notices;
- all upstream panels visible in reference/dev mode;
- every panel/API given final PROJECT/ADOPT/PRESENTATION-ONLY/STRIP disposition;
- no mass stripping yet.

Exit gate:

- AI-Verse shell launches from this repo;
- existing Dashboard isolation tests remain green;
- no Mission Control domain database is canonical.

## MC4 - Owner-backed conversion

Goal: replace Mission Control backend authority progressively.

Sequence is fixed unless an owner contract blocks it:

### MC4A System, Workspace, Gateway
### MC4B Chat, Runs, Live Activity
### MC4C Bots, Workers, Rooms, Tasks
### MC4D Attention, Approvals, Quality Review
### MC4E Automations
### MC4F Token Usage and Cost
### MC4G Memory and Skills
### MC4H Connections, Integrations, Channels, Webhooks
### MC4I Health, Doctor, Security, Audit
### MC4J Brain
### MC4K Apps and Data
### MC4L Advanced extras

Each subphase removes/retires the corresponding Mission Control authority only after owner-backed acceptance.

Exit gate:

- no Mission Control domain authority remains for converted areas;
- all retained panels are owner-backed or explicitly presentation-only.

## MC5 - Product simplification and polish

Goal: make AI-Verse feel like its own product, not a Mission Control fork.

Default navigation target:

- Ask AI-Verse;
- Workspaces;
- Recent Work;
- Needs You;
- Control Center.

Control Center retains advanced views.

High-priority additions from the feature map:

- customizable overview;
- doctor/update banners;
- Security & Audit center;
- alerts/notifications;
- multi-Gateway manager;
- runtime discovery/setup;
- completion receipts/quality review;
- backup/maintenance;
- global search;
- owner-backed integration management.

Exit gate:

- beginner path requires no component knowledge;
- advanced controls remain discoverable;
- visual identity is AI-Verse.

## MC6 - Desktop and install experience

Goal: ship the same UI as a macOS application.

Deliverables:

- Tauri 2 host;
- native folder picker;
- registered-system persistence;
- secure Gateway token reference/storage;
- Gateway process supervision;
- multiple registered systems;
- Distribution-backed "Install AI-Verse";
- local browser parity;
- development DMG;
- clean-machine test.

Exit gate:

- open DMG;
- select compatible AI-Verse folder;
- Gateway starts/attaches;
- Chat works;
- close/reopen retains registration;
- second AI-Verse system remains isolated.

Human checkpoint: H3.

## MC7 - Final release acceptance

Goal: prove the migration is complete enough for dogfood/public-beta target.

Required acceptance:

- architecture audit;
- licensing audit;
- security audit;
- two-system isolation;
- browser path;
- macOS path;
- Gateway recovery/restart;
- no hidden Mission Control authority;
- regression suite;
- owner dogfood.

Human checkpoint: H4.

## 13. Failure rules

### If Mission Control shell integration conflicts with AI-Verse ownership

AI-Verse ownership wins.

Adapt the UI instead of bending canonical owners.

### If a canonical owner lacks a required projection

Do not fabricate it in Dashboard.

Record the gap and add the smallest correct owner API in a separate PR.

### If an upstream Mission Control feature is useful but unsafe to port now

Keep it in the disposition backlog.

Do not block the active phase.

### If a new architecture idea appears mid-phase

Do not restart.

Record it, evaluate at the next phase boundary.

### If current main changes underneath the plan

Rebase the task against current state and preserve the PRD invariants.

## 14. Definition of complete

This program is complete when:

- AI-Verse opens as its own product;
- browser and macOS share one UI;
- users can choose systems/workspaces and Chat immediately;
- Mission Control is no longer required as a separate installation;
- Mission Control-derived UI code is properly attributed;
- all canonical domain truth comes from AI-Verse owners;
- optional advanced Mission Control ideas are either implemented or explicitly deferred;
- future work can continue from the tracker without conversation reconstruction.
