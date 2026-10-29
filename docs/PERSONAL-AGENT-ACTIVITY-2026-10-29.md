# Personal Agent Activity: bounded local runtime monitor

**29 October 2026.** Source in Dashboard draft PR #42, not deployed to a private Mac.

## Functional scope

Open **Agent activity** from the host-authenticated Personal Chat toolbar. The panel makes one exact-scope `operator.activity` query through the paired, HttpOnly browser session. It reads the *existing Dashboard-local* `SessionStore` through `QueryRouter`: most recent 12 session statuses/counts and most recent 12 timeline event kinds/roles/dates. It supports Refresh activity and local All events, Tool calls and Errors filters. It does **not** create or alter tasks/runs, and the filter is not a hidden server query.

Every response contains `source=dashboard-local-sessions`, `retention=in-memory-only`, the exact selected system/workspace, and a bounded partial page. It never returns session IDs, user/agent text, titles, file refs, model names, provider credentials, raw local paths, debug metadata, or a system/workspace list. The UI shape parser strips unknown fields and displays only canonical enumerations. The real owner is optional; missing SessionStore returns `SESSIONS_UNAVAILABLE`, not false empty/healthy data.

Named workspace reads first pass the canonical OS manifest/realpath verification; the implicit operator scope verifies the registered authorized OS root. Paired browser frames must match the pre-authorized system/workspace and one explicitly listed method. In-flight requests are discarded on retarget/close/refresh, including A→B→A.

## Evidence

- Source: `packages/protocol/src/methods.ts`, `apps/gateway/src/query-router.ts`, `apps/gateway/src/local-app-session.ts`, `apps/web/src/personal-agent-activity.ts`, `apps/web/src/personal-chat-ui.ts`.
- Unit negative/regression tests: `test/personal-agent-activity.test.ts`, `test/local-app-session.test.ts`, `test/protocol.test.ts`.
- Chromium integration: `scripts/mc2/ci-authenticated-browser-proof.mjs`, authentic paired browser + real pinned canonical Gateway + actual local SessionStore.
- Exact source `9e9930805800482a843cee4ea95ee83a73cc4193`, Dashboard CI 40878839555, Chromium 40878839278, real Gateway composition 40878839529, progress 40878839235, all successful.

## Limitations and next owner gates

This source does **not** expose the real persisted canonical Gateway bot fleet or run logs. The Dashboard-local SessionStore is ephemeral and may not be attached in a normal installation. No model/provider inference or remote automation status can be inferred from its lack of records. Real native owner auth, grant and approval lifecycle, persistent agent/read-only projections, multi-workspace navigation, privileged action controls, signed desktop delivery and private Mac acceptance remain pending.


## Persistent canonical Gateway activity increment

A second independent source in the same **Agent activity** panel reads **real persisted canonical Gateway** session and run history using pre-existing scoped host-authenticated `aiverse.gateway.session.list` and `aiverse.gateway.session.runs`. It requests at most three recent sessions and three recent runs for each of the two newest sessions. No run text, model output, prompts, tokens, session IDs or file refs are displayed. Status and date are validated and restricted to safe public fields. The local in-memory store may be unavailable while the persisted Gateway section remains usable, and vice versa. A change in system/workspace discards both pending sources.

Source: `apps/web/src/personal-agent-activity.ts`. Browser proof: `scripts/mc2/ci-authenticated-browser-proof.mjs`. Source commit `93397cad32e709b27115ef853fc2d8de3cd4cb6c`, verified later in source head `7fb93973766964a3c8cf98a73a5af47cb24607e2`: Dashboard CI [40880147089](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147089), browser QC [40880147102](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147102), real Gateway [40880147101](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40880147101), all passed.

The OS read-adapter also now refuses symlinked WORKSPACE.yaml and symlinked directory aliases, and rejects mismatched manifest directory IDs during workspace listing. This prevents a private external manifest from being advertised as a selectable workspace. Tests in `test/read-adapters.test.ts` pass all three platforms.

This expands useful real Control Center source work but **does not** install a native owner session, implement agent commands, make the Gateway always available or complete G06.2.
