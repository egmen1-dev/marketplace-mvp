import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { MobileReleaseChannelId } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { mapReleaseVersion } from "./map-release";
import type { ReleaseVersion } from "../types";

type ManifestSeed = {
  versionName: string;
  versionCode: number;
  commitSha: string;
  artifactSha256: string;
  artifactSizeBytes?: number;
  releaseChannel?: string;
  downloadUrl?: string | null;
};

function channelFromManifest(raw?: string): MobileReleaseChannelId {
  if (raw === "production") return "PRODUCTION";
  if (raw === "beta") return "BETA";
  if (raw === "developer") return "DEVELOPER";
  if (raw === "internal") return "INTERNAL";
  return "CLOSED_ALPHA";
}

export async function seedRegistryFromManifestIfEmpty(): Promise<ReleaseVersion | null> {
  const count = await prisma.mobileReleaseVersion.count();
  if (count > 0) return null;

  let manifest: ManifestSeed;
  try {
    manifest = JSON.parse(readFileSync(join(process.cwd(), "mobile-release-manifest.json"), "utf8")) as ManifestSeed;
  } catch {
    return null;
  }

  const row = await prisma.mobileReleaseVersion.create({
    data: {
      versionName: manifest.versionName,
      versionCode: manifest.versionCode,
      gitCommit: manifest.commitSha,
      sha256: manifest.artifactSha256,
      channel: channelFromManifest(manifest.releaseChannel),
      releaseNotes: "APP-SHELL-0 Alpha foundation",
      publishedAt: new Date(),
      minBackendVersion: "mobile-v1",
      minAppVersion: manifest.versionName,
      buildNumber: String(manifest.versionCode),
      status: "PUBLISHED",
      downloadUrl: manifest.downloadUrl ?? null,
      artifactSizeBytes: manifest.artifactSizeBytes ?? null,
      rolloutPercent: 100,
      mandatory: false,
    },
  });

  return mapReleaseVersion(row);
}

export async function listReleaseVersions(): Promise<ReleaseVersion[]> {
  await seedRegistryFromManifestIfEmpty();
  const rows = await prisma.mobileReleaseVersion.findMany({ orderBy: { versionCode: "desc" } });
  return rows.map(mapReleaseVersion);
}

export async function getReleaseByVersionCode(versionCode: number): Promise<ReleaseVersion | null> {
  await seedRegistryFromManifestIfEmpty();
  const row = await prisma.mobileReleaseVersion.findUnique({ where: { versionCode } });
  return row ? mapReleaseVersion(row) : null;
}

export async function getLatestPublishedRelease(channel?: MobileReleaseChannelId): Promise<ReleaseVersion | null> {
  await seedRegistryFromManifestIfEmpty();
  const row = await prisma.mobileReleaseVersion.findFirst({
    where: {
      status: "PUBLISHED",
      ...(channel ? { channel } : {}),
    },
    orderBy: { versionCode: "desc" },
  });
  return row ? mapReleaseVersion(row) : null;
}

export async function getPublishedReleaseHistory(limit = 20): Promise<ReleaseVersion[]> {
  await seedRegistryFromManifestIfEmpty();
  const rows = await prisma.mobileReleaseVersion.findMany({
    where: { status: { in: ["PUBLISHED", "ROLLED_BACK"] } },
    orderBy: { versionCode: "desc" },
    take: limit,
  });
  return rows.map(mapReleaseVersion);
}
