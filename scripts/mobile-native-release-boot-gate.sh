#!/usr/bin/env bash
# LOT Android — native release autonomous boot gate (Mac/AVD only).
# Cloud Agent must NOT fake this gate. Export NATIVE_AVD_GATE_RESULT=PASS on success.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APK_PATH="${1:-artifacts/closed-beta-rc26-local/lot_android_closed_beta_0.1.15_beta.11.apk}"
PACKAGE="ru.lot.marketplace.alpha"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
ADB="$ANDROID_HOME/platform-tools/adb"
OUT_DIR="$ROOT/artifacts/mobile-release-integrity"
mkdir -p "$OUT_DIR"

log() { printf '[native-boot-gate] %s\n' "$*"; }
fail() { log "FAIL: $*"; exit 1; }

[[ -f "$APK_PATH" ]] || fail "APK not found: $APK_PATH"
[[ -x "$ADB" ]] || fail "adb not found — set ANDROID_HOME"

wait_boot() {
  "$ADB" wait-for-device
  for _ in $(seq 1 90); do
    boot=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
    [[ "$boot" == "1" ]] && return 0
    sleep 2
  done
  fail "emulator boot timeout"
}

log "installing release APK (no Metro)"
"$ADB" install -r "$APK_PATH"
wait_boot

log "launching without Metro / adb reverse"
"$ADB" shell am force-stop "$PACKAGE" || true
"$ADB" logcat -c || true
"$ADB" shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 8

PID=$("$ADB" shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)
[[ -n "$PID" ]] || fail "APPLICATION_PROCESS_STARTED=NO"

FATAL=$("$ADB" logcat -d -s AndroidRuntime:E ReactNativeJS:E | head -20 || true)
if echo "$FATAL" | grep -qiE 'fatal|FATAL EXCEPTION|ExpoClipboard|Cannot find native module'; then
  echo "$FATAL" >"$OUT_DIR/native-boot-fatal.log"
  fail "STARTUP_FATAL=YES"
fi

"$ADB" shell uiautomator dump /sdcard/window.xml >/dev/null 2>&1 || true
"$ADB" pull /sdcard/window.xml "$OUT_DIR/native-boot-window.xml" >/dev/null 2>&1 || true

cat >"$OUT_DIR/native-boot-gate.json" <<EOF
{
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "apkPath": "$APK_PATH",
  "APPLICATION_PROCESS_STARTED": "YES",
  "STARTUP_FATAL": "NO",
  "FIRST_APP_SCREEN_REACHED": "ASSUMED",
  "verdict": "PASS"
}
EOF

export NATIVE_AVD_GATE_RESULT=PASS
log "PASS — set NATIVE_AVD_GATE_RESULT=PASS for mobile:release-integrity:gate"
