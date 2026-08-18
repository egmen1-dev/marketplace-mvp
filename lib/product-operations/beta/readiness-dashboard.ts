import { evaluateReleaseQualityGates } from "./release-gates";
import { buildBetaDashboardSnapshot } from "./beta-dashboard";
import { getPerformanceObservatory } from "./performance-observatory";
import { getUxObservatory } from "./ux-observatory";
import { validateAllJourneys } from "./journey-validation";
import { generateBetaExitReport } from "./beta-exit-report";

export type ClosedBetaReadinessDashboard = {
  generatedAt: string;
  overallScore: number | null;
  crashFreePercent: number;
  buyerJourneyPercent: number | null;
  sellerJourneyPercent: number | null;
  buyerJourneyStatus: "PASS" | "FAIL" | "INSUFFICIENT_DATA";
  sellerJourneyStatus: "PASS" | "FAIL" | "INSUFFICIENT_DATA";
  performanceWithinLimits: boolean;
  criticalBugs: number;
  warnings: string[];
  recommendation: "READY" | "NOT_READY" | "INSUFFICIENT_DATA";
  snapshot: Awaited<ReturnType<typeof buildBetaDashboardSnapshot>>;
  journeys: Awaited<ReturnType<typeof validateAllJourneys>>;
  releaseGates: Awaited<ReturnType<typeof evaluateReleaseQualityGates>>;
  exitReport: Awaited<ReturnType<typeof generateBetaExitReport>>;
};

export async function buildClosedBetaReadinessDashboard(): Promise<ClosedBetaReadinessDashboard> {
  const [snapshot, journeys, gates, exitReport, perf] = await Promise.all([
    buildBetaDashboardSnapshot(),
    validateAllJourneys(7),
    evaluateReleaseQualityGates(),
    generateBetaExitReport(),
    getPerformanceObservatory(7),
    getUxObservatory(7),
  ]);

  const failedGates = gates.rows.filter((r) => !r.ok).length;
  const slowMetrics = perf.filter((p) => p.p95Ms > 3000 && p.count >= 5);
  const warnings: string[] = [];
  if (snapshot.crashFreeSessions < 99) warnings.push(`Crash-free ${snapshot.crashFreeSessions}% < 99%`);
  if (journeys.buyer.status === "INSUFFICIENT_DATA") {
    warnings.push("Buyer journey: insufficient real-user session sample");
  } else if (journeys.buyer.completionRate !== null && journeys.buyer.completionRate < 10) {
    warnings.push(`Buyer journey completion ${journeys.buyer.completionRate}% low`);
  }
  if (journeys.seller.status === "INSUFFICIENT_DATA") {
    warnings.push("Seller journey: insufficient real-user session sample");
  } else if (journeys.seller.completionRate !== null && journeys.seller.completionRate < 5) {
    warnings.push(`Seller journey completion ${journeys.seller.completionRate}% low`);
  }
  if (failedGates > 0) warnings.push(`${failedGates} release gates failing`);
  if (slowMetrics.length > 0) warnings.push(`Slow P95: ${slowMetrics.map((m) => m.metric).join(", ")}`);

  const journeyScore =
    journeys.buyer.status === "INSUFFICIENT_DATA" || journeys.seller.status === "INSUFFICIENT_DATA"
      ? null
      : (journeys.buyer.completionRate ?? 0) * 0.5 + (journeys.seller.completionRate ?? 0) * 0.5;

  const overallScore =
    journeyScore === null
      ? null
      : Math.round(
          snapshot.crashFreeSessions * 0.4 + journeyScore * 0.4 + (gates.verdict === "PASS" ? 100 : 0) * 0.2,
        );

  const performanceWithinLimits = slowMetrics.length === 0;
  const criticalBugs = exitReport.topBugs.filter((b) => b.severity === "critical" || b.severity === "high").length;

  const buyerJourneyOk =
    journeys.buyer.status === "INSUFFICIENT_DATA" || journeys.buyer.status === "PASS";
  const sellerJourneyOk =
    journeys.seller.status === "INSUFFICIENT_DATA" || journeys.seller.status === "PASS";

  let recommendation: ClosedBetaReadinessDashboard["recommendation"] = "NOT_READY";
  if (
    journeys.buyer.status === "INSUFFICIENT_DATA" &&
    journeys.seller.status === "INSUFFICIENT_DATA" &&
    criticalBugs === 0 &&
    gates.verdict === "PASS"
  ) {
    recommendation = "INSUFFICIENT_DATA";
  } else if (
    gates.verdict === "PASS" &&
    snapshot.crashFreeSessions >= 99 &&
    criticalBugs === 0 &&
    buyerJourneyOk &&
    sellerJourneyOk &&
    journeys.buyer.status !== "FAIL" &&
    journeys.seller.status !== "FAIL"
  ) {
    recommendation = "READY";
  }

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    crashFreePercent: snapshot.crashFreeSessions,
    buyerJourneyPercent: journeys.buyer.completionRate,
    sellerJourneyPercent: journeys.seller.completionRate,
    buyerJourneyStatus: journeys.buyer.status,
    sellerJourneyStatus: journeys.seller.status,
    performanceWithinLimits,
    criticalBugs,
    warnings,
    recommendation,
    snapshot,
    journeys,
    releaseGates: gates,
    exitReport,
  };
}
