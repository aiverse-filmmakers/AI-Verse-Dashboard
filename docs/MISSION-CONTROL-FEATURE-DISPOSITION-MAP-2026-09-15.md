# Mission Control Feature Disposition Map for AI-Verse

**Date:** 2026-09-15  
**Mission Control source pin:** `builderz-labs/mission-control@5483a0e1eef15b467c167e95796791112cedbb7c`  
**Purpose:** audit everything valuable before stripping the upstream shell.  
**Status:** canonical pre-strip decision map.

## Disposition vocabulary

- **PROJECT**: AI-Verse already has the correct canonical owner. Keep/build the Mission Control surface, but feed it from AI-Verse.
- **ADOPT**: Mission Control exposes a useful capability AI-Verse does not currently have as a product capability. Add it to the correct AI-Verse owner before making the Dashboard depend on it.
- **PRESENTATION-ONLY**: retain the interaction or visual pattern, not Mission Control's backing authority.
- **STRIP**: remove when the AI-Verse replacement is ready or when the feature does not fit the product.

## Executive answer

Mission Control does **not** have a dramatically richer AI architecture than AI-Verse.

AI-Verse already has owners for most of Mission Control's major domains. The largest gap is productization: Mission Control has finished UI and operational workflows around capabilities that AI-Verse currently owns only in backend contracts or plans.

The genuinely additional capabilities worth evaluating are:

1. configurable alert rules and a notification center;
2. unified quality-review/evaluation workflow and review queue;
3. stale-task recovery UX and operator rescue controls;
4. multi-user Dashboard auth, roles and user administration;
5. backup/maintenance/export UI;
6. rich security center, secret/injection scans and security events;
7. multi-Gateway fleet/supervision view;
8. local runtime discovery/install/setup UI;
9. GitHub sync/operator integration;
10. provider subscription/quota visibility;
11. first-class device/client identity for remote Dashboard clients;
12. easy remote-access operations such as Tailscale-style serving;
13. internationalization and finished theme controls;
14. global search and operator command shortcuts;
15. interactive API/OpenAPI, CLI and MCP operator surfaces;
16. a customizable widget grid and briefing dashboard;
17. signed human-readable completion receipts;
18. optional standup/reporting workflows;
19. optional visual office/presence surface;
20. future remote compute/node management.

These are candidates, not automatic imports.

## Panel-by-panel map

| Mission Control surface | AI-Verse state today | Disposition | Correct AI-Verse owner / action |
|---|---|---|---|
| Overview / Briefing Bar | Now/Control Room planned, model exists | PROJECT | Dashboard projection from owners |
| Activity Feed / Event Stream | live activity normalization exists | PROJECT | Gateway + owner events |
| Fleet Status | partial runtime/session concepts | PROJECT + ADOPT polish | Gateway/Multiple Bots/Token projections |
| Task Board / Task Pipeline | Work surface planned; Multiple Bots owns coordination | PROJECT | Multiple Bots / OS projection |
| Agent Squad / Agent Detail | Bots panel planned; canonical Bot model exists outside Dashboard | PROJECT | Multiple Bots |
| Agent Comms | Rooms/Threads intended | PROJECT | Multiple Bots |
| Chat | timeline/runtime scaffolding exists | PROJECT | canonical Gateway |
| Runs / Sessions | Gateway already owns runs/checkpoints/events | PROJECT | canonical Gateway |
| Terminal / PTY | terminal/log concept exists but not core MVP | PRESENTATION-ONLY | bounded runtime/tool surface, never raw authority by default |
| Cron Management | Automations owns schedules | PROJECT | Automations |
| Execution Approvals | Gateway/OS permission boundary exists | PROJECT | Gateway + OS/owner policy |
| Memory Browser | Memory owner exists | PROJECT | Memory |
| Memory Relationship Graph | Brain/Memory graph is planned | PROJECT | owner projection, Dashboard visualization |
| Skills Hub | Skills owner exists | PROJECT | Skills |
| Cost Tracker / Tokens | Token is canonical owner | PROJECT | Token |
| Integrations | Connections intended owner, currently less mature | PROJECT | Connections |
| Channels | omnichannel planned | PROJECT | Connections + Gateway/channel bridge |
| Webhooks | Automations + Connections already define event boundaries | PROJECT | Connections/Automations |
| Gateway Control | canonical Gateway lifecycle exists | PROJECT | Gateway |
| Gateway Config | canonical Gateway config exists | PROJECT | Gateway, with safe bounded settings |
| Multi-Gateway | desktop plan needs one isolated Gateway per registered system | ADOPT | Dashboard host supervision + Gateway instances |
| System Monitor | owner health/doctor exists across components, UI weak | PROJECT | aggregate owner health |
| Log Viewer | Runs/logs planned | PROJECT | Gateway/owners |
| Audit Trail | receipts/audits exist across owners, no unified UI | PROJECT + ADOPT aggregation | Dashboard projection, owners remain canonical |
| Security Audit | strong backend laws, weak operator UI | ADOPT surface | OS/Gateway/Connections/security evidence |
| Alert Rules | no clear canonical generalized alert-rule product | ADOPT if useful | likely OS/Automations policy + Dashboard presentation |
| Notifications | attention exists, no mature general notification center | ADOPT | owner events + Dashboard/Connections delivery |
| GitHub Sync | no dedicated current AI-Verse product surface | ADOPT selectively | Connections, not Dashboard-owned credentials |
| Office visual view | no equivalent required | PRESENTATION-ONLY / optional | Multiple Bots projection |
| Orchestration Bar | Brain + Multiple Bots already own orchestration concepts | PROJECT | Brain/Multiple Bots |
| Pipeline view | workflow concepts exist but no finished visual pipeline | PRESENTATION-ONLY | Multiple Bots/Automations projection |
| Standup | no dedicated core feature | ADOPT only as optional workflow/app | Automations + Bot/App |
| Nodes | no finished remote-node product | ADOPT later if execution needs it | Gateway/runtime/computer-execution layer |
| Settings | required | PROJECT | bounded settings routed to each owner |
| Super Admin | current product is primarily owner/local-first | STRIP for MVP, reconsider SaaS | future account/organization layer |
| User Management | no current Dashboard multi-user product | ADOPT later if shared product needed | explicit identity/access owner required |
| Debug Panel | useful during development | PRESENTATION-ONLY | developer mode only |
| Local Agent Docs | useful operator convenience | PRESENTATION-ONLY | docs/help surface |
| Notifications panel | incomplete equivalent | ADOPT | event/attention projection |
| Plugins | OS extension registry exists, contributed-panel concept not implemented | PROJECT + ADOPT UI | OS + Dashboard extension registry |

## Operational capabilities outside the panels

| Mission Control capability | AI-Verse comparison | Disposition |
|---|---|---|
| OpenAI-compatible local provider routing | Gateway already exposes compatible endpoint | PROJECT immediately for MC1 proof |
| Claude/Codex/Hermes/OpenClaw discovery | AI-Verse has runtime concepts but no polished discovery UI | ADOPT discovery/setup UX |
| Agent self-registration and heartbeats | Multiple Bots/Gateway have stronger scoped coordination concepts | PROJECT, do not create parallel registry |
| Stale task recovery/requeue | retry/recovery exists in Multiple Bots, but Mission Control has explicit operator pattern | PROJECT + inspect for missing UX/policy |
| Aegis quality-review gate | Brain has verification and owners emit receipts, but no one unified task-review product | ADOPT a unified review surface, keep canonical evaluation with appropriate owners |
| Agent evals/optimizer | evaluation exists in several components but not a finished operator facility | ADOPT selectively |
| Completion receipts | AI-Verse has many receipts but no unified human-readable completion screen | ADOPT surface |
| SQLite control-plane database | conflicts with AI-Verse owner model if treated as domain truth | STRIP as authority; temporary disposable compatibility only |
| Session cookies/API keys/Google sign-in | Gateway has bearer auth, Dashboard lacks mature multi-user auth | ADOPT only when user/account sharing is required |
| Role checks | no finished Dashboard RBAC | ADOPT later for multi-user/remote deployments |
| OpenAPI REST docs | Gateway has HTTP API but not equivalent polished interactive operator docs | ADOPT |
| CLI | owners have CLIs, no single Dashboard/operator CLI | ADOPT only if it simplifies operations |
| MCP server for Mission Control | AI-Verse has component/tool surfaces but no single Dashboard MCP control plane | evaluate later; must not bypass owners |
| WebSocket + SSE | Gateway already has event streaming | PROJECT |
| Backup automation | several components have state/backup concepts but no unified product UI | ADOPT UI/orchestration |
| Export | Data and some owners support export; no unified Dashboard export center | PROJECT + ADOPT aggregation |
| Security scanner | no equivalent central Dashboard scan product | ADOPT surface using owner evidence |
| Secret scanner | credential boundaries exist, no single scan UI | ADOPT where safe |
| Prompt-injection guard | AI-Verse has permission boundaries, but no general Dashboard guard owner | evaluate, likely Gateway/runtime input defense |
| Rate limits | needed for remote exposure, not central current Dashboard feature | ADOPT in Gateway/access edge where missing |
| Device identity | not a finished Dashboard feature | ADOPT for trusted remote clients if needed |
| Signed receipts | receipt concepts exist, signing not universal | evaluate for tamper-evident operator history |
| Auto backup | no unified product behavior | ADOPT through owner-safe backup orchestration |
| Update/doctor banners | owners expose doctor/update commands but Dashboard does not surface them well | ADOPT immediately as UI |
| Provider subscription/plan detection | Token knows usage/cost, but plan/quota status is separate | ADOPT as non-canonical provider evidence |
| Global search | planned concept, not implemented | ADOPT |
| Themes | design tokens exist, finished themes do not | ADOPT presentation |
| Internationalization | absent | ADOPT later |
| Tailscale serve / easy remote access | Gateway supports deliberate remote bind behind TLS proxy, not a consumer-friendly remote-access flow | ADOPT only with security review |
| GitHub issue/task sync | no dedicated owner-backed product yet | ADOPT via Connections |
| Custom dashboard widgets | modular panel model exists but not rendered | ADOPT Mission Control implementation ideas |
| Onboarding wizard | MVP onboarding is planned, not implemented | ADOPT Mission Control patterns |
| Runtime setup wizard | absent as finished product | ADOPT |
| Security-scan onboarding | absent | ADOPT after owner health/security projection exists |
| Update banners | absent | ADOPT |
| Backup/maintenance widget | absent as unified surface | ADOPT |
| Quality-review queue | absent as unified Dashboard workflow | ADOPT |
| Virtual office | not required | optional only |
| Remote nodes | not current MVP | later only |

## What must NOT be copied as authority

Even if the UI is retained, replace these Mission Control canonical stores/decisions:

- task canonicality;
- agent/Bot canonicality;
- schedule canonicality;
- memory canonicality;
- cost/token pricing canonicality;
- integration credential ownership;
- approvals/permission authority;
- runtime session/run canonicality;
- AI-Verse workspace identity;
- AI-Verse health meaning.

Their AI-Verse owners already exist.

## Recommended extra features to keep in the roadmap

### High priority

1. Mission Control customizable Overview/widget grid.
2. Doctor/update/readiness banners.
3. Security & Audit center.
4. Alert rules + notification center.
5. Multi-Gateway manager for multiple registered AI-Verse systems.
6. Runtime discovery/setup.
7. Unified completion receipts and quality-review surface.
8. Backup/maintenance UI.
9. Global search.
10. owner-backed integration/webhook management.

### Medium priority

11. GitHub sync through Connections.
12. provider plan/quota status.
13. multi-user roles/auth when the product becomes shared.
14. interactive API docs/operator CLI.
15. device identity for trusted remote clients.
16. themes.
17. internationalization.

### Optional / later

18. standups.
19. virtual office.
20. remote nodes/computer fleet.
21. Tailscale-style one-click remote access.
22. agent optimization/eval laboratory.

## Pre-strip gate

A Mission Control feature can be removed only after one of these is documented:

- equivalent AI-Verse owner-backed surface is connected;
- feature is intentionally rejected;
- feature is deferred with a named future owner;
- feature is pure Mission Control/OpenClaw legacy and has no AI-Verse value.

Until then, leave it visible in the reference branch/build so the product owner can compare it directly.
