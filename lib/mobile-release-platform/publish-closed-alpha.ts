import { execSync } from "node:child_process";

import { prisma } from "@/lib/prisma";

import { CLOSED_ALPHA_APK, CLOSED_ALPHA_APK_DOWNLOAD_URL } from "./constants";
import { syncReleaseManifestFile } from "./manifest-sync";
import { mapReleaseVersion } from "./registry/map-release";
import { publishRelease } from "./release-manager";
import { assignTesterToRelease, upsertTester } from "./distribution";

function resolveGitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return CLOSED_ALPHA_APK.gitCommit;
  }
}

export type PublishClosedAlphaInput = {
  testerEmail?: string;
  testerName?: string;
  rolloutPercent?: number;
};

export async function ensureClosedAlphaReleasePublished(input: PublishClosedAlphaInput = {}) {
  const gitCommit = resolveGitCommit();
  const rolloutPercent = input.rolloutPercent ?? 100;

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
        minAppVersion: CLOSED_ALPHA_APK.versionName,
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
    downloadUrl: CLOSED_ALPHA_APK_DOWNLOAD_URL,
    tester,
  };
}
