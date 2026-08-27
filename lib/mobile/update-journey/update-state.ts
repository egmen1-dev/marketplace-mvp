/** Canonical update journey state — CHECK_ERROR ∩ UPDATE_AVAILABLE is impossible. */

export type UpdateJourneyPhase =
  | "IDLE"
  | "CHECKING"
  | "NO_UPDATE"
  | "UPDATE_AVAILABLE"
  | "CHECK_ERROR"
  | "DOWNLOAD_PREPARING"
  | "DOWNLOAD_STARTED"
  | "DOWNLOAD_PROGRESS"
  | "DOWNLOAD_COMPLETE"
  | "VERIFYING"
  | "VERIFIED"
  | "INSTALLER_PREPARING"
  | "INSTALLER_HANDOFF"
  | "INSTALLER_OPENED"
  | "INSTALL_PERMISSION_REQUIRED"
  | "DOWNLOAD_ERROR"
  | "VERIFY_ERROR"
  | "INSTALLER_ERROR";

export type UpdateErrorStage = "check" | "download" | "verify" | "install";

export type DownloadProgressSnapshot = {
  bytesWritten: number;
  totalBytes: number | null;
  percent: number | null;
  label: string | null;
} | null;

export type UpdateReleaseSnapshot = {
  versionName: string;
  versionCode: number;
  sha256: string | null;
  downloadUrl: string | null;
  artifactSizeBytes?: number | null;
};

export type UpdateJourneySnapshot = {
  phase: UpdateJourneyPhase;
  availableRelease: UpdateReleaseSnapshot | null;
  errorStage: UpdateErrorStage | null;
  errorMessage: string | null;
  errorClass: string | null;
  activeCheckSequence: number;
  hasCachedApk: boolean;
  updateActionId: string | null;
  downloadProgress: DownloadProgressSnapshot;
};

export type UpdateScreenUiContract = {
  showChecking: boolean;
  showUpToDate: boolean;
  showUpdateAvailable: boolean;
  showCheckError: boolean;
  showDownloadError: boolean;
  showVerifyError: boolean;
  showInstallError: boolean;
  showInstallPermission: boolean;
  showDownloading: boolean;
  showVerifying: boolean;
  showReadyToInstall: boolean;
  showInstallerOpened: boolean;
  showRetry: boolean;
  showDownloadCta: boolean;
  showInstallCta: boolean;
  showAllowInstallCta: boolean;
  progressLabel: string | null;
  errorTitle: string | null;
  availableVersionName: string | null;
};

const EMPTY_UI: UpdateScreenUiContract = {
  showChecking: false,
  showUpToDate: false,
  showUpdateAvailable: false,
  showCheckError: false,
  showDownloadError: false,
  showVerifyError: false,
  showInstallError: false,
  showInstallPermission: false,
  showDownloading: false,
  showVerifying: false,
  showReadyToInstall: false,
  showInstallerOpened: false,
  showRetry: false,
  showDownloadCta: false,
  showInstallCta: false,
  showAllowInstallCta: false,
  progressLabel: null,
  errorTitle: null,
  availableVersionName: null,
};

const DOWNLOADING_PHASES = new Set<UpdateJourneyPhase>([
  "DOWNLOAD_PREPARING",
  "DOWNLOAD_STARTED",
  "DOWNLOAD_PROGRESS",
  "DOWNLOAD_COMPLETE",
]);

export function hasUpdateContradiction(snapshot: UpdateJourneySnapshot): boolean {
  const ui = buildUpdateScreenUiContract(snapshot);
  const staleReleaseDuringCheckError =
    snapshot.phase === "CHECK_ERROR" && snapshot.availableRelease !== null;
  return (
    staleReleaseDuringCheckError ||
    (ui.showCheckError && (ui.showUpdateAvailable || ui.showDownloadCta))
  );
}

/** RC10.5 update.tsx secondary hint block — reproduced for regression only. */
export function legacyUpdateScreenWouldShowContradiction(input: {
  phase: string;
  hasUpdate: boolean;
  updateInfo: { versionName: string } | null;
}): boolean {
  const showFailed = input.phase === "failed";
  const showAvailableHint =
    input.hasUpdate &&
    input.phase !== "available" &&
    input.phase !== "downloading" &&
    input.phase !== "ready_to_install" &&
    Boolean(input.updateInfo);
  return showFailed && showAvailableHint;
}

export function buildUpdateScreenUiContract(snapshot: UpdateJourneySnapshot): UpdateScreenUiContract {
  const version = snapshot.availableRelease?.versionName ?? null;

  switch (snapshot.phase) {
    case "IDLE":
      return { ...EMPTY_UI };
    case "CHECKING":
      return { ...EMPTY_UI, showChecking: true };
    case "NO_UPDATE":
      return { ...EMPTY_UI, showUpToDate: true };
    case "UPDATE_AVAILABLE":
      return {
        ...EMPTY_UI,
        showUpdateAvailable: true,
        showDownloadCta: true,
        availableVersionName: version,
      };
    case "CHECK_ERROR":
      return {
        ...EMPTY_UI,
        showCheckError: true,
        showRetry: true,
        errorTitle: snapshot.errorMessage,
      };
    case "DOWNLOAD_PREPARING":
    case "DOWNLOAD_STARTED":
    case "DOWNLOAD_PROGRESS":
    case "DOWNLOAD_COMPLETE":
      return {
        ...EMPTY_UI,
        showDownloading: true,
        progressLabel: snapshot.downloadProgress?.label ?? null,
        availableVersionName: version,
      };
    case "VERIFYING":
      return {
        ...EMPTY_UI,
        showVerifying: true,
        progressLabel: snapshot.downloadProgress?.label ?? "Проверяем целостность обновления…",
        availableVersionName: version,
      };
    case "VERIFIED":
      return {
        ...EMPTY_UI,
        showReadyToInstall: true,
        showInstallCta: true,
        availableVersionName: version,
      };
    case "INSTALLER_PREPARING":
      return {
        ...EMPTY_UI,
        showVerifying: true,
        progressLabel: "Подготавливаем установку…",
        availableVersionName: version,
      };
    case "INSTALLER_HANDOFF":
    case "INSTALLER_OPENED":
      return {
        ...EMPTY_UI,
        showInstallerOpened: true,
        availableVersionName: version,
      };
    case "INSTALL_PERMISSION_REQUIRED":
      return {
        ...EMPTY_UI,
        showInstallPermission: true,
        showAllowInstallCta: true,
        showInstallCta: true,
        availableVersionName: version,
        errorTitle: snapshot.errorMessage,
      };
    case "DOWNLOAD_ERROR":
      return {
        ...EMPTY_UI,
        showDownloadError: true,
        showRetry: true,
        showDownloadCta: Boolean(snapshot.availableRelease),
        availableVersionName: version,
        errorTitle: snapshot.errorMessage,
      };
    case "VERIFY_ERROR":
      return {
        ...EMPTY_UI,
        showVerifyError: true,
        showRetry: true,
        showDownloadCta: Boolean(snapshot.availableRelease),
        availableVersionName: version,
        errorTitle: snapshot.errorMessage,
      };
    case "INSTALLER_ERROR":
      return {
        ...EMPTY_UI,
        showInstallError: true,
        showRetry: true,
        showInstallCta: Boolean(snapshot.availableRelease),
        availableVersionName: version,
        errorTitle: snapshot.errorMessage,
      };
    default:
      return { ...EMPTY_UI };
  }
}

export function beginUpdateCheck(sequence: number, actionId?: string | null): UpdateJourneySnapshot {
  return {
    phase: "CHECKING",
    availableRelease: null,
    errorStage: null,
    errorMessage: null,
    errorClass: null,
    activeCheckSequence: sequence,
    hasCachedApk: false,
    updateActionId: actionId ?? null,
    downloadProgress: null,
  };
}

export function completeUpdateCheck(
  snapshot: UpdateJourneySnapshot,
  input: {
    eligible: boolean;
    release: UpdateReleaseSnapshot | null;
    hasCachedApk: boolean;
  },
): UpdateJourneySnapshot {
  if (!input.eligible || !input.release) {
    return {
      ...snapshot,
      phase: "NO_UPDATE",
      availableRelease: null,
      errorStage: null,
      errorMessage: null,
      errorClass: null,
      hasCachedApk: false,
      downloadProgress: null,
    };
  }
  return {
    ...snapshot,
    phase: input.hasCachedApk ? "VERIFIED" : "UPDATE_AVAILABLE",
    availableRelease: input.release,
    errorStage: null,
    errorMessage: null,
    errorClass: null,
    hasCachedApk: input.hasCachedApk,
    downloadProgress: null,
  };
}

export function failUpdateCheck(
  snapshot: UpdateJourneySnapshot,
  message: string,
  errorClass: string | null = null,
): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "CHECK_ERROR",
    availableRelease: null,
    errorStage: "check",
    errorMessage: message,
    errorClass,
    hasCachedApk: false,
    downloadProgress: null,
  };
}

export function beginDownloadPreparing(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "DOWNLOAD_PREPARING",
    errorStage: null,
    errorMessage: null,
    errorClass: null,
    downloadProgress: null,
  };
}

export function applyDownloadFlowState(
  snapshot: UpdateJourneySnapshot,
  flowState: string,
  progress?: DownloadProgressSnapshot,
): UpdateJourneySnapshot {
  const phase = flowState as UpdateJourneyPhase;
  if (!DOWNLOADING_PHASES.has(phase) && phase !== "VERIFYING" && phase !== "VERIFIED" && ![
    "INSTALLER_PREPARING",
    "INSTALLER_HANDOFF",
    "INSTALLER_OPENED",
    "INSTALL_PERMISSION_REQUIRED",
  ].includes(phase)) {
    return snapshot;
  }
  return {
    ...snapshot,
    phase,
    downloadProgress: progress ?? snapshot.downloadProgress,
    errorStage: null,
    errorMessage: null,
    errorClass: null,
  };
}

export function beginDownload(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return beginDownloadPreparing(snapshot);
}

export function beginVerify(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return { ...snapshot, phase: "VERIFYING", errorStage: null, errorMessage: null, errorClass: null };
}

export function completeDownloadReady(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "VERIFIED",
    hasCachedApk: true,
    errorStage: null,
    errorMessage: null,
    errorClass: null,
    downloadProgress: null,
  };
}

export function completeInstallerHandoff(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "INSTALLER_OPENED",
    errorStage: null,
    errorMessage: null,
    errorClass: null,
    downloadProgress: null,
  };
}

export function requireInstallPermission(snapshot: UpdateJourneySnapshot, message: string): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "INSTALL_PERMISSION_REQUIRED",
    errorStage: "install",
    errorMessage: message,
    errorClass: "INSTALL_PERMISSION",
    downloadProgress: null,
  };
}

export function failDownload(
  snapshot: UpdateJourneySnapshot,
  message: string,
  errorClass: string | null = null,
): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "DOWNLOAD_ERROR",
    errorStage: "download",
    errorMessage: message,
    errorClass,
    downloadProgress: null,
  };
}

export function failVerify(
  snapshot: UpdateJourneySnapshot,
  message: string,
  errorClass: string | null = null,
): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "VERIFY_ERROR",
    errorStage: "verify",
    errorMessage: message,
    errorClass,
    downloadProgress: null,
  };
}

export function failInstallHandoff(
  snapshot: UpdateJourneySnapshot,
  message: string,
  errorClass: string | null = null,
): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "INSTALLER_ERROR",
    errorStage: "install",
    errorMessage: message,
    errorClass,
    downloadProgress: null,
  };
}

/** Reproduces RC10.5 buggy behavior for regression tests (RED baseline). */
export function legacyBuggyCheckFailure(
  snapshot: UpdateJourneySnapshot,
  message: string,
): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "CHECK_ERROR",
    errorStage: "check",
    errorMessage: message,
  };
}

export function formatDownloadProgressLabel(progress: DownloadProgressSnapshot): string | null {
  if (!progress) return null;
  if (progress.percent != null) {
    return `Скачивание обновления — ${progress.percent}%`;
  }
  if (progress.bytesWritten > 0 && progress.totalBytes != null && progress.totalBytes > 0) {
    const writtenMb = (progress.bytesWritten / (1024 * 1024)).toFixed(1);
    const totalMb = (progress.totalBytes / (1024 * 1024)).toFixed(1);
    return `Скачано ${writtenMb} из ${totalMb} МБ`;
  }
  return null;
}
