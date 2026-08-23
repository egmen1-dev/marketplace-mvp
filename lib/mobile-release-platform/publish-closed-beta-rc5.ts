import { prisma } from "@/lib/prisma";

import {
  CLOSED_BETA_RC5_DOWNLOAD_URL,
  CLOSED_BETA_RELEASE_RC5,
} from "./closed-beta-rc5";
import { syncReleaseManifestFile } from "./manifest-sync";
import { mapReleaseVersion } from "./registry/map-release";
import { publishRelease } from "./release-manager";

export type ClosedBetaRC5PublishInput = {
  sha256: string;
  artifactSizeBytes: number;
  gitCommit: string;
  downloadUrl?: string;
};

/**
 * Publish Closed Beta RC5 (0.1.10-beta.1 code 9) on the BETA MRP channel.
 * Creates or updates the versionCode 9 row so clients on RC3/RC4 can receive RC5.
 */
export async function ensureClosedBetaRC5Published(input: ClosedBetaRC5PublishInput) {
  const rolloutPercent = 100;
  const downloadUrl = input.downloadUrl ?? CLOSED_BETA_RC5_DOWNLOAD_URL;
  const data = {
    versionName: CLOSED_BETA_RELEASE_RC5.versionName,
    gitCommit: input.gitCommit,
    sha256: input.sha256,
    channel: "BETA" as const,
    releaseNotes: CLOSED_BETA_RELEASE_RC5.releaseNotes,
    minBackendVersion: "mobile-v1",
    minAppVersion: CLOSED_BETA_RELEASE_RC5.minAppVersion,
    buildNumber: String(CLOSED_BETA_RELEASE_RC5.versionCode),
    downloadUrl,
    artifactSizeBytes: input.artifactSizeBytes,
    rolloutPercent,
    mandatory: false,
  };

  let row = await prisma.mobileReleaseVersion.findUnique({
    where: { versionCode: CLOSED_BETA_RELEASE_RC5.versionCode },
  });

  if (!row) {
    row = await prisma.mobileReleaseVersion.create({
      data: {
        ...data,
        versionCode: CLOSED_BETA_RELEASE_RC5.versionCode,
        status: "DRAFT",
      },
    });
  } else {
    row = await prisma.mobileReleaseVersion.update({
      where: { versionCode: CLOSED_BETA_RELEASE_RC5.versionCode },
      data,
    });
  }

  if (row.status !== "PUBLISHED") {
    await publishRelease(row.id);
    row = await prisma.mobileReleaseVersion.findUniqueOrThrow({ where: { id: row.id } });
  } else {
    await syncReleaseManifestFile();
  }

  return {
    release: mapReleaseVersion(row),
    downloadUrl,
  };
}
