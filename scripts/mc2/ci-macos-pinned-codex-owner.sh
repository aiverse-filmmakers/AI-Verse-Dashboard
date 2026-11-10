#!/usr/bin/env bash
# 3A.49: official, immutable macOS Codex 0.167.0, native parent-owned XPC
# acceptance with no original events, model requests, credentials or storage.
set -euo pipefail
test "$(uname -s)" = "Darwin"
test "${CI:-}" = "true"
test "${AIVERSE_MACOS_ACTUAL_XPC_CI:-}" = "1"
test -z "${OPENAI_API_KEY:-}"
test -z "${CODEX_API_KEY:-}"
test -z "${GITHUB_TOKEN:-}"
test -z "${AIVERSE_GATEWAY_TOKEN:-}"
test -n "${RUNNER_TEMP:-}"

# Exact first-party release tags and SHA-256 digests verified against
# https://api.github.com/repos/openai/codex/releases/tags/rust-v0.167.0
# This intentionally follows the *already pinned* Dashboard/OS test release.
case "$(uname -m)" in
  arm64)
    ASSET="codex-aarch64-apple-darwin.tar.gz"
    SIZE=108379331
    SHA="4b22a2a971be2791c3e31f912f3e77a88ebd64a65812a7289ccba65dd6425fe9"
    EXECUTABLE="codex-aarch64-apple-darwin"
    ;;
  x86_64)
    ASSET="codex-x86_64-apple-darwin.tar.gz"
    SIZE=117941240
    SHA="d8eb4a865a0b17319cde10347523e5bab0978d01725b39f4a639f40905e01221"
    EXECUTABLE="codex-x86_64-apple-darwin"
    ;;
  *) echo "FAIL: unsupported macOS architecture" >&2; exit 1 ;;
esac
umask 077
ROOT="$(mktemp -d "$RUNNER_TEMP/aiverse-offline-codex49.XXXXXXXX")"
trap 'rm -rf "$ROOT"' EXIT
chmod 0700 "$ROOT"
ARCHIVE="$ROOT/$ASSET"
BIN="$ROOT/codex"
curl --fail --silent --show-error --location \
  --proto '=https' --proto-redir '=https' --retry 3 \
  --connect-timeout 20 --max-time 240 \
  --output "$ARCHIVE" \
  "https://github.com/openai/codex/releases/download/rust-v0.167.0/$ASSET"
test "$(stat -f '%z' "$ARCHIVE")" = "$SIZE"
printf '%s  %s\n' "$SHA" "$ARCHIVE" | shasum -a 256 --check --status

CODEX_ARCHIVE="$ARCHIVE" CODEX_BINARY="$BIN" CODEX_EXPECTED="$EXECUTABLE" python3 - <<'PY'
import os
from pathlib import Path
import shutil
import tarfile

archive_path = Path(os.environ["CODEX_ARCHIVE"])
output = Path(os.environ["CODEX_BINARY"])
expected = os.environ["CODEX_EXPECTED"]
with tarfile.open(archive_path, "r:gz") as archive:
    members = archive.getmembers()
    if len(members) != 1 or not members[0].isfile():
        raise SystemExit("FAIL: Codex archive layout not a single file")
    if members[0].name.removeprefix("./") != expected:
        raise SystemExit("FAIL: Codex archive contains unexpected path")
    if not 1 <= members[0].size <= 300_000_000:
        raise SystemExit("FAIL: invalid Codex payload size")
    src = archive.extractfile(members[0])
    if src is None:
        raise SystemExit("FAIL: empty Codex archive member")
    with output.open("xb") as dst:
        shutil.copyfileobj(src, dst, length=128 * 1024)
    if output.stat().st_size != members[0].size:
        raise SystemExit("FAIL: incomplete extracted Codex executable")
output.chmod(0o500)
PY
rm -f "$ARCHIVE"
test -x "$BIN"
"$BIN" --version | grep -q '^codex-cli 0\.167\.0'

# Reuse the already working real launchd XPC app, but this time its
# host directly owns the pinned real Codex App Server instead of /bin/sleep.
# The child is not initialized and stdout is discarded; no turns/history.
AIVERSE_CODEX_OFFLINE_BINARY="$BIN" \
AIVERSE_CODEX_OFFLINE_CHILD_CI=1 \
bash scripts/mc2/ci-macos-actual-xpc-lifecycle.sh
echo "PASS: 3A.49 immutable official Codex Mac binary native-owner/XPC and physical process cwd; no capture"
