import type { MobileReleaseChannelId } from "@prisma/client";

import { evaluateCompatibility, type CompatibilityInput } from "../compatibility";
import { parseReleaseNotes } from "../registry/map-release";
import { getLatestPublishedRelease } from "../registry";
import { isDeviceEligibleForRollout } from "../release-manager";
import type { MobileUpdatePayload } from "../types";

export type UpdateQuery = CompatibilityInput & {
  channel?: MobileReleaseChannelId;
  deviceId?: string;
};

export async function buildMobileUpdatePayload(query: UpdateQuery = { clientVersionCode: 1 }): Promise<MobileUpdatePayload> {
  const channel = query.channel ?? "CLOSED_ALPHA";
  const latest = await getLatestPublishedRelease(channel);
  const compatibility = evaluateCompatibility(latest, query);
  const rolloutEligible = latest
    ? isDeviceEligibleForRollout(query.deviceId, latest.rolloutPercent)
    : false;

  const hasNewer = latest ? query.clientVersionCode < latest.versionCode : false;
  const updateRequired = compatibility.forceUpgrade || (latest?.mandatory ?? false);
  const showUpdate = hasNewer && rolloutEligible && Boolean(latest?.downloadUrl);

  return {
    latestVersion: latest?.versionName ?? "0.0.0-dev",
    versionCode: latest?.versionCode ?? 1,
    versionName: latest?.versionName ?? "0.0.0-dev",
    minimumVersion: latest?.minAppVersion ?? "0.0.0-dev",
    minimumSupportedVersionCode: latest?.versionCode ?? 1,
    updateRequired,
    mandatory: latest?.mandatory ?? false,
    downloadUrl: showUpdate ? latest?.downloadUrl ?? null : null,
    sha256: showUpdate ? latest?.sha256 ?? null : null,
    releaseNotes: parseReleaseNotes(latest?.releaseNotes ?? "No release notes"),
    channel: latest?.channel ?? channel,
    rollout: { percent: latest?.rolloutPercent ?? 0, eligible: rolloutEligible },
    compatibility: {
      minBackendVersion: compatibility.minBackendVersion,
      minAppVersion: compatibility.minAppVersion,
      minApiVersion: compatibility.minApiVersion,
      compatible: compatibility.compatible,
      forceUpgrade: compatibility.forceUpgrade,
    },
    publishedAt: latest?.publishedAt ?? null,
    advisoryOnly: true,
  };
}

/** Backward-compatible shape for existing android/update clients */
export async function buildLegacyAndroidUpdatePayload(query: UpdateQuery = { clientVersionCode: 1 }) {
  const payload = await buildMobileUpdatePayload(query);
  return {
    versionCode: payload.versionCode,
    versionName: payload.versionName,
    minimumVersion: payload.minimumVersion,
    minimumSupportedVersionCode: payload.minimumSupportedVersionCode,
    latestVersion: payload.latestVersion,
    updateRequired: payload.updateRequired,
    downloadUrl: payload.downloadUrl,
    sha256: payload.sha256,
    releaseNotes: payload.releaseNotes,
    publishedAt: payload.publishedAt,
    advisoryOnly: true as const,
    mandatory: payload.mandatory,
    channel: payload.channel,
    rollout: payload.rollout,
    compatibility: payload.compatibility,
  };
}
