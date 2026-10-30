# Development Tasks 496–519: Trusted host OS workspace selection

**29 October 2026.** Dashboard draft [PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), source branch `codex/dashboard-source-checkpoint`. These 24 items are deliberately small source/test/documentation slices comprising one real host-controlled workspace lifecycle package, not 24 product features.

- **496**: Verify previous Task 495 checkpoint and exact CI success before modifying the branch.
- **497**: Inspect actual production-intent `mc2:local-app` TTY launch and Gateway-approved OS root authority.
- **498**: Trace scope and permission boundaries through HttpOnly local session, HTTP RPC, WebSocket and Canonical Gateway.
- **499**: Bind host session to an injected authorized canonical `SystemRegistry`, never a browser-provided OS root.
- **500**: Capture registered root identity and binding generation when host authorizes its initial scope.
- **501**: Expose TTY-only `:workspaces` catalog from the existing OS-owned manifest reader.
- **502**: Expose TTY-only `:use <workspace-id>`, `:use operator`, `:help` with no HTTP switch endpoint.
- **503**: Validate the requested named workspace with canonical OS manifest and realpath checks before any state change.
- **504**: Deny invalid or missing workspace selections without revoking the old valid pairing.
- **505**: Atomically revoke all old session cookies and WebSocket subscriptions during approved host rotation.
- **506**: Issue new cryptographic one-time pairing code, session token, born-at timestamp and rate-limit budget.
- **507**: Deny stale pairing-code replay and old cookie use across operator and film workspace boundaries.
- **508**: Preserve the current system ID while changing workspace; reject broad browser `workspace.list` and unreviewed switch commands.
- **509**: Implement browser-side session watch that clears all private chat DOM on host revocation without localStorage.
- **510**: Recheck host session immediately when the browser regains focus or visibility.
- **511**: Add genuine localhost cookie+WebSocket tests for operator→film→operator, new codes, new cookies, and old socket closure.
- **512**: Assert typed canonical OS adapter errors rather than incorrectly matching error text.
- **513**: Add full real Gateway + paired Chromium browser proof: host rotation clears recovered private turns and new pairing resumes without restoring browser state.
- **514**: Defensively copy the caller-provided scope on session creation so mutable external objects cannot silently change browser permissions.
- **515**: Pin selected OS workspace realpath, device and inode, and revalidate manifest/root identity for each authenticated session.
- **516**: Treat root registry generation changes or replaced manifests as stale leases, requiring explicit new host approval.
- **517**: Require a still-active exact workspace lease for browser run subscriptions and before forwarding each canonical Gateway event.
- **518**: Run Node 22 Linux/macOS/Windows CI, native security suite, Chromium QC, real canonical Gateway composition and progress integrity on exact source revision.
- **519**: Save canonical owner runbook, progress/limitations, fixed milestone ledger and source+CI handoff for next Task 520.

## Actual source

- `apps/gateway/src/local-app-session.ts`: host-only `rotateWorkspaceFromHost`, strict registry/manifest identity, session secret rotation, revoked browsers.
- `scripts/mc2/start-connected.ts`: interactive trusted TTY commands and private one-time code delivery.
- `apps/web/local-app/boot.js`: automatic old-chat destruction on expired/changed host session.
- `apps/gateway/src/server.ts`: stream lease checks on subscription and per emitted event.
- `test/local-app-session.test.ts`: paired HTTP, cookie, WebSocket, OS root identity, stale/mutated scope and invalid selection regressions.
- `scripts/mc2/ci-authenticated-browser-proof.mjs`: real Chromium and canonical Gateway proof with actual host rotation/re-pair.

**Verified exact implementation commit:** `4c269f411ee0990e8a784f6542c1f2c13da3283e`.
- [Dashboard CI 40886502087](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502087), Linux/macOS/Windows success.
- [Browser QC 40886502368](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502368), success.
- [Real canonical Gateway composition 40886502198](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502198), success.
- [Progress integrity 40886502307](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40886502307), success.

**Engineering GB ~42/100 provisional**, +1 Control Center source-backed capability. **Formal MC roadmap acceptance FA 15/100** unchanged. Fixed 10 chapters/40 milestones: 4 verified, 8 implemented draft, 4 in progress (G03.4, G06.1, G06.2, G08.2), 24 planned. Native private Mac acceptance remains unscored.

**Next Task 520**: verify the latest head CI and advance genuine owner-approved in-app workspace selection/grant approval and revocation controls, or continue canonical Gateway agent jobs, not fake mock UI. The current interactive TTY workspace selection is real but not a production-grade native graphical workspace manager.
