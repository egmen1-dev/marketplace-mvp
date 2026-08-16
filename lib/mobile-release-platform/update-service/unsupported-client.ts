import type { MobileReleaseChannelId } from "@prisma/client";

import {
  CLOSED_ALPHA_UNSUPPORTED_CLIENT_REASON,
  getMinimumSupportedVersion,
  type MinimumSupportedVersion,
} from "../baseline";
import type { MobileUpdatePayload } from "../types";
import type { ReleaseVersion } from "../types";

export function buildUnsupportedClientPayload(input: {
  clientVersionCode: number;
  channel: MobileReleaseChannelId;
  latest: ReleaseVersion | null;
  minimum?: MinimumSupportedVersion | null;
}): MobileUpdatePayload {
  const minimum =
    input.minimum ?? getMinimumSupportedVersion(input.channel) ?? {
      versionCode: 3,
      versionName: "0.1.2-alpha",
      reason: CLOSED_ALPHA_UNSUPPORTED_CLIENT_REASON,
    };

  const downloadUrl = input.latest?.downloadUrl ?? null;

  return {
    latestVersion: input.latest?.versionName ?? minimum.versionName,
    versionCode: input.latest?.versionCode ?? minimum.versionCode,
    versionName: input.latest?.versionName ?? minimum.versionName,
    minimumVersion: minimum.versionName,
    minimumSupportedVersionCode: minimum.versionCode,
    minimumVersionCode: minimum.versionCode,
    minimumVersionName: minimum.versionName,
    reason: minimum.reason,
    updateRequired: true,
    updateState: "UNSUPPORTED_CLIENT",
    mandatory: true,
    downloadUrl,
    sha256: input.latest?.sha256 ?? null,
    artifactSizeBytes: input.latest?.artifactSizeBytes ?? null,
    releaseNotes: ["Установите последнюю поддерживаемую версию Closed Alpha"],
    channel: input.channel,
    rollout: { percent: 100, eligible: true },
    compatibility: {
      minBackendVersion: input.latest?.minBackendVersion ?? "mobile-v1",
      minAppVersion: minimum.versionName,
      minApiVersion: "mobile-api-v1",
      compatible: false,
      forceUpgrade: true,
    },
    publishedAt: input.latest?.publishedAt ?? null,
    previousRelease: null,
    knownIssues: [],
    advisoryOnly: true,
  };
}
