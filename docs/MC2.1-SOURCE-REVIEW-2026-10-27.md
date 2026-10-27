# MC2.1 source review and MC2.2 implementation boundary, 27 October 2026

Status: **MC2.1 design packet reviewed against named owner sources, ready for PR acceptance, not yet merged.** MC0/MC1 remain the only accepted historical 15/100 points. MC2.2's first host-only transport slice is implemented and tested independently; it is not an authenticated Dashboard UI integration.

## Source pins inspected

| Owner/source | Main revision reviewed | Verified current surface |
| --- | --- | --- |
| Gateway `AI-Verse-Gateway` | `ceb8849ec062f0d3997ceb0207e42c25aedd20c6`, candidate descriptor pins `386ff40135a841c27bfd106531b38a7f37c1c227` | `src/server.mjs`: `/status`, `/v1/models`, create/read run, run events, diagnostics, cancel/pause/resume/approval. Authenticated principal owns run; session and workspace are bound on creation. No generic workspace/session/run inventory API. |
| Dashboard source | PR #42 `codex/dashboard-source-checkpoint` | Existing `packages/client/src/client.ts` targets Dashboard-local `/rpc`, not canonical Gateway. `apps/gateway/src/server.ts` has authenticated HTTP/WS routing but synchronous local `QueryRouter.handle()`. `packages/registry/src/registry.ts` owns approved OS root identity with `resolveRoot()`/revalidate; it is not a credential vault. |
| OS `AI-Verse-OS` | `0dc744057199970a34a60c11dff192e407ad64ed` | OS owns workspace scope, permission floors, context and owner-routed effects. CLI lifecycle and owner-routed mutation exist. No approved generic Dashboard canvas document/action host API discovered from README. |
| Memory `AI-Verse-Memory` | `09911eae0b4b0cbf7e7e7969230fe5b86647b841` | Memory is historical scoped Markdown with derived recall, read-only orientation/progressive recall methods. Do not represent it as a global free-form database or browse filesystem paths from the browser. |
| Skills `AI-Verse-Skills` | `297c63a5be95f8319cc5755f287329c2e4387b02` | Status, doctor, readiness, active generations and proposals exist. Skill invocation/permissions require separate owner and runtime approval. |
| Data `AI-Verse-Data` | `7e9fadbd73752b24eb79e270aff6b311ad508109` | Native workspace-bound structured records, scope-first query/transaction support and owner-backed backup. Not a generic file upload/canvas persistence API. |
| Token `AI-Verse-Token` | `363dde3d87edaf8e7acd072c542775017f0b5dbf` | `@ai-verse/token/dashboard` and usage/status/doctor offer bounded owner projections; ACTUAL/CALCULATED/UNKNOWN remain distinct, unknown is not zero. |
| Connections `AI-Verse-Connections` | `b6eedea9a1ab569581f56a9d123de3497464619d` | Owner has local `ConnectionsService`/CLI for scoped roster/readiness, verification, credentials and approval. Newer guided-provider code exists on main; its precise credential protocol must be checked before any host exposure. Stable v1 Dashboard handoff documents `status()`, `doctor()`, `listConnections()`, verification and fail-closed execution. It does not establish an authenticated Dashboard HTTP endpoint. |

These are source/published-contract checks, not private member-install qualification or a real provider account connection.

## MC2.1 contract decisions

1. **Separate interfaces**: Dashboard-local `/rpc` is a disposable projection service. Canonical Gateway HTTP/SSE is the only admitted AI run execution source. No auto-fallback or dual submission.
2. **Identity**: the authenticated local Dashboard host resolves `Dashboard systemId -> approved registry root -> canonical Gateway system_id -> workspace_id + epoch`. The browser never supplies OS root, Gateway origin, model credentials or principal. `operator` is an explicit general-chat workspace wire scope.
3. **Creds**: a host-only opaque credential lookup is still required; `SystemRegistry` is not a vault. AUTH-1 PKCE state is not a token exchange, account login or permission grant. A trusted host must vet provider eligibility and credential ownership before the Connect AI UI is enabled.
4. **Only real routes**: canonical Gateway exposes status, virtual model `aiverse`, create/read run, SSE replay, diagnostics and controls. It does not expose conversation list/rename/archive, workspace create/list, file blobs, dynamic physical model/reasoning selection or generic canvas actions. Those have explicitly unavailable statuses in Stage 1. Absence must not be silently papered over.
5. **Run bound controls**: Gateway authenticates run ownership by principal, but control routes do not accept an atomic expected-workspace predicate. The host must bind selected run/lease and test actual rebind behavior before making live Stop/approval clickable. The client can precheck and validate the response, but that is not an atomic control guarantee.
6. **SSE**: Gateway SSE includes `event_id,run_id,type,at,data`, not trusted scope or resumable server-side cursor. The host binds scope, validates run IDs, deduplicates replay, and treats `gateway.replay_overflow` as interrupted, never successful completion.
7. **App context envelope (proposed, not yet a callable route)**: the future host should derive `{systemId,workspaceId,conversationId,appId,documentId,revision,selection,connectionEpoch}` from authenticated authorized UI state, not from arbitrary model text. An app action should include `operationId`, typed action name/parameters, target document revision, approval/grant if required, and a canonical owner receipt. Validate target scope and revision at the final write edge; cancellation reports partial results. Supported action vocabulary cannot be declared until the canvas/document owner is identified.
8. **Stable owners**: Connections verifies and authorizes external capabilities, Token owns usage/cost truth, Memory owns historical recall, Skills owns packages, OS owns workspace authority, and Gateway owns runs/events. Dashboard may show projections but must not duplicate canonical stores.

## What MC2.2 slice 1 actually implements

`packages/client/src/canonical-gateway-client.ts` is deliberately **not** re-exported by the browser-facing `packages/client/src/index.ts`. It accepts an already-approved host binding plus a host-side bearer resolver, and provides `preflight`, `createRun`, `getRun`, `controlRun`, `subscribeRun` and `invalidate`.

The boundary rejects remote/credential-bearing Gateway origins, invalid workspace IDs, wrong canonical system/run scope, malformed JSON/events, unknown lifecycle/model, replay overflow and stale leases. It retains caller-issued idempotency and operation IDs and never echoes upstream error messages/secrets. `test/canonical-gateway-client.test.ts` exercises those rules with synthetic HTTP/SSE fixtures, including repeated submissions and fragmented CRLF. No provider network, OS filesystem write or browser credential input is performed.

### Integration gate to continue

- Host-side approved binding registry: inspect root via `SystemRegistry.resolveRoot()`, resolve canonical Gateway ID/origin through an owner-approved connection record, and obtain the bearer from an actual credential owner. The existing registry currently lacks the latter mapping. Do not add a browser-provided token/origin or fake credential store.
- Add a narrow authenticated asynchronous bridge at the existing Dashboard host boundary; keep `QueryRouter.handle()` compatibility. Verify caller system/workspace authN/authZ, connection epoch, errors and no raw Gateway artifacts/credentials in browser messages. Do not wire a speculative route.
- Test against one real local deterministic Gateway process with the approved system binding, and test negative cross-system/epoch/unauthorized access, stream disconnect and run controls. Only then expose first Personal live Chat and Stop.
- All live provider, Memory, Skills, Token and file integrations remain separate owner-backed steps. Stage 1 browser conversation storage is a UX preview, not canonical Gateway session recovery.

**Design review disposition:** no need to restart MC0/MC1 or invent a new C0/C1 plan. Proceed with existing MC2.2 after this exact owner- and contract-bound review; award MC2.1's 2 points only when PR acceptance gate is met. This plan deliberately contains no invented host endpoint and preserves the current 15 accepted baseline points.
