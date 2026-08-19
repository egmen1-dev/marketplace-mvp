import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import { applyBetaConfig } from "../beta/config";
import { getBuildInfo } from "../beta/build-info";
import { setRemoteFlags } from "../beta/remote-flags";
import { trackBootTiming } from "../beta/performance-tracker";
import { loadAppConfig } from "../config/env";
import type { BootstrapPayload } from "../types/api";
import { getDeviceId, getAccessToken, getSessionMeta } from "../storage/secure-session";
import { bootApiGet } from "./boot-api-request";
import { emitStartupEvent, emitStartupFailureReport, STARTUP_EVENTS } from "./startup-telemetry";
import {
  formatBootReportSummary,
  getStartupBootReport,
  logStartupFailure,
  logStartupStage,
  resetStartupDiagnostics,
  type StartupBootReport,
} from "./startup-diagnostics";
import { withTimeout } from "./with-timeout";

export const BOOT_STEP_TIMEOUT_MS = 12_000;
export const BOOT_HARD_TIMEOUT_MS = 60_000;

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
  | {
      status: "error";
      message: string;
      userMessage: string;
      report: StartupBootReport;
      failedStage?: string;
    };

function isUnsupportedUpdate(update: MobileUpdateInfo): boolean {
  return update.updateState === "UNSUPPORTED_CLIENT";
}

function buildBootError(
  failedStage: string,
  err: unknown,
  userMessage = "Не удалось загрузить приложение",
): StartupPipelineResult {
  logStartupFailure(failedStage, err);
  const report = getStartupBootReport();
  emitStartupFailureReport(report);
  return {
    status: "error",
    message: formatBootReportSummary(report),
    userMessage,
    report,
    failedStage,
  };
}

function parseMobileUpdate(raw: MobileUpdateInfo & {
  updateState?: MobileUpdateInfo["updateState"];
  minimumVersionName?: string;
  minimumVersionCode?: number;
  reason?: "CLIENT_TOO_OLD";
}): MobileUpdateInfo {
  const config = loadAppConfig();
  const versionCode = Number(config.buildNumber) || 1;
  const updateState =
    raw.updateState ??
    (raw.reason === "CLIENT_TOO_OLD"
      ? "UNSUPPORTED_CLIENT"
      : raw.updateRequired || raw.mandatory
        ? "REQUIRED_UPDATE"
        : raw.downloadUrl && raw.versionCode > versionCode && raw.rollout.eligible
          ? "OPTIONAL_UPDATE"
          : "NO_UPDATE");
  return {
    ...raw,
    updateState,
    minimumVersionName: raw.minimumVersionName,
    minimumVersionCode: raw.minimumVersionCode,
    reason: raw.reason,
  };
}

export async function runStartupPipeline(): Promise<StartupPipelineResult> {
  resetStartupDiagnostics();
  const bootStart = Date.now();
  const build = getBuildInfo();
  const config = loadAppConfig();

  logStartupStage("app_init", "start", JSON.stringify({
    apiBaseUrl: config.apiBaseUrl,
    releaseChannel: config.releaseChannel,
    appVersion: config.appVersion,
    buildNumber: config.buildNumber,
    betaChannel: build.channel,
    commitSha: build.commitSha,
  }));
  emitStartupEvent(STARTUP_EVENTS.appStart);

  try {
    logStartupStage("api_health", "start");
    emitStartupEvent(STARTUP_EVENTS.healthStart);
    await withTimeout(
      "api_health",
      bootApiGet<{ ok?: boolean }>("api_health", "/api/health", BOOT_STEP_TIMEOUT_MS),
      BOOT_STEP_TIMEOUT_MS,
    );
    emitStartupEvent(STARTUP_EVENTS.healthOk);
    logStartupStage("api_health", "ok");
  } catch (err) {
    emitStartupEvent(STARTUP_EVENTS.healthFail, err instanceof Error ? err.message.slice(0, 80) : "health_error");
    return buildBootError("api_health", err);
  }

  try {
    emitStartupEvent(STARTUP_EVENTS.bootstrapStart);
    logStartupStage("bootstrap", "start");
    await withTimeout(
      "bootstrap",
      bootApiGet<BootstrapPayload>("bootstrap", "/api/mobile/bootstrap", BOOT_STEP_TIMEOUT_MS),
      BOOT_STEP_TIMEOUT_MS,
    );
    emitStartupEvent(STARTUP_EVENTS.bootstrapOk);
    logStartupStage("bootstrap", "ok");
  } catch (err) {
    emitStartupEvent(STARTUP_EVENTS.bootstrapFail, err instanceof Error ? err.message.slice(0, 80) : "bootstrap_error");
    return buildBootError("bootstrap", err);
  }

  let remoteConfig: Record<string, unknown> | null = null;
  emitStartupEvent(STARTUP_EVENTS.configStart);
  logStartupStage("remote_config", "start");
  try {
    const deviceId = getDeviceId();
    const remote = await withTimeout(
      "remote_config",
      bootApiGet<{
        config?: Record<string, unknown>;
        flags?: Array<{ key: string; enabled: boolean }>;
      }>(
        "remote_config",
        `/api/product-ops/config?surface=mobile&deviceId=${encodeURIComponent(deviceId)}`,
        BOOT_STEP_TIMEOUT_MS,
      ),
      BOOT_STEP_TIMEOUT_MS,
    );
    remoteConfig = remote.config ?? null;
    const flagsRecord = Object.fromEntries((remote.flags ?? []).map((f) => [f.key, f.enabled]));
    applyBetaConfig(remoteConfig, flagsRecord);
    setRemoteFlags(flagsRecord);
    emitStartupEvent(STARTUP_EVENTS.configOk);
    logStartupStage("remote_config", "ok");
  } catch (err) {
    const message = err instanceof Error ? err.message : "config_error";
    emitStartupEvent(STARTUP_EVENTS.configFail, message.slice(0, 80));
    logStartupFailure("remote_config", err);
  }

  void postTelemetry({ screen: "boot", event: "session_start" }).catch(() => null);

  let update: MobileUpdateInfo;
  emitStartupEvent(STARTUP_EVENTS.updateCheckStart);
  logStartupStage("update_check", "start");
  try {
    const versionCode = Number(config.buildNumber) || 1;
    const deviceId = getDeviceId();
    const qs = new URLSearchParams({
      versionCode: String(versionCode),
      deviceId,
      channel: "CLOSED_ALPHA",
    });
    update = await withTimeout(
      "update_check",
      bootApiGet<MobileUpdateInfo>(
        "update_check",
        `/api/mobile/update?${qs.toString()}`,
        BOOT_STEP_TIMEOUT_MS,
      ).then(parseMobileUpdate),
      BOOT_STEP_TIMEOUT_MS,
    );
    emitStartupEvent(STARTUP_EVENTS.updateCheckOk, update.updateState);
    logStartupStage("update_check", "ok", update.updateState);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update_error";
    emitStartupEvent(STARTUP_EVENTS.updateCheckFail, message.slice(0, 80));
    logStartupFailure("update_check", err);
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
  logStartupStage("session_restore", "start");
  let token: string | null = null;
  let meta: Awaited<ReturnType<typeof getSessionMeta>> = null;
  try {
    token = await withTimeout("session_token", getAccessToken(), BOOT_STEP_TIMEOUT_MS);
    logStartupStage("session_restore", "token_ok", token ? "has_token" : "no_token");
    meta = await withTimeout("session_meta", getSessionMeta(), BOOT_STEP_TIMEOUT_MS);
    logStartupStage("session_restore", "meta_ok", meta?.role ?? "no_meta");
    emitStartupEvent(STARTUP_EVENTS.sessionRestoreOk);
  } catch (err) {
    const message = err instanceof Error ? err.message : "session_error";
    emitStartupEvent(STARTUP_EVENTS.sessionRestoreFail, message.slice(0, 80));
    return buildBootError("session_restore", err);
  }

  const destination: StartupDestination = token && meta ? "app" : "login";
  emitStartupEvent(STARTUP_EVENTS.navigationReady, destination);
  logStartupStage("navigation", "ready", destination);
  trackBootTiming("total", Date.now() - bootStart);

  return {
    status: "ready",
    destination,
    update: update.updateState === "NO_UPDATE" ? null : update,
    remoteConfig,
    role: meta?.role ?? null,
  };
}
