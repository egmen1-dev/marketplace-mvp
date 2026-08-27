import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  type DownloadProgressUpdate,
} from "../update/download-apk";
import {
  createUpdateActionId,
  recordUpdateJourneyEvent,
} from "../update/journey-diagnostics";
import { UPDATE_UI_LABELS } from "../update/update-ui-labels";
import { UPDATE_ANALYTICS } from "../update/types";
import { isUpdateEligibleForInstall } from "../utils/update-eligibility";
import {
  describeUpdateError,
  type UpdateErrorClass,
} from "../../../../lib/mobile/update-journey/error-taxonomy";
import {
  applyDownloadFlowState,
  beginDownloadPreparing,
  beginUpdateCheck,
  buildUpdateScreenUiContract,
  completeDownloadReady,
  completeInstallerHandoff,
  completeUpdateCheck,
  failDownload,
  failInstallHandoff,
  failUpdateCheck,
  failVerify,
  formatDownloadProgressLabel,
  requireInstallPermission,
  type UpdateJourneySnapshot,
  type UpdateReleaseSnapshot,
} from "../../../../lib/mobile/update-journey/update-state";
import { createUpdateCheckSequenceGuard } from "../../../../lib/mobile/update-journey/request-sequencing";

function toReleaseSnapshot(info: MobileUpdateInfo): UpdateReleaseSnapshot {
  return {
    versionName: info.versionName,
    versionCode: info.versionCode,
    sha256: info.sha256,
    downloadUrl: info.downloadUrl,
    artifactSizeBytes: info.artifactSizeBytes,
  };
}

function mapFlowErrorToSnapshot(
  snapshot: UpdateJourneySnapshot,
  code: UpdateErrorClass,
): UpdateJourneySnapshot {
  const message = getUpdateErrorMessage(code);
  const descriptor = describeUpdateError(code);
  if (descriptor.stage === "verify") return failVerify(snapshot, message, code);
  if (descriptor.stage === "install") {
    if (code === "INSTALL_PERMISSION") return requireInstallPermission(snapshot, message);
    return failInstallHandoff(snapshot, message, code);
  }
  if (descriptor.stage === "check") return failUpdateCheck(snapshot, message, code);
  return failDownload(snapshot, message, code);
}

function toProgressSnapshot(progress: DownloadProgressUpdate) {
  const snapshot = {
    bytesWritten: progress.bytesWritten,
    totalBytes: progress.totalBytes,
    percent: progress.percent,
    label: null as string | null,
  };
  snapshot.label = formatDownloadProgressLabel(snapshot);
  return snapshot;
}

export function useUpdateCheckFlow(options?: { autoCheck?: boolean }) {
  const buildInfo = getBuildInfo();
  const sequenceGuardRef = useRef(createUpdateCheckSequenceGuard());
  const [snapshot, setSnapshot] = useState<UpdateJourneySnapshot>({
    phase: options?.autoCheck === false ? "IDLE" : "CHECKING",
    availableRelease: null,
    errorStage: null,
    errorMessage: null,
    errorClass: null,
    activeCheckSequence: 0,
    hasCachedApk: false,
    updateActionId: null,
    downloadProgress: null,
  });
  const [needsUnknownSources, setNeedsUnknownSources] = useState(false);
  const ui = useMemo(() => buildUpdateScreenUiContract(snapshot), [snapshot]);

  const updateInfo = useMemo<MobileUpdateInfo | null>(() => {
    if (!snapshot.availableRelease) return null;
    return {
      latestVersion: snapshot.availableRelease.versionName,
      versionCode: snapshot.availableRelease.versionCode,
      versionName: snapshot.availableRelease.versionName,
      updateRequired: false,
      updateState: "OPTIONAL_UPDATE",
      mandatory: false,
      downloadUrl: snapshot.availableRelease.downloadUrl,
      sha256: snapshot.availableRelease.sha256,
      artifactSizeBytes: snapshot.availableRelease.artifactSizeBytes,
      releaseNotes: [],
      channel: "BETA",
      rollout: { percent: 100, eligible: true },
      compatibility: { compatible: true, forceUpgrade: false },
    };
  }, [snapshot.availableRelease]);

  const checkForUpdate = useCallback(async () => {
    const sequence = sequenceGuardRef.current.next();
    const actionId = createUpdateActionId("update-check");
    const startedAt = Date.now();
    setNeedsUnknownSources(false);
    setSnapshot(beginUpdateCheck(sequence, actionId));
    recordUpdateJourneyEvent({
      event: "UPDATE_CHECK_STARTED",
      actionId,
      installedCode: buildInfo.buildNumber,
    });

    try {
      const info = await fetchMobileUpdate();
      if (!sequenceGuardRef.current.isLatest(sequence)) return;

      const eligible = isUpdateEligibleForInstall(info, buildInfo.buildNumber);
      if (!eligible) {
        setSnapshot((prev) =>
          completeUpdateCheck(prev, {
            eligible: false,
            release: null,
            hasCachedApk: false,
          }),
        );
        recordUpdateJourneyEvent({
          event: "UPDATE_CHECK_SUCCESS",
          actionId,
          installedCode: buildInfo.buildNumber,
          latestCode: info.versionCode,
          durationMs: Date.now() - startedAt,
          finalState: "NO_UPDATE",
        });
        return;
      }

      let hasCachedApk = false;
      if (info.sha256) {
        recordUpdateJourneyEvent({
          event: "CACHE_VERIFY_STARTED",
          actionId,
          latestCode: info.versionCode,
          targetCode: info.versionCode,
        });
        const cached = await findVerifiedCachedApk({
          versionCode: info.versionCode,
          sha256: info.sha256,
          expectedSizeBytes: info.artifactSizeBytes,
        });
        hasCachedApk = Boolean(cached);
        recordUpdateJourneyEvent({
          event: hasCachedApk ? "CACHE_VALID" : "CACHE_MISS",
          actionId,
          latestCode: info.versionCode,
          targetCode: info.versionCode,
          finalState: hasCachedApk ? "VERIFIED" : "UPDATE_AVAILABLE",
        });
      }

      if (!sequenceGuardRef.current.isLatest(sequence)) return;

      setSnapshot((prev) =>
        completeUpdateCheck(prev, {
          eligible: true,
          release: toReleaseSnapshot(info),
          hasCachedApk,
        }),
      );
      recordUpdateJourneyEvent({
        event: hasCachedApk ? "UPDATE_CHECK_SUCCESS" : "UPDATE_AVAILABLE",
        actionId,
        installedCode: buildInfo.buildNumber,
        latestCode: info.versionCode,
        targetCode: info.versionCode,
        durationMs: Date.now() - startedAt,
        finalState: hasCachedApk ? "VERIFIED" : "UPDATE_AVAILABLE",
      });
    } catch (err) {
      if (!sequenceGuardRef.current.isLatest(sequence)) return;
      setSnapshot((prev) => failUpdateCheck(prev, UPDATE_UI_LABELS.checkFailed, "UPDATE_CHECK_NETWORK"));
      recordUpdateJourneyEvent({
        event: "UPDATE_CHECK_FAILED",
        actionId,
        installedCode: buildInfo.buildNumber,
        durationMs: Date.now() - startedAt,
        errorCode: err instanceof Error ? err.message.slice(0, 80) : "check_failed",
        errorClass: "UPDATE_CHECK_NETWORK",
        finalState: "CHECK_ERROR",
      });
    }
  }, [buildInfo.buildNumber]);

  useEffect(() => {
    if (options?.autoCheck !== false) {
      void checkForUpdate();
    }
  }, [checkForUpdate, options?.autoCheck]);

  const downloadUpdate = useCallback(async () => {
    if (!updateInfo || !snapshot.availableRelease) return;
    const actionId = createUpdateActionId("update-download");
    setNeedsUnknownSources(false);
    setSnapshot((prev) => ({
      ...beginDownloadPreparing(prev),
      updateActionId: actionId,
    }));
    recordUpdateJourneyEvent({
      event: "UPDATE_CTA_PRESS",
      actionId,
      installedCode: buildInfo.buildNumber,
      targetCode: updateInfo.versionCode,
    });
    recordUpdateJourneyEvent({
      event: "UPDATE_DOWNLOAD_STARTED",
      actionId,
      installedCode: buildInfo.buildNumber,
      latestCode: updateInfo.versionCode,
      targetCode: updateInfo.versionCode,
    });
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });

    const useVerifiedCache =
      snapshot.hasCachedApk &&
      (snapshot.phase === "VERIFIED" ||
        snapshot.phase === "INSTALLER_ERROR" ||
        snapshot.phase === "INSTALL_PERMISSION_REQUIRED");
    const runner = useVerifiedCache ? installCachedApkUpdate : startApkDownload;
    const result = await runner(updateInfo, {
      actionId,
      onStateChange: (flowState: ApkUpdateFlowState) => {
        setSnapshot((prev) => applyDownloadFlowState(prev, flowState));
      },
      onProgress: (progress) => {
        setSnapshot((prev) => ({
          ...applyDownloadFlowState(prev, "DOWNLOAD_PROGRESS"),
          downloadProgress: toProgressSnapshot(progress),
        }));
      },
    });

    if (!result.ok) {
      if (result.state === "INSTALL_PERMISSION_REQUIRED") {
        setSnapshot((prev) => requireInstallPermission(prev, getUpdateErrorMessage(result.code)));
        setNeedsUnknownSources(true);
        recordUpdateJourneyEvent({
          event: "INSTALL_PERMISSION_REQUIRED",
          actionId,
          installedCode: buildInfo.buildNumber,
          targetCode: updateInfo.versionCode,
          errorClass: result.code,
          finalState: "INSTALL_PERMISSION_REQUIRED",
        });
        return;
      }

      setSnapshot((prev) => mapFlowErrorToSnapshot(prev, result.code));
      setNeedsUnknownSources(Boolean(result.needsUnknownSources));
      recordUpdateJourneyEvent({
        event:
          describeUpdateError(result.code).stage === "verify"
            ? "SHA_VERIFY_FAILED"
            : describeUpdateError(result.code).stage === "install"
              ? "INSTALLER_INTENT_FAILED"
              : "UPDATE_FLOW_FAILED",
        actionId,
        installedCode: buildInfo.buildNumber,
        targetCode: updateInfo.versionCode,
        errorClass: result.code,
        finalState: describeUpdateError(result.code).stage === "verify" ? "VERIFY_ERROR" : "DOWNLOAD_ERROR",
      });
      return;
    }

    setSnapshot((prev) =>
      result.state === "INSTALLER_OPENED" ? completeInstallerHandoff(prev) : completeDownloadReady(prev),
    );
    recordUpdateJourneyEvent({
      event: result.state === "INSTALLER_OPENED" ? "INSTALLER_INTENT_OPENED" : "UPDATE_DOWNLOAD_SUCCESS",
      actionId,
      installedCode: buildInfo.buildNumber,
      targetCode: updateInfo.versionCode,
      finalState: result.state,
    });
  }, [buildInfo.buildNumber, snapshot.availableRelease, snapshot.hasCachedApk, snapshot.phase, updateInfo]);

  return {
    buildInfo,
    ui,
    snapshot,
    updateInfo,
    needsUnknownSources,
    checkForUpdate,
    downloadUpdate,
    openUnknownSourcesSettings,
  };
}
