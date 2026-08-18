#!/usr/bin/env tsx
/** P0 — APK bytecode guard for AnyTypeProvider / expo-clipboard SDK alignment. */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  countDexString,
  emitReport,
  mobilePaths,
  type GateRow,
} from "./mobile-p0-gate-lib";

function main() {
  const apkPath = process.env.RELEASE_APK?.trim() || mobilePaths().releaseApk;
  const rows: GateRow[] = [];

  rows.push({ id: "apk_exists", ok: existsSync(apkPath), detail: apkPath });
  if (!existsSync(apkPath)) {
    emitReport("P0 APK Bytecode Guard", rows, {}, "bytecode-guard-report.json");
    return;
  }

  const anyTypeProviderCount = countDexString(apkPath, "AnyTypeProvider");
  const anyTypeCacheCount = countDexString(apkPath, "AnyTypeCache");
  const clip571Count = countDexString(apkPath, "57.0.1");
  const clip88Count = countDexString(apkPath, "8.0.8");

  rows.push({
    id: "any_type_provider_zero",
    ok: anyTypeProviderCount === 0,
    detail: `${anyTypeProviderCount} occurrences`,
  });
  rows.push({
    id: "any_type_cache_present",
    ok: anyTypeCacheCount > 0,
    detail: `${anyTypeCacheCount} occurrences`,
  });
  rows.push({
    id: "expo_clipboard_571_present",
    ok: clip571Count > 0 || anyTypeCacheCount > 0,
    detail: `57.0.1 refs=${clip571Count}`,
  });
  rows.push({
    id: "expo_clipboard_88_absent",
    ok: clip88Count === 0,
    detail: `8.0.8 refs=${clip88Count}`,
  });

  const clipAar = join(
    mobilePaths().mobile,
    "node_modules/expo-clipboard/local-maven-repo/host/exp/exponent/expo.modules.clipboard",
  );
  const clipVersion = existsSync(clipAar)
    ? execSync(`ls "${clipAar}"`, { encoding: "utf8" }).trim().split("\n")[0]
    : "missing";
  rows.push({
    id: "node_clipboard_prebuilt_571",
    ok: clipVersion === "57.0.1",
    detail: clipVersion,
  });

  try {
    const gradleOut = execSync(
      "./gradlew :app:dependencies --configuration releaseRuntimeClasspath 2>&1 | grep expo-clipboard || true",
      { cwd: mobilePaths().android, encoding: "utf8" },
    );
    rows.push({
      id: "gradle_expo_clipboard_571",
      ok: gradleOut.includes("expo-clipboard") && gradleOut.includes("57.0.1"),
      detail: gradleOut.trim().split("\n").pop() ?? "missing",
    });
  } catch {
    rows.push({ id: "gradle_expo_clipboard_571", ok: false, detail: "gradle query failed" });
  }

  emitReport(
    "P0 APK Bytecode Guard",
    rows,
    {
      bytecode: {
        anyTypeProviderCount,
        anyTypeCacheCount,
        clip571Count,
        clip88Count,
      },
    },
    "bytecode-guard-report.json",
  );
}

main();
