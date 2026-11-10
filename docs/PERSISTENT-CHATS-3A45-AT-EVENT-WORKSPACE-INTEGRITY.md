# Phase 3A.45: native child and physical scope rechecked at each event

**CI-only, no capture.** Exact tested Dashboard source:
`faab75af2e792f0d5e23d3e4ff88e4041742b841`.

`native-macos-workspace-event-fence.{h,m}` composes the directly
parent-owned silent test child from Phase 3A.44 and the existing native
XPC lease fence. Each synthetic denied-only observation must match:

- The original host-owned child **process PID** and launch **generation**
- The currently running `NSTask` parent-owned handle
- The exact workspace ID, caller session UUID and current XPC lease epoch
- The original physical workspace's canonical path, device/inode, owner
  and non-group/world-writable permission bits

A mismatch immediately revokes the active observation epoch. The Apple
CI test intentionally changes a workspace directory to mode 0777,
restores it, and proves that the previous epoch stays invalid. It then
replaces the directory with a different inode at the **same path**,
restores the original and again proves that the old epoch cannot revive.
The test also stops and relaunches the child and rejects the previous
generation. None of these checks reads conversation text.

[Apple native-workspace/XPC acceptance](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42897113015)
**PASS** on exact code head above.

**Important boundary:** This validates disposable local **filesystem
ownership**, not OS Workspace Registry authorization, actual current
Codex subprocess/event attribution, device-owner auth, recording consent,
or access rights to production chat. `recordingAuthorized` and
`memoryAuthorized` always return false. The CI fixture is never
bundled into the production Node/Gateway release.
