import type { MobileReleaseChannelId } from "@prisma/client";

import { resolveMRPChannelFromClient } from "../channels";
import { isClientBelowMinimumSupported, getMinimumSupportedVersion } from "../baseline";
import { evaluateCompatibility, type CompatibilityInput } from "../compatibility";
import { parseReleaseNotes } from "../registry/map-release";
import { getLatestPublishedRelease, listReleaseVersions } from "../registry";
import { isDeviceEligibleForRollout } from "../release-manager";
import type { MobileUpdatePayload } from "../types";
import { resolveClientDownloadUrl } from "../download-url";
import { resolveUpdateState } from "./resolve-update-state";
import { buildUnsupportedClientPayload } from "./unsupported-client";

export type UpdateQuery = CompatibilityInput & {
  /** MRP channel id or client label (e.g. CLOSED_BETA → BETA). */
  channel?: MobileReleaseChannelId | string;
  deviceId?: string;
};

const CLOSED_ALPHA_KNOWN_ISSUES = [
  "0.1.0-alpha is prototype — minimum supported is 0.1.2-alpha",
  "Full wallet ledger not available on mobile API yet",
  "Physical Android acceptance required before cohort expansion",
];

export async function buildMobileUpdatePayload(query: UpdateQuery = { clientVersionCode: 1 }): Promise<MobileUpdatePayload> {
  const channel = resolveMRPChannelFromClient(query.channel ?? "CLOSED_ALPHA");
  const latest = await getLatestPublishedRelease(channel);
  const history = await listReleaseVersions();
  const previous = history.find((row) => row.versionCode < (latest?.versionCode ?? 0)) ?? null;

  if (isClientBelowMinimumSupported(query.clientVersionCode, channel)) {
    return buildUnsupportedClientPayload({
      clientVersionCode: query.clientVersionCode,
      channel,
      latest,
    });
  }

  const compatibility = evaluateCompatibility(latest, query, channel);
  const rolloutEligible = latest
    ? isDeviceEligibleForRollout(query.deviceId, latest.rolloutPercent)
    : false;

  const hasNewer = latest ? query.clientVersionCode < latest.versionCode : false;
  const updateRequired = compatibility.forceUpgrade || (latest?.mandatory ?? false);
  const clientDownloadUrl = resolveClientDownloadUrl(latest);
  const showUpdate = hasNewer && rolloutEligible && Boolean(clientDownloadUrl);
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

  const minimum = getMinimumSupportedVersion(channel);

  return {
    latestVersion: latest?.versionName ?? "0.0.0-dev",
    versionCode: latest?.versionCode ?? 1,
    versionName: latest?.versionName ?? "0.0.0-dev",
    minimumVersion: minimum?.versionName ?? latest?.minAppVersion ?? "0.0.0-dev",
    minimumSupportedVersionCode: minimum?.versionCode ?? latest?.versionCode ?? 1,
    updateRequired,
    updateState,
    mandatory: latest?.mandatory ?? false,
    downloadUrl: showUpdate ? clientDownloadUrl : null,
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

/** Android/update alias — same unified payload since EPIC 83 */
export async function buildLegacyAndroidUpdatePayload(query: UpdateQuery = { clientVersionCode: 1 }) {
  let payload: MobileUpdatePayload;

  if (!query.channel) {
    const betaMinimum = getMinimumSupportedVersion("BETA");
    const eligibleForBeta =
      betaMinimum != null && query.clientVersionCode >= betaMinimum.versionCode;
    if (eligibleForBeta) {
      const betaPayload = await buildMobileUpdatePayload({ ...query, channel: "BETA" });
      if (betaPayload.downloadUrl) {
        payload = betaPayload;
      } else {
        payload = await buildMobileUpdatePayload({ ...query, channel: "CLOSED_ALPHA" });
      }
    } else {
      payload = await buildMobileUpdatePayload({ ...query, channel: "CLOSED_ALPHA" });
    }
  } else {
    payload = await buildMobileUpdatePayload(query);
  }

  return {
    versionCode: payload.versionCode,
    versionName: payload.versionName,
    minimumVersion: payload.minimumVersion,
    minimumSupportedVersionCode: payload.minimumSupportedVersionCode,
    minimumVersionCode: payload.minimumVersionCode,
    minimumVersionName: payload.minimumVersionName,
    reason: payload.reason,
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
