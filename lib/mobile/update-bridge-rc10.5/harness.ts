/**
 * RC10.5 → live MRP bridge harness.
 * Reproduces legacy check/download state machine against current staging MRP + APK.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  rc105BeginCheck,
  rc105CheckCatch,
  rc105CompleteCheck,
  rc105DownloadHandlerReachable,
} from "./rc10.5-check-flow";
import { downloadVerifiedApkRc105, probeDownloadUrl } from "./transport";
import {
  getRc105UpdateErrorMessage,
  isRc105UpdateEligible,
  rc105WouldShowAvailableHint,
  type Rc105CheckSnapshot,
  type Rc105UpdateInfo,
} from "./types";

const STAGING = process.env.STAGING_BASE_URL ?? "https://web-production-e56fb.up.railway.app";
const INSTALLED_CODE = Number(process.env.RC105_INSTALLED_CODE ?? "21");

export type Rc105BridgeMrpPayload = {
  versionName: string;
  versionCode: number;
  downloadUrl: string | null;
  sha256: string | null;
  updateState: string;
  rollout: { eligible: boolean };
};

export async function fetchRc105Mrp(installedCode = INSTALLED_CODE): Promise<Rc105BridgeMrpPayload> {
  const qs = new URLSearchParams({
    versionCode: String(installedCode),
    channel: "BETA",
  });
  const res = await fetch(`${STAGING}/api/mobile/update?${qs}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`mrp_http_${res.status}`);
  const body = (await res.json()) as Rc105BridgeMrpPayload;
  return body;
}

export function toRc105UpdateInfo(payload: Rc105BridgeMrpPayload): Rc105UpdateInfo {
  return {
    versionName: payload.versionName,
    versionCode: payload.versionCode,
    downloadUrl: payload.downloadUrl,
    sha256: payload.sha256,
    updateState: payload.updateState,
    rollout: payload.rollout,
  };
}

export function simulateRc105CheckAfterMrp(
  info: Rc105UpdateInfo,
  installedCode: number,
  cache: "hit" | "miss" | "throw",
): Rc105CheckSnapshot {
  let snap = rc105BeginCheck();
  if (cache === "throw") {
    snap = { ...snap, updateInfo: info };
    return rc105CheckCatch(snap);
  }
  return rc105CompleteCheck({
    snapshot: snap,
    info,
    installedCode,
    cache: cache === "hit" ? { kind: "hit" } : { kind: "miss" },
  });
}

export function simulateRc105DownloadTapFailure(
  snapshot: Rc105CheckSnapshot,
  code: Parameters<typeof getRc105UpdateErrorMessage>[0],
): Rc105CheckSnapshot {
  return {
    ...snapshot,
    phase: "failed",
    errorMessage: getRc105UpdateErrorMessage(code),
  };
}

export type Rc105BridgeReport = {
  installedCode: number;
  mrp: Rc105BridgeMrpPayload;
  checkAfterMrp: Rc105CheckSnapshot;
  downloadHandler: ReturnType<typeof rc105DownloadHandlerReachable>;
  showsAvailableHintAfterCheckFail: boolean;
  showsAvailableHintAfterDownloadFail: boolean;
  transportProbe: Awaited<ReturnType<typeof probeDownloadUrl>> | null;
  transportDownload: Awaited<ReturnType<typeof downloadVerifiedApkRc105>> | null;
  physicalFailureReproducedInHarness: "YES" | "NO";
  cacheFailureRootCause: "YES" | "NO" | "UNKNOWN";
  classification: string;
};

export async function runRc105BridgeHarness(options?: {
  installedCode?: number;
  skipFullDownload?: boolean;
}): Promise<Rc105BridgeReport> {
  const installedCode = options?.installedCode ?? INSTALLED_CODE;
  const mrp = await fetchRc105Mrp(installedCode);
  const info = toRc105UpdateInfo(mrp);

  const checkAfterMrp = simulateRc105CheckAfterMrp(info, installedCode, "miss");
  const downloadHandler = rc105DownloadHandlerReachable(checkAfterMrp);

  const afterDownloadFail = simulateRc105DownloadTapFailure(checkAfterMrp, "network_error");
  const showsAvailableHintAfterCheckFail = rc105WouldShowAvailableHint(
    simulateRc105CheckAfterMrp(info, installedCode, "throw"),
    installedCode,
  );
  const showsAvailableHintAfterDownloadFail = rc105WouldShowAvailableHint(afterDownloadFail, installedCode);

  let transportProbe: Awaited<ReturnType<typeof probeDownloadUrl>> | null = null;
  let transportDownload: Awaited<ReturnType<typeof downloadVerifiedApkRc105>> | null = null;

  if (mrp.downloadUrl) {
    transportProbe = await probeDownloadUrl(mrp.downloadUrl);
    if (!options?.skipFullDownload && mrp.sha256) {
      const cacheDir = mkdtempSync(join(tmpdir(), "rc105-bridge-"));
      transportDownload = await downloadVerifiedApkRc105({
        downloadUrl: mrp.downloadUrl,
        expectedSha256: mrp.sha256,
        versionCode: mrp.versionCode,
        cacheDir,
        userAgent: "okhttp/4.12.0",
      });
    }
  }

  const hasContradiction = showsAvailableHintAfterCheckFail || showsAvailableHintAfterDownloadFail;
  const transportFailed = transportDownload != null && !transportDownload.ok;

  const physicalFailureReproducedInHarness: "YES" | "NO" =
    hasContradiction && downloadHandler.reachable ? "YES" : "NO";

  const cacheFailureRootCause: "YES" | "NO" | "UNKNOWN" =
    showsAvailableHintAfterCheckFail && checkAfterMrp.phase === "failed" ? "YES" : "NO";

  let classification = "H=UNKNOWN";
  if (hasContradiction && transportFailed) classification = "H=MULTIPLE";
  else if (transportFailed) classification = "C=APK_DOWNLOAD_TRANSPORT_FAILURE";
  else if (downloadHandler.reachable && afterDownloadFail.phase === "failed") classification = "B=INVALID_FAILED_PHASE_DOWNLOAD_STATE";
  else if (cacheFailureRootCause === "YES") classification = "A=UPDATE_CHECK_POST_SUCCESS_CACHE_FAILURE";

  return {
    installedCode,
    mrp,
    checkAfterMrp,
    downloadHandler,
    showsAvailableHintAfterCheckFail,
    showsAvailableHintAfterDownloadFail,
    transportProbe,
    transportDownload,
    physicalFailureReproducedInHarness,
    cacheFailureRootCause,
    classification,
  };
}

export function proxyDownloadUrl(stagingBase: string, versionCode: number): string {
  return `${stagingBase.replace(/\/$/, "")}/api/mobile/releases/apk?versionCode=${versionCode}`;
}

export function isUpdateEligible(info: Rc105UpdateInfo | null, installedCode: number): boolean {
  return isRc105UpdateEligible(info, installedCode);
}
