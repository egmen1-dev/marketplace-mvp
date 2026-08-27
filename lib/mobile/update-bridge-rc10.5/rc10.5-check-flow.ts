/**
 * Exact RC10.5 useUpdateCheckFlow check semantics (commit 91b9c1d).
 * setUpdateInfo BEFORE cache lookup; catch does NOT clear updateInfo.
 */

import {
  RC105_UI_LABELS,
  type Rc105CheckSnapshot,
  type Rc105UpdateInfo,
} from "./types";

export function rc105BeginCheck(): Rc105CheckSnapshot {
  return {
    phase: "checking",
    updateInfo: null,
    errorMessage: null,
    hasCachedApk: false,
  };
}

export type Rc105CacheLookupResult =
  | { kind: "hit" }
  | { kind: "miss" }
  | { kind: "throw"; error: unknown };

export function rc105CompleteCheck(input: {
  snapshot: Rc105CheckSnapshot;
  info: Rc105UpdateInfo;
  installedCode: number;
  cache: Rc105CacheLookupResult;
}): Rc105CheckSnapshot {
  const { info, installedCode, cache } = input;
  const snapshot: Rc105CheckSnapshot = {
    ...input.snapshot,
    updateInfo: info,
    errorMessage: null,
  };

  const eligible = info.versionCode > installedCode && info.rollout.eligible && Boolean(info.downloadUrl);
  if (!eligible) {
    return { ...snapshot, phase: "up_to_date", hasCachedApk: false };
  }

  if (info.sha256) {
    if (cache.kind === "throw") {
      return {
        ...snapshot,
        phase: "failed",
        errorMessage: RC105_UI_LABELS.installFailed,
      };
    }
    const hasCachedApk = cache.kind === "hit";
    return {
      ...snapshot,
      hasCachedApk,
      phase: hasCachedApk ? "ready_to_install" : "available",
    };
  }

  return { ...snapshot, phase: "available", hasCachedApk: false };
}

export function rc105CheckCatch(snapshot: Rc105CheckSnapshot): Rc105CheckSnapshot {
  return {
    ...snapshot,
    phase: "failed",
    errorMessage: RC105_UI_LABELS.installFailed,
  };
}

/** RC10.5 downloadUpdate only guards updateInfo — no phase check. */
export function rc105DownloadHandlerReachable(snapshot: Rc105CheckSnapshot): {
  reachable: boolean;
  downloadStateValid: boolean;
  reason?: string;
} {
  if (!snapshot.updateInfo) {
    return { reachable: false, downloadStateValid: false, reason: "updateInfo_null" };
  }
  return {
    reachable: true,
    downloadStateValid: snapshot.phase === "failed" || snapshot.phase === "available" || snapshot.phase === "ready_to_install",
  };
}
