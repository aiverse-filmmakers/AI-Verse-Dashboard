# G02.4 canonical asset and attachment admission contract

**30 October 2026 | Task 648 | Design/owner dependency only, not a shipped attachment feature**

## Why this is the next planned integration

The [fixed 40-milestone plan](github-chapters-milestones.json) places **Attachments, commands and Skills in real chat** in G02.4. The user-click, Data-reread saved Canvas text insert is already implemented in the Dashboard. That is a trusted *text reference* and **not** a binary attachment or a Skill invocation.

Owner source verification, 30 October 2026:

- [AI-Verse Data](https://github.com/aiverse-filmmakers/AI-Verse-Data), `package.json`, `README.md`, and `docs/PROTOCOL-V0.1.md`: structured records, relations, schema-level `attachment_ref` values and backup/export artifacts exist. These do **not** establish a general user-facing, content-addressed binary ingestion/read API or a chat-ready, scope-checked media grant. A backup artifact is not a chat image attachment. Treating a reference field as proof of bytes or authorization would be incorrect.
- [Canonical Gateway](https://github.com/aiverse-filmmakers/AI-Verse-Gateway), `src/server.mjs:455`: `validateMessages()` currently admits only supported roles and **string or null** `content`. `src/runtime.mjs` runs those messages through existing runtime adapters. Gateway does not currently have a canonical binary asset reference/admission contract, a media-capability catalog or a verified multimodal run binding.
- [AI-Verse OS](https://github.com/aiverse-filmmakers/AI-Verse-OS) owns effective workspace scope, host authorization and permission floors; [AI-Verse Skills](https://github.com/aiverse-filmmakers/AI-Verse-Skills) owns pinned Skill generations/readiness, **not** permission to run them. The Dashboard cannot create missing owner authority by adding an upload control.

The Dashboard may only expose an attachment workflow **after** the owning components implement and approve the following contract. Do not add localStorage blobs, arbitrary host file reads, untrusted URLs, base64 images in chat text, inert paperclip placeholders or raw credential forwarding.

## Owner-owned contract to approve and implement

### A. Asset ingestion and immutable identity (Data and OS owners)

The owner must provide an explicit, versioned API that accepts an operator-authorized local upload and returns an opaque **asset ID + immutable generation/version**, bound to authenticated owner identity, OS system, exact workspace and a verified content digest. The owning Data service, not Dashboard, determines storage location, content identity and access.

Minimum checks: declared MIME versus independently inspected content; extension mismatch; reasonable byte ceiling by MIME; compressed/decompression bombs; image pixels/dimensions; symlink/traversal/absolute-path denial; archive handling; malware policy; empty/truncated content; hash mismatch; filesystem ownership; repeated upload idempotency; interrupted/staged upload cleanup; cross-workspace reuse denial; revocation and deletion/tombstone semantics. Metadata-only reference is never counted as a stored asset.

An ingestion receipt must identify **exact source, digest, size, validated MIME, immutable version, scope and readiness** without returning native paths, bucket URLs, private credentials or arbitrary model-visible bytes.

### B. Model input admission (Gateway and Connections owners)

Gateway must accept **only an owner-issued, scoped asset receipt**, not client-supplied raw filesystem paths, direct URLs or unverified provider file IDs. On run creation, Gateway resolves the current asset generation and consent, verifies OS workspace authorization and provider/model modality permission via Connections, and checks the requested input against the selected runtime's actual supported modalities.

The committed Gateway run and idempotency record must immutably bind the admitted asset receipts and the execution policy. Revocation after UI selection but before dispatch must deny admission. Unsupported multimodal runtime must fail with an explicit `ATTACHMENT_MODALITY_UNAVAILABLE`, not silently describe an image as text or route through a different paid model. No claim of provider support may come from an external public catalog or browser capability guess.

### C. Browser UX only after A and B

When the above APIs exist and are approved, Dashboard can implement an **explicit user-initiated selection / upload**, display the owner receipt's filename/MIME/status, allow removal before Send, and include exact opaque admitted IDs in a typed canonical Gateway run call. It must not send bytes, automatically submit the run, store duplicates in the browser, infer model ability from a file extension or carry pending selection across workspace/root rotation.

For restart and history, the Dashboard must fetch the original Gateway run's authorized asset summaries, not rebuild its own attachment database. Fallback with unavailable owner APIs: a clear unsupported state and the existing reviewed saved-Canvas-text reference.

### D. Skills and commands remain a separate owner contract

A visible Skill or command requires a **pinned and ready generation from Skills** plus a *separate* OS-granted execution scope and Gateway enforcement at dispatch. A package being installed is not operator permission. Run approval and execution receipts must be governed by the actual owners, not browser parameters or a generic `execute` RPC. This work is distinct from binary attachment admission and does not become complete when text references are supported.

## Gate for genuine implementation and a future score increment

Before a claim of real binary attachments, owner-backed integration acceptance must demonstrate:

1. A real Data-owned upload/asset receipt persists and can be re-read in the same authenticated workspace with exact digest and immutable generation.
2. The canonical Gateway submits that asset only to an explicitly authorized *multimodal-capable* runtime; confirmed model execution uses the **actual bytes**, not a filename or text surrogate.
3. Forged asset IDs/generations, foreign workspace/principal, revoked approval, stale root generation, malformed MIME, oversized input, private path, unsafe URL and unsupported provider model all fail before dispatch.
4. Retry/idempotency cannot duplicate upload or billable inference, even after network interruption.
5. Browser, diagnostics, history and logs expose only approved metadata, not private asset paths, credentials or raw content.
6. Full deterministic CI and **real native owner acceptance** both pass, with positive and negative tests. Synthetic browser fixture alone is not accepted as a production-ready attachment.

**Decision:** G02.4 remains **in progress**. Existing Canvas note insertion is the only text-reference capability. Binary attachment implementation is **blocked by owner contracts**, and the 12/15 target is **not** a reason to bypass them. At this checkpoint the provisional Chat engineering score remains **11/15**, overall GitHub/browser **47/100**, formally accepted **15/100**.

**Task 649 when the owner schema is approved:** implement only the exact approved Data/Gateway bridge methods, then test the full admission chain. Otherwise proceed with the next already-defined milestone whose owner contracts actually exist; do not invent a new milestone.
