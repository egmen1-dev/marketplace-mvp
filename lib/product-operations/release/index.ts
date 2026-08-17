import { prisma } from "@/lib/prisma";

import { getFeedbackSummary } from "../feedback";
import { countTelemetrySince } from "../telemetry";
import type { ReleaseIntelligenceRow, VersionDistributionRow } from "../types";

const UPDATE_EVENT_TYPES = {
  viewed: "update_viewed",
  started: "update_started",
  deferred: "update_deferred",
} as const;

async function countUpdateEvents(versionCode: number, eventType: string) {
  return prisma.productTelemetryEvent.count({
    where: { versionCode, eventType },
  });
}

export async function getVersionDistribution(): Promise<VersionDistributionRow[]> {
  const grouped = await prisma.productTelemetryEvent.groupBy({
    by: ["versionCode", "versionName"],
    where: {
      eventType: "session_start",
      deviceIdHash: { not: null },
    },
    _count: { deviceIdHash: true },
  });

  return grouped
    .map((row) => ({
      versionName: row.versionName ?? `v${row.versionCode ?? 0}`,
      versionCode: row.versionCode ?? 0,
      deviceCount: row._count.deviceIdHash,
    }))
    .sort((a, b) => b.versionCode - a.versionCode);
}

export async function getReleaseIntelligence(): Promise<ReleaseIntelligenceRow[]> {
  const releases = await prisma.mobileReleaseVersion.findMany({
    orderBy: { versionCode: "desc" },
    take: 10,
  });

  const distribution = await getVersionDistribution();
  const rows: ReleaseIntelligenceRow[] = [];

  for (const release of releases) {
    const [crashes, sessions, feedback, updateViewed, updateStarted, updateDeferred] = await Promise.all([
      prisma.productTelemetryEvent.count({
        where: { versionCode: release.versionCode, eventType: { in: ["crash", "error"] } },
      }),
      prisma.productTelemetryEvent.count({
        where: { versionCode: release.versionCode, eventType: { in: ["session_start", "screen_view"] } },
      }),
      prisma.productFeedbackItem.count({ where: { versionCode: release.versionCode } }),
      countUpdateEvents(release.versionCode, UPDATE_EVENT_TYPES.viewed),
      countUpdateEvents(release.versionCode, UPDATE_EVENT_TYPES.started),
      countUpdateEvents(release.versionCode, UPDATE_EVENT_TYPES.deferred),
    ]);

    const activeVersionDistribution =
      distribution.find((row) => row.versionCode === release.versionCode)?.deviceCount ?? 0;

    const crashRate = sessions > 0 ? crashes / sessions : crashes > 0 ? 1 : 0;
    let rollbackRisk: ReleaseIntelligenceRow["rollbackRisk"] = "low";
    if (crashRate > 0.05 || crashes >= 5) rollbackRisk = "high";
    else if (crashRate > 0.01 || feedback >= 3) rollbackRisk = "medium";

    rows.push({
      releaseId: release.id,
      versionName: release.versionName,
      versionCode: release.versionCode,
      crashes,
      sessions,
      feedback,
      rollbackRisk,
      eligibleDevices: release.rolloutPercent,
      updateViewed,
      updateStarted,
      updateDeferred,
      activeVersionDistribution,
    });
  }

  return rows;
}

export async function getReleaseIntelligenceSummary() {
  const rows = await getReleaseIntelligence();
  const feedbackByVersion = await getFeedbackSummary();
  const crashes24h = await countTelemetrySince(24, ["crash"]);
  const versionDistribution = await getVersionDistribution();

  return { rows, feedbackByVersion, crashes24h, versionDistribution };
}

export {
  buildProductReleaseVerdictReport,
  computeProductReleaseVerdict,
  type ProductReleaseMetrics,
  type ProductReleaseVerdict,
  type ProductReleaseVerdictReport,
} from "./verdict";
