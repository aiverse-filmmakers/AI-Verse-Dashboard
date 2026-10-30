# Development Tasks 555–573: Canonical model inventory and resilient Chat reconnection

**30 October 2026.** Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), branch `codex/dashboard-source-checkpoint`. This batch implements two distinct user-visible host-authenticated Chat capabilities and their positive/negative tests. Not a user-Mac installation, paid provider sign-in or a working physical model selector.

## Development slices

- **555:** Inspect current canonical Gateway `/v1/models`, `/status`, runtime model authority, Dashboard host, Connections and Token boundaries. Confirm `aiverse` is the *only advertised virtual Gateway model*. Do not infer physical model choices.
- **556:** Register `aiverse.gateway.models` as an explicit read-only, workspace-scoped Dashboard protocol method.
- **557:** Admit the method to the exact paired-browser method allowlist, preserving all arbitrary provider/control prohibitions.
- **558:** Implement strict host-owned parameter-free model inventory projection through actual authenticated Gateway preflight.
- **559:** Bound runtime metadata and advertise switching/inference truthfully unavailable.
- **560:** Add typed client method through existing Dashboard-local `/rpc`, never direct browser-to-Gateway credentials.
- **561:** Create first-party `AI models` status panel with live authenticated data rather than sample model choices.
- **562:** Add refresh, source provenance, unavailable states, workspace retarget fences and teardown.
- **563:** Style accessible model-information controls and mobile toolbar layout.
- **564:** Unit-test parser denial of fake provider identities, false switching/inference claims, wrong workspaces and unsafe metadata.
- **565:** Add authenticated synthetic Gateway + wrong-origin/parameter rejection and exact local-session allowlist tests.
- **566:** Verify the same inventory against the pinned real canonical Gateway in disposable composition CI.
- **567:** Add `PersonalChatRunController.reconnect()` for interrupted **known** run IDs using canonical `run.get` and SSE replay; do not issue a second run.
- **568:** Add a real Chat `Reconnect run` control distinct from uncertain-create `Retry request`.
- **569:** Clear speculative stream fragments before reconnection and replace them only with canonical terminal output or fresh events.
- **570:** Dispose broken stream subscriptions on interruption.
- **571:** Fence each stream generation, including old callbacks delivered after WebSocket closure or after reconnect.
- **572:** Test running and already-completed canonical reconciliation, one run-create only, stale callbacks and a physically dropped browser WebSocket.
- **573:** Verify full Node 22 cross-platform, Chromium, real Gateway and progress CI; reconcile category/milestone score without treating tests as acceptance.

## Exact source verification

Functional head: `e94b2fbb7c4d7494525c55e8711a43cc6d167956`.

- [Dashboard Node22 CI Linux/macOS/Windows 40977323923](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323923): **success**.
- [Chromium browser interaction 40977323908](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323908): **success**.
- [Pinned canonical Gateway composition 40977323926](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323926): **success**.
- [Progress/milestone integrity 40977323901](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40977323901): **success**.

Earlier commits temporarily failed due to two **real** stream-lifecycle bugs caught by tests: lingering listener disposal and late obsolete event projection. Both were repaired. Report only the above final verified functional head as passing.

## Scope and scoring

This source-backed partial G02.3 increment includes truthful canonical model discovery, not actual physical provider/model switching, and separately improves G02.2 with a user-facing replay-safe reconnect. **Provisional Chat + Gateway 9/15** (previously 8/15) and **GitHub/browser 45/100** (previously 44/100). This is a rounded workstream engineering estimate, not a new formal acceptance. **Formal MC0+MC1 acceptance stays 15/100**. G02.3 changes from *planned* to *in-progress* only, G02.2 remains implemented in draft. 10 chapters and 40 milestones stay fixed: 4 verified, 8 implemented draft, 5 in progress and 23 planned.

## Next Task 574 and actual blockers

**574:** design and implement a host-authorized real provider/model choice contract only after the canonical Gateway and Connections owners expose approved choices, precise credential/consent semantics and per-run model validation. Until that contract exists, the current `aiverse` virtual model is the only safe browser option; never pass arbitrary model strings or provider keys to canonical run creation.

Safe independent follow-up while waiting for that owner contract: provider-model capability preflight tests, bounded run-control reconciliation/stop safety, uploaded attachment admission through the canonical Data/asset owner and OS-approved Skills/commands. Native production owner session, provider account authorization, signed Mac app and private Mac dogfood remain unaccepted. No upstream owner repository was changed in this batch. The Dashboard PR remains draft/unmerged.
