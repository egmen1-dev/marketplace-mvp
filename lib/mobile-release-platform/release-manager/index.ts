import { createHash } from "node:crypto";

import type { MobileReleaseChannelId, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { mapReleaseVersion } from "../registry/map-release";
import { seedRegistryFromManifestIfEmpty } from "../registry";
import { syncReleaseManifestFile } from "../manifest-sync";
import type { ReleaseVersion } from "../types";
import { ROLLOUT_STEPS } from "../types";

export type CreateReleaseInput = {
  versionName: string;
  versionCode: number;
  gitCommit: string;
  sha256: string;
  channel?: MobileReleaseChannelId;
  releaseNotes?: string;
  minBackendVersion?: string;
  minAppVersion?: string;
  buildNumber?: string;
  downloadUrl?: string | null;
  artifactSizeBytes?: number | null;
  rolloutPercent?: number;
  mandatory?: boolean;
};

export async function createReleaseDraft(input: CreateReleaseInput): Promise<ReleaseVersion> {
  const row = await prisma.mobileReleaseVersion.create({
    data: {
      versionName: input.versionName,
      versionCode: input.versionCode,
      gitCommit: input.gitCommit,
      sha256: input.sha256,
      channel: input.channel ?? "CLOSED_ALPHA",
      releaseNotes: input.releaseNotes ?? "",
      minBackendVersion: input.minBackendVersion ?? "mobile-v1",
      minAppVersion: input.minAppVersion ?? input.versionName,
      buildNumber: input.buildNumber ?? String(input.versionCode),
      downloadUrl: input.downloadUrl ?? null,
      artifactSizeBytes: input.artifactSizeBytes ?? null,
      rolloutPercent: input.rolloutPercent ?? 10,
      mandatory: input.mandatory ?? false,
      status: "DRAFT",
    },
  });
  return mapReleaseVersion(row);
}

export async function publishRelease(releaseId: string): Promise<ReleaseVersion> {
  const row = await prisma.mobileReleaseVersion.update({
    where: { id: releaseId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await syncReleaseManifestFile();
  return mapReleaseVersion(row);
}

export async function rollbackRelease(releaseId: string, reason?: string): Promise<ReleaseVersion> {
  const row = await prisma.mobileReleaseVersion.update({
    where: { id: releaseId },
    data: { status: "ROLLED_BACK" },
  });
  await prisma.mobileReleaseAnalyticsEvent.create({
    data: {
      releaseId,
      eventType: "rollback",
      versionCode: row.versionCode,
      metadata: reason ? ({ reason } as Prisma.InputJsonValue) : undefined,
    },
  });

  const previous = await prisma.mobileReleaseVersion.findFirst({
    where: { status: "PUBLISHED", versionCode: { lt: row.versionCode } },
    orderBy: { versionCode: "desc" },
  });

  if (previous) {
    await prisma.mobileReleaseVersion.update({
      where: { id: previous.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), rolloutPercent: 100 },
    });
  }

  await syncReleaseManifestFile();
  return mapReleaseVersion(row);
}

export async function setRolloutPercent(releaseId: string, percent: number): Promise<ReleaseVersion> {
  const normalized = ROLLOUT_STEPS.includes(percent as (typeof ROLLOUT_STEPS)[number])
    ? percent
    : Math.min(100, Math.max(0, percent));
  const row = await prisma.mobileReleaseVersion.update({
    where: { id: releaseId },
    data: { rolloutPercent: normalized },
  });
  return mapReleaseVersion(row);
}

export function isDeviceEligibleForRollout(deviceId: string | undefined, percent: number): boolean {
  if (percent >= 100) return true;
  if (!deviceId) return false;
  const hash = createHash("sha256").update(deviceId).digest();
  const bucket = hash[0] % 100;
  return bucket < percent;
}

export async function getReleaseDashboardRows() {
  await seedRegistryFromManifestIfEmpty();
  return prisma.mobileReleaseVersion.findMany({
    orderBy: { versionCode: "desc" },
    include: {
      _count: { select: { analyticsEvents: true, testerAssignments: true } },
    },
  });
}
