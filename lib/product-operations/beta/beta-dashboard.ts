import { prisma } from "@/lib/prisma";

import { getProductAnalyticsOverview } from "../analytics";
import { getCrashObservatory } from "./crash-observatory";
import { getPerformanceObservatory } from "./performance-observatory";
import { getUxObservatory } from "./ux-observatory";
import { validateAllJourneys } from "./journey-validation";
import type { BetaDashboardSnapshot } from "./types";

export async function buildBetaDashboardSnapshot(): Promise<BetaDashboardSnapshot> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [analytics, crashes, perf, ux, journeys, errors, feedback, screenViews, abandoned] =
    await Promise.all([
      getProductAnalyticsOverview(),
      getCrashObservatory(1, 5),
      getPerformanceObservatory(1),
      getUxObservatory(7),
      validateAllJourneys(7),
      prisma.productTelemetryEvent.groupBy({
        by: ["eventType"],
        where: { createdAt: { gte: dayAgo }, eventType: { in: ["error", "api_failure", "crash"] } },
        _count: { _all: true },
        orderBy: { _count: { eventType: "desc" } },
        take: 5,
      }),
      prisma.productFeedbackItem.groupBy({
        by: ["classification"],
        where: { createdAt: { gte: dayAgo } },
        _count: { _all: true },
        orderBy: { _count: { classification: "desc" } },
        take: 5,
      }),
      prisma.productTelemetryEvent.groupBy({
        by: ["screen"],
        where: { createdAt: { gte: dayAgo }, eventType: "screen_view", screen: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { screen: "desc" } },
        take: 8,
      }),
      getUxObservatory(7).then((rows) => rows.filter((r) => r.signal === "abandoned_flow").slice(0, 5)),
    ]);

  const sessionDurations = await prisma.productSessionStep.findMany({
    where: { createdAt: { gte: dayAgo } },
    select: { sessionId: true, createdAt: true },
    take: 2000,
  });
  const sessionTimes = new Map<string, { min: number; max: number }>();
  for (const step of sessionDurations) {
    const t = step.createdAt.getTime();
    const cur = sessionTimes.get(step.sessionId);
    if (!cur) sessionTimes.set(step.sessionId, { min: t, max: t });
    else {
      cur.min = Math.min(cur.min, t);
      cur.max = Math.max(cur.max, t);
    }
  }
  const durations = [...sessionTimes.values()].map((s) => (s.max - s.min) / 60000);
  const averageSessionMinutes =
    durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0;

  const crashRate = analytics.sessions24h > 0
    ? Math.round((crashes.reduce((s, c) => s + c.count, 0) / analytics.sessions24h) * 1000) / 10
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    crashRate,
    crashFreeSessions: analytics.crashFreeRate,
    successRate: Math.min(100, analytics.crashFreeRate),
    averageSessionMinutes,
    activeBetaUsers: analytics.dau,
    buyerCompletionRate: journeys.buyer.completionRate,
    sellerCompletionRate: journeys.seller.completionRate,
    mostCommonErrors: errors.map((e) => ({ label: e.eventType, count: e._count._all })),
    mostCommonFeedback: feedback.map((f) => ({ category: f.classification, count: f._count._all })),
    slowestScreens: perf
      .filter((p) => p.p95Ms > 0)
      .slice(0, 5)
      .map((p) => ({ screen: p.metric, p95Ms: p.p95Ms })),
    mostOpenedScreens: screenViews.map((s) => ({
      screen: s.screen ?? "unknown",
      count: s._count._all,
    })),
    mostAbandonedFlows: abandoned.map((a) => ({ flow: a.screen, count: a.count })),
  };
}
