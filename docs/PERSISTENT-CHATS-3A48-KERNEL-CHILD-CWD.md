# Persistent Chats 3A.48: verify actual native child cwd via macOS kernel

**Result: PASS on exact Dashboard source commit**
`0b1c67c7a3cae8bc0627cb77e2c41f13d73ae5b8`.
[Apple CI log](https://github.com/aiverse-filmmakers/AI-Verse-Dashboard/actions/runs/42899963616).

## Finding and fix

Phase 3A.44 validated the host's on-disk workspace, but the test
subprocess did not explicitly set its working directory. Its actual
kernel-level cwd could therefore differ from the claimed workspace.
This was a meaningful gap in the process-ownership proof.

`native-macos-codex-child-owner.m` now:

- Launches the child using `NSTask.currentDirectoryURL` set to the
  canonical, owner-controlled workspace.
- Uses Apple's `proc_pidinfo(PROC_PIDTBSDINFO)` to verify the child's
  kernel-reported PID, real parent PID and owning UID.
- Uses `proc_pidinfo(PROC_PIDVNODEPATHINFO)` to compare the child's
  **kernel-reported cwd device, inode and canonical path** to the original
  physical workspace identity. Missing or denied kernel information
  fails closed.
- Rechecks the exact live `NSTask`, child PID, host-owned generation
  and physical cwd for each synthetic XPC observation.
- Explicitly terminates child processes with a bounded grace period,
  falling back to SIGKILL, then reaps the child.

The actual macOS SDK exposes the cwd inode via
`struct vinfo_stat` in `proc_vnodepathinfo`. An initial CI compile
identified a different structure name; this was fixed and retested.

**Privacy:** This only inspects a disposable child and workspace.
No real messages or Codex protocol records were read or saved.
The class remains a CI fixture, not a production process identity issuer.

Reference: [Apple XNU proc info tests](https://www.newosxbook.com/src.php?file=%2Ftests%2Fproc_info.c&tree=xnu).

No recording, archives, Memory or history import were enabled. Both
primary PRs remain draft and unmerged.
