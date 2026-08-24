import { fetchMobileUpdate, type MobileUpdateInfo } from "../api/endpoints";
import { loadAppConfig } from "../config/env";
import { isUpdateEligibleForInstall } from "../utils/update-eligibility";

export function installedVersionCode(): number {
  return Number(loadAppConfig().buildNumber) || 1;
}

export function isInstallableUpdate(info: MobileUpdateInfo | null | undefined): boolean {
  return isUpdateEligibleForInstall(info, installedVersionCode());
}

export async function fetchInstallableUpdate(): Promise<MobileUpdateInfo | null> {
  const payload = await fetchMobileUpdate();
  return isInstallableUpdate(payload) ? payload : null;
}
