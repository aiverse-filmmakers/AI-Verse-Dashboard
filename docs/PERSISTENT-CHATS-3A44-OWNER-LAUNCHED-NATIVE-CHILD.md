# Phase 3A.44: native XPC host retains a real child subprocess

**CI-only, no capture.** Exact tested Dashboard code head:
`faab75af2e792f0d5e23d3e4ff88e4041742b841`.

Previous real XPC tests bound a session lease to the **XPC owner's own PID**,
not to a child process it owned. In this phase the disposable
`AIVerseActualXPCOwner` process itself launches a distinct silent
`/bin/sleep` process through `NSTask` and retains its OS-managed
process handle and launch generation. This is **not** the installed
Dashboard and is **not** Codex. It reads no stdout, chat content or
provider credentials.

`native-macos-codex-child-owner.{h,m}` rechecks the live child,
actual PID, launch generation and the workspace's original device/inode.
The real `NSXPCConnection` exchanges only a synthetic
`CAPTURE_DISABLED` probe while the parent-owned subprocess is alive.
The test rejects parent-PID substitution, stale child generation,
symlinked workspace names and post-exit owner claims. A replacement child
has a new generation even if the OS reuses a PID.

[Apple macOS owner/XPC CI](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42897113015)
**PASS** on that exact tested code head. The same head passed
[Dashboard CI](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42897112925),
[real Codex offline](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42897113031),
[native-owner browser](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42897113065)
and [Personal Chat QC](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42897112971).

**Limits:** The owned child is a harmless test subprocess and does not
provide the Codex App Server's original-event provenance. No Developer
ID-signed installed application, interactive operator authentication,
recording consent, writer, archive, history import or Memory integration
has been enabled. Both primary PRs remain draft and unmerged.
