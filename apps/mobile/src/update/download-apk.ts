import { File } from "expo-file-system";
import { Platform } from "react-native";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import {
  apkCacheFile,
  findVerifiedCachedApk,
  saveApkDownloadCache,
  clearApkDownloadCache,
} from "./apk-download-cache";
import { openApkInstaller, openUnknownSourcesSettings } from "./install-apk-android";
import { normalizeSha256Hex, sha256HexFromFile, sha256Matches } from "./apk-sha256";
import { UPDATE_ANALYTICS, UPDATE_ERROR_MESSAGES, type UpdateFlowError } from "./types";

export type ApkUpdateFlowState =
  | "AVAILABLE"
  | "DOWNLOADING"
  | "READY_TO_INSTALL"
  | "INSTALLER_OPENED"
  | "FAILED";

export type StartApkDownloadOptions = {
  onStateChange?: (state: ApkUpdateFlowState) => void;
};

export type StartApkDownloadResult =
  | { ok: true; state: "READY_TO_INSTALL" | "INSTALLER_OPENED"; fromCache: boolean }
  | { ok: false; code: UpdateFlowError; state: "FAILED"; needsUnknownSources?: boolean };

export function mapUpdateError(err: unknown): UpdateFlowError {
  if (err instanceof Error) {
    if (/network|fetch|timeout/i.test(err.message)) return "network_error";
    if (/cancel/i.test(err.message)) return "update_cancelled";
    if (/sha256|verify/i.test(err.message)) return "sha_verification_failed";
    if (/content_uri|install|handoff/i.test(err.message)) return "install_handoff_failed";
  }
  return "download_failed";
}

export function getUpdateErrorMessage(code: UpdateFlowError): string {
  return UPDATE_ERROR_MESSAGES[code];
}

async function downloadVerifiedApk(info: MobileUpdateInfo, downloadUrl: string): Promise<File> {
  const expectedSha = normalizeSha256Hex(info.sha256);
  if (!expectedSha) {
    throw new Error("sha256_expected_missing");
  }

  const destination = apkCacheFile(info.versionCode);
  if (destination.exists) {
    destination.delete();
  }

  const downloaded = await File.downloadFileAsync(downloadUrl, destination, { idempotent: true });
  const actualSha = normalizeSha256Hex(await sha256HexFromFile(downloaded));
  if (!actualSha || !sha256Matches(actualSha, expectedSha)) {
    try {
      downloaded.delete();
    } catch {
      // ignore cleanup failures
    }
    throw new Error("sha256_verify_failed");
  }

  await saveApkDownloadCache({
    versionCode: info.versionCode,
    versionName: info.versionName,
    fileUri: downloaded.uri,
    sha256: actualSha,
    downloadedAt: new Date().toISOString(),
  });

  return downloaded;
}

async function launchInstaller(
  file: File,
  versionName: string,
  fromCache: boolean,
): Promise<StartApkDownloadResult> {
  const handoff = await openApkInstaller(file);
  if (handoff === "permission_required") {
    return { ok: false, code: "installer_permission_unavailable", state: "FAILED", needsUnknownSources: true };
  }

  await postTelemetry({
    screen: "update",
    event: UPDATE_ANALYTICS.installOpened,
    errorCode: versionName,
  });

  return { ok: true, state: "INSTALLER_OPENED", fromCache };
}

export async function startApkDownload(
  info: MobileUpdateInfo,
  options?: StartApkDownloadOptions,
): Promise<StartApkDownloadResult> {
  const setState = (state: ApkUpdateFlowState) => options?.onStateChange?.(state);

  if (!info.downloadUrl) {
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: "download_url_unavailable" });
    setState("FAILED");
    return { ok: false, code: "download_url_unavailable", state: "FAILED" };
  }

  if (Platform.OS !== "android") {
    setState("FAILED");
    return { ok: false, code: "incompatible_apk", state: "FAILED" };
  }

  const expectedSha = normalizeSha256Hex(info.sha256);
  if (!expectedSha) {
    setState("FAILED");
    return { ok: false, code: "sha_verification_failed", state: "FAILED" };
  }

  try {
    await postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.started,
      errorCode: info.versionName,
    });

    const cached = await findVerifiedCachedApk({
      versionCode: info.versionCode,
      sha256: expectedSha,
    });

    let apkFile = cached;
    let fromCache = Boolean(cached);

    if (!apkFile) {
      setState("DOWNLOADING");
      apkFile = await downloadVerifiedApk(info, info.downloadUrl);
      fromCache = false;
      await postTelemetry({
        screen: "update",
        event: UPDATE_ANALYTICS.downloaded,
        errorCode: info.versionName,
      });
    }

    setState("READY_TO_INSTALL");
    const installResult = await launchInstaller(apkFile, info.versionName, fromCache);
    if (!installResult.ok) {
      setState("FAILED");
      return installResult;
    }

    setState("INSTALLER_OPENED");
    return { ...installResult, fromCache };
  } catch (err) {
    const code = mapUpdateError(err);
    if (code === "sha_verification_failed") {
      await clearApkDownloadCache();
    }
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: code });
    setState("FAILED");
    return { ok: false, code, state: "FAILED" };
  }
}

export async function installCachedApkUpdate(
  info: MobileUpdateInfo,
  options?: StartApkDownloadOptions,
): Promise<StartApkDownloadResult> {
  const setState = (state: ApkUpdateFlowState) => options?.onStateChange?.(state);
  const expectedSha = normalizeSha256Hex(info.sha256);
  if (!expectedSha) {
    setState("FAILED");
    return { ok: false, code: "sha_verification_failed", state: "FAILED" };
  }

  const cached = await findVerifiedCachedApk({
    versionCode: info.versionCode,
    sha256: expectedSha,
  });
  if (!cached) {
    return startApkDownload(info, options);
  }

  setState("READY_TO_INSTALL");
  const installResult = await launchInstaller(cached, info.versionName, true);
  if (!installResult.ok) {
    setState("FAILED");
    return installResult;
  }
  setState("INSTALLER_OPENED");
  return { ...installResult, fromCache: true };
}

export { openUnknownSourcesSettings };
