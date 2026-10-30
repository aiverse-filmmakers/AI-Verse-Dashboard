# Owner-approved Personal workspace picker

**29 October 2026**. A real source-implemented, CI-tested feature of Dashboard [draft PR #42](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/pull/42). Not installed, signed or accepted on a private user Mac.

## Operator workflow

Run the existing **trusted, interactive** `npm run mc2:local-app` entrypoint with an already approved AI-Verse Gateway and its credentials supplied only in the trusted runtime. Do not paste keys or pairing codes into the browser URL, GitHub or ChatGPT.

Enter the one-time pairing code displayed by the local terminal. In the authenticated Personal screen select **Workspaces**, choose an actual workspace from the already registered OS, then **Request access**. The terminal receives an exact request identifier; it can independently inspect the pending proposal:

```text
:pending
:approve <request-id>
:deny <request-id>
:workspaces
:use film
:use operator
:help
```

The browser cannot approve or deny itself. If the owner denies, the original authorized chat stays active. A successful owner approval **immediately revokes** the old browser cookie and event subscriptions, destroys old in-memory chat DOM and prints a fresh one-time code **only in the trusted terminal**. Re-enter the code to open the authorized workspace. History remains in its respective real Gateway owner, partitioned by system/workspace.

## Implementation and trust boundaries

- **Host authority:** the existing `SystemRegistry`, root generation and OS `getWorkspace()` realpath/device/inode identity. A nominated workspace must still match the captured identity when the terminal approves.
- **Browser:** a same-origin, HttpOnly paired session; `GET /local-app/workspaces` bounded read-only public manifest fields, `POST /local-app/workspace-request` proposal only, `GET /local-app/workspace-request` pending/denied/expired status. No server token, absolute OS path, approval code or privileged filesystem path appears in the browser.
- **Approval:** 90-second pending window, maximum five proposals per pairing, one pending at a time, randomly generated request ID, exact request match in the terminal.
- **Revocation:** new session secret and pairing code after approval. Old cookie and WebSockets invalid; the browser clears its old chat. Async requests are scoped to a client generation, preventing stale catalog or session responses from being painted after logout or workspace change.
- **Catalog scope:** one registered OS only, up to 100 named workspaces plus Personal; terminal owner explicitly opts into exposing the catalog to its authenticated paired browser. Generic `workspace.list` and `system.list` RPC remain denied.
- **Verification:** the real pinned canonical Gateway and disposable workspace `film` complete a new film chat. Its persisted Gateway session list does not include a previous operator session. This is not a fake UI-only selector.

## Source/tests

`apps/gateway/src/local-app-session.ts`, `scripts/mc2/start-connected.ts`, `apps/web/local-app/index.html`, `apps/web/local-app/boot.js`, `apps/web/local-app/shell.css`; `test/local-app-session.test.ts`, `scripts/mc2/ci-canonical-proof.mjs`, `scripts/mc2/ci-authenticated-browser-proof.mjs`.

Source revision `072afb8dfb428b57fce7c8c0d126f029d887a7df`. Dashboard CI 40960567285, browser QC 40960567514, real Gateway composition 40960567259, progress CI 40960567232, all successful.

## Missing acceptance gates

This is a **browser interface served by an authorized local host**, not an operating-system-native signed desktop dialog. It requires terminal confirmation, not an on-screen native owner login. There are no durable permission grants/audit receipts yet; private Mac signing, installation and production account/provider authentication are unverified. No multi-system fleet management is implied. The in-flight current PR remains draft.
