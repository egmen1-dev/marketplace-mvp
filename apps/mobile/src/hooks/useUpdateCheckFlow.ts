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
} from "../update/download-apk";
import {
  createUpdateActionId,
  recordUpdateJourneyEvent,
} from "../update/journey-diagnostics";
import { UPDATE_UI_LABELS } from "../update/update-ui-labels";
import { UPDATE_ANALYTICS } from "../update/types";
import { isUpdateEligibleForInstall } from "../utils/update-eligibility";
import {
  beginDownload,
  beginUpdateCheck,
  buildUpdateScreenUiContract,
  completeDownloadReady,
  completeInstallerHandoff,
  completeUpdateCheck,
  failDownload,
  failInstallHandoff,
  failUpdateCheck,
  failVerify,
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
  };
}

function mapFlowErrorToSnapshot(
  snapshot: UpdateJourneySnapshot,
  code: Parameters<typeof getUpdateErrorMessage>[0],
): UpdateJourneySnapshot {
  const message = getUpdateErrorMessage(code);
  if (code === "sha_verification_failed") return failVerify(snapshot, message);
  if (code === "install_handoff_failed" || code === "installer_permission_unavailable") {
    return failInstallHandoff(snapshot, message);
  }
  return failDownload(snapshot, message);
}

export function useUpdateCheckFlow(options?: { autoCheck?: boolean }) {
  const buildInfo = getBuildInfo();
  const sequenceGuardRef = useRef(createUpdateCheckSequenceGuard());
  const [snapshot, setSnapshot] = useState<UpdateJourneySnapshot>({
    phase: options?.autoCheck === false ? "IDLE" : "CHECKING",
    availableRelease: null,
    errorStage: null,
    errorMessage: null,
    activeCheckSequence: 0,
    hasCachedApk: false,
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
    setSnapshot(beginUpdateCheck(sequence));
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
        recordUpdateJourneyEvent({ event: "UPDATE_VERIFY_STARTED", actionId, latestCode: info.versionCode });
        const cached = await findVerifiedCachedApk({
          versionCode: info.versionCode,
          sha256: info.sha256,
        });
        hasCachedApk = Boolean(cached);
        recordUpdateJourneyEvent({
          event: "UPDATE_VERIFY_SUCCESS",
          actionId,
          latestCode: info.versionCode,
          finalState: hasCachedApk ? "READY_TO_INSTALL" : "UPDATE_AVAILABLE",
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
        durationMs: Date.now() - startedAt,
        finalState: hasCachedApk ? "READY_TO_INSTALL" : "UPDATE_AVAILABLE",
      });
    } catch (err) {
      if (!sequenceGuardRef.current.isLatest(sequence)) return;
      setSnapshot((prev) => failUpdateCheck(prev, UPDATE_UI_LABELS.checkFailed));
      recordUpdateJourneyEvent({
        event: "UPDATE_CHECK_FAILED",
        actionId,
        installedCode: buildInfo.buildNumber,
        durationMs: Date.now() - startedAt,
        errorCode: err instanceof Error ? err.message.slice(0, 80) : "check_failed",
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
    setSnapshot((prev) => beginDownload(prev));
    recordUpdateJourneyEvent({
      event: "UPDATE_DOWNLOAD_STARTED",
      actionId,
      installedCode: buildInfo.buildNumber,
      latestCode: updateInfo.versionCode,
    });
    await postTelemetry({ screen: "update", event: UPDATE_ANALYTICS.started, errorCode: updateInfo.versionName });

    const runner = snapshot.hasCachedApk ? installCachedApkUpdate : startApkDownload;
    const result = await runner(updateInfo, {
      onStateChange: (flowState: ApkUpdateFlowState) => {
        if (flowState === "DOWNLOADING") {
          setSnapshot((prev) => beginDownload(prev));
        }
        if (flowState === "READY_TO_INSTALL") {
          setSnapshot((prev) => completeDownloadReady(prev));
        }
      },
    });

    if (!result.ok) {
      const failedPhase =
        result.code === "sha_verification_failed"
          ? "VERIFY_ERROR"
          : result.code === "install_handoff_failed" || result.code === "installer_permission_unavailable"
            ? "INSTALL_HANDOFF_ERROR"
            : "DOWNLOAD_ERROR";
      setSnapshot((prev) => mapFlowErrorToSnapshot(prev, result.code));
      setNeedsUnknownSources(Boolean(result.needsUnknownSources));
      recordUpdateJourneyEvent({
        event:
          result.code === "sha_verification_failed"
            ? "UPDATE_VERIFY_FAILED"
            : result.code === "install_handoff_failed" || result.code === "installer_permission_unavailable"
              ? "UPDATE_INSTALL_HANDOFF_FAILED"
              : "UPDATE_DOWNLOAD_STARTED",
        actionId,
        installedCode: buildInfo.buildNumber,
        latestCode: updateInfo.versionCode,
        errorCode: result.code,
        finalState: failedPhase,
      });
      return;
    }

    setSnapshot((prev) =>
      result.state === "INSTALLER_OPENED" ? completeInstallerHandoff(prev) : completeDownloadReady(prev),
    );
    recordUpdateJourneyEvent({
      event: result.state === "INSTALLER_OPENED" ? "UPDATE_INSTALL_HANDOFF" : "UPDATE_DOWNLOAD_SUCCESS",
      actionId,
      installedCode: buildInfo.buildNumber,
      latestCode: updateInfo.versionCode,
      finalState: result.state,
    });
  }, [buildInfo.buildNumber, snapshot.availableRelease, snapshot.hasCachedApk, updateInfo]);

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
