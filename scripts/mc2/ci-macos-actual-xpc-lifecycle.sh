#!/usr/bin/env bash
# 3A.35: real launchd-managed XPC service smoke, no transcripts or capture.
set -euo pipefail
test "$(uname -s)" = "Darwin"
test "${CI:-}" = "true"
test "${AIVERSE_MACOS_ACTUAL_XPC_CI:-}" = "1"
test -z "${OPENAI_API_KEY:-}"
test -z "${AIVERSE_GATEWAY_TOKEN:-}"
test -z "${AIVERSE_MACOS_OWNER_AUTH_PREVIEW:-}"
test -n "${RUNNER_TEMP:-}"
ROOT="$(mktemp -d "$RUNNER_TEMP/aiverse-realxpc35.XXXXXXXX")"
trap 'rm -rf "$ROOT"' EXIT
chmod 700 "$ROOT"
APP="$ROOT/AIVerseActualXPCProof.app"
XPC="$APP/Contents/XPCServices/com.aiverse.ci-only.persistentchat.actual-xpc-service.xpc"
mkdir -p "$APP/Contents/MacOS" "$XPC/Contents/MacOS"
INBOUND="$APP/Contents/XPCServices/com.aiverse.ci-only.persistentchat.inbound-deny.xpc"
mkdir -p "$INBOUND/Contents/MacOS"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.aiverse.ci-only.persistentchat.actual-xpc-owner</string>
<key>CFBundleExecutable</key><string>AIVerseActualXPCOwner</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>0.0.0-ci-only</string>
<key>LSBackgroundOnly</key><true/>
</dict></plist>
PLIST
cat > "$XPC/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.aiverse.ci-only.persistentchat.actual-xpc-service</string>
<key>CFBundleExecutable</key><string>AIVerseActualXPCService</string>
<key>CFBundlePackageType</key><string>XPC!</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>0.0.0-ci-only</string>
<key>XPCService</key><dict>
<key>ServiceType</key><string>Application</string>
<key>RunLoopType</key><string>NSRunLoop</string>
</dict>
</dict></plist>
PLIST
cat > "$INBOUND/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.aiverse.ci-only.persistentchat.inbound-deny</string>
<key>CFBundleExecutable</key><string>AIVerseInboundXPCDeny</string>
<key>CFBundlePackageType</key><string>XPC!</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>0.0.0-ci-only</string>
<key>XPCService</key><dict>
<key>ServiceType</key><string>Application</string>
<key>RunLoopType</key><string>NSRunLoop</string>
</dict>
</dict></plist>
PLIST
plutil -lint "$APP/Contents/Info.plist" "$XPC/Contents/Info.plist" "$INBOUND/Contents/Info.plist"
clang -fobjc-arc -framework Foundation -I scripts/mc2 \
  -o "$XPC/Contents/MacOS/AIVerseActualXPCService" \
  scripts/mc2/native-macos-actual-xpc-service.m
clang -fobjc-arc -framework Foundation -framework Security -I scripts/mc2 \
  -o "$INBOUND/Contents/MacOS/AIVerseInboundXPCDeny" \
  scripts/mc2/native-macos-inbound-xpc-deny.m
clang -fobjc-arc -framework Foundation -I scripts/mc2 \
  -o "$APP/Contents/MacOS/AIVerseActualXPCOwner" \
  scripts/mc2/native-macos-actual-xpc-owner.m \
  scripts/mc2/native-macos-xpc-lease-fence.m \
  scripts/mc2/native-macos-release-peer-deny.m \
  scripts/mc2/native-macos-inbound-xpc-deny-test.m \
  scripts/mc2/native-macos-device-owner-host-review.m \
  -framework Security -framework LocalAuthentication
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.actual-xpc-service "$XPC"
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.inbound-deny "$INBOUND"
codesign --force --sign - --identifier com.aiverse.ci-only.persistentchat.actual-xpc-owner "$APP"
codesign --verify --strict "$XPC"
codesign --verify --strict "$INBOUND"
codesign --verify --deep --strict "$APP"
"$APP/Contents/MacOS/AIVerseActualXPCOwner" --ci-probe
echo 'PASS: real XPC 3A.35 packaged service, two OS processes, denial-only reply; still no user consent'
"$APP/Contents/MacOS/AIVerseActualXPCOwner" --ci-revocation
echo 'PASS: real XPC 3A.36 delayed reply, connection replacement and interruption cannot authorize capture'
"$APP/Contents/MacOS/AIVerseActualXPCOwner" --ci-release-peer-deny
"$APP/Contents/MacOS/AIVerseActualXPCOwner" --ci-device-owner-deny
"$APP/Contents/MacOS/AIVerseActualXPCOwner" --ci-inbound-deny

