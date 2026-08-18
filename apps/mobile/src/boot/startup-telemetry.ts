import { postTelemetry } from "../api/endpoints";
import type { StartupBootReport } from "./startup-diagnostics";

export const STARTUP_EVENTS = {
  appStart: "APP_START",
  healthStart: "HEALTH_START",
  healthOk: "HEALTH_OK",
  healthFail: "HEALTH_FAIL",
  bootstrapStart: "BOOTSTRAP_START",
  bootstrapOk: "BOOTSTRAP_OK",
  bootstrapFail: "BOOTSTRAP_FAIL",
  configStart: "CONFIG_START",
  configOk: "CONFIG_OK",
  configFail: "CONFIG_FAIL",
  updateCheckStart: "UPDATE_CHECK_START",
  updateCheckOk: "UPDATE_CHECK_OK",
  updateCheckFail: "UPDATE_CHECK_FAIL",
  sessionRestoreStart: "SESSION_RESTORE_START",
  sessionRestoreOk: "SESSION_RESTORE_OK",
  sessionRestoreFail: "SESSION_RESTORE_FAIL",
  navigationReady: "NAVIGATION_READY",
  bootTimeout: "BOOT_TIMEOUT",
  bootDiagnostics: "BOOT_DIAGNOSTICS",
} as const;

/** Fire-and-forget startup telemetry — never blocks boot. */
export function emitStartupEvent(event: string, errorCode?: string): void {
  void postTelemetry({ screen: "boot", event, errorCode }).catch(() => null);
}

/** Upload condensed boot report when pipeline fails (best-effort). */
export function emitStartupFailureReport(report: StartupBootReport): void {
  const lastFailures = report.entries
    .filter((e) => e.event === "request_fail" || e.event === "stage_fail")
    .slice(-5)
    .map((e) => ({
      stage: e.stage,
      event: e.event,
      url: e.url,
      status: e.status,
      kind: e.failureKind,
      detail: e.detail?.slice(0, 160),
    }));

  void postTelemetry({
    screen: "boot",
    event: STARTUP_EVENTS.bootDiagnostics,
    errorCode: report.failedStage ?? report.currentStage,
    metadata: {
      env: report.env,
      failures: lastFailures,
      durationMs: report.finishedAt && report.startedAt ? report.finishedAt - report.startedAt : undefined,
    },
  }).catch(() => null);
}
