/** Canonical update journey state — CHECK_ERROR ∩ UPDATE_AVAILABLE is impossible. */

export type UpdateJourneyPhase =
  | "IDLE"
  | "CHECKING"
  | "NO_UPDATE"
  | "UPDATE_AVAILABLE"
  | "CHECK_ERROR"
  | "DOWNLOADING"
  | "VERIFYING"
  | "READY_TO_INSTALL"
  | "INSTALLER_HANDOFF"
  | "DOWNLOAD_ERROR"
  | "VERIFY_ERROR"
  | "INSTALL_HANDOFF_ERROR";

export type UpdateErrorStage = "check" | "download" | "verify" | "install";

export type UpdateReleaseSnapshot = {
  versionName: string;
  versionCode: number;
  sha256: string | null;
  downloadUrl: string | null;
};

export type UpdateJourneySnapshot = {
  phase: UpdateJourneyPhase;
  availableRelease: UpdateReleaseSnapshot | null;
  errorStage: UpdateErrorStage | null;
  errorMessage: string | null;
  activeCheckSequence: number;
  hasCachedApk: boolean;
};

export type UpdateScreenUiContract = {
  showChecking: boolean;
  showUpToDate: boolean;
  showUpdateAvailable: boolean;
  showCheckError: boolean;
  showDownloadError: boolean;
  showVerifyError: boolean;
  showInstallError: boolean;
  showDownloading: boolean;
  showReadyToInstall: boolean;
  showInstallerOpened: boolean;
  showRetry: boolean;
  showDownloadCta: boolean;
  showInstallCta: boolean;
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
  showDownloading: false,
  showReadyToInstall: false,
  showInstallerOpened: false,
  showRetry: false,
  showDownloadCta: false,
  showInstallCta: false,
  errorTitle: null,
  availableVersionName: null,
};

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
    case "DOWNLOADING":
      return {
        ...EMPTY_UI,
        showDownloading: true,
        availableVersionName: version,
      };
    case "VERIFYING":
      return {
        ...EMPTY_UI,
        showDownloading: true,
        availableVersionName: version,
      };
    case "READY_TO_INSTALL":
      return {
        ...EMPTY_UI,
        showReadyToInstall: true,
        showInstallCta: true,
        availableVersionName: version,
      };
    case "INSTALLER_HANDOFF":
      return {
        ...EMPTY_UI,
        showInstallerOpened: true,
        availableVersionName: version,
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
    case "INSTALL_HANDOFF_ERROR":
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

export function beginUpdateCheck(sequence: number): UpdateJourneySnapshot {
  return {
    phase: "CHECKING",
    availableRelease: null,
    errorStage: null,
    errorMessage: null,
    activeCheckSequence: sequence,
    hasCachedApk: false,
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
      hasCachedApk: false,
    };
  }
  return {
    ...snapshot,
    phase: input.hasCachedApk ? "READY_TO_INSTALL" : "UPDATE_AVAILABLE",
    availableRelease: input.release,
    errorStage: null,
    errorMessage: null,
    hasCachedApk: input.hasCachedApk,
  };
}

export function failUpdateCheck(snapshot: UpdateJourneySnapshot, message: string): UpdateJourneySnapshot {
  return {
    ...snapshot,
    phase: "CHECK_ERROR",
    availableRelease: null,
    errorStage: "check",
    errorMessage: message,
    hasCachedApk: false,
  };
}

export function beginDownload(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return { ...snapshot, phase: "DOWNLOADING", errorStage: null, errorMessage: null };
}

export function beginVerify(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return { ...snapshot, phase: "VERIFYING", errorStage: null, errorMessage: null };
}

export function completeDownloadReady(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return { ...snapshot, phase: "READY_TO_INSTALL", hasCachedApk: true, errorStage: null, errorMessage: null };
}

export function completeInstallerHandoff(snapshot: UpdateJourneySnapshot): UpdateJourneySnapshot {
  return { ...snapshot, phase: "INSTALLER_HANDOFF", errorStage: null, errorMessage: null };
}

export function failDownload(snapshot: UpdateJourneySnapshot, message: string): UpdateJourneySnapshot {
  return { ...snapshot, phase: "DOWNLOAD_ERROR", errorStage: "download", errorMessage: message };
}

export function failVerify(snapshot: UpdateJourneySnapshot, message: string): UpdateJourneySnapshot {
  return { ...snapshot, phase: "VERIFY_ERROR", errorStage: "verify", errorMessage: message };
}

export function failInstallHandoff(snapshot: UpdateJourneySnapshot, message: string): UpdateJourneySnapshot {
  return { ...snapshot, phase: "INSTALL_HANDOFF_ERROR", errorStage: "install", errorMessage: message };
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
