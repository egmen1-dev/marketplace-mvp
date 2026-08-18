import { loadAppConfig } from "../config/env";
import { getDeviceId } from "../storage/secure-session";
import { getRestCommerceTransport } from "../infrastructure/transport/rest-commerce-transport";
import type { MobileUpdateInfo, MobileUpdateState } from "./types";

/** Application infrastructure — update check (not commerce domain). */
export async function fetchMobileUpdateInfo(): Promise<MobileUpdateInfo> {
  const config = loadAppConfig();
  const versionCode = Number(config.buildNumber) || 1;
  const deviceId = getDeviceId();
  const qs = new URLSearchParams({
    versionCode: String(versionCode),
    deviceId,
    channel: "CLOSED_ALPHA",
  });
  const transport = getRestCommerceTransport();
  const raw = await transport.request<
    MobileUpdateInfo & {
      updateState?: MobileUpdateState;
      minimumVersionName?: string;
      minimumVersionCode?: number;
      reason?: "CLIENT_TOO_OLD";
    }
  >({ path: `/api/mobile/update?${qs.toString()}` });

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
