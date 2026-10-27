# Local creative-shell MVP

Buildless design preview. No dependencies, install or network services required beyond a loopback static server. Serve **only this directory**, never the OS root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory apps/web/preview
```

Open http://127.0.0.1:4173 . Stop with Ctrl+C. It also opens directly as index.html in browsers allowing local module scripts, but HTTP is the supported preview path.

This is sample-data design work, not connected product acceptance. `DESIGN.md` records scope and visual decisions. All browser data uses the isolated `aiverse-design-preview-v1` key on the preview origin. No fetch, model call, telemetry, credential, direct OS write or external script runs. Links open only on explicit click. Image import is PNG/JPEG/WebP under1.5MB. Browser storage may fill; the info dialog exports preview data. No import/reset overwrite flow is included.

Try “Start a film project called The Mountain Within” in chat, then apply the proposal. This is a deterministic demonstration, visibly labelled, not AI. Chat does not claim to perform general work. Real routing requires the canonical Gateway adapter and owner checks in the existing implementation plan.


## Resume remotely

See [remote development checkpoint](../../../docs/REMOTE-DEVELOPMENT-CHECKPOINT-2026-10-27.md). The gallery is at `/inspiration/` on the same static server. Open a gallery image and use Left/Right arrows to move between pictures; Escape closes it. Third-party screenshot attribution is in [inspiration/SOURCES.md](inspiration/SOURCES.md).

Known mismatch with the new plan: this saved prototype still hides chat in focus mode and uses a mobile drawer. Always-present chat is a requirement for the next iteration, not already implemented. No real sign-in or AI connection is wired here.
