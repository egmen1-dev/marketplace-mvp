import type { MobileReleaseChannelId } from "@prisma/client";

import { evaluateCompatibility, type CompatibilityInput } from "../compatibility";
import { parseReleaseNotes } from "../registry/map-release";
import { getLatestPublishedRelease, listReleaseVersions } from "../registry";
import { isDeviceEligibleForRollout } from "../release-manager";
import type { MobileUpdatePayload } from "../types";
import { resolveUpdateState } from "./resolve-update-state";

export type UpdateQuery = CompatibilityInput & {
  channel?: MobileReleaseChannelId;
  deviceId?: string;
};

const CLOSED_ALPHA_KNOWN_ISSUES = [
  "Cart line item thumbnails require 0.1.1-alpha+",
  "Full wallet ledger not available on mobile API yet",
  "Physical Android acceptance required before cohort expansion",
];

export async function buildMobileUpdatePayload(query: UpdateQuery = { clientVersionCode: 1 }): Promise<MobileUpdatePayload> {
  const channel = query.channel ?? "CLOSED_ALPHA";
  const latest = await getLatestPublishedRelease(channel);
  const history = await listReleaseVersions();
  const previous = history.find((row) => row.versionCode < (latest?.versionCode ?? 0)) ?? null;
  const compatibility = evaluateCompatibility(latest, query);
  const rolloutEligible = latest
    ? isDeviceEligibleForRollout(query.deviceId, latest.rolloutPercent)
    : false;

  const hasNewer = latest ? query.clientVersionCode < latest.versionCode : false;
  const updateRequired = compatibility.forceUpgrade || (latest?.mandatory ?? false);
  const showUpdate = hasNewer && rolloutEligible && Boolean(latest?.downloadUrl);
  const updateState = resolveUpdateState({
    clientVersionCode: query.clientVersionCode,
    latestVersionCode: latest?.versionCode ?? null,
    hasDownloadUrl: Boolean(latest?.downloadUrl),
    rolloutEligible,
    updateRequired,
    mandatory: latest?.mandatory ?? false,
    forceUpgrade: compatibility.forceUpgrade,
    compatible: compatibility.compatible,
  });

  return {
    latestVersion: latest?.versionName ?? "0.0.0-dev",
    versionCode: latest?.versionCode ?? 1,
    versionName: latest?.versionName ?? "0.0.0-dev",
    minimumVersion: latest?.minAppVersion ?? "0.0.0-dev",
    minimumSupportedVersionCode: previous?.versionCode ?? 1,
    updateRequired,
    updateState,
    mandatory: latest?.mandatory ?? false,
    downloadUrl: showUpdate ? latest?.downloadUrl ?? null : null,
    sha256: showUpdate ? latest?.sha256 ?? null : null,
    artifactSizeBytes: showUpdate ? latest?.artifactSizeBytes ?? null : null,
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
    previousRelease: previous
      ? {
          versionName: previous.versionName,
          versionCode: previous.versionCode,
          downloadUrl: previous.downloadUrl,
        }
      : null,
    knownIssues: channel === "CLOSED_ALPHA" ? CLOSED_ALPHA_KNOWN_ISSUES : [],
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
    updateState: payload.updateState,
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
