import { Linking, Platform } from "react-native";

import type { MobileUpdateInfo } from "../api/endpoints";
import { postTelemetry } from "../api/endpoints";
import { UPDATE_ANALYTICS, UPDATE_ERROR_MESSAGES, type UpdateFlowError } from "./types";

export function mapUpdateError(err: unknown): UpdateFlowError {
  if (err instanceof Error) {
    if (/network|fetch|timeout/i.test(err.message)) return "network_error";
    if (/cancel/i.test(err.message)) return "update_cancelled";
  }
  return "download_failed";
}

export function getUpdateErrorMessage(code: UpdateFlowError): string {
  return UPDATE_ERROR_MESSAGES[code];
}

export async function startApkDownload(info: MobileUpdateInfo): Promise<{ ok: true } | { ok: false; code: UpdateFlowError }> {
  if (!info.downloadUrl) {
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: "download_url_unavailable" });
    return { ok: false, code: "download_url_unavailable" };
  }

  if (Platform.OS !== "android") {
    return { ok: false, code: "incompatible_apk" };
  }

  try {
    const canOpen = await Linking.canOpenURL(info.downloadUrl);
    if (!canOpen) {
      await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: "download_url_unavailable" });
      return { ok: false, code: "download_url_unavailable" };
    }

    // v1 flow: browser/download-manager handoff — we do NOT download or install in-app.
    await postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.started,
      errorCode: info.versionName,
    });

    await Linking.openURL(info.downloadUrl);

    await postTelemetry({
      screen: "update",
      event: UPDATE_ANALYTICS.installOpened,
      errorCode: info.versionName,
    });

    return { ok: true };
  } catch (err) {
    const code = mapUpdateError(err);
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.failed, errorCode: code });
    return { ok: false, code };
  }
}
