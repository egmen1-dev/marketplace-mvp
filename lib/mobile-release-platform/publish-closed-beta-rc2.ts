import { prisma } from "@/lib/prisma";

import {
  CLOSED_BETA_RC2_DOWNLOAD_URL,
  CLOSED_BETA_RELEASE_RC2,
} from "./closed-beta-rc2";
import { syncReleaseManifestFile } from "./manifest-sync";
import { mapReleaseVersion } from "./registry/map-release";
import { publishRelease } from "./release-manager";

/**
 * Publish Closed Beta RC2 on the BETA MRP channel.
 *
 * Staging historically registered 0.1.5-alpha at versionCode 6 on CLOSED_ALPHA.
 * RC2 also uses versionCode 6 — we migrate that row to BETA + RC2 metadata so
 * Closed Beta clients (channel=CLOSED_BETA → BETA) receive RC2 instead of Alpha.
 */
export async function ensureClosedBetaRC2Published() {
  const rolloutPercent = 100;
  const data = {
    versionName: CLOSED_BETA_RELEASE_RC2.versionName,
    gitCommit: CLOSED_BETA_RELEASE_RC2.gitCommit,
    sha256: CLOSED_BETA_RELEASE_RC2.sha256,
    channel: "BETA" as const,
    releaseNotes: CLOSED_BETA_RELEASE_RC2.releaseNotes,
    minBackendVersion: "mobile-v1",
    minAppVersion: CLOSED_BETA_RELEASE_RC2.minAppVersion,
    buildNumber: String(CLOSED_BETA_RELEASE_RC2.versionCode),
    downloadUrl: CLOSED_BETA_RC2_DOWNLOAD_URL,
    artifactSizeBytes: CLOSED_BETA_RELEASE_RC2.artifactSizeBytes,
    rolloutPercent,
    mandatory: false,
  };

  let row = await prisma.mobileReleaseVersion.findUnique({
    where: { versionCode: CLOSED_BETA_RELEASE_RC2.versionCode },
  });

  if (!row) {
    row = await prisma.mobileReleaseVersion.create({
      data: {
        ...data,
        versionCode: CLOSED_BETA_RELEASE_RC2.versionCode,
        status: "DRAFT",
      },
    });
  } else {
    row = await prisma.mobileReleaseVersion.update({
      where: { versionCode: CLOSED_BETA_RELEASE_RC2.versionCode },
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
    downloadUrl: CLOSED_BETA_RC2_DOWNLOAD_URL,
  };
}
