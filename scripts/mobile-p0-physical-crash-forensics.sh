#!/usr/bin/env bash
# P0 — Physical Android crash forensics (operator run on problematic device)
set -euo pipefail

PKG="ru.lot.marketplace.alpha"
RELEASE="${RELEASE:-0.1.5-alpha}"
OUT_DIR="artifacts/epic-84-p0-physical-crash/${RELEASE}"
mkdir -p "$OUT_DIR"

echo "=== P0 Physical Crash Forensics ==="
echo "Output: $OUT_DIR"

adb devices -l | tee "$OUT_DIR/adb-devices.txt"
if ! adb devices | tail -n +2 | grep -q "device$"; then
  echo "ERROR: No adb device. Connect USB debugging device and retry."
  exit 1
fi

echo "--- device matrix ---"
{
  echo "manufacturer=$(adb shell getprop ro.product.manufacturer | tr -d '\r')"
  echo "model=$(adb shell getprop ro.product.model | tr -d '\r')"
  echo "android=$(adb shell getprop ro.build.version.release | tr -d '\r')"
  echo "sdk=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "abi=$(adb shell getprop ro.product.cpu.abi | tr -d '\r')"
} | tee "$OUT_DIR/device-matrix.txt"

echo "--- installed binary ---"
adb shell dumpsys package "$PKG" | grep -E "versionName|versionCode" | tee "$OUT_DIR/installed-version.txt"

echo "--- exit-info (if available) ---"
adb shell dumpsys activity exit-info "$PKG" 2>/dev/null | tee "$OUT_DIR/exit-info.txt" || true

echo "--- clear logcat ---"
adb logcat -c

echo "--- launch app (force stop first) ---"
adb shell am force-stop "$PKG"
sleep 1
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
sleep 5

echo "--- capture logs ---"
adb logcat -d > "$OUT_DIR/lot-crash-full.log"
adb logcat -d | grep -E "AndroidRuntime|FATAL EXCEPTION|ReactNativeJS|libc|DEBUG|SoLoader|Hermes|TurboModule|Expo|LOT" \
  > "$OUT_DIR/lot-crash-filtered.log" || true
adb logcat -b crash -d > "$OUT_DIR/lot-crash-buffer.txt" || true

echo "--- boot markers ---"
grep -E "NATIVE_START|JS_BUNDLE_START|ROUTER_ENTRY|ROOT_LAYOUT_INIT|BOOT_PIPELINE|LOT" "$OUT_DIR/lot-crash-filtered.log" \
  | tee "$OUT_DIR/boot-markers.log" || true

echo "Done. Upload $OUT_DIR for analysis."
