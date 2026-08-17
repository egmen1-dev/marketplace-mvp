import { execSync } from "node:child_process";

import { prisma } from "@/lib/prisma";

import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_RELEASE_010,
  CLOSED_ALPHA_RELEASE_011,
  CLOSED_ALPHA_RELEASE_012,
  CLOSED_ALPHA_RELEASE_013,
  CLOSED_ALPHA_RELEASE_014,
} from "./constants";
import { syncReleaseManifestFile } from "./manifest-sync";
import { mapReleaseVersion } from "./registry/map-release";
import { publishRelease } from "./release-manager";
import { assignTesterToRelease, upsertTester } from "./distribution";
import type { PublishClosedAlphaInput } from "./publish-closed-alpha";

const CLOSED_ALPHA_010_DOWNLOAD_URL =
  "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.0/lot-android-alpha-0.1.0.apk";

function resolveGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return CLOSED_ALPHA_RELEASE_014.gitCommit;
  }
}

async function ensureReleaseHistoryPublished() {
  const seeds = [
    {
      meta: CLOSED_ALPHA_RELEASE_010,
      downloadUrl: CLOSED_ALPHA_010_DOWNLOAD_URL,
      rolloutPercent: 0,
      publishedAt: new Date("2026-08-16T00:00:00.000Z"),
    },
    {
      meta: CLOSED_ALPHA_RELEASE_011,
      downloadUrl:
        "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.1/lot-android-alpha-0.1.1.apk",
      rolloutPercent: 0,
      publishedAt: new Date("2026-08-16T17:59:37.731Z"),
    },
    {
      meta: CLOSED_ALPHA_RELEASE_012,
      downloadUrl:
        "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.2/lot-android-alpha-0.1.2.apk",
      rolloutPercent: 0,
      publishedAt: new Date("2026-08-16T19:00:00.000Z"),
    },
    {
      meta: CLOSED_ALPHA_RELEASE_013,
      downloadUrl:
        "https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.3/lot-android-alpha-0.1.3.apk",
      rolloutPercent: 0,
      publishedAt: new Date("2026-08-16T20:14:43.557Z"),
    },
  ];

  for (const release of seeds) {
    const existing = await prisma.mobileReleaseVersion.findUnique({
      where: { versionCode: release.meta.versionCode },
    });
    if (existing) continue;

    await prisma.mobileReleaseVersion.create({
      data: {
        versionName: release.meta.versionName,
        versionCode: release.meta.versionCode,
        gitCommit: release.meta.gitCommit,
        sha256: release.meta.sha256,
        channel: "CLOSED_ALPHA",
        releaseNotes: release.meta.releaseNotes,
        minBackendVersion: "mobile-v1",
        minAppVersion: release.meta.versionName,
        buildNumber: String(release.meta.versionCode),
        status: "PUBLISHED",
        downloadUrl: release.downloadUrl,
        artifactSizeBytes: release.meta.artifactSizeBytes,
        rolloutPercent: release.rolloutPercent,
        mandatory: false,
        publishedAt: release.publishedAt,
      },
    });
  }
}

/** Publish 0.1.4-alpha P0 hotfix — RECOMMENDED update only after physical PASS */
export async function ensureClosedAlpha014ReleasePublished(input: PublishClosedAlphaInput = {}) {
  const gitCommit = resolveGitCommit();
  const rolloutPercent = input.rolloutPercent ?? 0;

  if (CLOSED_ALPHA_APK.sha256.startsWith("pending")) {
    throw new Error("Update constants.ts with real SHA256 before MRP publish");
  }

  await ensureReleaseHistoryPublished();

  let row = await prisma.mobileReleaseVersion.findUnique({
    where: { versionCode: CLOSED_ALPHA_APK.versionCode },
  });

  if (!row) {
    row = await prisma.mobileReleaseVersion.create({
      data: {
        versionName: CLOSED_ALPHA_APK.versionName,
        versionCode: CLOSED_ALPHA_APK.versionCode,
        gitCommit,
        sha256: CLOSED_ALPHA_APK.sha256,
        channel: "CLOSED_ALPHA",
        releaseNotes: CLOSED_ALPHA_APK.releaseNotes,
        minBackendVersion: "mobile-v1",
        minAppVersion: CLOSED_ALPHA_RELEASE_013.versionName,
        buildNumber: String(CLOSED_ALPHA_APK.versionCode),
        status: "DRAFT",
        downloadUrl: CLOSED_ALPHA_APK_DOWNLOAD_URL,
        artifactSizeBytes: CLOSED_ALPHA_APK.artifactSizeBytes,
        rolloutPercent,
        mandatory: false,
      },
    });
  } else {
    row = await prisma.mobileReleaseVersion.update({
      where: { id: row.id },
      data: {
        gitCommit,
        sha256: CLOSED_ALPHA_APK.sha256,
        downloadUrl: CLOSED_ALPHA_APK_DOWNLOAD_URL,
        artifactSizeBytes: CLOSED_ALPHA_APK.artifactSizeBytes,
        channel: "CLOSED_ALPHA",
        rolloutPercent,
        releaseNotes: CLOSED_ALPHA_APK.releaseNotes,
        mandatory: false,
        minAppVersion: CLOSED_ALPHA_RELEASE_013.versionName,
      },
    });
  }

  if (row.status !== "PUBLISHED") {
    await publishRelease(row.id);
    row = await prisma.mobileReleaseVersion.findUniqueOrThrow({ where: { id: row.id } });
  }

  await syncReleaseManifestFile();

  let tester = null;
  if (input.testerEmail) {
    tester = await upsertTester({
      email: input.testerEmail,
      name: input.testerName,
      status: "invited",
    });
    await assignTesterToRelease(tester.id, row.id);
  }

  return {
    release: mapReleaseVersion(row),
    previousVersionCode: CLOSED_ALPHA_RELEASE_013.versionCode,
    downloadUrl: CLOSED_ALPHA_APK_DOWNLOAD_URL,
    minimumSupportedVersionCode: CLOSED_ALPHA_RELEASE_012.versionCode,
    tester,
  };
}
