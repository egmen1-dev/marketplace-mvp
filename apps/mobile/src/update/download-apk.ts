import { File } from "expo-file-system";
import { Platform } from "react-native";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import {
  describeUpdateError,
  mapThrownError,
  type UpdateErrorClass,
} from "../../../../lib/mobile/update-journey/error-taxonomy";
import {
  apkCacheFile,
  clearApkDownloadCache,
  deleteApkFile,
  findVerifiedCachedApk,
  lookupCachedApk,
  saveApkDownloadCache,
  verifyCachedApk,
  type ApkCacheState,
} from "./apk-download-cache";
import { openApkInstaller, openUnknownSourcesSettings } from "./install-apk-android";
import { normalizeSha256Hex, sha256HexFromFile, sha256Matches } from "./apk-sha256";
import {
  createUpdateActionId,
  recordUpdateJourneyEvent,
  type UpdateJourneyDiagnosticEvent,
} from "./journey-diagnostics";
import { UPDATE_ANALYTICS } from "./types";

export type ApkUpdateFlowState =
  | "AVAILABLE"
  | "DOWNLOAD_PREPARING"
  | "DOWNLOAD_STARTED"
  | "DOWNLOAD_PROGRESS"
  | "DOWNLOAD_COMPLETE"
  | "VERIFYING"
  | "VERIFIED"
  | "INSTALLER_PREPARING"
  | "INSTALLER_HANDOFF"
  | "INSTALLER_OPENED"
  | "INSTALL_PERMISSION_REQUIRED"
  | "FAILED";

export type DownloadProgressUpdate = {
  bytesWritten: number;
  totalBytes: number | null;
  percent: number | null;
};

export type StartApkDownloadOptions = {
  actionId?: string;
  onStateChange?: (state: ApkUpdateFlowState) => void;
  onCacheState?: (state: ApkCacheState) => void;
  onProgress?: (progress: DownloadProgressUpdate) => void;
};

export type StartApkDownloadResult =
  | { ok: true; state: "VERIFIED" | "INSTALLER_OPENED"; fromCache: boolean }
  | {
      ok: false;
      code: UpdateErrorClass;
      state: "FAILED" | "INSTALL_PERMISSION_REQUIRED";
      needsUnknownSources?: boolean;
    };

const PROGRESS_MILESTONES = [10, 25, 50, 75, 90, 100] as const;

function computePercent(bytesWritten: number, totalBytes: number | null): number | null {
  if (totalBytes == null || totalBytes <= 0) return null;
  return Math.min(100, Math.round((bytesWritten / totalBytes) * 100));
}

function logProgressMilestone(
  actionId: string,
  targetCode: number,
  progress: DownloadProgressUpdate,
  logged: Set<number>,
): void {
  const percent = progress.percent;
  if (percent == null) return;
  for (const milestone of PROGRESS_MILESTONES) {
    if (percent >= milestone && !logged.has(milestone)) {
      logged.add(milestone);
      recordUpdateJourneyEvent({
        event: "DOWNLOAD_PROGRESS",
        actionId,
        targetCode,
        bytesDownloaded: progress.bytesWritten,
        durationMs: percent,
      });
    }
  }
}

function emit(
  event: UpdateJourneyDiagnosticEvent["event"],
  actionId: string,
  extra: Partial<UpdateJourneyDiagnosticEvent> = {},
): void {
  recordUpdateJourneyEvent({ event, actionId, ...extra });
}

async function assertDownloadedFileIntegrity(input: {
  file: File;
  expectedSha: string;
  expectedSizeBytes?: number | null;
  actionId: string;
  targetCode: number;
}): Promise<void> {
  if (!input.file.exists) throw new Error("DOWNLOAD_FILESYSTEM");
  const size = input.file.size ?? 0;
  if (size <= 0) throw new Error("zero_byte_file");

  if (input.expectedSizeBytes != null && input.expectedSizeBytes > 0 && size !== input.expectedSizeBytes) {
    throw new Error("size_mismatch");
  }

  emit("SHA_VERIFY_STARTED", input.actionId, { targetCode: input.targetCode, bytesDownloaded: size });
  const started = Date.now();
  const actualSha = normalizeSha256Hex(await sha256HexFromFile(input.file));
  const durationMs = Date.now() - started;

  if (!actualSha || !sha256Matches(actualSha, input.expectedSha)) {
    emit("SHA_VERIFY_FAILED", input.actionId, {
      targetCode: input.targetCode,
      durationMs,
      errorClass: "VERIFY_SHA_MISMATCH",
      expectedShaPrefix: input.expectedSha.slice(0, 12),
      actualShaPrefix: actualSha?.slice(0, 12) ?? null,
    });
    throw new Error("sha256_verify_failed");
  }

  emit("SHA_VERIFY_COMPLETE", input.actionId, {
    targetCode: input.targetCode,
    durationMs,
    bytesDownloaded: size,
  });
}

async function downloadVerifiedApk(
  info: MobileUpdateInfo,
  downloadUrl: string,
  options: StartApkDownloadOptions,
): Promise<File> {
  const actionId = options.actionId ?? createUpdateActionId("apk-download");
  const expectedSha = normalizeSha256Hex(info.sha256);
  if (!expectedSha) throw new Error("UPDATE_METADATA_INVALID");

  const destination = apkCacheFile(info.versionCode);
  if (destination.exists) {
    await deleteApkFile(destination);
  }

  options.onStateChange?.("DOWNLOAD_PREPARING");
  emit("DOWNLOAD_PREPARING", actionId, { targetCode: info.versionCode });

  const totalHint = info.artifactSizeBytes ?? null;
  const loggedMilestones = new Set<number>();
  let lastProgress: DownloadProgressUpdate = {
    bytesWritten: 0,
    totalBytes: totalHint,
    percent: null,
  };

  options.onStateChange?.("DOWNLOAD_STARTED");
  emit("DOWNLOAD_HTTP_STARTED", actionId, { targetCode: info.versionCode, bytesDownloaded: totalHint ?? undefined });

  const downloaded = await File.downloadFileAsync(downloadUrl, destination, {
    idempotent: true,
    onProgress: ({ bytesWritten, totalBytes }) => {
      const progress: DownloadProgressUpdate = {
        bytesWritten,
        totalBytes: totalBytes > 0 ? totalBytes : totalHint,
        percent: computePercent(bytesWritten, totalBytes > 0 ? totalBytes : totalHint),
      };
      lastProgress = progress;
      options.onStateChange?.("DOWNLOAD_PROGRESS");
      options.onProgress?.(progress);
      logProgressMilestone(actionId, info.versionCode, progress, loggedMilestones);
    },
  });

  options.onStateChange?.("DOWNLOAD_COMPLETE");
  emit("DOWNLOAD_HTTP_COMPLETE", actionId, {
    targetCode: info.versionCode,
    bytesDownloaded: downloaded.size ?? lastProgress.bytesWritten,
  });

  options.onStateChange?.("VERIFYING");
  try {
    await assertDownloadedFileIntegrity({
      file: downloaded,
      expectedSha,
      expectedSizeBytes: info.artifactSizeBytes,
      actionId,
      targetCode: info.versionCode,
    });
  } catch (err) {
    await deleteApkFile(downloaded);
    throw err;
  }

  const actualSha = expectedSha;
  await saveApkDownloadCache({
    versionCode: info.versionCode,
    versionName: info.versionName,
    fileUri: downloaded.uri,
    sha256: actualSha,
    downloadedAt: new Date().toISOString(),
  });

  options.onStateChange?.("VERIFIED");
  return downloaded;
}

async function launchInstaller(
  file: File,
  info: MobileUpdateInfo,
  fromCache: boolean,
  options: StartApkDownloadOptions,
): Promise<StartApkDownloadResult> {
  const actionId = options.actionId ?? createUpdateActionId("apk-install");
  options.onStateChange?.("INSTALLER_PREPARING");
  emit("INSTALLER_PREPARING", actionId, { targetCode: info.versionCode });

  emit("INSTALLER_INTENT_STARTED", actionId, { targetCode: info.versionCode });
  const handoff = await openApkInstaller(file);
  if (handoff === "permission_required") {
    options.onStateChange?.("INSTALL_PERMISSION_REQUIRED");
    emit("INSTALL_PERMISSION_REQUIRED", actionId, { targetCode: info.versionCode });
    return {
      ok: false,
      code: "INSTALL_PERMISSION",
      state: "INSTALL_PERMISSION_REQUIRED",
      needsUnknownSources: true,
    };
  }

  options.onStateChange?.("INSTALLER_HANDOFF");
  emit("INSTALLER_INTENT_OPENED", actionId, { targetCode: info.versionCode });

  await postTelemetry({
    screen: "update",
    event: UPDATE_ANALYTICS.installOpened,
    errorCode: info.versionName,
  });

  options.onStateChange?.("INSTALLER_OPENED");
  return { ok: true, state: "INSTALLER_OPENED", fromCache };
}

export async function startApkDownload(
  info: MobileUpdateInfo,
  options?: StartApkDownloadOptions,
): Promise<StartApkDownloadResult> {
  const actionId = options?.actionId ?? createUpdateActionId("update-download");
  const setState = (state: ApkUpdateFlowState) => options?.onStateChange?.(state);

  if (!info.downloadUrl) {
    const code: UpdateErrorClass = "UPDATE_METADATA_INVALID";
    emit("UPDATE_FLOW_FAILED", actionId, { targetCode: info.versionCode, errorClass: code });
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: code });
    setState("FAILED");
    return { ok: false, code, state: "FAILED" };
  }

  if (Platform.OS !== "android") {
    const code: UpdateErrorClass = "UPDATE_METADATA_INVALID";
    setState("FAILED");
    return { ok: false, code, state: "FAILED" };
  }

  const expectedSha = normalizeSha256Hex(info.sha256);
  if (!expectedSha) {
    setState("FAILED");
    return { ok: false, code: "UPDATE_METADATA_INVALID", state: "FAILED" };
  }

  try {
    await postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.started,
      errorCode: info.versionName,
    });

    emit("CACHE_CHECK_STARTED", actionId, { targetCode: info.versionCode });
    const lookup = await lookupCachedApk({
      versionCode: info.versionCode,
      sha256: expectedSha,
      expectedSizeBytes: info.artifactSizeBytes,
    });
    options?.onCacheState?.(lookup.state === "CACHE_FOUND" ? "CACHE_FOUND" : lookup.state);

    let apkFile: File | null = null;
    let fromCache = false;

    if (lookup.state === "CACHE_FOUND") {
      options?.onCacheState?.("CACHE_VERIFYING");
      emit("CACHE_VERIFY_STARTED", actionId, { targetCode: info.versionCode });
      const verify = await verifyCachedApk({
        file: lookup.file,
        sha256: expectedSha,
        expectedSizeBytes: info.artifactSizeBytes,
      });
      if (verify.ok) {
        apkFile = lookup.file;
        fromCache = true;
        options?.onCacheState?.("CACHE_VALID");
        emit("CACHE_VALID", actionId, { targetCode: info.versionCode });
        setState("VERIFIED");
      } else {
        options?.onCacheState?.("CACHE_INVALID");
        emit("CACHE_INVALID", actionId, { targetCode: info.versionCode, errorClass: verify.reason });
        const deleted = await deleteApkFile(lookup.file);
        await clearApkDownloadCache();
        if (deleted === "delete_failed") {
          options?.onCacheState?.("CACHE_DELETE_FAILED");
        }
      }
    } else if (lookup.state === "CACHE_MISS") {
      emit("CACHE_MISS", actionId, { targetCode: info.versionCode });
    } else if (lookup.state === "CACHE_INVALID" || lookup.state === "CACHE_DELETE_FAILED") {
      emit("CACHE_INVALID", actionId, {
        targetCode: info.versionCode,
        errorClass: lookup.reason,
      });
    }

    if (!apkFile) {
      apkFile = await downloadVerifiedApk(info, info.downloadUrl, { ...options, actionId });
      fromCache = false;
      await postTelemetry({
        screen: "update",
        event: UPDATE_ANALYTICS.downloaded,
        errorCode: info.versionName,
      });
    }

    const installResult = await launchInstaller(apkFile, info, fromCache, { ...options, actionId });
    if (!installResult.ok) {
      setState(installResult.state === "INSTALL_PERMISSION_REQUIRED" ? "INSTALL_PERMISSION_REQUIRED" : "FAILED");
      if (installResult.state !== "INSTALL_PERMISSION_REQUIRED") {
        emit("INSTALLER_INTENT_FAILED", actionId, {
          targetCode: info.versionCode,
          errorClass: installResult.code,
        });
      }
      return installResult;
    }

    return installResult;
  } catch (err) {
    const code = mapThrownError(err);
    if (code === "VERIFY_SHA_MISMATCH" || code === "VERIFY_IO") {
      await clearApkDownloadCache();
    }
    emit("UPDATE_FLOW_FAILED", actionId, { targetCode: info.versionCode, errorClass: code });
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: code });
    setState("FAILED");
    return { ok: false, code, state: "FAILED" };
  }
}

export async function installCachedApkUpdate(
  info: MobileUpdateInfo,
  options?: StartApkDownloadOptions,
): Promise<StartApkDownloadResult> {
  const actionId = options?.actionId ?? createUpdateActionId("update-install");
  const setState = (state: ApkUpdateFlowState) => options?.onStateChange?.(state);
  const expectedSha = normalizeSha256Hex(info.sha256);
  if (!expectedSha) {
    setState("FAILED");
    return { ok: false, code: "UPDATE_METADATA_INVALID", state: "FAILED" };
  }

  const cached = await findVerifiedCachedApk({
    versionCode: info.versionCode,
    sha256: expectedSha,
    expectedSizeBytes: info.artifactSizeBytes,
  });
  if (!cached) {
    return startApkDownload(info, { ...options, actionId });
  }

  setState("VERIFIED");
  const installResult = await launchInstaller(cached, info, true, { ...options, actionId });
  if (!installResult.ok) {
    setState(installResult.state === "INSTALL_PERMISSION_REQUIRED" ? "INSTALL_PERMISSION_REQUIRED" : "FAILED");
    return installResult;
  }
  return installResult;
}

export function getUpdateErrorMessage(code: UpdateErrorClass): string {
  return describeUpdateError(code).message;
}

export { openUnknownSourcesSettings };
