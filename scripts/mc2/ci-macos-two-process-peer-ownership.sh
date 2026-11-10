#!/usr/bin/env bash
# 3A.34 isolated Darwin two-process socket peer identity test, NOT XPC.
set -euo pipefail
test "$(uname -s)" = "Darwin"
test "${CI:-}" = "true"
test "${AIVERSE_MACOS_TWO_PROCESS_FIXTURE:-}" = "1"
test -z "${OPENAI_API_KEY:-}"
test -z "${AIVERSE_GATEWAY_TOKEN:-}"
test -z "${AIVERSE_MACOS_OWNER_AUTH_PREVIEW:-}"
test -n "${RUNNER_TEMP:-}"
ROOT="$(mktemp -d "$RUNNER_TEMP/aiverse-peer34.XXXXXXXX")"
chmod 700 "$ROOT"
trap 'rm -rf "$ROOT"' EXIT
ALLOWED="$ROOT/allowed"
IMPOSTOR="$ROOT/impostor"
SOURCE="scripts/mc2/native-macos-two-process-peer-proof.m"
clang -fobjc-arc -framework Foundation -framework Security -o "$ALLOWED" "$SOURCE"
clang -fobjc-arc -framework Foundation -framework Security -o "$IMPOSTOR" "$SOURCE"
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.peer.allowed "$ALLOWED"
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.peer.impostor "$IMPOSTOR"
codesign --verify --strict "$ALLOWED"
codesign --verify --strict "$IMPOSTOR"
codesign -dv --verbose=3 "$ALLOWED" 2> "$ROOT/allowed.details"
codesign -dv --verbose=3 "$IMPOSTOR" 2> "$ROOT/impostor.details"
grep -q 'Signature=adhoc' "$ROOT/allowed.details"
grep -q 'Signature=adhoc' "$ROOT/impostor.details"
grep -q 'Identifier=com.aiverse.ci-only.persistentchat.peer.allowed' "$ROOT/allowed.details"
grep -q 'Identifier=com.aiverse.ci-only.persistentchat.peer.impostor' "$ROOT/impostor.details"
"$ALLOWED" --ci-parent "$ALLOWED" "$IMPOSTOR" | grep -qx 'PASS: 3A.34 two real macOS processes, kernel peer credentials, dynamic signer mismatch, PID ownership and revocation; recording denied'

# Both executables must refuse a caller lacking the exact fixture protocol.
set +e
env -u AIVERSE_MACOS_TWO_PROCESS_FIXTURE "$ALLOWED" --ci-parent "$ALLOWED" "$IMPOSTOR" >"$ROOT/negative" 2>&1
status=$?
set -e
test "$status" -eq 64
grep -q '^NATIVE_PEER_PROOF_DENIED$' "$ROOT/negative"
echo 'PASS: 3A.34 real peer code-signature boundary and unauthorized entrypoint denial'
