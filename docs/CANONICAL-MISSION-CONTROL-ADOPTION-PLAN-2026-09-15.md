# AI-Verse Dashboard Canonical Mission Control Adoption Plan

**Date:** 2026-09-15  
**Status:** CANONICAL IMPLEMENTATION PLAN  
**System authority:** `AI-Verse-System/docs/DASHBOARD-CANONICAL-MISSION-CONTROL-ADOPTION-PLAN-2026-09-15.md`  
**Upstream shell pin:** `builderz-labs/mission-control@5483a0e1eef15b467c167e95796791112cedbb7c`  
**Dashboard baseline before adoption:** `c636acf019f76194c40a341bd7985906383f7106`

## Decision

Use Builderz Labs Mission Control as the initial launchable UI/application shell.

Keep AI-Verse as the architecture and source-of-truth system underneath it.

Do not restart the previous scratch-built shell sequence. Do not delete the existing Dashboard foundations. Reuse the existing protocol, isolation, registry, panel/layout, live-event and runtime-adapter work where it strengthens the Mission Control-derived shell.

## First objective

Get a real AI-Verse system talking through Mission Control before stripping any Mission Control feature.

Mission Control already supports an OpenAI-compatible local provider. AI-Verse Gateway already exposes an OpenAI-compatible `/v1/chat/completions` endpoint.

Initial proof route:

~~~text
Mission Control
  -> LOCAL_LLM_ENDPOINT=http://127.0.0.1:8787/v1
  -> AI-Verse Gateway
  -> selected AI-Verse system/workspace
  -> owner boundaries
  -> runtime
~~~

Use `dispatchModel=local/aiverse`. Mission Control strips the provider prefix and sends model `aiverse`.

This is a temporary compatibility route used to prove the shell. It does not make Mission Control the canonical task, agent, memory, schedule, cost, approval or session owner.

## Rules

1. Prototype before strip.
2. Every Mission Control feature gets an explicit PROJECT, ADOPT, PRESENTATION-ONLY or STRIP decision.
3. AI-Verse owner boundaries remain stronger than Mission Control's internal domain model.
4. Mission Control SQLite is never silently promoted to AI-Verse canonical state.
5. Existing Dashboard isolation and system/workspace scope tests are preserved.
6. Existing Dashboard plans remain in Git history/docs as historical evidence, but this plan controls sequencing.
7. GawkBot is a primary UX reference, not a source-code donor under its current license.
8. Tauri 2 remains the preferred final desktop wrapper over the same product UI.
9. The browser and DMG share one UI.
10. The canonical AI-Verse Gateway remains the runtime/client edge.

## Work tracks

### MC0: baseline and preservation

- pin upstream Mission Control;
- record MIT provenance;
- preserve current Dashboard implementation and tests;
- run stock Mission Control locally;
- add no AI-Verse domain mutation yet.

### MC1: real AI-Verse chat proof

- run canonical AI-Verse Gateway;
- point Mission Control local provider to Gateway;
- create/select an AI-Verse-backed runtime entry;
- send a real message;
- prove system/workspace isolation and Gateway authentication;
- record an integration test.

### MC2: explicit AI-Verse mode

Replace the generic-local disguise with a first-class AI-Verse adapter.

Surface selected:

- system;
- workspace;
- Gateway;
- runtime/account;
- session/run;
- live events;
- cancel/pause/resume/approval capabilities.

### MC3: full feature disposition

Use `docs/MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md`.

Nothing gets stripped before its disposition is recorded.

### MC4: owner-backed conversion

Replace Mission Control-owned domain storage progressively with AI-Verse owner projections and commands.

Order:

1. system/workspace/Gateway;
2. chat/runs;
3. Bots/Workers/Rooms/Tasks;
4. approvals/attention;
5. Automations;
6. Token;
7. Memory/Skills;
8. Connections/channels/webhooks;
9. health/security/doctor;
10. Brain;
11. Apps/Data;
12. advanced operator extras.

### MC5: product simplification

Make AI-Verse simpler than stock Mission Control.

Default surface:

- Ask AI-Verse;
- Workspaces;
- Recent work;
- Needs You.

Advanced Control Center exposes the full Mission Control-style system view.

### MC6: desktop

Wrap the same UI in Tauri 2.

Add:

- folder selection;
- existing AI-Verse detection;
- persisted system registry;
- per-system Gateway supervision;
- secure Gateway-token storage;
- explicit Distribution installation;
- DMG packaging;
- detached windows/HUD later.

## Existing Dashboard code to retain

Retain and integrate, do not throw away:

- `packages/protocol`;
- `packages/registry`;
- systemId/workspaceId isolation rules;
- `packages/client`;
- read-only projection code where owner-correct;
- `apps/web/src/panels.ts` panel contracts;
- `apps/web/src/layout.ts` layout/presentation model;
- `packages/live` normalization and trace helpers;
- runtime-adapter interfaces;
- isolation/security tests.

The current Dashboard `apps/gateway` is not the canonical AI-Verse Gateway. Treat it as historical projection/compatibility scaffolding and retire or narrow it as owner projections move behind the real AI-Verse Gateway.

## Acceptance gate before visual stripping

Do not begin a mass removal pass until all are true:

- stock Mission Control launches;
- AI-Verse Gateway launches;
- Mission Control sends a successful message through AI-Verse Gateway;
- the selected AI-Verse system/workspace is explicit;
- no cross-system context leak exists;
- feature-disposition map is complete;
- upstream license/provenance is recorded;
- current Dashboard tests remain preserved or replaced by stronger equivalent coverage.

## End state

The user should no longer perceive a fork of Mission Control.

The finished product is AI-Verse:

- Mission Control contributes shell maturity and operator UX;
- GawkBot contributes job-oriented product simplicity;
- OpenHands contributes workspace/runtime UX;
- Hermes contributes Gateway/system UX;
- Celesto can later contribute isolated computer execution;
- AI-Verse owns all canonical intelligence, state, permissions and lifecycle.
