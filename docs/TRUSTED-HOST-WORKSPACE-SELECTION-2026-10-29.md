# Trusted local host workspace selection

**29 October 2026.** Owner-authorized source in Dashboard draft PR #42, not yet installed/signed on a private Mac. No browser method can independently change its system/workspace.

## How the reviewed local host works

The already available `npm run mc2:local-app` launcher relies on an already authorized local canonical AI-Verse Gateway: `AIVERSE_GATEWAY_HOME` for its owned config, `AIVERSE_GATEWAY_URL` (loopback by default), and `AIVERSE_GATEWAY_TOKEN` supplied privately in the terminal runtime. The launcher is intentionally interactive and refuses headless/CI pipes for Personal UI. **Do not put credentials or pairing codes in a command argument, browser URL, GitHub commit, chat message or log.**

After gateway preflight, the private terminal prints the local app URL and a one-time pairing code. Enter it into the local browser. The same trusted terminal supports:

```text
:workspaces
:use film
:use operator
:help
```

`:workspaces` uses `listWorkspaces(registry, systemId)` on the already registered OS. `:use` validates the named workspace manifest through `getWorkspace`. It does not enumerate or select other registered systems, create workspaces, edit manifests or modify the canonical Gateway.

Successful `:use` immediately invalidates the previous browser HttpOnly session, closes tracked WebSockets, rotates the cryptographic pairing code/token and requires the user to reload the browser and enter the newly displayed one-time terminal code. If a requested workspace does not exist or its OS manifest is invalid, the host prints a generic denial and leaves the valid old pairing intact. The browser cannot call a workspace-switch endpoint or see the host's code or original OS root.

The browser checks the local paired session while connected and when foregrounded. On invalidation it destroys its old in-memory chat UI instead of continuing to show messages from a previously authorized workspace. Old canonical Gateway conversations remain with their owner, not in browser storage.

## Authority and security

- **Owner:** trusted local TTY host with injected `SystemRegistry`; same selected system only.
- **OS scope:** pinned registered root and generation, selected workspace realpath/device/inode; no root/path from browser.
- **Network:** exact same-origin local pair, HttpOnly SameSite=Strict cookie; no bearer export.
- **Revocation:** old session cookies and active WebSocket event streams revoked; every browser run stream checks current active lease before forwarding.
- **Recovery:** explicit host re-pairing is required after every switch, including selecting the same workspace.
- **No false claims:** this is host-controlled workspace switching, not native account login, a graphical workspace library/picker, multi-system migration, owner-consent workflow, release signing or production desktop deployment.

## Evidence

Exact code `4c269f411ee0990e8a784f6542c1f2c13da3283e`. Dashboard CI 40886502087, Chromium QC 40886502368, pinned real canonical Gateway/OS/Data composition 40886502198, progress 40886502307: **all success**. The canonical Gateway fixture is disposable and deterministic, not the real user's machine or provider account.

## Next owner gates

A production native host needs reviewed graphical workspace selection, explicit owner confirmation and grant approval, persistence/recovery, audit, app packaging/signing and private Mac acceptance. Preserve the host-only authority and explicit method allowlist until the UI has an owner-authenticated approval path.
