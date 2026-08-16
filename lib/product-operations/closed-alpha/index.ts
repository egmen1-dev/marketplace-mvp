import { prisma } from "@/lib/prisma";
import { listTesters } from "@/lib/mobile-release-platform/distribution";

import { getProductAnalyticsOverview } from "../analytics";
import type { ClosedAlphaConsole } from "../types";

export async function buildClosedAlphaConsole(): Promise<ClosedAlphaConsole> {
  const [testers, releases, analytics, feedbackCount, crashCount] = await Promise.all([
    listTesters(),
    prisma.mobileReleaseVersion.findMany({
      where: { channel: "CLOSED_ALPHA" },
      orderBy: { versionCode: "desc" },
      include: { _count: { select: { testerAssignments: true } } },
    }),
    getProductAnalyticsOverview(),
    prisma.productFeedbackItem.count(),
    prisma.productTelemetryEvent.count({ where: { eventType: { in: ["crash", "error"] } } }),
  ]);

  const testerRows = await Promise.all(
    testers.map(async (t) => {
      const deviceHash = t.deviceModel ? t.email : undefined;
      const [fb, cr] = await Promise.all([
        prisma.productFeedbackItem.count({
          where: deviceHash ? { deviceIdHash: deviceHash } : { source: "mobile" },
        }),
        prisma.productTelemetryEvent.count({
          where: { eventType: { in: ["crash", "error"] } },
        }),
      ]);

      const assignment = t.assignments[0]?.release;
      return {
        id: t.id,
        email: t.email,
        status: t.status,
        deviceModel: t.deviceModel,
        versionCode: assignment?.versionCode ?? null,
        feedbackCount: fb,
        crashCount: cr,
      };
    }),
  );

  let verdict: ClosedAlphaConsole["stability"]["verdict"] = "WATCH";
  if (analytics.crashFreeRate >= 98 && crashCount === 0 && testers.length >= 1) verdict = "GO";
  if (analytics.crashFreeRate < 90 || crashCount > 5) verdict = "NO-GO";

  return {
    testers: testerRows,
    releases: releases.map((r) => ({
      versionName: r.versionName,
      versionCode: r.versionCode,
      status: r.status,
      testerCount: r._count.testerAssignments,
    })),
    stability: {
      crashFreeRate: analytics.crashFreeRate,
      openFeedback: feedbackCount,
      verdict,
    },
  };
}
