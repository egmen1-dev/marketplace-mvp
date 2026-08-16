#!/usr/bin/env bash
# APP-SHELL-0-PHYSICAL-ACCEPTANCE-001 — run on a machine with physical Android + USB debugging.
set -euo pipefail

APK="${APK_PATH:-/opt/cursor/artifacts/lot-android-alpha-0.1.0.apk}"
EXPECTED_SHA="${EXPECTED_SHA:-91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585}"
PACKAGE="ru.lot.marketplace.alpha"
OUT_DIR="${OUT_DIR:-./artifacts/mobile-physical-acceptance}"
mkdir -p "$OUT_DIR"

echo "== LOT Alpha physical acceptance =="
echo "APK: $APK"

ACTUAL_SHA=$(sha256sum "$APK" | awk '{print $1}')
if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
  echo "FAIL: SHA256 mismatch"
  echo " expected: $EXPECTED_SHA"
  echo " actual:   $ACTUAL_SHA"
  exit 1
fi
echo "PASS: SHA256 verified"

if ! command -v adb >/dev/null; then
  echo "FAIL: adb not found"
  exit 1
fi

DEVICES=$(adb devices | awk 'NR>1 && $2=="device"{print $1}')
if [ -z "$DEVICES" ]; then
  echo "FAIL: no physical Android device (state=device). Connect phone with USB debugging."
  adb devices
  exit 2
fi

SERIAL=$(echo "$DEVICES" | head -1)
echo "Device serial: $SERIAL"

{
  echo "manufacturer=$(adb -s "$SERIAL" shell getprop ro.product.manufacturer | tr -d '\r')"
  echo "model=$(adb -s "$SERIAL" shell getprop ro.product.model | tr -d '\r')"
  echo "android=$(adb -s "$SERIAL" shell getprop ro.build.version.release | tr -d '\r')"
  echo "sdk=$(adb -s "$SERIAL" shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "abi=$(adb -s "$SERIAL" shell getprop ro.product.cpu.abi | tr -d '\r')"
  wm=$(adb -s "$SERIAL" shell wm size 2>/dev/null | tr -d '\r' || true)
  echo "screen=$wm"
} | tee "$OUT_DIR/device-info.txt"

echo "Installing APK..."
adb -s "$SERIAL" install -r "$APK" | tee "$OUT_DIR/install.log"

echo "Launching app..."
adb -s "$SERIAL" shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 | tee "$OUT_DIR/launch.log"

sleep 5
CRASH=$(adb -s "$SERIAL" logcat -d -t 50 | grep -iE "FATAL|AndroidRuntime.*$PACKAGE" || true)
if [ -n "$CRASH" ]; then
  echo "$CRASH" > "$OUT_DIR/startup-crash.log"
  echo "FAIL: crash detected on startup — see $OUT_DIR/startup-crash.log"
  exit 3
fi
echo "PASS: no startup crash in recent logcat"

echo "Deep link smoke (logged-out may redirect to login)..."
adb -s "$SERIAL" shell am start -a android.intent.action.VIEW -d "lot://product/demo" | tee "$OUT_DIR/deeplink-product.log"

echo ""
echo "Manual checklist remaining (see docs/mobile/APP_SHELL_0_PHYSICAL_ACCEPTANCE.md):"
echo " - login / session restore / logout"
echo " - buyer + seller flows"
echo " - back button / offline / share / keyboard"
echo ""
echo "Capture screenshots to $OUT_DIR/ and fill acceptance report."
