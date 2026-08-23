import { useCallback, useEffect, useState } from "react";

import { fetchMobileUpdate, postTelemetry } from "../api/endpoints";
import type { MobileUpdateInfo } from "../api/endpoints";
import { getBuildInfo } from "../beta/build-info";
import { getUpdateErrorMessage, startApkDownload } from "../update/download-apk";
import { UPDATE_UI_LABELS, type UpdateUiPhase } from "../update/update-ui-labels";
import { UPDATE_ANALYTICS } from "../update/types";
import { isUpdateEligibleForInstall } from "../utils/update-eligibility";

export function useUpdateCheckFlow(options?: { autoCheck?: boolean }) {
  const buildInfo = getBuildInfo();
  const [phase, setPhase] = useState<UpdateUiPhase>(options?.autoCheck ? "checking" : "checking");
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    setPhase("checking");
    setErrorMessage(null);
    try {
      const info = await fetchMobileUpdate();
      setUpdateInfo(info);
      if (isUpdateEligibleForInstall(info, buildInfo.buildNumber)) {
        setPhase("available");
      } else {
        setPhase("up_to_date");
      }
    } catch {
      setPhase("failed");
      setErrorMessage(UPDATE_UI_LABELS.installFailed);
    }
  }, [buildInfo.buildNumber]);

  useEffect(() => {
    if (options?.autoCheck !== false) {
      void checkForUpdate();
    }
  }, [checkForUpdate, options?.autoCheck]);

  const downloadUpdate = useCallback(async () => {
    if (!updateInfo) return;
    setPhase("handoff");
    setErrorMessage(null);
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });
    const result = await startApkDownload(updateInfo);
    if (!result.ok) {
      setPhase("failed");
      setErrorMessage(getUpdateErrorMessage(result.code));
    }
  }, [updateInfo]);

  const hasUpdate = isUpdateEligibleForInstall(updateInfo, buildInfo.buildNumber);

  return {
    buildInfo,
    phase,
    updateInfo,
    errorMessage,
    hasUpdate,
    checkForUpdate,
    downloadUpdate,
  };
}
