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

async function runStage<T>(
  stage: Exclude<BootStage, BootStage.DONE>,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T; durationMs: number } | { ok: false; failure: BootFailure }> {
  const startedAt = Date.now();
  bootLogger.stageStart(stage);
  emitBootStageEvent("started", stage);
  try {
    const value = await withTimeout(stage.toLowerCase(), fn(), timeoutMs);
    const durationMs = Date.now() - startedAt;
    bootLogger.stageSuccess(stage, durationMs);
    emitBootStageEvent("success", stage, durationMs);
    return { ok: true, value, durationMs };
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const failure = parseBootFailure(stage, err, durationMs);
    bootLogger.stageFail(stage, failure);
    emitBootStageEvent("failed", stage, durationMs, failure.code);
    return { ok: false, failure };
  }
}

export async function runStartupPipeline(options?: { isRetry?: boolean }): Promise<StartupPipelineResult> {
  if (options?.isRetry) {
    emitStartupEvent(STARTUP_EVENTS.bootRetry);
  }

  bootLogger.reset();
  emitStartupEvent(STARTUP_EVENTS.bootStarted);

  const bootstrap = await runStage(BootStage.BOOTSTRAP, BOOT_STAGE_TIMEOUT_MS[BootStage.BOOTSTRAP], fetchBootstrap);
  if (!bootstrap.ok) {
    const report = bootLogger.complete(false);
    emitStartupEvent(STARTUP_EVENTS.bootAborted, bootstrap.failure.code);
    await saveStartupReport(report);
    return { status: "error", failure: bootstrap.failure, report };
  }

  let remoteConfig: Record<string, unknown> | null = null;
  const remote = await runStage(BootStage.REMOTE_CONFIG, BOOT_STAGE_TIMEOUT_MS[BootStage.REMOTE_CONFIG], fetchRemoteConfig);
  if (remote.ok) {
    remoteConfig = remote.value.config ?? {};
    await saveRemoteConfigCache(remoteConfig);
  } else {
    const cached = (await loadRemoteConfigCache()) ?? DEFAULT_REMOTE_CONFIG;
    remoteConfig = cached;
    bootLogger.stageRecovered(
      BootStage.REMOTE_CONFIG,
      remote.failure.durationMs,
      remote.failure.message,
    );
    emitBootStageEvent("success", BootStage.REMOTE_CONFIG, remote.failure.durationMs, "cached_config");
  }

  void postTelemetry({ screen: "boot", event: "session_start" }).catch(() => null);

  let update: MobileUpdateInfo = defaultUpdateFallback();
  const updateStage = await runStage(BootStage.UPDATE, BOOT_STAGE_TIMEOUT_MS[BootStage.UPDATE], fetchMobileUpdate);
  if (updateStage.ok) {
    if (!isValidUpdatePayload(updateStage.value)) {
      const durationMs = updateStage.durationMs;
      bootLogger.stageRecovered(BootStage.UPDATE, durationMs, "Invalid payload");
      emitBootStageEvent("success", BootStage.UPDATE, durationMs, "invalid_payload_fallback");
    } else {
      update = updateStage.value;
    }
  } else {
    bootLogger.stageRecovered(BootStage.UPDATE, updateStage.failure.durationMs, updateStage.failure.message);
    emitBootStageEvent("success", BootStage.UPDATE, updateStage.failure.durationMs, "update_skipped");
  }

  if (isUnsupportedUpdate(update)) {
    const report = bootLogger.complete(false);
    await saveStartupReport(report);
    return { status: "unsupported", update, report };
  }

  let destination: StartupDestination = "login";
  let role: string | null = null;
  const sessionStage = await runStage(BootStage.SESSION, BOOT_STAGE_TIMEOUT_MS[BootStage.SESSION], restoreSession);
  if (sessionStage.ok) {
    const { token, meta, issue } = sessionStage.value;
    if (issue) {
      bootLogger.stageRecovered(BootStage.SESSION, sessionStage.durationMs, issue);
      emitBootStageEvent("success", BootStage.SESSION, sessionStage.durationMs, issue);
    }
    destination = token && meta ? "app" : "login";
    role = meta?.role ?? null;
  } else {
    bootLogger.stageRecovered(
      BootStage.SESSION,
      sessionStage.failure.durationMs,
      sessionStage.failure.message,
    );
    emitBootStageEvent("success", BootStage.SESSION, sessionStage.failure.durationMs, "session_to_login");
    destination = "login";
    role = null;
  }

  const navigation = await runStage(BootStage.NAVIGATION, BOOT_STAGE_TIMEOUT_MS[BootStage.NAVIGATION], async () => {
    if (destination !== "login" && destination !== "app") {
      throw new Error("navigation failed");
    }
    return destination;
  });

  if (!navigation.ok) {
    const report = bootLogger.complete(false);
    emitStartupEvent(STARTUP_EVENTS.bootAborted, navigation.failure.code);
    await saveStartupReport(report);
    return { status: "error", failure: navigation.failure, report };
  }

  bootLogger.stageSuccess(BootStage.DONE, 0);
  const report = bootLogger.complete(true, destination);
  emitStartupEvent(STARTUP_EVENTS.bootCompleted, destination);
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
