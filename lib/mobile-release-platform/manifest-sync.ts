import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type { MobileReleaseChannelId } from "@prisma/client";

import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_GITHUB_RELEASE_URL,
  CLOSED_ALPHA_RELEASE_012,
} from "./constants";
import { CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE } from "./baseline";
import { getLatestPublishedRelease, listReleaseVersions } from "./registry";
import type { ReleaseVersion } from "./types";

export type MobileReleaseManifest = {
  appName: string;
  packageId: string;
  versionName: string;
  versionCode: number;
  releaseChannel: string;
  commitSha: string;
  apiVersion: string;
  schemaVersion: string;
  artifactSha256: string;
  artifactSizeBytes: number | null;
  artifactFileName: string;
  buildDate: string;
  downloadUrl: string | null;
  updateRequired: boolean;
  releaseHistory: Array<{
    versionName: string;
    versionCode: number;
    commitSha: string;
    artifactSha256: string;
    acceptanceStatus: string;
    changelog: string;
  }>;
  alphaDistribution: {
    ready: boolean;
    hostingUrl: string | null;
    recommendedHosting?: string;
    releasePageUrl?: string | null;
  };
  launchGate?: {
    epic: string;
    mobPa001: string;
    mobPa002: string;
    physicalVerdict: string;
    closedAlphaVerdict: string;
    appShell1Status: string;
    knownP0: number;
    knownP1: number;
    seamlessUpdateVerdict?: string;
  };
  knownIssues?: string[];
  acceptanceStatus?: string;
  previousRelease?: {
    versionName: string;
    versionCode: number;
    downloadUrl: string | null;
  } | null;
  minimumSupportedVersionCode: number;
  minimumSupportedVersionName: string;
  source: "mobile-release-platform";
  generatedAt: string;
};

function channelToManifest(channel: MobileReleaseChannelId): string {
  if (channel === "PRODUCTION") return "production";
  if (channel === "BETA") return "beta";
  if (channel === "DEVELOPER") return "developer";
  if (channel === "INTERNAL") return "internal";
  if (channel === "CLOSED_ALPHA") return "alpha";
  return channel.toLowerCase();
}

export async function buildReleaseManifestFromRegistry(): Promise<MobileReleaseManifest> {
  const latest = await getLatestPublishedRelease();
  const history = await listReleaseVersions();

  const versionName = latest?.versionName ?? "0.0.0-dev";
  const versionCode = latest?.versionCode ?? 1;
  const previous = history.find((r) => r.versionCode < versionCode) ?? null;

  return {
    appName: "ЛОТ",
    packageId: latest?.packageId ?? "ru.lot.marketplace.alpha",
    versionName,
    versionCode,
    releaseChannel: channelToManifest(latest?.channel ?? "CLOSED_ALPHA"),
    commitSha: latest?.gitCommit ?? "unknown",
    apiVersion: "mobile-v1",
    schemaVersion: "1",
    artifactSha256: latest?.sha256 ?? "",
    artifactSizeBytes: latest?.artifactSizeBytes ?? null,
    artifactFileName: `lot-android-${versionName}.apk`,
    buildDate: latest?.publishedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    downloadUrl: latest?.downloadUrl ?? null,
    updateRequired: latest?.mandatory ?? false,
    releaseHistory: history.slice(0, 10).map((r) => ({
      versionName: r.versionName,
      versionCode: r.versionCode,
      commitSha: r.gitCommit,
      artifactSha256: r.sha256,
      acceptanceStatus: r.status,
      changelog: r.releaseNotes.split("\n")[0] ?? "",
    })),
    alphaDistribution: {
      ready: Boolean(latest?.downloadUrl),
      hostingUrl: latest?.downloadUrl ?? CLOSED_ALPHA_APK_DOWNLOAD_URL,
      recommendedHosting: "GitHub Release asset (immutable HTTPS)",
      releasePageUrl: CLOSED_ALPHA_GITHUB_RELEASE_URL,
    },
    launchGate: {
      epic: "EPIC-83",
      mobPa001: "OPEN",
      mobPa002: "CLOSED",
      physicalVerdict: "NOT_RUN",
      closedAlphaVerdict: "WATCH",
      appShell1Status: "BLOCKED",
      knownP0: 0,
      knownP1: 2,
      seamlessUpdateVerdict: "PENDING_PHYSICAL",
    },
    knownIssues: [...CLOSED_ALPHA_APK.knownIssues],
    acceptanceStatus: CLOSED_ALPHA_APK.acceptanceStatus,
    minimumSupportedVersionCode: CLOSED_ALPHA_MINIMUM_SUPPORTED_VERSION_CODE,
    minimumSupportedVersionName: CLOSED_ALPHA_RELEASE_012.versionName,
    previousRelease: previous
      ? {
          versionName: previous.versionName,
          versionCode: previous.versionCode,
          downloadUrl: previous.downloadUrl,
        }
      : null,
    source: "mobile-release-platform",
    generatedAt: new Date().toISOString(),
  };
}

export async function syncReleaseManifestFile(): Promise<MobileReleaseManifest> {
  const manifest = await buildReleaseManifestFromRegistry();
  writeFileSync(join(process.cwd(), "mobile-release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export function releaseToManifestEntry(release: ReleaseVersion) {
  return {
    versionName: release.versionName,
    versionCode: release.versionCode,
    commitSha: release.gitCommit,
    artifactSha256: release.sha256,
    channel: channelToManifest(release.channel),
    downloadUrl: release.downloadUrl,
  };
}
