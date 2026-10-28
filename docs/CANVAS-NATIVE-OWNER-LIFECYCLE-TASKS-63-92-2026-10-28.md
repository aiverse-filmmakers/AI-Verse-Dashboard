# Tasks 63–92: Native OS grant owner lifecycle and measured GitHub progress

Date: 28 October 2026.
Status: **source implemented, CI acceptance pending at last checkpoint**.
OS stacked draft [PR #111](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/111)
depends on readonly grant verifier draft
[PR #110](https://github.com/aiverse-filmmakers/AI-Verse-OS/pull/110).
Dashboard integration remains draft
[PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42).

## Why this phase was necessary

Tasks 43–62 introduced an authenticated **grant reader**, not a way for
an owner to issue or revoke grants. The OS and canonical GatewayStore
still do not provide a built-in independently authenticated Mac owner
session or destructive approval receipt. A Dashboard cookie, HTTP bearer,
model reply, fake `agentGrant` flag or automatic grant creation is
not an identity.

This phase adds a **host-only candidate lifecycle**. It requires a
separate native human-approval callback, not exposed through any
browser or AI tool. All real permissions remain **absent by default**.
Its Linux/macOS functionality is subject to independent security
review and owner host integration. Windows issuance is explicitly
denied until real Windows ACL ownership has been implemented.

## 30 bounded source tasks

| Task | Actual source change or acceptance proof | Condition |
| --- | --- | --- |
| 63 | Inspected existing native OS action policy, grant reader and real GatewayStore run/session contract; no fake issuer | Source checked |
| 64 | Created separate stacked OS draft PR #111 instead of expanding reader PR #110 | Draft |
| 65 | Shared exact grant JSON schema between native reader and writer | Source |
| 66 | Added trusted OS root/scope/owner-private snapshot without browser path injection | Source |
| 67 | Added host-only `createCanvasGrantOwnerLifecycle` with **no** HTTP endpoint | Source |
| 68 | Required separately injected native human approval; missing callback denies | Source/test |
| 69 | Bound approval to SHA-256 of exact OS root, operation, generation and parameters | Source/test |
| 70 | Provided readable owner approval summary for actor, scope, methods and expiry | Source/test |
| 71 | Required short-lived approved owner receipt and rechecked expiry at effect edge | Source/test |
| 72 | Enforced bounded (maximum 24-hour) actor grant expiry and exact method allowlist | Source/test |
| 73 | Reused existing OS permission evaluator to deny paused workspace issuance | Source/test |
| 74 | Required independently verified live canonical Gateway run/session for bot issuance | Source/test |
| 75 | Rechecked live run/session after approval before granting a bot | Source/test |
| 76 | Blocked bot revert/delete and human delete grants until reviewed destructive approval system | Source/test |
| 77 | Added optimistic `expectedGeneration` CAS to refuse stale/replayed owner updates | Source/test |
| 78 | Added exclusive native owner lock and fail-closed simultaneous update behavior | Source/test |
| 79 | Added private temp file, fsync, atomic rename and directory fsync | Source/test |
| 80 | Re-read canonical grant after commit, returning bound native receipt without credentials | Source/test |
| 81 | Implemented explicit single grant revocation, including while workspace is paused | Source/test |
| 82 | Implemented separate owner-approved revoke-all operation | Source/test |
| 83 | Denied duplicate/ambiguous actor scopes and invalid grant documents | Source/test |
| 84 | Denied foreign/unsafe OS grant directories, symlinks and corrupt existing canonical file | Source/test |
| 85 | Explicitly disabled Windows issuance pending an actual ACL owner contract | Source/test |
| 86 | Tested TTL, invalid fields, missing/wrong approval and unsafe methods | OS test matrix |
| 87 | Fixed asynchronous caller mutation race by cloning/freezing the approved grant request | Source/test |
| 88 | Tested owner pause/cancel/rebind during pending approval, tamper, lock and CAS conflicts | OS test matrix |
| 89 | Added independent Node 22 lifecycle workflow for Linux/macOS/Windows and original verifier regression | GitHub Actions |
| 90 | Composed native lifecycle with **real** GatewayStore and Dashboard OS adapter in disposable CI | Dashboard integration |
| 91 | Created machine-readable 100-point remote progress data, anti-inflation validator and CI | Progress Actions |
| 92 | Stored security/owner runbook and handoff with exact PRs, pins, CI and unresolved production gates | Handoff |

**No new production Mac grant was issued.** Native approval and live
bot authentication are simulated by an explicit trusted **CI-only**
adapter running against the real GatewayStore. This validates
correct contract composition, not actual private operator authentication.

## Exact source and verification

Latest OS lifecycle code/test SHA:
`d304db51d11f8e4865e9d4dfbd2ceb7e79b7e0f7`.
[OS lifecycle CI 40772532207](https://github.com/aiverse-filmmakers/AI-Verse-OS/actions/runs/40772532207)
and [OS original read-only CI 40772532318](https://github.com/aiverse-filmmakers/AI-Verse-OS/actions/runs/40772532318).
The new stacked PR #111 also has the OS's full original regression
workflows. **Check the conclusion of every relevant run.**
An earlier lifecycle candidate's Ubuntu and Windows jobs passed
but macOS was queued; a previous candidate's Dashboard composed proof
passed before the final immutable-request security update.

Latest Dashboard pinned implementation:
`dff258f709daa5b4cbf4f9dbbd124f48a9076e7a`.
[Dashboard CI 40772577941](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40772577941),
[Chromium 40772577827](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40772577827),
[real Gateway+OS+Data and native grant lifecycle 40772577730](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40772577730).
Progress data last change may have additional checks
[GitHub scorecard workflow 40772577719](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40772577719).
If any run remains queued/failed, state that accurately and do not
award full verification credit.

## Three independent progress indicators

Read `docs/GITHUB-BROWSER-COMPLETION-SCORECARD-2026-10-28.md`
and the machine ledger `docs/github-browser-progress.json`.

- **GB:** **~34/100 provisional** at task start, pending source-by-source
  audit. This owner-grant lifecycle can qualify a small increment in
  the OS authority workstream **only after all exact CI runs are green**.
  A batch of 30 source tasks is NOT 30 engineering points.
- **FA:** **15/100 accepted**, MC2.1/Personal-first independent review
  not completed. Do not silently increment this score.
- **LR:** no fabricated percentage. Native Mac authentication, account
  consent, ACLs, audit retention, installed Gateway model tools, actual
  Data provisioning/backup, signed packaging and dogfood remain.

## Next Task 93

Qualify a **genuine owner-authenticated native Mac session** and durable
owner approval audit receipts before attaching the lifecycle to any
real installation. Investigate the actual OS release/Distribution
and Gateway interfaces first. Avoid adding an "approve=true" escape
hatch or HTTP/mobile request endpoint. If a native issuer cannot be
authenticated independently, leave actual grant issuance unavailable.

Other GB priorities: functional app-context and grouping, real provider
connections/image asset jobs, owner-backed control panels, accessibility
and GitHub-built Mac package. Do not develop a fake stand-in for
canonical Brain, Token, Memory, Automations, Connections or Data APIs.
