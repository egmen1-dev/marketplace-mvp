import { useCallback, useEffect, useState } from "react";

import { fetchMobileUpdate, postTelemetry } from "../api/endpoints";
import type { MobileUpdateInfo } from "../api/endpoints";
import { getBuildInfo } from "../beta/build-info";
import { findVerifiedCachedApk } from "../update/apk-download-cache";
import {
  getUpdateErrorMessage,
  installCachedApkUpdate,
  openUnknownSourcesSettings,
  startApkDownload,
  type ApkUpdateFlowState,
} from "../update/download-apk";
import { UPDATE_UI_LABELS, type UpdateUiPhase } from "../update/update-ui-labels";
import { UPDATE_ANALYTICS } from "../update/types";
import { isUpdateEligibleForInstall } from "../utils/update-eligibility";

function phaseFromFlowState(flowState: ApkUpdateFlowState, hasCachedApk: boolean): UpdateUiPhase {
  if (flowState === "DOWNLOADING") return "downloading";
  if (flowState === "READY_TO_INSTALL") return "ready_to_install";
  if (flowState === "INSTALLER_OPENED") return "installer_opened";
  if (hasCachedApk) return "ready_to_install";
  return "available";
}

export function useUpdateCheckFlow(options?: { autoCheck?: boolean }) {
  const buildInfo = getBuildInfo();
  const [phase, setPhase] = useState<UpdateUiPhase>(options?.autoCheck ? "checking" : "checking");
  const [updateInfo, setUpdateInfo] = useState<MobileUpdateInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCachedApk, setHasCachedApk] = useState(false);
  const [needsUnknownSources, setNeedsUnknownSources] = useState(false);

  const checkForUpdate = useCallback(async () => {
    setPhase("checking");
    setErrorMessage(null);
    setNeedsUnknownSources(false);
    try {
      const info = await fetchMobileUpdate();
      setUpdateInfo(info);
      if (isUpdateEligibleForInstall(info, buildInfo.buildNumber)) {
        if (info.sha256) {
          const cached = await findVerifiedCachedApk({
            versionCode: info.versionCode,
            sha256: info.sha256,
          });
          setHasCachedApk(Boolean(cached));
          setPhase(cached ? "ready_to_install" : "available");
        } else {
          setHasCachedApk(false);
          setPhase("available");
        }
      } else {
        setHasCachedApk(false);
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
    setErrorMessage(null);
    setNeedsUnknownSources(false);
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });

    const runner = hasCachedApk ? installCachedApkUpdate : startApkDownload;
    const result = await runner(updateInfo, {
      onStateChange: (flowState) => setPhase(phaseFromFlowState(flowState, hasCachedApk)),
    });

    if (!result.ok) {
      setPhase("failed");
      setErrorMessage(getUpdateErrorMessage(result.code));
      setNeedsUnknownSources(Boolean(result.needsUnknownSources));
      return;
    }

    setHasCachedApk(true);
    setPhase(result.state === "INSTALLER_OPENED" ? "installer_opened" : "ready_to_install");
  }, [hasCachedApk, updateInfo]);

  const hasUpdate = isUpdateEligibleForInstall(updateInfo, buildInfo.buildNumber);

  return {
    buildInfo,
    phase,
    updateInfo,
    errorMessage,
    hasUpdate,
    hasCachedApk,
    needsUnknownSources,
    checkForUpdate,
    downloadUpdate,
    openUnknownSourcesSettings,
  };
}
