#!/usr/bin/env tsx
/** EPIC-84 P0 — Startup Diagnostics & Recovery gate */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  bootFailureCode,
  bootFailureMessage,
  bootPipelineHungFailure,
  parseBootFailure,
  BootTimeoutError,
} from "@/lib/mobile/boot/errors";
import { BootStage } from "@/lib/mobile/boot/types";
import { BOOT_STAGE_TIMEOUT_MS } from "@/lib/mobile/boot/timeouts";
import { decodeJwtPayload } from "@/lib/mobile/boot/jwt";

type Row = { id: string; ok: boolean; detail?: string };

const REQUIRED_FILES = [
  "lib/mobile/boot/types.ts",
  "lib/mobile/boot/errors.ts",
  "apps/mobile/index.js",
  "apps/mobile/app.config.js",
  "apps/mobile/src/boot/early-boot.ts",
  "apps/mobile/src/boot/fatal-bootstrap.tsx",
  "apps/mobile/src/boot/boot-types.ts",
  "apps/mobile/src/boot/boot-logger.ts",
  "apps/mobile/src/boot/boot-errors.ts",
  "apps/mobile/src/boot/boot-storage.ts",
  "apps/mobile/src/boot/boot-timeouts.ts",
  "apps/mobile/src/boot/session-restore.ts",
  "apps/mobile/src/boot/run-startup-pipeline.ts",
  "apps/mobile/src/components/RootErrorBoundary.tsx",
  "apps/mobile/src/components/StartupFatalGate.tsx",
  "apps/mobile/src/features/startup/StartupFatalErrorScreen.tsx",
  "apps/mobile/src/features/startup/StartupErrorScreen.tsx",
  "apps/mobile/src/features/startup/StartupDiagnosticsScreen.tsx",
  "apps/mobile/app/startup-diagnostics.tsx",
  "docs/product/EPIC_84_P0_STARTUP_DIAGNOSTICS.md",
  "docs/product/EPIC_84_P0_STARTUP_CRASH.md",
  "docs/product/EPIC_84_P0_PHYSICAL_CRASH_FORENSICS.md",
  "artifacts/epic-84-p0-startup/physical-checklist.md",
];

function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  for (const file of REQUIRED_FILES) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(root, file)), detail: file });
  }

  const indexSource = readFileSync(join(root, "apps/mobile/app/index.tsx"), "utf8");
  const layoutSource = readFileSync(join(root, "apps/mobile/app/_layout.tsx"), "utf8");
  const entrySource = readFileSync(join(root, "apps/mobile/index.js"), "utf8");
  const earlyBootSource = readFileSync(join(root, "apps/mobile/src/boot/early-boot.ts"), "utf8");
  const pkg = JSON.parse(readFileSync(join(root, "apps/mobile/package.json"), "utf8")) as { main?: string };

  rows.push({ id: "custom_entry_main", ok: pkg.main === "index.js" });
  rows.push({ id: "entry_boot_marks", ok: entrySource.includes("bootMark") && entrySource.includes("expo-router/entry") });
  rows.push({
    id: "entry_fatal_fallback",
    ok: entrySource.includes("registerFatalBootstrap") && !entrySource.includes("throw error"),
  });
  rows.push({
    id: "early_boot_global_handler",
    ok: earlyBootSource.includes("ErrorUtils.setGlobalHandler") && earlyBootSource.includes("recordFatalStartupError"),
  });
  rows.push({
    id: "root_error_boundary_layout",
    ok: layoutSource.includes("RootErrorBoundary") && layoutSource.includes("StartupFatalGate"),
  });
  rows.push({ id: "layout_boot_marks", ok: layoutSource.includes("bootMark") });
  rows.push({ id: "index_boot_marks", ok: indexSource.includes("bootMark") });

  const appConfig = readFileSync(join(root, "apps/mobile/app.config.js"), "utf8");
  rows.push({ id: "lazy_router_import_mode", ok: appConfig.includes("EXPO_ROUTER_IMPORT_MODE") && appConfig.includes("lazy") });
  rows.push({ id: "new_arch_disabled_release", ok: appConfig.includes("newArchEnabled: false") });
  rows.push({ id: "native_boot_marker_plugin", ok: existsSync(join(root, "apps/mobile/plugins/withLotBootMarkers.js")) });
  rows.push({ id: "native_arch_sync_plugin", ok: existsSync(join(root, "apps/mobile/plugins/withNativeArchSync.js")) });
  const gradleProps = existsSync(join(root, "apps/mobile/android/gradle.properties"))
    ? readFileSync(join(root, "apps/mobile/android/gradle.properties"), "utf8")
    : "";
  rows.push({
    id: "gradle_new_arch_disabled",
    ok: gradleProps.includes("newArchEnabled=false"),
    detail: gradleProps.match(/newArchEnabled=.+/m)?.[0],
  });
  rows.push({ id: "previous_crash_module", ok: existsSync(join(root, "apps/mobile/src/boot/previous-crash.ts")) });
  rows.push({ id: "boot_isolation_module", ok: existsSync(join(root, "apps/mobile/src/boot/boot-isolation.ts")) });
  rows.push({ id: "deferred_root_providers", ok: layoutSource.includes("LazyNetworkBanner") && layoutSource.includes("LazyUpdateHost") });
  rows.push({ id: "lazy_startup_error_screen", ok: indexSource.includes("LazyStartupErrorScreen") });

  const fatalScreen = readFileSync(
    join(root, "apps/mobile/src/features/startup/StartupFatalErrorScreen.tsx"),
    "utf8",
  );
  rows.push({ id: "fatal_error_screen_title", ok: fatalScreen.includes("Startup Fatal Error") });
  rows.push({ id: "fatal_error_stack_trace", ok: fatalScreen.includes("Stack trace") });
  rows.push({ id: "fatal_error_boot_trail", ok: fatalScreen.includes("Boot trail") && fatalScreen.includes("getBootMarks") });

  rows.push({
    id: "no_generic_boot_error",
    ok: !indexSource.includes('"Не удалось загрузить приложение"'),
  });
  rows.push({
    id: "uses_startup_error_screen",
    ok: indexSource.includes("StartupErrorScreen"),
  });
  rows.push({
    id: "retry_increments_attempt",
    ok: indexSource.includes("setAttempt") && indexSource.includes("runStartupPipeline"),
  });
  rows.push({
    id: "long_press_diagnostics",
    ok:
      (indexSource.includes("onLongPress") && indexSource.includes("build-info")) ||
      indexSource.includes("startup-diagnostics"),
  });

  const pipelineSource = readFileSync(join(root, "apps/mobile/src/boot/run-startup-pipeline.ts"), "utf8");
  rows.push({
    id: "session_non_blocking",
    ok: pipelineSource.includes("session_to_login") || pipelineSource.includes('destination = "login"'),
    detail: "session failure opens login",
  });
  rows.push({
    id: "remote_config_recovery",
    ok: pipelineSource.includes("loadRemoteConfigCache"),
  });
  rows.push({
    id: "update_non_blocking",
    ok: pipelineSource.includes("update_skipped") || pipelineSource.includes("defaultUpdateFallback"),
  });

  const errorScreen = readFileSync(join(root, "apps/mobile/src/features/startup/StartupErrorScreen.tsx"), "utf8");
  rows.push({ id: "error_shows_stage", ok: errorScreen.includes("Этап") });
  rows.push({ id: "error_shows_reason", ok: errorScreen.includes("Причина") });
  rows.push({ id: "error_shows_http", ok: errorScreen.includes("HTTP") });

  rows.push({
    id: "bootstrap_timeout_8s",
    ok: BOOT_STAGE_TIMEOUT_MS[BootStage.BOOTSTRAP] === 8_000,
  });
  rows.push({
    id: "update_timeout_5s",
    ok: BOOT_STAGE_TIMEOUT_MS[BootStage.UPDATE] === 5_000,
  });

  const timeoutErr = parseBootFailure(BootStage.BOOTSTRAP, new BootTimeoutError("bootstrap", 8000), 8000);
  rows.push({
    id: "parse_timeout_failure",
    ok: timeoutErr.message === "Request timeout" || timeoutErr.code.includes("timeout"),
    detail: timeoutErr.code,
  });

  rows.push({
    id: "jwt_decode_helper",
    ok: decodeJwtPayload("a.b.c") === null,
  });

  rows.push({
    id: "hung_failure_retryable",
    ok: bootPipelineHungFailure(30000).retryable === true,
  });

  rows.push({
    id: "failure_code_bootstrap_network",
    ok: bootFailureCode(BootStage.BOOTSTRAP, new TypeError("Network request failed")).includes("network"),
  });

  rows.push({
    id: "failure_message_session_expired",
    ok: bootFailureMessage(BootStage.SESSION, new Error("session_expired")) === "Session expired",
  });

  const mobilePkg = JSON.parse(readFileSync(join(root, "apps/mobile/package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  const mobileLock = JSON.parse(readFileSync(join(root, "apps/mobile/package-lock.json"), "utf8")) as {
    packages?: Record<string, { version?: string }>;
  };
  const clipDeclared = mobilePkg.dependencies?.["expo-clipboard"] ?? "";
  const clipInstalled = mobileLock.packages?.["node_modules/expo-clipboard"]?.version ?? "";
  rows.push({
    id: "expo_clipboard_sdk57",
    ok: clipDeclared.includes("57.") && clipInstalled.startsWith("57."),
    detail: `declared=${clipDeclared} installed=${clipInstalled}`,
  });
  rows.push({
    id: "expo_clipboard_forensics_doc",
    ok: existsSync(join(root, "docs/product/EPIC_84_P0_EXPO_CLIPBOARD_CRASH_FORENSICS.md")),
  });

  try {
    execSync("npx tsx scripts/mobile-p0-expo-deps-gate.ts", { stdio: "pipe", cwd: root });
    rows.push({ id: "expo_deps_gate", ok: true });
  } catch {
    rows.push({ id: "expo_deps_gate", ok: false });
  }

  try {
    execSync("npm run mobile:typecheck", { stdio: "pipe" });
    rows.push({ id: "mobile_typecheck", ok: true });
  } catch {
    rows.push({ id: "mobile_typecheck", ok: false });
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    epic: "EPIC-84",
    phase: "P0 Startup Diagnostics, Recovery & Crash Guard",
    generatedAt: new Date().toISOString(),
    verdict: failed.length === 0 ? "PASS" : "FAIL",
    rows,
  };

  const outDir = join(root, "artifacts/epic-84-p0-startup");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "gate-report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) process.exit(1);
}

main();
