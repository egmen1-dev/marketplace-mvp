import { beginBootSession, getCurrentBootId, getCurrentRetryCount } from "./boot-session";
import { bootLogger } from "./boot-logger";
import { parseBootFailure } from "./boot-errors";
import { saveRemoteConfigCache, saveStartupReport, loadRemoteConfigCache, DEFAULT_REMOTE_CONFIG } from "./boot-storage";
import { BootStage, type BootFailure, type StartupDestination, type StartupReport } from "./boot-types";
import { BOOT_STAGE_TIMEOUT_MS } from "./boot-timeouts";
import { restoreSession } from "./session-restore";
import {
  emitBootStageEvent,
  emitStartupEvent,
  STARTUP_EVENTS,
} from "./startup-telemetry";
import { withTimeout } from "./with-timeout";
import type { MobileUpdateInfo } from "../api/endpoints";
import { fetchBootstrap, fetchMobileUpdate, fetchRemoteConfig, postTelemetry } from "../api/endpoints";

export { BOOT_HARD_TIMEOUT_MS, BOOT_STAGE_TIMEOUT_MS } from "./boot-timeouts";
export type { BootFailure, StartupReport, StartupDestination } from "./boot-types";
export { getCurrentBootId, getCurrentRetryCount } from "./boot-session";

export type StartupPipelineResult =
  | { status: "unsupported"; update: MobileUpdateInfo; report: StartupReport }
  | {
      status: "ready";
      destination: StartupDestination;
      update: MobileUpdateInfo | null;
      remoteConfig: Record<string, unknown> | null;
      role: string | null;
      report: StartupReport;
    }
  | { status: "error"; failure: BootFailure; report: StartupReport };

function isUnsupportedUpdate(update: MobileUpdateInfo): boolean {
  return update.updateState === "UNSUPPORTED_CLIENT";
}

function defaultUpdateFallback(): MobileUpdateInfo {
  return {
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

function isValidUpdatePayload(update: MobileUpdateInfo): boolean {
  return typeof update.updateState === "string" && typeof update.versionCode === "number";
}

function sessionMeta(bootId: string, retryCount: number) {
  return { bootId, retryCount };
}

async function runStage<T>(
  stage: Exclude<BootStage, BootStage.DONE>,
  timeoutMs: number,
  fn: () => Promise<T>,
  bootId: string,
): Promise<{ ok: true; value: T; durationMs: number } | { ok: false; failure: BootFailure }> {
  const startedAt = Date.now();
  bootLogger.stageStart(stage);
  emitBootStageEvent("started", stage, undefined, undefined, bootId);
  try {
    const value = await withTimeout(stage.toLowerCase(), fn(), timeoutMs);
    const durationMs = Date.now() - startedAt;
    bootLogger.stageSuccess(stage, durationMs);
    emitBootStageEvent("success", stage, durationMs, undefined, bootId);
    return { ok: true, value, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const failure = parseBootFailure(stage, err, durationMs);
    bootLogger.stageFail(stage, failure);
    emitBootStageEvent("failed", stage, durationMs, failure.code, bootId);
    return { ok: false, failure };
  }
}

export async function runStartupPipeline(options?: { isRetry?: boolean }): Promise<StartupPipelineResult> {
  const { bootId, retryCount } = beginBootSession(Boolean(options?.isRetry));

  if (options?.isRetry) {
    emitStartupEvent(STARTUP_EVENTS.bootRetry, String(retryCount), bootId);
  }

  bootLogger.reset();
  emitStartupEvent(STARTUP_EVENTS.bootStarted, undefined, bootId);

  const bootstrap = await runStage(BootStage.BOOTSTRAP, BOOT_STAGE_TIMEOUT_MS[BootStage.BOOTSTRAP], fetchBootstrap, bootId);
  if (!bootstrap.ok) {
    const report = bootLogger.complete(false, undefined, sessionMeta(bootId, retryCount));
    emitStartupEvent(STARTUP_EVENTS.bootFailed, bootstrap.failure.code, bootId);
    emitStartupEvent(STARTUP_EVENTS.bootAborted, bootstrap.failure.code, bootId);
    await saveStartupReport(report);
    return { status: "error", failure: bootstrap.failure, report };
  }

  let remoteConfig: Record<string, unknown> | null = null;
  const remote = await runStage(BootStage.REMOTE_CONFIG, BOOT_STAGE_TIMEOUT_MS[BootStage.REMOTE_CONFIG], fetchRemoteConfig, bootId);
  if (remote.ok) {
    remoteConfig = remote.value.config ?? {};
    await saveRemoteConfigCache(remoteConfig);
  } else {
    const cached = (await loadRemoteConfigCache()) ?? DEFAULT_REMOTE_CONFIG;
    remoteConfig = cached;
    bootLogger.stageRecovered(BootStage.REMOTE_CONFIG, remote.failure.durationMs, remote.failure.message);
    emitBootStageEvent("success", BootStage.REMOTE_CONFIG, remote.failure.durationMs, "cached_config", bootId);
  }

  void postTelemetry({ screen: "boot", event: "session_start", bootId }).catch(() => null);

  let update: MobileUpdateInfo = defaultUpdateFallback();
  const updateStage = await runStage(BootStage.UPDATE, BOOT_STAGE_TIMEOUT_MS[BootStage.UPDATE], fetchMobileUpdate, bootId);
  if (updateStage.ok) {
    if (!isValidUpdatePayload(updateStage.value)) {
      bootLogger.stageRecovered(BootStage.UPDATE, updateStage.durationMs, "Invalid payload");
      emitBootStageEvent("success", BootStage.UPDATE, updateStage.durationMs, "invalid_payload_fallback", bootId);
    } else {
      update = updateStage.value;
    }
  } else {
    bootLogger.stageRecovered(BootStage.UPDATE, updateStage.failure.durationMs, updateStage.failure.message);
    emitBootStageEvent("success", BootStage.UPDATE, updateStage.failure.durationMs, "update_skipped", bootId);
  }

  if (isUnsupportedUpdate(update)) {
    const report = bootLogger.complete(false, undefined, sessionMeta(bootId, retryCount));
    await saveStartupReport(report);
    return { status: "unsupported", update, report };
  }

  let destination: StartupDestination = "login";
  let role: string | null = null;
  const sessionStage = await runStage(BootStage.SESSION, BOOT_STAGE_TIMEOUT_MS[BootStage.SESSION], restoreSession, bootId);
  if (sessionStage.ok) {
    const { token, meta, issue } = sessionStage.value;
    if (issue) {
      bootLogger.stageRecovered(BootStage.SESSION, sessionStage.durationMs, issue);
      emitBootStageEvent("success", BootStage.SESSION, sessionStage.durationMs, issue, bootId);
    }
    destination = token && meta ? "app" : "login";
    role = meta?.role ?? null;
  } else {
    bootLogger.stageRecovered(BootStage.SESSION, sessionStage.failure.durationMs, sessionStage.failure.message);
    emitBootStageEvent("success", BootStage.SESSION, sessionStage.failure.durationMs, "session_to_login", bootId);
    destination = "login";
    role = null;
  }

  const navigation = await runStage(
    BootStage.NAVIGATION,
    BOOT_STAGE_TIMEOUT_MS[BootStage.NAVIGATION],
    async () => {
      if (destination !== "login" && destination !== "app") {
        throw new Error("navigation failed");
      }
      return destination;
    },
    bootId,
  );

  if (!navigation.ok) {
    const report = bootLogger.complete(false, undefined, sessionMeta(bootId, retryCount));
    emitStartupEvent(STARTUP_EVENTS.bootFailed, navigation.failure.code, bootId);
    emitStartupEvent(STARTUP_EVENTS.bootAborted, navigation.failure.code, bootId);
    await saveStartupReport(report);
    return { status: "error", failure: navigation.failure, report };
  }

  bootLogger.stageSuccess(BootStage.DONE, 0);
  const report = bootLogger.complete(true, destination, sessionMeta(bootId, retryCount));
  emitStartupEvent(STARTUP_EVENTS.bootCompleted, destination, bootId);
  await saveStartupReport(report);

  return {
    status: "ready",
    destination,
    update: update.updateState === "NO_UPDATE" ? null : update,
    remoteConfig,
    role,
    report,
  };
}
