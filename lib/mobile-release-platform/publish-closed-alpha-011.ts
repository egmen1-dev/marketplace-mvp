import { execSync } from "node:child_process";

import { prisma } from "@/lib/prisma";

import {
  CLOSED_ALPHA_APK,
  CLOSED_ALPHA_APK_DOWNLOAD_URL,
  CLOSED_ALPHA_APK_PREVIOUS,
  CLOSED_ALPHA_APK_PREVIOUS_DOWNLOAD_URL,
  CLOSED_ALPHA_RELEASE_011,
} from "./constants";
import { syncReleaseManifestFile } from "./manifest-sync";
import { mapReleaseVersion } from "./registry/map-release";
import { publishRelease } from "./release-manager";
import { assignTesterToRelease, upsertTester } from "./distribution";
import type { PublishClosedAlphaInput } from "./publish-closed-alpha";

function resolveGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return CLOSED_ALPHA_RELEASE_011.gitCommit;
  }
}

async function ensurePreviousReleasePublished(gitCommit: string) {
  let row = await prisma.mobileReleaseVersion.findUnique({
    where: { versionCode: CLOSED_ALPHA_APK_PREVIOUS.versionCode },
  });

  if (!row) {
    row = await prisma.mobileReleaseVersion.create({
      data: {
        versionName: CLOSED_ALPHA_APK_PREVIOUS.versionName,
        versionCode: CLOSED_ALPHA_APK_PREVIOUS.versionCode,
        gitCommit: CLOSED_ALPHA_APK_PREVIOUS.gitCommit,
        sha256: CLOSED_ALPHA_APK_PREVIOUS.sha256,
        channel: "CLOSED_ALPHA",
        releaseNotes: CLOSED_ALPHA_APK_PREVIOUS.releaseNotes,
        minBackendVersion: "mobile-v1",
        minAppVersion: CLOSED_ALPHA_APK_PREVIOUS.versionName,
        buildNumber: String(CLOSED_ALPHA_APK_PREVIOUS.versionCode),
        status: "PUBLISHED",
        downloadUrl: CLOSED_ALPHA_APK_PREVIOUS_DOWNLOAD_URL,
        artifactSizeBytes: CLOSED_ALPHA_APK_PREVIOUS.artifactSizeBytes,
        rolloutPercent: 0,
        mandatory: false,
        publishedAt: new Date("2026-08-16T00:00:00.000Z"),
      },
    });
  }

  return row;
}

export async function ensureClosedAlpha011ReleasePublished(input: PublishClosedAlphaInput = {}) {
  const gitCommit = resolveGitCommit();
  const rolloutPercent = input.rolloutPercent ?? 100;

  await ensurePreviousReleasePublished(gitCommit);

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
        minAppVersion: CLOSED_ALPHA_APK_PREVIOUS.versionName,
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
    previousVersionCode: CLOSED_ALPHA_APK_PREVIOUS.versionCode,
    downloadUrl: CLOSED_ALPHA_APK_DOWNLOAD_URL,
    tester,
  };
}
