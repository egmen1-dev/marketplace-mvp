/**
 * Deterministic RC10.5 failed-phase download transition model (91b9c1d).
 */

import type { Rc105CheckSnapshot, Rc105UpdateInfo } from "./types";

export type FailedPhaseTransition = {
  step: string;
  phase: string;
  errorMessage: string | null;
  notes: string;
};

export type FailedPhaseDownloadAnalysis = {
  supported: "YES" | "NO" | "BROKEN";
  phaseGuardBlocksDownload: boolean;
  setPhaseDownloadingOnTap: boolean;
  downloadUrlRequired: boolean;
  sha256Required: boolean;
  abortControllerFromCheck: boolean;
  competingCheckOnFocus: boolean;
  transitions: FailedPhaseTransition[];
  verdict: string;
};

const RC107: Rc105UpdateInfo = {
  versionName: "0.1.15-beta.8",
  versionCode: 23,
  downloadUrl: "https://web-production-e56fb.up.railway.app/api/mobile/releases/apk?versionCode=23",
  sha256: "4b4f88df493eee141019d27e88da37840186e21dbcd45429364e031aa5d9a043",
  updateState: "OPTIONAL_UPDATE",
  rollout: { eligible: true },
};

export function analyzeFailedPhaseDownload(snapshot?: Partial<Rc105CheckSnapshot>): FailedPhaseDownloadAnalysis {
  const base: Rc105CheckSnapshot = {
    phase: "failed",
    updateInfo: RC107,
    errorMessage: "Не удалось проверить обновление. Проверьте интернет и попробуйте позже.",
    hasCachedApk: false,
    ...snapshot,
  };

  const transitions: FailedPhaseTransition[] = [
    {
      step: "initial",
      phase: base.phase,
      errorMessage: base.errorMessage,
      notes: "availableHint still visible; hasUpdate=true from updateInfo",
    },
    {
      step: "downloadUpdate_entry",
      phase: base.phase,
      errorMessage: null,
      notes: "setErrorMessage(null) — does NOT change phase yet",
    },
    {
      step: "postTelemetry_started",
      phase: base.phase,
      errorMessage: null,
      notes: "still failed until onStateChange",
    },
    {
      step: "startApkDownload_cache_lookup",
      phase: base.phase,
      errorMessage: null,
      notes: "findVerifiedCachedApk may throw/OOM before DOWNLOADING",
    },
    {
      step: "onStateChange_DOWNLOADING",
      phase: "downloading",
      errorMessage: null,
      notes: "only if cache lookup completes without throw",
    },
    {
      step: "File_downloadFileAsync",
      phase: "downloading",
      errorMessage: null,
      notes: "HTTP to MRP proxy begins",
    },
    {
      step: "on_failure",
      phase: "failed",
      errorMessage: "network_error copy",
      notes: "setPhase failed + availableHint returns",
    },
  ];

  return {
    supported: "BROKEN",
    phaseGuardBlocksDownload: false,
    setPhaseDownloadingOnTap: false,
    downloadUrlRequired: true,
    sha256Required: true,
    abortControllerFromCheck: false,
    competingCheckOnFocus: false,
    transitions,
    verdict:
      "Handler executes (no phase guard) but UX is BROKEN: tap does not set downloading until after cache lookup; auto-installer runs immediately after download; failed-phase CTA remains visible after failure.",
  };
}
