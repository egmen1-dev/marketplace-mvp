import type { MobileReleaseVersion } from "@prisma/client";

import type { ReleaseVersion } from "../types";

export function mapReleaseVersion(row: MobileReleaseVersion): ReleaseVersion {
  return {
    id: row.id,
    versionName: row.versionName,
    versionCode: row.versionCode,
    gitCommit: row.gitCommit,
    sha256: row.sha256,
    channel: row.channel,
    releaseNotes: row.releaseNotes,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    minBackendVersion: row.minBackendVersion,
    minAppVersion: row.minAppVersion,
    buildNumber: row.buildNumber,
    status: row.status,
    downloadUrl: row.downloadUrl,
    artifactSizeBytes: row.artifactSizeBytes,
    rolloutPercent: row.rolloutPercent,
    mandatory: row.mandatory,
    packageId: row.packageId,
  };
}

export function parseReleaseNotes(notes: string): string[] {
  return notes
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
