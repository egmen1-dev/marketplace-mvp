import { evaluateReleaseQualityGates } from "./release-gates";
import { buildBetaDashboardSnapshot } from "./beta-dashboard";
import { getCrashObservatory } from "./crash-observatory";
import { getPerformanceObservatory } from "./performance-observatory";
import { getUxObservatory } from "./ux-observatory";
import { validateAllJourneys } from "./journey-validation";
import { generateBetaExitReport } from "./beta-exit-report";

export type ClosedBetaReadinessDashboard = {
  generatedAt: string;
  overallScore: number;
  crashFreePercent: number;
  buyerJourneyPercent: number;
  sellerJourneyPercent: number;
  performanceWithinLimits: boolean;
  criticalBugs: number;
  warnings: string[];
  recommendation: "READY" | "NOT_READY";
  snapshot: Awaited<ReturnType<typeof buildBetaDashboardSnapshot>>;
  journeys: Awaited<ReturnType<typeof validateAllJourneys>>;
  releaseGates: Awaited<ReturnType<typeof evaluateReleaseQualityGates>>;
  exitReport: Awaited<ReturnType<typeof generateBetaExitReport>>;
};

export async function buildClosedBetaReadinessDashboard(): Promise<ClosedBetaReadinessDashboard> {
  const [snapshot, journeys, gates, exitReport, perf, ux] = await Promise.all([
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
  if (journeys.buyer.completionRate < 10) warnings.push(`Buyer journey completion ${journeys.buyer.completionRate}% low`);
  if (journeys.seller.completionRate < 5) warnings.push(`Seller journey completion ${journeys.seller.completionRate}% low`);
  if (failedGates > 0) warnings.push(`${failedGates} release gates failing`);
  if (slowMetrics.length > 0) warnings.push(`Slow P95: ${slowMetrics.map((m) => m.metric).join(", ")}`);

  const overallScore = Math.round(
    (snapshot.crashFreeSessions * 0.4 +
      snapshot.buyerCompletionRate * 0.2 +
      snapshot.sellerCompletionRate * 0.2 +
      (gates.verdict === "PASS" ? 100 : 0) * 0.2),
  );

  const performanceWithinLimits = slowMetrics.length === 0;
  const criticalBugs = exitReport.topBugs.filter((b) => b.severity === "critical" || b.severity === "high").length;

  const recommendation: ClosedBetaReadinessDashboard["recommendation"] =
    gates.verdict === "PASS" &&
    snapshot.crashFreeSessions >= 99 &&
    criticalBugs === 0 &&
    journeys.buyer.status === "PASS" &&
    journeys.seller.status === "PASS"
      ? "READY"
      : "NOT_READY";

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    crashFreePercent: snapshot.crashFreeSessions,
    buyerJourneyPercent: journeys.buyer.completionRate,
    sellerJourneyPercent: journeys.seller.completionRate,
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
