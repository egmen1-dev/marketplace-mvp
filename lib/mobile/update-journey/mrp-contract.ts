/** Shared MRP decision logic — used by mobile client and release gates. */

export type MrpUpdateState =
  | "NO_UPDATE"
  | "OPTIONAL_UPDATE"
  | "RECOMMENDED_UPDATE"
  | "REQUIRED_UPDATE"
  | "UNSUPPORTED_CLIENT";

export type MrpReleasePayload = {
  versionCode: number;
  versionName: string;
  updateState?: MrpUpdateState;
  updateRequired?: boolean;
  mandatory?: boolean;
  downloadUrl?: string | null;
  sha256?: string | null;
  artifactSizeBytes?: number | null;
  reason?: "CLIENT_TOO_OLD";
  rollout?: { percent: number; eligible: boolean };
};

export type UpdateDecision = {
  installedVersionCode: number;
  latestVersionCode: number | null;
  latestVersionName: string | null;
  updateState: MrpUpdateState;
  eligibleForInstall: boolean;
  downloadUrl: string | null;
  sha256: string | null;
};

export function resolveUpdateState(
  raw: MrpReleasePayload,
  installedVersionCode: number,
): MrpUpdateState {
  if (raw.updateState) return raw.updateState;
  if (raw.reason === "CLIENT_TOO_OLD") return "UNSUPPORTED_CLIENT";
  if (raw.updateRequired || raw.mandatory) return "REQUIRED_UPDATE";
  if (raw.downloadUrl && raw.versionCode > installedVersionCode && raw.rollout?.eligible !== false) {
    return "OPTIONAL_UPDATE";
  }
  return "NO_UPDATE";
}

export function evaluateUpdateDecision(
  raw: MrpReleasePayload,
  installedVersionCode: number,
): UpdateDecision {
  const updateState = resolveUpdateState(raw, installedVersionCode);
  const rolloutEligible = raw.rollout?.eligible !== false;
  const eligibleForInstall =
    updateState !== "NO_UPDATE" &&
    Boolean(raw.downloadUrl) &&
    raw.versionCode > installedVersionCode &&
    rolloutEligible;

  return {
    installedVersionCode,
    latestVersionCode: raw.versionCode ?? null,
    latestVersionName: raw.versionName ?? null,
    updateState,
    eligibleForInstall,
    downloadUrl: raw.downloadUrl ?? null,
    sha256: raw.sha256 ?? null,
  };
}
