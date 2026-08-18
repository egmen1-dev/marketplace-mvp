import type { MobileUpdateInfo } from "../api/endpoints";
import { fetchBootstrap, fetchMobileUpdate, fetchRemoteConfig, postTelemetry } from "../api/endpoints";
import { applyBetaConfig } from "../beta/config";
import { setRemoteFlags } from "../beta/remote-flags";
import { trackBootTiming } from "../beta/performance-tracker";
import { emitStartupEvent, STARTUP_EVENTS } from "./startup-telemetry";
import { withTimeout } from "./with-timeout";
import { getAccessToken, getSessionMeta } from "../storage/secure-session";

export const BOOT_STEP_TIMEOUT_MS = 8_000;
export const BOOT_HARD_TIMEOUT_MS = 10_000;

export type StartupDestination = "login" | "app";

export type StartupPipelineResult =
  | { status: "unsupported"; update: MobileUpdateInfo }
  | {
      status: "ready";
      destination: StartupDestination;
      update: MobileUpdateInfo | null;
      remoteConfig: Record<string, unknown> | null;
      role: string | null;
    }
  | { status: "error"; message: string };

function isUnsupportedUpdate(update: MobileUpdateInfo): boolean {
  return update.updateState === "UNSUPPORTED_CLIENT";
}

export async function runStartupPipeline(): Promise<StartupPipelineResult> {
  const bootStart = Date.now();
  emitStartupEvent(STARTUP_EVENTS.appStart);

  try {
    emitStartupEvent(STARTUP_EVENTS.bootstrapStart);
    await withTimeout("bootstrap", fetchBootstrap(), BOOT_STEP_TIMEOUT_MS);
    emitStartupEvent(STARTUP_EVENTS.bootstrapOk);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bootstrap_error";
    emitStartupEvent(STARTUP_EVENTS.bootstrapFail, message.slice(0, 80));
    return { status: "error", message: message.includes("timed out") ? "Не удалось загрузить приложение" : message };
  }

  let remoteConfig: Record<string, unknown> | null = null;
  emitStartupEvent(STARTUP_EVENTS.configStart);
  try {
    const remote = await withTimeout("remote_config", fetchRemoteConfig(), BOOT_STEP_TIMEOUT_MS);
    remoteConfig = remote.config ?? null;
    const flagsRecord = Object.fromEntries((remote.flags ?? []).map((f) => [f.key, f.enabled]));
    applyBetaConfig(remoteConfig, flagsRecord);
    setRemoteFlags(flagsRecord);
    emitStartupEvent(STARTUP_EVENTS.configOk);
  } catch (err) {
    const message = err instanceof Error ? err.name : "config_error";
    emitStartupEvent(STARTUP_EVENTS.configFail, message.slice(0, 80));
  }

  void postTelemetry({ screen: "boot", event: "session_start" }).catch(() => null);

  let update: MobileUpdateInfo;
  emitStartupEvent(STARTUP_EVENTS.updateCheckStart);
  try {
    update = await withTimeout("update_check", fetchMobileUpdate(), BOOT_STEP_TIMEOUT_MS);
    emitStartupEvent(STARTUP_EVENTS.updateCheckOk, update.updateState);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update_error";
    emitStartupEvent(STARTUP_EVENTS.updateCheckFail, message.slice(0, 80));
    update = {
      latestVersion: "0.0.0",
      versionCode: 0,
      versionName: "unknown",
      updateRequired: false,
      updateState: "NO_UPDATE",
      mandatory: false,
      downloadUrl: null,
      sha256: null,
      releaseNotes: [],
      channel: "CLOSED_ALPHA",
      rollout: { percent: 0, eligible: false },
      compatibility: { compatible: true, forceUpgrade: false },
    };
  }

  if (isUnsupportedUpdate(update)) {
    return { status: "unsupported", update };
  }

  emitStartupEvent(STARTUP_EVENTS.sessionRestoreStart);
  let token: string | null = null;
  let meta: Awaited<ReturnType<typeof getSessionMeta>> = null;
  try {
    [token, meta] = await withTimeout(
      "session_restore",
      Promise.all([getAccessToken(), getSessionMeta()]),
      BOOT_STEP_TIMEOUT_MS,
    );
    emitStartupEvent(STARTUP_EVENTS.sessionRestoreOk);
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_error";
    emitStartupEvent(STARTUP_EVENTS.sessionRestoreFail, message.slice(0, 80));
    return { status: "error", message: message.includes("timed out") ? "Не удалось загрузить приложение" : message };
  }

  const destination: StartupDestination = token && meta ? "app" : "login";
  emitStartupEvent(STARTUP_EVENTS.navigationReady, destination);
  trackBootTiming("total", Date.now() - bootStart);

  return {
    status: "ready",
    destination,
    update: update.updateState === "NO_UPDATE" ? null : update,
    remoteConfig,
    role: meta?.role ?? null,
  };
}
