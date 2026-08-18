#!/usr/bin/env bash
# P0 — bundle ErrorUtils probe with Metro (same polyfill order as production) and execute in Node.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="$ROOT/apps/mobile"
OUT="$ROOT/artifacts/epic-84-p0-startup/errorutils-runtime-probe"
mkdir -p "$OUT"

cd "$MOBILE"
BUNDLE="$OUT/probe.android.bundle"
LOG="$OUT/probe-runtime.log"

npx expo export:embed \
  --entry-file scripts/errorutils-probe-entry.js \
  --platform android \
  --dev false \
  --bundle-output "$BUNDLE" \
  --assets-dest "$OUT/assets" \
  2>&1 | tee "$OUT/metro-export.log"

node <<'NODE' "$BUNDLE" "$LOG"
const fs = require("fs");
const vm = require("vm");
const [bundlePath, logPath] = process.argv.slice(2);
const code = fs.readFileSync(bundlePath, "utf8");
const logs = [];
const sandbox = {
  console: {
    log: (...args) => {
      const line = args.map(String).join(" ");
      logs.push(line);
      process.stdout.write(line + "\n");
    },
    warn: (...args) => logs.push("[warn] " + args.join(" ")),
    error: (...args) => logs.push("[error] " + args.join(" ")),
  },
  global: {},
  process,
  setTimeout,
  clearTimeout,
  queueMicrotask,
  performance: { now: () => Date.now() },
};
sandbox.global = sandbox;
sandbox.self = sandbox;
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.__DEV__ = false;
sandbox.__fbBatchedBridgeConfig = { remoteModuleConfig: [] };
sandbox.nativeModuleProxy = {};
sandbox.nativeRequireModuleConfig = () => [];
sandbox.RN$Bridgeless = true;
vm.createContext(sandbox);
try {
  vm.runInContext(code, sandbox, { filename: bundlePath, timeout: 30000 });
} catch (err) {
  logs.push("[EXEC_ERROR] " + (err && err.stack ? err.stack : String(err)));
}
fs.writeFileSync(logPath, logs.join("\n") + "\n");
const probeLine = logs.find((l) => l.includes("[LOT-P0-PROBE-RESULT]"));
if (!probeLine) {
  console.error("PROBE_MISSING");
  process.exit(2);
}
const json = probeLine.replace(/^.*\[LOT-P0-PROBE-RESULT\]\s*/, "");
const result = JSON.parse(json);
const pass =
  result.reactNativeNamedImportType === "undefined" &&
  result.globalErrorUtilsType === "object" &&
  result.globalHasGetGlobalHandler === "function";
console.log(JSON.stringify({ pass, result }, null, 2));
process.exit(pass ? 0 : 1);
NODE
