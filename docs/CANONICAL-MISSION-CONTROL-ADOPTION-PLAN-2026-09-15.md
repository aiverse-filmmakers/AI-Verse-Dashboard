# AI-Verse Dashboard implementation plan

Original Mission Control adoption decision: 15 September 2026. Refreshed: 26 October 2026.

- **Outcome / owner:** turn the existing Mission Control foundation into a usable AI-Verse interface; AI-Verse-Dashboard owns presentation and integration.
- **Depth:** extended, because the work crosses UI, authenticated runtime control, multiple systems, owner data and desktop delivery.
- **Checkpoint:** **15/100 accepted roadmap points; 85 remain.** MC0 and MC1 are complete for their recorded scope. MC2.1 is the next unfinished slice.
- **Authority:** the [PRD](PRD-MISSION-CONTROL-AIVERSE-DASHBOARD-2026-09-15.md) retains product invariants; the [execution tracker](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md) retains every slice, weight and acceptance gate. This living plan explains the route. It replaces this document's older sequencing summary, not the accepted roadmap.
- **Method:** current Plan Maker proportional structure; [System planning method](https://github.com/aiverse-filmmakers/AI-Verse-System/blob/main/docs/ADAPTIVE-IMPLEMENTATION-PLANNING-SKILL.md). No outcome, denominator, major ordering or permission changes are introduced by this refresh.

## 1. Problem and boundary

### What exists and what the user still needs

Mission Control already provides a complete reference application. Our maintained copy has successfully dispatched a real local-model task through AI-Verse Gateway on a Mac. That proves the connection path, not a finished AI-Verse dashboard or an integrated main Chat screen.

The intended journey is: open AI-Verse, select the intended system and workspace, ask for work, watch progress, approve or intervene when required, and inspect deeper controls only when useful. The normal interface remains **Ask AI-Verse, Workspaces, Recent Work and Needs You**, with an advanced Control Center. Browser and Mac desktop share the product UI.

### Scope and preservation

Continue the approved Mission Control adoption. Preserve existing Dashboard protocol, registry, isolation, presentation/layout, read-model and live-event work. Reuse Mission Control presentation and useful workflows in stages; do not overwrite this repository with a raw fork or restart a separate scratch-built dashboard.

AI-Verse OS, Gateway and the existing domain components retain their authority. Dashboard views must use their supported interfaces and show unavailable/unknown honestly. No Mission Control task, memory, schedule, credential or cost database becomes AI-Verse truth. Preserve licensing, user data, scope isolation, permission checks and recovery. See the PRD sections 3–6 and the [feature disposition map](MISSION-CONTROL-FEATURE-DISPOSITION-MAP-2026-09-15.md).

This program does not recreate Gateway, qualify the existing private Core installation by inference, release a member build, or add speculative enterprise features. Optional panels and extra workflows keep their existing priorities and owners.

## 2. Existing path and smallest change

### Reviewed baseline

| Source | Observed state / decision |
| --- | --- |
| Dashboard `016da5fda319c94bda6704859acc5b12d23ad4ed` | MC0/MC1 accepted; MC2.1 pending. Existing typed client uses the local Dashboard `/rpc` projection service, not the canonical Gateway HTTP run API. |
| Gateway current source `ceb8849ec062f0d3997ceb0207e42c25aedd20c6` | Descriptor points to qualified candidate `386ff40135a841c27bfd106531b38a7f37c1c227`; actual routes support authenticated status/models, chat, runs, events, diagnostics and controls. |
| System [PR #290](https://github.com/aiverse-filmmakers/AI-Verse-System/pull/290) / merge `2296ed1f0582324264cb7a35897798ba755fbf48` | Gateway 10/10 candidate readiness accepted; handoff to existing Dashboard MC2.1. Candidate qualification is not member release admission. |
| AI-Verse-maintained Mission Control `570b74195b0837131ae015a06fe466472f12001a` | Active proof dependency, derived from MIT upstream `5483a0e1eef15b467c167e95796791112cedbb7c`. Preserve provenance; no incidental pin upgrade. |
| [Real-model Mac acceptance](MC1-REAL-MODEL-ACCEPTANCE-2026-10-26.md) | Actual local Qwen result, scope/authentication, unchanged standalone OS and cleanup verified. Private Core, general tools and Full-profile operation remain outside that proof. |

The executable Gateway source and accepted closeout outrank older prose still calling issue #60 open or MC1.4 blocked. The generic/private-owner test path remains separately blocked; the accepted disposable proof must not be rerun just to restart this roadmap.

### Current and intended flow

Current proof: separate Mission Control task dispatcher → compatibility `local/aiverse` route → canonical Gateway → installed disposable OS and real model → task result.

Current Dashboard foundations: panels/client → authenticated local `/rpc` or `/ws` → scoped registry/read models and legacy live presentation.

Intended product: Mission Control-derived AI-Verse UI → scoped Dashboard host/client bridge → canonical Gateway → OS/runtime and existing owners → truthful runs/events/approvals back to the selected UI context.

| Disposition | Smallest maintainable route |
| --- | --- |
| REUSE | `packages/protocol`, `packages/registry`, `packages/client`, `packages/live`, owner-correct read projections, panel/layout contracts and isolation/security coverage. |
| EXTEND | Existing client/host boundary to consume Gateway HTTP/SSE with explicit identity, secrets, failure and lifecycle handling. Existing `/rpc` read behavior remains compatible until callers migrate. |
| CREATE | Only the missing typed canonical-Gateway adapter and later Mission Control-derived application surface already required by MC2/MC3. No new service or domain store is justified now. |
| RETIRE, after equivalent acceptance | Old echo/subprocess execution or local session projections acting as production Gateway truth; duplicated Mission Control authority, one area at a time. Do not delete foundations or panels early. |
| BLOCK / UNKNOWN | Unsupported owner operations, unverified provider/account readiness, production Brain Goal transport, and any integration that requires bypassing canonical permissions. Resolve at the owning slice; do not invent successful data. |

The [MC2.1 client contract draft](MC2.1-AIVERSE-GATEWAY-CLIENT-CONTRACT-2026-10-26.md) specifies the next seam. Importing the application UI remains MC3; choosing its exact build integration is deferred to source inspection there. The old recommended stack is not evidence that framework migration has already been decided or implemented.

### Constraints beside the change

- Keep browser presentation authentication separate from the upstream Gateway bearer. Resolve the latter only in the trusted host and never put it into browser storage, URLs, logs or third-party install scripts.
- A Dashboard registry ID and the configured Gateway system ID may differ. Bind them explicitly; do not rename an installation or trust a browser-provided canonical ID.
- Gateway has no generic capabilities, workspace-list or run-list endpoint at this baseline. Reuse tested compatibility and supported owner projections; never fabricate these APIs or read Gateway storage directly.
- Canonical run SSE is different from OpenAI chat SSE. Preserve scope through the subscription binding; the upstream event envelope itself has no system/workspace fields or sequence cursor.
- Disable an unavailable control or panel with an honest reason. A model listing, configuration flag or rendered panel does not prove owner/model readiness.
- Browser and Tauri remain hosts of the same UI. Folder selection, secret storage and lifecycle supervision follow their existing MC6 and Distribution boundaries.

## 3. Acceptance and planned verification

These IDs summarize existing requirements; they add no new product obligations. The detailed slice acceptance in the tracker and PRD remains controlling.

| ID | Observable success and important failure | Existing slices / planned proof |
| --- | --- | --- |
| R01 | Requests, caches, streams and controls stay bound to the selected system/workspace; wrong identity, root replacement and late events reject rather than fall back. | MC2.1–MC2.5, MC3.3, MC7.2; existing registry/isolation tests plus real two-system A→B→A client checks. |
| R02 | Main Chat uses the real canonical Gateway; runs/events and allowed cancel/pause/resume/approval actions return actual owner outcomes. | MC2, MC4A/B/D; typed client and authenticated HTTP/SSE composition, including interrupted/recovery and approval failures. |
| R03 | Failed/unsupported/disabled/offline remains explicit; retries preserve idempotency and cannot duplicate an effect. | MC2.2/MC2.5, MC4I; timeouts, scope mismatch, wrong token, retry conflict, restart and unavailable-owner cases. |
| R04 | Feature views use canonical owners; Mission Control/legacy local stores do not become AI-Verse tasks, sessions, memory, costs, permissions or schedules. | MC3/MC4/MC7; feature disposition and actual source/write-path review with owner-backed panel checks. |
| R05 | Mission Control presentation is adopted with provenance while existing useful packages, isolation and layouts survive. | MC0/MC3; launchable app, license/import inventory and existing regression coverage before any stripping. |
| R06 | A normal user can choose context, ask for work, understand progress and respond to Needs You; advanced controls stay available. | MC5; real interaction/accessibility/visual verification against the existing product brief. |
| R07 | Browser and Mac share the UI; trusted desktop registration, per-system supervision, secure credentials and install/update paths remain correctly owned. | MC6; native development/DMG, clean-machine and preservation checks; human OS/signing steps only when genuinely required. |
| R08 | Final supported product behavior, security, licensing and two-system isolation are evidenced before dogfood/release claims. | MC7; independent review, composed acceptance and explicit final user sign-off. Distribution admission remains separate. |

Use current API/schema/resource bounds. Measure a real bottleneck when encountered; this refresh adds no invented latency target or benchmark program. Planned verification is not executed evidence. Documentation-only MC2.1 is reviewed against source and invariants; it does not require a new synthetic test suite.

| Applicable risk | Decision / responsible work |
| --- | --- |
| Duplicate runtime/domain authority | Canonical Gateway/owners remain authoritative; MC2 contract distinguishes existing Dashboard scaffolding and MC4 replaces authority only after each owner-backed path works. |
| Scope, stale approvals and delayed responses | Bind both system identities, workspace and connection epoch; validate returned run ownership and fail closed where the upstream contract cannot enforce an exact control precondition. MC2.1 records gaps; MC2.5 resolves necessary owner changes separately. |
| Secret or private context exposure | Host-only upstream credentials; strict browser envelopes, scoped projections and untrusted text rendering. No real credentials or private data are introduced by a plan or contract review. |
| Stream/retry/restart failure | Separate stream protocols, bounded rebuildable projections, explicit reconnect/deduplication and stable operation IDs; canonical recovery status wins. |
| Breaking existing callers or importing the wrong framework | Add an adapter at the existing package boundary, preserve legacy responses until migration, inspect actual Mission Control source at MC3 and keep rollback in Git. |
| False readiness or release claim | Distinguish code, owner acceptance, candidate qualification, installed-system evidence and Distribution release. Unsupported owners remain unavailable. |

## 4. Execution

The existing **100-point** roadmap and task IDs are unchanged. Future stages stay at outcome level here; derive their detailed work only when they start. Follow the tracker for each individual slice's weight, dependencies and gate.

| Phase | Fixed outcome | Weight / accepted | Start condition and next |
| --- | --- | --- | --- |
| MC0 | Preserve architecture, licensing and build baseline | 5 / 5 | Complete; retain recorded evidence. |
| MC1 | Real Mission Control task through authenticated OS/Gateway/runtime | 10 / 10 | Complete for the recorded local-model scope; continue MC2.1. |
| MC2 | First-class AI-Verse client, context selection, Chat and run controls | 15 / 0 | MC1 accepted. Existing order MC2.1→MC2.2→MC2.3→MC2.4→MC2.5→MC2.6; next MC3. |
| MC3 | Launchable Mission Control-derived app with retained contracts and full feature inventory | 10 / 0 | MC2 accepted; MC3.1–MC3.5 preserve the no-stripping gate; next MC4. |
| MC4 | Connect feature areas to their real AI-Verse owners | 35 / 0 | MC3 accepted; retain MC4A–MC4L owner order and independent gates; next MC5. |
| MC5 | Simple AI-Verse experience, visual identity and accessible interactions | 10 / 0 | MC4 accepted; retain MC5.1–MC5.4; next MC6. |
| MC6 | Same product delivered as a Mac desktop app with owned lifecycle boundaries | 10 / 0 | MC5 accepted; retain MC6.1–MC6.4; next MC7. |
| MC7 | Independent product/security/isolation acceptance and owner dogfood | 5 / 0 | MC6 accepted; retain MC7.1–MC7.3; Distribution separately authorizes release. |

### Current slice: MC2.1 — Adapter contract design (2 points)

- **Owner / acceptance:** Dashboard; R01–R03. Design review against real Gateway protocol and Dashboard invariants, as already required by the tracker.
- **Start evidence:** accepted MC1 and qualified Gateway candidate; exact reviewed refs are above. No new local model test is required to design this interface.
- **Bounded change:** design documentation and the existing living plan/tracker only. No runtime API, live credential, canonical owner or renderer changes in this slice.
- **Derived tasks:** (1) inspect actual caller/owner seams; (2) write the concrete identity/auth/API/stream/control contract and gap dispositions; (3) cross-check it against source and PRD, then record the reviewed checkpoint.
- **First useful result:** the next implementer can build MC2.2 using actual endpoint shapes and explicit failure behavior without guessing a discovery API or creating another run owner.
- **Recovery:** documentation remains proposed until accepted; Git preserves the prior plan. Reverting design text does not mutate user state.
- **Local checkpoint:** the three design tasks are prepared for review in this change. They add no accepted points before the normal PR acceptance. After accepted MC2.1, the fixed tracker becomes 17/100 and MC2.2 is next.

MC2.2 should implement the typed adapter at `packages/client` first. MC2.3 supplies explicit AI-Verse runtime identity, MC2.4 wires selection/isolation, MC2.5 connects main Chat/run/event/control behavior, and MC2.6 handles provider readiness/login only where needed. The exact tasks are derived at each start; none is silently counted complete by this plan rewrite.

## 5. Checkpoint and next action

- **Confirmed:** Mission Control remains the approved foundation, through the maintained AI-Verse copy. MC0/MC1 are accepted; the real local-model path is proven. Gateway's agreed candidate program is 10/10; member/private-Core release qualification remains separate.
- **Current accepted progress:** **15/100**. Refreshing this document does not reset or increase it.
- **In review:** the MC2.1 design packet linked above. Next action is its source/architecture review and normal acceptance, then existing MC2.2. No client or finished UI is claimed by a design document.
- **Assumptions / blockers:** the normal Chat/run path can target the qualified Gateway now. Capability discovery is a compatibility/readiness projection, not a nonexistent endpoint. Optional owner panels and any atomic scope/control gap are resolved at their owning slice before that behavior is enabled.
- **Execution evidence:** [tracker](MISSION-CONTROL-EXECUTION-TRACKER-2026-09-15.md), [real Mac acceptance](MC1-REAL-MODEL-ACCEPTANCE-2026-10-26.md), [Gateway closeout](https://github.com/aiverse-filmmakers/AI-Verse-System/pull/290). Earlier proof restrictions and original upstream provenance remain historical evidence; no code or release is promoted by prose.
