# Development Tasks 520–548: Owner-approved graphical workspace manager

**29 October 2026**. Dashboard draft [PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42), branch `codex/dashboard-source-checkpoint`. This batch contains **29 small source, integration, security, regression and handoff slices** across one substantial functional product increment. A task slice is not an independent feature or roadmap percentage.

- **520:** Verify previous Task 519 source and all four exact GitHub CI checks.
- **521:** Audit real local Personal UI, canonical Gateway transport and OS registry before changing auth.
- **522:** Keep general browser `workspace.list`, `system.list`, raw source and global scope changes prohibited.
- **523:** Add trusted-host opt-in `setWorkspaceRequestListener`, absent by default.
- **524:** Add a narrow, authenticated host-owned `GET /local-app/workspaces` returning actual canonical OS manifest metadata only.
- **525:** Bound catalog to at most 100 named workspaces plus the implicit operator context, with no OS roots.
- **526:** Add a read-only paired `GET /local-app/workspace-request` status with no approval authority.
- **527:** Add exact-origin and existing HttpOnly-cookie admission to `POST /local-app/workspace-request`.
- **528:** Require a tiny strict one-key JSON request, canonical workspace slug and real OS manifest identity.
- **529:** Enforce one pending proposal, 90-second TTL, five requests per browser pairing and unpredictable 16-hex request identifiers.
- **530:** Add owner-only `approveWorkspaceRequest`, requiring exact current matching request ID and renewed workspace identity verification.
- **531:** Add owner-only `denyWorkspaceRequest`, preserving previously authorized browser scope.
- **532:** Reuse reviewed `rotateWorkspaceFromHost` for approved re-pair, cookie and browser socket revocation.
- **533:** Wire trusted terminal commands `:approve <id>` and `:deny <id>`; browser never receives code or bearer.
- **534:** Add terminal `:pending` to recover missed request notice and show current state.
- **535:** Build a real first-party accessible **Workspaces** panel with OS-derived select and clear owner-approval disclosure.
- **536:** Add request submission, pending status, denial and expiry states, loading/unavailable cases.
- **537:** Preserve an already pending request across closing/reopening the chooser; do not fabricate selection changes.
- **538:** Fence stale catalog/request response and current session checks across scope rotations and logout.
- **539:** Test opt-in host gating: unpaired or unconfigured requests cannot discover catalog or request access.
- **540:** Test actual paired localhost catalog, request creation, pending status and typed denial.
- **541:** Test forged request IDs, JSON extra keys, wrong Origin, missing, same-current and traversal workspaces.
- **542:** Test request limit and terminal decision replay protection.
- **543:** Test fresh browser pairing after real owner approval and new film-only RPC scope, with generic browser workspace listing denied.
- **544:** Extend pinned canonical Gateway OS fixture with genuine `film/WORKSPACE.yaml`, not a synthetic UI-only workspace.
- **545:** Exercise real Chromium Workspaces picker, owner denial, approval and retained vs revoked DOM behavior.
- **546:** Prove real post-switch canonical Gateway run executes in film with no inherited Personal conversation turns.
- **547:** Fetch actual Gateway film session history, match exact canonical film session ID, ensure earlier operator session excluded.
- **548:** Save code evidence, owner runbook, scorecard and handoff; reconcile fixed 10-chapter/40-milestone ledger without inflating formal acceptance.

## Verified source

The final functional source revision is `072afb8dfb428b57fce7c8c0d126f029d887a7df`.

- [Dashboard CI: Node 22 Linux/macOS/Windows #40960567285](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567285): success.
- [Chromium interaction QC #40960567514](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567514): success.
- [Pinned real canonical Gateway composition #40960567259](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567259): success.
- [Progress and milestone integrity #40960567232](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/40960567232): success.

**Scope:** one real OS registered by trusted host; browser holds only exact paired cookie, OS workspace proposal and public OS metadata. **No direct browser permission grant.** The terminal must authorize every proposal; approval revokes old cookies, sockets and chat UI, and issues a new private one-time pairing code. The named film workspace was created in a disposable CI OS, and chat successfully executed through the pinned canonical Gateway with isolated history.

**Not yet done:** native owner identity/login, durable/audited grants/permissions, signed app packaging, user Mac installation, all-system workspace fleet, agent controls/approvals/tasks, production provider sign-in.

**Progress:** 44/100 provisional GitHub/browser engineering (up +2 for complete functional owner-approved graphical workflow and real Gateway scope isolation); **15/100 formal acceptance unchanged**; fixed 10 chapters/40 milestones, 4 verified, 8 draft implemented, 4 in progress, 24 planned.

**Next Task 549**: reconcile native owner grant/consent and task approval interfaces or work on a different unimplemented source-owned capability, keeping workspace authority and the explicit browser allowlist stable.
