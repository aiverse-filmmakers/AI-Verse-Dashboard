# Dashboard Baseline Preservation Report

**Date:** 2026-09-15  
**Baseline before Mission Control source adoption:** `604b7fec8d1e53a930c63be62f6891050eb0e33b`  
**Purpose:** define what must survive the Mission Control adoption and what is only temporary scaffolding.

## 1. Preserve as architectural law

The following behaviors must survive even if their current implementation is later replaced.

### System and workspace isolation

Preserve:

- explicit `systemId` and `workspaceId`;
- fail-closed unknown system handling;
- no silent fallback between registered systems;
- server-side root resolution;
- traversal rejection;
- symlink escape rejection;
- cross-system cache/session/subscription isolation.

Primary current evidence:

- `packages/registry`;
- `packages/os-read-adapter`;
- `packages/protocol`;
- `test/isolation.test.ts`;
- `test/registry.test.ts`;
- `test/protocol.test.ts`.

### Presentation is non-canonical

Preserve:

- panel/layout state is presentation state only;
- saved layout/panel placement never becomes domain truth;
- full/compact/HUD are presentation modes;
- detached/floating concepts do not transfer ownership.

Primary current evidence:

- `apps/web/src/panels.ts`;
- `apps/web/src/layout.ts`;
- `apps/web/src/shell.ts`;
- `test/web-shell.test.ts`.

### Read paths are bounded

Preserve:

- read-only source access where direct source access remains necessary;
- raw roots never become normal browser authority;
- selected system/workspace remains explicit.

Primary current evidence:

- `packages/os-read-adapter`;
- `apps/gateway/src/query-router.ts`;
- read/isolation tests.

### Runtime connectors are not permission owners

Preserve:

- runtime adapters do not become canonical authority;
- runtime/session transport is separate from Memory and other durable owners;
- privileged effects must ultimately pass owner permission/approval boundaries.

Primary current evidence:

- `packages/live/src/runtime-adapters.ts`;
- System Dashboard component specification.

### Live event normalization

Preserve the useful generic modeling around:

- sessions;
- run events;
- activity;
- timeline/log presentation.

Primary current evidence:

- `packages/live`;
- live activity/run tests.

## 2. Preserve as reusable implementation unless superseded by stronger tested code

Candidate reusable packages:

- `packages/protocol`;
- `packages/registry`;
- `packages/client`;
- `packages/live`;
- bounded parts of `packages/os-read-adapter`;
- owner-correct parts of `packages/read-models`.

Candidate reusable UI contracts:

- panel registry;
- layout manager;
- system/workspace switcher concepts;
- presentation/freshness/provenance tokens.

These may be refactored or absorbed, but their accepted behavior must remain covered by tests.

## 3. Temporary scaffolding that must not become permanent authority

### Dashboard-local `apps/gateway`

This is not the canonical AI-Verse Gateway.

It may remain temporarily for tests/projections while migration is active, but production runtime/control must converge on `aiverse-filmmakers/AI-Verse-Gateway`.

### SessionStore-backed agent truth

Current Dashboard live session data must not become canonical Bot/agent identity.

Canonical Bot/Worker/Room/Task truth belongs to the appropriate AI-Verse owner, principally Multiple Bots where defined.

### Synthetic health/work/inbox semantics

Current source-derived health/work/inbox interpretations were already identified by the System audit as shadow-authority risk.

Do not expand them.

Replace them with owner-declared projections.

### Direct CLI runtime execution

The generic CLI adapter is useful test/prototyping scaffolding.

Production privileged effects must route through canonical Gateway/OS/owner permission paths.

## 4. Tests that form the preservation net

Current tests to retain or replace only with stronger equivalent coverage:

- `test/protocol.test.ts`;
- `test/registry.test.ts`;
- `test/isolation.test.ts`;
- `test/read-adapters.test.ts`;
- `test/read-models.test.ts`;
- `test/web-shell.test.ts`;
- `test/gateway.test.ts`;
- `test/live-chat.test.ts`;
- `test/live-activity.test.ts`;
- `test/live-runs.test.ts`;
- `test/live-runs-timeline.test.ts`;
- `test/live-adapters.test.ts`;
- `test/phase1-gate.test.ts`.

A Mission Control import is not allowed to delete these protections simply because the upstream application has its own tests.

## 5. Mission Control adoption boundary

The adoption may replace:

- visual layout implementation;
- navigation;
- widget implementation;
- dashboard cards;
- operator panel UI;
- chat presentation;
- settings presentation;
- shell bootstrapping.

The adoption must not replace, without an explicit owner migration:

- AI-Verse system/workspace identity;
- Gateway run/session ownership;
- Brain ownership;
- Memory ownership;
- Data ownership;
- Skills ownership;
- Multiple Bots ownership;
- Automations ownership;
- Connections ownership;
- Token ownership;
- Distribution ownership.

## 6. Active sibling-work protection

At the time of this report, AI-Verse Gateway has active Context Ladder work.

Dashboard implementation should consume current Gateway contracts and avoid convenience changes to Gateway.

If a missing contract is discovered, create a separately scoped owner PR only after proving the gap.

## 7. Baseline acceptance

MC0 baseline preservation is accepted when:

- this report is merged;
- the current Dashboard build/tests pass on clean hosted CI;
- the third-party provenance baseline is merged;
- no runtime source has yet been imported from Mission Control.

After acceptance, MC1 is the only active implementation phase.
