import { postTelemetry } from "../api/endpoints";

export const STARTUP_EVENTS = {
  appStart: "APP_START",
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
} as const;

/** Fire-and-forget startup telemetry — never blocks boot. */
export function emitStartupEvent(event: string, errorCode?: string): void {
  void postTelemetry({ screen: "boot", event, errorCode }).catch(() => null);
}
