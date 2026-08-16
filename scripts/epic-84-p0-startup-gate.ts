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
  "apps/mobile/src/boot/boot-types.ts",
  "apps/mobile/src/boot/boot-logger.ts",
  "apps/mobile/src/boot/boot-errors.ts",
  "apps/mobile/src/boot/boot-storage.ts",
  "apps/mobile/src/boot/boot-timeouts.ts",
  "apps/mobile/src/boot/session-restore.ts",
  "apps/mobile/src/boot/run-startup-pipeline.ts",
  "apps/mobile/src/features/startup/StartupErrorScreen.tsx",
  "apps/mobile/src/features/startup/StartupDiagnosticsScreen.tsx",
  "apps/mobile/app/startup-diagnostics.tsx",
  "docs/product/EPIC_84_P0_STARTUP_DIAGNOSTICS.md",
  "artifacts/epic-84-p0-startup/physical-checklist.md",
];

function main() {
  const rows: Row[] = [];
  const root = process.cwd();

  for (const file of REQUIRED_FILES) {
    rows.push({ id: `file_${file.split("/").pop()}`, ok: existsSync(join(root, file)), detail: file });
  }

  const indexSource = readFileSync(join(root, "apps/mobile/app/index.tsx"), "utf8");
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
    ok: indexSource.includes("onLongPress") && indexSource.includes("startup-diagnostics"),
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

  try {
    execSync("npm run mobile:typecheck", { stdio: "pipe" });
    rows.push({ id: "mobile_typecheck", ok: true });
  } catch {
    rows.push({ id: "mobile_typecheck", ok: false });
  }

  const failed = rows.filter((r) => !r.ok);
  const report = {
    epic: "EPIC-84",
    phase: "P0 Startup Diagnostics & Recovery",
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
