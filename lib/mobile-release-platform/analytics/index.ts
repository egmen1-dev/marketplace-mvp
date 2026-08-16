import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

import type { ReleaseAnalyticsSummary } from "../types";

export async function recordReleaseEvent(input: {
  eventType: string;
  versionCode?: number;
  releaseId?: string;
  deviceIdHash?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.mobileReleaseAnalyticsEvent.create({
    data: {
      eventType: input.eventType,
      versionCode: input.versionCode,
      releaseId: input.releaseId,
      deviceIdHash: input.deviceIdHash,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getReleaseAnalyticsSummary(releaseId: string): Promise<ReleaseAnalyticsSummary> {
  const events = await prisma.mobileReleaseAnalyticsEvent.groupBy({
    by: ["eventType"],
    where: { releaseId },
    _count: { _all: true },
  });

  const count = (type: string) => events.find((e) => e.eventType === type)?._count._all ?? 0;

  return {
    installs: count("install"),
    active: count("active"),
    updates: count("update"),
    crashes: count("crash"),
    sessions: count("session"),
  };
}

export async function getPlatformAnalyticsOverview() {
  const [releases, events] = await Promise.all([
    prisma.mobileReleaseVersion.count({ where: { status: "PUBLISHED" } }),
    prisma.mobileReleaseAnalyticsEvent.groupBy({
      by: ["eventType"],
      _count: { _all: true },
    }),
  ]);

  return {
    publishedReleases: releases,
    events: Object.fromEntries(events.map((e) => [e.eventType, e._count._all])),
  };
}
