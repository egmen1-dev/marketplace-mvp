import { prisma } from "@/lib/prisma";

import { isEligibleReleaseMetric } from "./evidence-eligibility";
import { getCrashObservatory } from "./crash-observatory";
import { getPerformanceObservatory } from "./performance-observatory";
import { getUxObservatory } from "./ux-observatory";
import { evaluateReleaseQualityGates } from "./release-gates";
import type { BetaExitReport, BetaExitReportItem } from "./types";

function toItem(
  category: string,
  title: string,
  count: number,
  severity: BetaExitReportItem["severity"],
  priority: number,
  effort: BetaExitReportItem["estimatedEffort"],
  impact: BetaExitReportItem["businessImpact"],
): BetaExitReportItem {
  return {
    category,
    title,
    count,
    severity,
    fixPriority: priority,
    estimatedEffort: effort,
    businessImpact: impact,
  };
}

export async function generateBetaExitReport(): Promise<BetaExitReport> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [crashes, perf, ux, feedbackRows, gates] = await Promise.all([
    getCrashObservatory(14, 10),
    getPerformanceObservatory(14),
    getUxObservatory(14),
    prisma.productFeedbackItem.findMany({
      where: { createdAt: { gte: since } },
      select: {
        classification: true,
        content: true,
        screen: true,
        metadata: true,
        createdAt: true,
      },
    }),
    evaluateReleaseQualityGates(),
  ]);

  const eligibleFeedback = feedbackRows.filter((row) =>
    isEligibleReleaseMetric({
      createdAt: row.createdAt,
      screen: row.screen,
      content: row.content,
      metadata: row.metadata,
    }),
  );

  const feedbackCounts = new Map<string, number>();
  for (const row of eligibleFeedback) {
    if (row.classification === "error" || row.classification === "crash") {
      feedbackCounts.set(row.classification, (feedbackCounts.get(row.classification) ?? 0) + 1);
    }
  }

  const topCrashes = crashes.slice(0, 5).map((c) =>
    toItem(
      "crash",
      `${c.eventType} on ${c.screen}`,
      c.count,
      c.severity === "critical" ? "critical" : c.severity,
      c.severity === "critical" ? 1 : 2,
      "M",
      "high",
    ),
  );

  const topPerformance = perf
    .filter((p) => p.p95Ms > 2000)
    .slice(0, 5)
    .map((p) =>
      toItem("performance", `${p.metric} P95 ${p.p95Ms}ms`, p.count, "medium", 3, "M", "medium"),
    );

  const topUx = ux.slice(0, 5).map((u) =>
    toItem("ux", `${u.detail} (${u.screen})`, u.count, "medium", 4, "S", "medium"),
  );

  const topBugs = [...feedbackCounts.entries()].slice(0, 5).map(([classification, count]) =>
    toItem("bug", classification, count, "high", 2, "M", "high"),
  );

  const featureCounts = new Map<string, number>();
  const improvementCounts = new Map<string, number>();
  for (const row of eligibleFeedback) {
    if (row.classification === "feature_request") {
      featureCounts.set(row.classification, (featureCounts.get(row.classification) ?? 0) + 1);
    } else {
      improvementCounts.set(row.classification, (improvementCounts.get(row.classification) ?? 0) + 1);
    }
  }

  const topFeatureRequests = [...featureCounts.entries()].slice(0, 5).map(([classification, count]) =>
    toItem("feature_request", classification, count, "low", 6, "L", "medium"),
  );

  const mostRequested = [...improvementCounts.entries()].slice(0, 5).map(([classification, count]) =>
    toItem("improvement", classification, count, "low", 5, "M", "medium"),
  );

  const verdict = gates.verdict === "PASS" && topCrashes.filter((c) => c.severity === "critical").length === 0
    ? "READY"
    : "NOT_READY";

  const recommendation =
    verdict === "READY"
      ? "Beta evidence supports proceeding toward public release after final physical acceptance."
      : "Address release gate failures and top crashes before public launch.";

  return {
    generatedAt: new Date().toISOString(),
    verdict,
    topBugs,
    topUxIssues: topUx,
    topPerformanceIssues: topPerformance,
    topFeatureRequests,
    topCrashes,
    topConfusionPoints: topUx,
    mostRequestedImprovements: mostRequested,
    recommendation,
    releaseGates: gates.rows,
  };
}
