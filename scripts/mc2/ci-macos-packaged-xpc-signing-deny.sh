#!/usr/bin/env bash
# 3A.33 macOS CI-only nested code-signature + packaging integrity proof.
# No Developer ID credential, production entitlement, real XPC connection,
# LocalAuthentication success, Codex transcript, or recording is used.
set -euo pipefail
test "${CI:-}" = "true"
test "${AIVERSE_MACOS_PACKAGED_DENY_FIXTURE:-}" = "1"
test -z "${AIVERSE_MACOS_OWNER_AUTH_PREVIEW:-}"
test -z "${OPENAI_API_KEY:-}"
test -z "${AIVERSE_GATEWAY_TOKEN:-}"
test -n "${RUNNER_TEMP:-}"
test "$(uname -s)" = "Darwin"

PACKAGE_ROOT="$(mktemp -d "$RUNNER_TEMP/aiverse-xpc33.XXXXXXXX")"
trap 'rm -rf "$PACKAGE_ROOT"' EXIT
APP="$PACKAGE_ROOT/AIVerseCIOnlyOwner.app"
SERVICE="$APP/Contents/XPCServices/com.aiverse.ci-only.persistentchat.denied.xpc"
APP_EXE="$APP/Contents/MacOS/AIVerseCIOnlyOwner"
SERVICE_EXE="$SERVICE/Contents/MacOS/AIVerseCIOnlyDeniedXPC"
mkdir -p "$APP/Contents/MacOS" "$SERVICE/Contents/MacOS"
chmod 700 "$PACKAGE_ROOT"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.aiverse.ci-only.persistentchat.owner</string>
<key>CFBundleExecutable</key><string>AIVerseCIOnlyOwner</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>0.0.0-ci-only</string>
</dict></plist>
PLIST
cat > "$SERVICE/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.aiverse.ci-only.persistentchat.denied</string>
<key>CFBundleExecutable</key><string>AIVerseCIOnlyDeniedXPC</string>
<key>CFBundlePackageType</key><string>XPC!</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>0.0.0-ci-only</string>
<key>XPCService</key><dict>
<key>RunLoopType</key><string>NSRunLoop</string>
<key>ServiceType</key><string>Application</string>
</dict>
</dict></plist>
PLIST
plutil -lint "$APP/Contents/Info.plist" "$SERVICE/Contents/Info.plist"
swiftc -parse-as-library -o "$APP_EXE" scripts/mc2/native-macos-packaged-owner-deny.swift
swiftc -parse-as-library -o "$SERVICE_EXE" scripts/mc2/native-macos-packaged-xpc-deny.swift
test -x "$APP_EXE" && test -x "$SERVICE_EXE"

# Apple's signing order: nested XPC service first, enclosing app second.
# Ad-hoc signatures prove only seal/integrity for this exact CI build.
# There is NO Developer Team identity, notarization or trusted release.
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.denied "$SERVICE"
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.owner "$APP"
codesign --verify --strict --verbose=2 "$SERVICE"
codesign --verify --deep --strict --verbose=2 "$APP"

app_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Contents/Info.plist")"
service_id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$SERVICE/Contents/Info.plist")"
type="$(/usr/libexec/PlistBuddy -c 'Print :CFBundlePackageType' "$SERVICE/Contents/Info.plist")"
test "$app_id" = "com.aiverse.ci-only.persistentchat.owner"
test "$service_id" = "com.aiverse.ci-only.persistentchat.denied"
test "$type" = "XPC!"

codesign -dv --verbose=3 "$APP" 2> "$PACKAGE_ROOT/owner-details"
codesign -dv --verbose=3 "$SERVICE" 2> "$PACKAGE_ROOT/service-details"
grep -q 'Signature=adhoc' "$PACKAGE_ROOT/owner-details"
grep -q 'Signature=adhoc' "$PACKAGE_ROOT/service-details"
grep -q 'Identifier=com.aiverse.ci-only.persistentchat.owner' "$PACKAGE_ROOT/owner-details"
grep -q 'Identifier=com.aiverse.ci-only.persistentchat.denied' "$PACKAGE_ROOT/service-details"

# These separate signed Mach-O executables cannot authorize recording.
"$APP_EXE" --ci-deny | grep -qx "BLOCKED: macOS packaged owner has no chat capture permission"
"$SERVICE_EXE" --ci-deny | grep -qx "BLOCKED: macOS packaged XPC has no chat capture permission"
assert_denied() {
  local target="$1"
  local status=0
  "$target" > "$PACKAGE_ROOT/deny-output" 2>&1 || status=$?
  test "$status" -ne 0
  grep -q '^DENIED:' "$PACKAGE_ROOT/deny-output"
}
assert_denied "$APP_EXE"
assert_denied "$SERVICE_EXE"

# The outer seal must fail if metadata changes after signing, even if its
# plist still parses. This is NOT protection from ad-hoc re-signing.
TAMPER="$PACKAGE_ROOT/ChangedOwner.app"
cp -R "$APP" "$TAMPER"
/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.attacker.changed' "$TAMPER/Contents/Info.plist"
plutil -lint "$TAMPER/Contents/Info.plist"
if codesign --verify --deep --strict "$TAMPER" > "$PACKAGE_ROOT/tamper-log" 2>&1; then
  echo "FAIL: modified outer bundle incorrectly verified" >&2; exit 1
fi
rm -rf "$TAMPER"
cp -R "$APP" "$TAMPER"
/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.attacker.service' "$TAMPER/Contents/XPCServices/com.aiverse.ci-only.persistentchat.denied.xpc/Contents/Info.plist"
plutil -lint "$TAMPER/Contents/XPCServices/com.aiverse.ci-only.persistentchat.denied.xpc/Contents/Info.plist"
if codesign --verify --deep --strict "$TAMPER" > "$PACKAGE_ROOT/tamper-log" 2>&1; then
  echo "FAIL: modified nested XPC bundle incorrectly verified" >&2; exit 1
fi

echo 'PASS: 3A.33 CI-only signed nested owner/XPC package, distinct IDs, deny-only entrypoints and tamper detection'
