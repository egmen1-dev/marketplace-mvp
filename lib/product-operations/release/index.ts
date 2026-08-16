import { prisma } from "@/lib/prisma";

import { getFeedbackSummary } from "../feedback";
import { countTelemetrySince } from "../telemetry";
import type { ReleaseIntelligenceRow } from "../types";

export async function getReleaseIntelligence(): Promise<ReleaseIntelligenceRow[]> {
  const releases = await prisma.mobileReleaseVersion.findMany({
    orderBy: { versionCode: "desc" },
    take: 10,
  });

  const rows: ReleaseIntelligenceRow[] = [];

  for (const release of releases) {
    const [crashes, sessions, feedback] = await Promise.all([
      prisma.productTelemetryEvent.count({
        where: { versionCode: release.versionCode, eventType: { in: ["crash", "error"] } },
      }),
      prisma.productTelemetryEvent.count({
        where: { versionCode: release.versionCode, eventType: { in: ["session_start", "screen_view"] } },
      }),
      prisma.productFeedbackItem.count({ where: { versionCode: release.versionCode } }),
    ]);

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
    });
  }

  return rows;
}

export async function getReleaseIntelligenceSummary() {
  const rows = await getReleaseIntelligence();
  const feedbackByVersion = await getFeedbackSummary();
  const crashes24h = await countTelemetrySince(24, ["crash"]);

  return { rows, feedbackByVersion, crashes24h };
}
