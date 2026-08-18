import type { MobileUpdateInfo } from "../api/endpoints";
import { fetchMobileUpdate } from "../api/endpoints";
import { isBuildExpired } from "./config";

export type VersionCheckResult = {
  supported: boolean;
  expired: boolean;
  update: MobileUpdateInfo | null;
  reason: "OK" | "CLIENT_TOO_OLD" | "BUILD_EXPIRED" | "UPDATE_REQUIRED";
};

export async function checkVersion(): Promise<VersionCheckResult> {
  if (isBuildExpired()) {
    return { supported: false, expired: true, update: null, reason: "BUILD_EXPIRED" };
  }

  const update = await fetchMobileUpdate();
  if (update.updateState === "UNSUPPORTED_CLIENT") {
    return { supported: false, expired: false, update, reason: "CLIENT_TOO_OLD" };
  }
  if (update.mandatory || update.updateState === "REQUIRED_UPDATE") {
    return { supported: true, expired: false, update, reason: "UPDATE_REQUIRED" };
  }
  return { supported: true, expired: false, update, reason: "OK" };
}
