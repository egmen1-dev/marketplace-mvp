import type { MobileUpdatePayload } from "../types";

/** Schema consumed by shipped 0.1.0-alpha (versionCode 1) — no EPIC 82 fields. */
export type LegacyMobileUpdatePayload = {
  latestVersion: string;
  versionCode: number;
  versionName: string;
  minimumVersion?: string;
  minimumSupportedVersionCode?: number;
  updateRequired: boolean;
  mandatory: boolean;
  downloadUrl: string | null;
  sha256: string | null;
  releaseNotes: string[];
  channel: string;
  rollout: { percent: number; eligible: boolean };
  compatibility: {
    compatible: boolean;
    forceUpgrade: boolean;
    minBackendVersion?: string;
    minAppVersion?: string;
    minApiVersion?: string;
  };
};

export function buildLegacyMobileUpdatePayload(payload: MobileUpdatePayload): LegacyMobileUpdatePayload {
  return {
    latestVersion: payload.latestVersion,
    versionCode: payload.versionCode,
    versionName: payload.versionName,
    minimumVersion: payload.minimumVersion,
    minimumSupportedVersionCode: payload.minimumSupportedVersionCode,
    updateRequired: payload.updateRequired,
    mandatory: payload.mandatory,
    downloadUrl: payload.downloadUrl,
    sha256: payload.sha256,
    releaseNotes: payload.releaseNotes,
    channel: payload.channel,
    rollout: payload.rollout,
    compatibility: payload.compatibility,
  };
}

/** Clients at or below this versionCode expect the legacy update payload shape. */
export const LEGACY_MOBILE_UPDATE_MAX_VERSION_CODE = 1;
