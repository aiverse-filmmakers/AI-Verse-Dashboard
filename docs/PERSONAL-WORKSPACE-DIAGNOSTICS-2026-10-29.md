# Personal Workspace Diagnostics: real owner and registry projections

**29 October 2026.** Dashboard draft PR #42.
**Milestone:** G06.1, systems/workspaces/Gateway health and diagnostics,
**in progress**, not complete.

## First-party UI

In the native-host-authenticated Personal Chat toolbar choose
**Workspace status**. The panel is implemented in
`apps/web/src/personal-diagnostics.ts` and
`apps/web/src/personal-chat-ui.ts`. It does **not** run in the
public GitHub Pages preview. It uses the same source-bundled authenticated
localhost `DashboardClient`, not direct SQLite, OS file reads, model
credentials or a second auth/login mechanism.

The panel loads four independent live read-only sources and always
identifies the currently host-bound system/workspace:

1. **Registered OS:** `system.get` returns the public `SystemRegistry`
   entry for the exact paired system. Display authorized/unauthorized,
   label/type/version, never a root or root identity.
2. **Canonical Gateway:** `aiverse.gateway.status` authenticates a
   real Gateway preflight; capability booleans are reported literally.
   **Status does not prove inference succeeded**, and provider selection
   is not fabricated.
3. **Canvas Data:** `aiverse.canvas.list(limit=25)` gets a bounded
   canonical Data owner list. A missing grant/owner shows
   **unavailable** rather than synthetic Canvas records. Count is
   explicitly a *page*, not a lifetime total; no document titles or
   content are rendered into diagnostics.
4. **Conversation library:** `aiverse.gateway.session.list(5,0)`
   reports up to 5 actual scoped recent sessions and `has_more`.
   No session IDs, prompts or private reply text are shown.

All results validate owner/source identity and exact scope.
They use textContent, not HTML interpolation or model output.
A→B→A selection changes, close, refresh or destroy invalidate
pending responses using request epochs, so old workspace data
cannot render after a retarget. Manual refresh works with
independent `Promise.allSettled` results, so an unavailable
Data owner never masks an available Gateway or OS system.

## Narrow local pairing change

The trusted `LocalApplicationSession.isAllowedFrame` adds only
**`system.get`** for the EXACT already-paired
`systemId+workspaceId`. It does not allow `system.list`,
`workspace.list`, any other system/workspace, arbitrary
roots, source preview or owner write actions.
The public registry projection strips root, root identity,
internal architecture and identity drift internals.
A browser still has only an HttpOnly scoped session cookie,
never the Dashboard or canonical Gateway bearer.

## Test evidence and limitations

- `test/personal-diagnostics.test.ts`: pure projection and
  forged/wrong-source/wrong-workspace/oversize/canonical-count
  regression tests.
- `test/local-app-session.test.ts`: actual localhost paired cookie
  allows only own `system.get`, denies other systems/workspaces,
  broad listing and private root export.
- `scripts/mc2/ci-authenticated-browser-proof.mjs`: real pinned
  canonical Gateway + actual Playwright Chromium pairing.
  It opens the Workspace status panel, checks registered OS and
  Gateway/history available, observes missing Canvas owner as
  unavailable, refreshes with the same authenticated scope,
  and asserts no authorization bearer was sent in browser RPC.
- The separate `scripts/mc2/ci-canvas-data-owner-proof.mjs`
  already proves the actual owner-backed Canvas RPC against
  a disposable scoped Data SQLite installation. This panel
  never synthesizes Canvas owner state from its own UI.

**Release gaps:** A native Mac operator login, installation
and consent; registered multiple-system selection; real
workspace switch/lifecycle policy; full OS/Gateway diagnostics,
provider status, logs and network retry; private owner dogfood;
independent PR acceptance. G06.1 therefore stays
**in-progress**, and the official formal MC acceptance remains
15/100. The new engineering GB point, if any, must be
qualified by exact CI and scorecard review, not number of tests.
