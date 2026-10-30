# MC2.1 design review and Personal-first contract reconciliation

**Review candidate:** 28 October 2026. **Scope:** the original MC2.1 Gateway contract design (2 historical points), amended with explicit Personal-first source/owner boundaries and testable future action envelopes. **Not** an implementation/merge, user Mac acceptance, a release or any reallocation of the existing 100-point historical programme.

**Proposed decision:** **READY FOR NORMAL PR DESIGN REVIEW; NOT ACCEPTED**. Formal accepted score stays **15/100** until the focused review PR is approved and integrated and the owner records MC2.1 acceptance with exact evidence. If the gate closes, the next historic score is **17/100**, not 16/100. Source inspection, a self-authored checklist or passing implementation tests do not themselves constitute owner approval.

Companion [full Gateway transport contract](MC2.1-AIVERSE-GATEWAY-CLIENT-CONTRACT-2026-10-26.md) is the original wire-detail baseline, not an assumption that every downstream method is implemented. The source/PRD review is separated here from the much larger Dashboard [implementation draft #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), stacked on [plan amendment draft #41](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/41).

## 1. Exact source identity and decision authority

| Owner | Source reviewed | Accepted/available boundary | Separate draft or unsupported |
| --- | --- | --- | --- |
| Dashboard | `AI-Verse-Dashboard@016da5fda319c94bda6704859acc5b12d23ad4ed`; source draft #42 at `2a015ce28f963b55782e4a724bee5483625ad760` | Local authenticated `/rpc`, registry-root identity, selected workspace, disposable projections and browser presentation | Draft #42 has working canonical chat, Previous Chats and Canvas host facade; it is **not merged/owner admitted** |
| Gateway | `AI-Verse-Gateway@ceb8849ec062f0d3997ceb0207e42c25aedd20c6` | Authenticated `GET /status`, `GET /v1/models`, `POST/GET /v1/runs`, SSE events, diagnostics, cancel/pause/resume/approval | [Gateway draft #80](https://github.com/aiverse-filmmakers/AI-Verse-Gateway/pull/80) `9748dd0d5473b65ad95ef92df62fe0a13575e378` adds read-only principal/workspace-scoped `GET /v1/sessions` and `/v1/sessions/:id/runs` |
| OS | `AI-Verse-OS@0dc744057199970a34a60c11dff192e407ad64ed` | System/workspace topology, `scripts/action-permission.mjs`, owner action/write permission floors and provenance | No general browser-callable Canvas action authority; source mapping/approval must be admitted at final write edge |
| Data | `AI-Verse-Data@7e9fadbd73752b24eb79e270aff6b311ad508109` | Scoped SQLite/record engine, CAS version, idempotency, provenance, read-only Dashboard projection | [Data draft #22](https://github.com/aiverse-filmmakers/AI-Verse-Data/pull/22) `68f642cee430dc22381033f1338398b635993972` adds Data-owned Canvas documents/notes/connections; Dashboard host draft still needs production OS admission |
| Connections | `AI-Verse-Connections@b6eedea9a1ab569581f56a9d123de3497464619d` | `ConnectionsService` local owner: credential vault handles, scoped connection roster, verify/admit/approve/revoke and final-edge execution checks; documented `docs/DASHBOARD-CONSUMPTION-HANDOFF-2026-10-27.md` | No production authenticated Dashboard credential exchange API; guided provider [draft #15](https://github.com/aiverse-filmmakers/AI-Verse-Connections/pull/15) adds narrower verification guidance |
| Token | `AI-Verse-Token@363dde3d87edaf8e7acd072c542775017f0b5dbf` | Token owner has bounded Dashboard cost/usage projections; ACTUAL/CALCULATED/UNKNOWN remain distinct | No Dashboard sidecar pricing/cost truth or fabricated usage values |
| Memory | `AI-Verse-Memory@09911eae0b4b0cbf7e7e7969230fe5b86647b841` | Historical recall and scoped memory/provenance through owner API | Chat history is Gateway session/run state, **not** Memory or browser-local canonical content |
| Skills | `AI-Verse-Skills@297c63a5be95f8319cc5755f287329c2e4387b02` | Skills owner admission, active generations and capability readiness | No arbitrary browser ability to invoke skills or auto-grant a model-suggested capability |

**Review correction:** earlier baseline phrases like "Gateway has no session list" and "Data has no Canvas model" were correct at Gateway/Data **main pins**, but the corresponding APIs now exist in **unmerged drafts**. A proposed route is neither a released owner contract nor an authorized desktop route until its PR and lifecycle gates are accepted. Nothing in this design promotes these draft routes to production.

## 2. Reviewed host/transport boundary (MC2.1 core)

| Caller → owner | Input authority and executable mapping | Response provenance / failure |
| --- | --- | --- |
| Untrusted web UI → Dashboard localhost `/rpc` | Browser has a scoped authenticated Dashboard session (paired HttpOnly cookie for trusted first-party local UI; public Pages preview has no private access). Frame selects registered Dashboard `systemId`, explicit `workspaceId`, typed method and bounded params. No file roots, upstream bearer, provider URL or caller-asserted grant. | Host rejects unauthenticated/cross-origin/cross-workspace frames, invalid envelopes and changed registration generations. |
| Trusted host → canonical Gateway | An **approved** mapping from Dashboard registry identity to canonical `system_id`, loopback origin and host-only resolved Gateway bearer. Host preflights `/status` and `/v1/models`; virtual model `aiverse` only. | Compare verified canonical system/workspace/run binding to selected scope; no opaque upstream error secrets in UI. |
| Run submission → Gateway | `POST /v1/runs` includes `model:"aiverse"`, bounded role/content messages, `metadata.workspace_id`, optional `metadata.session_id`, unchanged `Idempotency-Key`. Never dual-submit a user turn via chat and runs. | Canonical `run_id,session_id,system_id,workspace_id,status` source of truth. Uncertain submission reuses **exact** key/body/scope, not a new run. |
| Event/recovery → Gateway | `GET /v1/runs/:id/events` SSE with `event_id,run_id,type,at,data`. The host scopes and projects event IDs and safe deltas; no upstream SSE sequence or resumable cursor exists. `GET /v1/runs/:id` reconciles terminal state. | Replay is deduplicated by event ID. Only authoritative completed output becomes confirmed follow-up context. Failed/parked/unknown/approval-required never become success. |
| History → Gateway draft #80 | `GET /v1/sessions?workspace_id=...&limit=...&offset=...` and `GET /v1/sessions/:id/runs?workspace_id=...` | Strict principal/system/workspace, bounded redacted user and completed-output fields. No system/tool prompt or raw owner storage exposure. Not on baseline main. |
| Canvas operations → Data draft #22 | Host maps the caller's registered OS/workspace to approved scoped Data owner; `create/list/get/rename/edit/delete` are **typed**. Data enforces optimistic version/idempotency/provenance, while OS host enforces actor authority and approval. | Dashboard draft #42 exposes opt-in Canvas RPC but default-denies without an injected owner. CI fixture permission is **not** a production OS permission grant. |
| Credentials/provider selection → Connections/host | Gateway server bearer originates from authorized Gateway installation config, **not** a model token or a credential copied from a browser. Connections owns external provider credential handles/vault and must vet scoped eligibility and grants. | AUTH-2 **ownership resolved to Connections + trusted host; production exchange/secret resolution not wired**. A key/PKCE helper is not proof of connected model or paid balance. |
| Usage/skills/memory → corresponding owners | Host queries only explicit bounded owner reads after identity/permission checks. | Disconnected or unknown is shown as unavailable; no invented model reasoning levels, tokens or private cross-workspace content. |

### Verified wire examples: supported current Gateway operations

The following illustrate concrete request/response fields supported by the pinned Gateway's `src/server.mjs`, `createRun` and sanitized result. Values are **examples**, not live account/run IDs.

```http
GET /status
Authorization: Bearer <HOST_ONLY_GATEWAY_BEARER>
```

```http
GET /v1/models
Authorization: Bearer <HOST_ONLY_GATEWAY_BEARER>

200: {"object":"list","data":[{"id":"aiverse","object":"model", ...}]}
```

```http
POST /v1/runs
Authorization: Bearer <HOST_ONLY_GATEWAY_BEARER>
Idempotency-Key: submit-123
Content-Type: application/json

{"model":"aiverse","metadata":{"workspace_id":"operator"},
 "messages":[{"role":"user","content":"Plan a camera move"}]}

202: {"run_id":"<canonical-run>","session_id":"<canonical-session>",
      "system_id":"<installed-canonical-system>","workspace_id":"operator",
      "status":"running", ...}
```

```text
GET /v1/runs/<canonical-run>/events
event: assistant.delta
data: {"event_id":"<event>","run_id":"<canonical-run>",
       "type":"assistant.delta","at":"<timestamp>",
       "data":{"text":"..."}}

GET /v1/runs/<canonical-run>
200: {"run_id":"<canonical-run>","status":"completed",
      "output":{"content":"..."}, ...}
```

Never take physical provider/model names, workspace scope, role grants or file bytes from an assistant message and treat them as API authority.

## 3. Personal-first state/context contract (design only)

The same conversation UI stays present while changing top-level Personal / Filmmaking / Workspace / Canvas views. **Navigation does not change conversation authority**. Canonical Gateway sessions belong to an explicit system and workspace, and the UI may show an app/document from a different scope. The host must refuse an app-target effect until the intended target is resolved with visible user choice if ambiguous.

Proposed **bounded presentation context** (host-normalized, no authority conveyed):

```ts
type SelectedAppContext = {
  systemId: string;               // registered Dashboard system, host verifies
  conversationId?: string;        // canonical Gateway session, only if bound
  conversationWorkspaceId: string;// "operator" or named workspace
  visibleWorkspaceId: string;     // selected app's workspace, may differ
  appId: "personal" | "filmmaking" | string;
  documentId?: string;            // Data-owned, only if verified
  documentVersion?: number;       // optimistic version, not authorization
  selection?: { nodeIds: string[] }; // bounded, untrusted UI hint
  connectionEpoch: number;        // host-generated, invalidated by retargeting
}
```

**Action command proposal** (not a callable Gateway endpoint and not a permission grant):

```ts
type CanvasActionRequest = {
  action: "note.add" | "note.move" | "note.text" | "note.remove" |
          "edge.add" | "edge.remove" | "document.rename";
  target: {
    systemId: string; workspaceId: string;
    documentId: string; expectedVersion: number;
  };
  operationId: string;            // stable retry identity
  parameters: Record<string, unknown>; // strict action-specific schema
};
```

The trusted host derives **principal, approved Data workspace, policy, grants, model identity and canonical owner actor** separately. Manual UI and agent proposals share *exactly the same* final authorization, validation, target CAS and Data mutation path. A model-generated instruction is untrusted text. Execution must not accept an arbitrary `operation` string, file path, tool name, scope expansion, approval bit or alternate origin. No write can race a silent workspace retarget: revalidate selected scope and OS/owner permission at the **final effect edge**, not only on an early UI read.

**Batch/undo/partial failure:** a user request to create three notes or three images is not an unbounded single effect. Every item gets stable action/receipt IDs; results distinguish applied, rejected, unknown and canceled. Stop prevents further dispatch and reports already-applied changes. For reversible note move/rename, undo is a new version-checked canonical owner operation, not browser-local rollback. External paid/image effects require admitted Connections/provider, canonical asset storage and appropriate approval before any job; absent owners remain unavailable.

**Attachments and dynamic model/reasoning:** the baseline Gateway's `/v1/models` advertises only the virtual `aiverse` model, not a user-selectable provider/reasoning matrix. No authenticated file bytes ingress/egress or `app.action` route exists on baseline main. Do not invent these endpoints. The UI shows unsupported until owner contracts, capability discovery and negative tests exist.

## 4. Negative security and failure acceptance matrix

| Case | Required expected behavior | Evidence status |
| --- | --- | --- |
| Missing cookie/bearer, wrong localhost Origin, GitHub Pages preview | 401/403; private bundle/WS/RPC denied | Real first-party browser + Gateway tests in implementation draft #42 |
| Browser supplies root, token, principal, connection grant or another workspace | Strict envelope denial before owner effects | Dashboard bridge and Canvas host tests in draft #42 |
| OS registry root is replaced, A → B → A workspace selection, old event arrives | Invalidate epoch/lease, cancel or discard stale output | Registry/Chat tests in draft #42; final owner effect recheck still needed |
| Run create timeout with unknown result | Retry **same** body/Idempotency-Key or reconcile canonical ID; do not mint a new request | Canonical follow-up/retry tests in draft #42 |
| SSE replay overlap, premature EOF or misleading `run.completed` delta | Deduplicate/reconcile against canonical `GET`; never fake success | Canonical browser stream tests in draft #42 |
| Run's selected workspace changes between GET and Stop/approval POST | **Keep Stop and approval disabled** until owner proves atomic/final-edge binding or adds appropriate Gateway-owned guard | **Open downstream control gate**, not MC2.1 design proof |
| Canvas write after selection switched, permission revoked, version stale | Deny/revalidate at owner edge; show conflict/unknown; no cross-workspace action | Data CAS + draft Dashboard host tests; **live OS host admission missing** |
| User or model tries unpaid/provider action without approval | No execution, preserve grant/readiness/receipt distinctions | **Not integrated**; Connections owner remains authoritative |
| Missing usage, credential, session history or feature | Show unknown/unavailable, never zero/fake demo as product truth | Read-only owner source contracts; app UI still staged |

## 5. Explicit carry-forward, additions, deferrals and progress

| Disposition | Milestone relationship | Implication |
| --- | --- | --- |
| **Carry forward** | MC0/MC1 historical acceptance 15/100; MC2 Gateway transport, staged Mission Control adoption, OS isolation, MC6/MC7 owner qualification | No relabeling/retesting accepted Mac proof. |
| **Accept for design review only** | MC2.1 core client/host mapping + Personal-first target/action envelope and negative test decisions | Worth 2 points **only after focused review PR acceptance**, then **17/100**. |
| **Implementation in drafts, not acceptance** | MC2.2+ Gateway chat and continuity in Dashboard #42; Gateway history in #80; Data Canvas in #22 | Code/CI success cannot claim merged owner interfaces, provider support or formal roadmap points. |
| **New/expanded Personal-first scope** | Always-on chat, contextual app selection, UI Canvas, manual/agent parity, persistent notes/assets, image jobs, broad provider selection | These require distinct owner/PRD estimates and gates; **not** silently squeezed into the historical 85 remaining points. |
| **Defer until owner APIs admitted** | Live provider OAuth, physical model/reasoning selection, file uploads, image generation, real Stop control, automatic workspace moves, undo/batch approvals | The UI must indicate unavailable, not promise or simulate real execution. |
| **Separate final acceptance** | Full OS/Connections credential policy and owner Mac/DMG/dogfood | No GitHub-only test can substitute the member's private identity or installed environment. |

The 100-point roadmap is a **historical baseline**, not yet a re-estimate of the expanded Personal-first product. Avoid claiming that the remaining 85 points necessarily cover the new scope or that GitHub-first 90–93% is current completion. Keep the Personal-first plan PR #41 review open and record a reviewed revised estimate **before changing total accounting**.

## 6. Design-only PR acceptance checklist

- [x] Baseline `/status`, `/v1/models`, run, SSE, diagnostic, controls and canonical identity semantics inspected at named immutable Gateway pin
- [x] Corrected current **draft** session history and Canvas/Data ownership vs main; no invented release status
- [x] Separate browser and Gateway authentication, registry root and workspace lease, idempotency and event-replay contract
- [x] Explicit Connections credential owner and Gateway installation key role, while acknowledging host credential exchange remains unimplemented
- [x] Bounded proposed app-context/action envelopes, manual/agent parity, version checks, partial-failure/undo policy, unsupported API list
- [x] Negative test matrix including workspace rebind/Stop race, cross-scope events, stale targets and refusal of model-supplied grants
- [x] Historical carry-forward / added / deferred scope recorded without changing unreviewed roadmap weights
- [ ] **Independent PR acceptance/merge** of the *design-only* review packet, recording approval and accepted source pin
- [ ] **Separate Personal-first plan amendment/estimate review** before interpreting the 100-point history as product completion
- [ ] Later MC2.2–MC2.6, Canvas/owner installation and private owner acceptance, assessed by their own existing gates

**Reviewer decision requested:** Approve or request changes to **MC2.1 design** only. Do **not** approve unfinished implementation PR #42, claim owner Mac testing, authorize live model credentials, or release Gateway/Data draft APIs by approving this document. After approval/merge, the execution tracker may record **MC2.1 2/2, total 17/100** with linked PR/merge commit.
