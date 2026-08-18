import { prisma } from "@/lib/prisma";

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
  const [crashes, perf, ux, feedback, gates] = await Promise.all([
    getCrashObservatory(14, 10),
    getPerformanceObservatory(14),
    getUxObservatory(14),
    prisma.productFeedbackItem.groupBy({
      by: ["classification"],
      _count: { _all: true },
      orderBy: { _count: { classification: "desc" } },
    }),
    evaluateReleaseQualityGates(),
  ]);

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

  const topBugs = feedback
    .filter((f) => f.classification === "error" || f.classification === "crash")
    .slice(0, 5)
    .map((f) =>
      toItem("bug", f.classification, f._count._all, "high", 2, "M", "high"),
    );

  const topFeatureRequests = feedback
    .filter((f) => f.classification === "feature_request")
    .slice(0, 5)
    .map((f) => toItem("feature_request", f.classification, f._count._all, "low", 6, "L", "medium"));

  const mostRequested = feedback.slice(0, 5).map((f) =>
    toItem("improvement", f.classification, f._count._all, "low", 5, "M", "medium"),
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
