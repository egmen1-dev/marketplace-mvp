#!/usr/bin/env tsx
/** P0 — Expo dependency compatibility gate (mandatory before Android release). */
import {
  auditExpoPackages,
  emitReport,
  readMobileLock,
  readMobilePkg,
  repoRoot,
  satisfiesExpoRange,
  type GateRow,
} from "./mobile-p0-gate-lib";

function main() {
  const root = repoRoot();
  const rows: GateRow[] = auditExpoPackages(root);
  const bundled = require(`${root}/apps/mobile/node_modules/expo/bundledNativeModules.json`) as Record<
    string,
    string
  >;
  const lock = readMobileLock(root);
  const pkg = readMobilePkg(root);

  rows.push({
    id: "expo_sdk",
    ok: satisfiesExpoRange(
      lock.packages?.["node_modules/expo"]?.version ?? null,
      bundled.expo ?? "~57.0.13",
    ),
    detail: `installed=${lock.packages?.["node_modules/expo"]?.version ?? "missing"}`,
  });

  rows.push({
    id: "expo_modules_core",
    ok: satisfiesExpoRange(
      lock.packages?.["node_modules/expo-modules-core"]?.version ?? null,
      bundled["expo-modules-core"] ?? "~57.0.11",
    ),
    detail: `installed=${lock.packages?.["node_modules/expo-modules-core"]?.version ?? "transitive"}`,
  });

  rows.push({
    id: "react_native",
    ok: satisfiesExpoRange(
      lock.packages?.["node_modules/react-native"]?.version ?? null,
      bundled["react-native"] ?? "0.86.2",
    ),
    detail: `installed=${lock.packages?.["node_modules/react-native"]?.version ?? "missing"}`,
  });

  const clipDeclared = pkg.dependencies?.["expo-clipboard"] ?? "";
  rows.push({
    id: "expo_clipboard_declared_sdk57",
    ok: clipDeclared.includes("57."),
    detail: clipDeclared,
  });

  emitReport("P0 Expo Dependency Compatibility Gate", rows, {}, "expo-deps-gate-report.json");
}

main();
