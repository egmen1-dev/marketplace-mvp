import type { MobileUpdateInfo } from "../api/endpoints";

/** Never offer an update when the published versionCode is not newer than the installed build. */
export function isUpdateEligibleForInstall(
  info: MobileUpdateInfo | null | undefined,
  installedVersionCode: number,
): boolean {
  if (!info) return false;
  if (info.updateState === "UNSUPPORTED_CLIENT") return true;
  if (!info.downloadUrl) return false;
  if (info.versionCode <= installedVersionCode) return false;
  if (!info.rollout.eligible) return false;
  return info.updateState !== "NO_UPDATE";
}
