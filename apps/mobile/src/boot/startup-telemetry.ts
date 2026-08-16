import { BootStage } from "./boot-types";
import { postTelemetry } from "../api/endpoints";

export const STARTUP_EVENTS = {
  bootStarted: "BOOT_STARTED",
  bootStageStarted: "BOOT_STAGE_STARTED",
  bootStageSuccess: "BOOT_STAGE_SUCCESS",
  bootStageFailed: "BOOT_STAGE_FAILED",
  bootCompleted: "BOOT_COMPLETED",
  bootAborted: "BOOT_ABORTED",
  bootRetry: "BOOT_RETRY",
  /** @deprecated legacy alias */
  appStart: "BOOT_STARTED",
  bootstrapStart: "BOOT_STAGE_STARTED",
  bootstrapOk: "BOOT_STAGE_SUCCESS",
  bootstrapFail: "BOOT_STAGE_FAILED",
  configStart: "BOOT_STAGE_STARTED",
  configOk: "BOOT_STAGE_SUCCESS",
  configFail: "BOOT_STAGE_FAILED",
  updateCheckStart: "BOOT_STAGE_STARTED",
  updateCheckOk: "BOOT_STAGE_SUCCESS",
  updateCheckFail: "BOOT_STAGE_FAILED",
  sessionRestoreStart: "BOOT_STAGE_STARTED",
  sessionRestoreOk: "BOOT_STAGE_SUCCESS",
  sessionRestoreFail: "BOOT_STAGE_FAILED",
  navigationReady: "BOOT_COMPLETED",
  bootTimeout: "BOOT_ABORTED",
} as const;

/** Fire-and-forget startup telemetry — never blocks boot. */
export function emitStartupEvent(event: string, detail?: string): void {
  void postTelemetry({ screen: "boot", event, errorCode: detail }).catch(() => null);
}

export function emitBootStageEvent(
  phase: "started" | "success" | "failed",
  stage: BootStage,
  durationMs?: number,
  detail?: string,
): void {
  const event =
    phase === "started"
      ? STARTUP_EVENTS.bootStageStarted
      : phase === "success"
        ? STARTUP_EVENTS.bootStageSuccess
        : STARTUP_EVENTS.bootStageFailed;
  const payload = [stage, durationMs !== undefined ? `${durationMs}ms` : null, detail].filter(Boolean).join(":");
  emitStartupEvent(event, payload);
}
