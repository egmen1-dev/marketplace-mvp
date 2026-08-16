import type { CognitiveBrainVersion, TwinComparisonReport } from "./types";
import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { resolveBasePolicyWeights } from "./candidate";

function scoreProduct(
  weights: CognitiveBrainVersion["policyWeights"],
  input: { quality: number; relevance: number; promotion: boolean; trust: number },
): number {
  return (
    input.quality * weights.quality +
    input.relevance * weights.relevance +
    (input.promotion ? 100 : 0) * weights.promotion +
    input.trust * weights.trust
  );
}

export function runTwinValidation(candidate: CognitiveBrainVersion): {
  stage: "TWIN_VALIDATION";
  passed: boolean;
  detail: string;
  report: TwinComparisonReport;
} {
  const currentVersion = getActiveBrainVersion();
  const currentWeights = resolveBasePolicyWeights(currentVersion);
  const scenarios = [
    { name: "predicted_ctr", quality: 70, relevance: 75, promotion: false, trust: 80 },
    { name: "conversion", quality: 78, relevance: 72, promotion: false, trust: 85 },
    { name: "ranking_estimate", quality: 65, relevance: 68, promotion: true, trust: 70 },
    { name: "bad_product_exposure", quality: 25, relevance: 20, promotion: true, trust: 30 },
    { name: "seller_recommendation", quality: 60, relevance: 62, promotion: false, trust: 55 },
  ];

  const metrics = scenarios.map((s) => {
    const current = scoreProduct(currentWeights, {
      quality: s.quality,
      relevance: s.relevance,
      promotion: s.promotion,
      trust: s.trust,
    });
    const cand = scoreProduct(candidate.policyWeights, {
      quality: s.quality,
      relevance: s.relevance,
      promotion: s.promotion,
      trust: s.trust,
    });
    const delta = cand - current;
    return {
      name: s.name,
      current,
      candidate: cand,
      delta,
      confidence: 0.55,
      risk: Math.abs(delta) > 25 ? 0.7 : 0.25,
      coverage: 0.6,
    };
  });

  const badExposure = metrics.find((m) => m.name === "bad_product_exposure")!;
  const multiObjectivePass =
    badExposure.candidate <= badExposure.current + 5 &&
    !metrics.some((m) => m.name !== "bad_product_exposure" && m.delta > 40 && m.risk > 0.6);

  const safetyMetrics = {
    badProductTopExposure: badExposure.candidate,
    prohibitedProductExposure: 0,
    lowTrustExposure: candidate.policyWeights.trust < 0.05 ? 1 : 0,
    coldStartSuppression: 0,
    newSellerSuppression: 0,
    promotionDominance: candidate.policyWeights.promotion > 0.3 ? 1 : 0,
  };

  const report: TwinComparisonReport = {
    currentVersion,
    candidateVersion: candidate.version,
    metrics,
    multiObjectivePass,
    safetyMetrics,
  };

  return {
    stage: "TWIN_VALIDATION",
    passed: multiObjectivePass,
    detail: multiObjectivePass ? "twin multi-objective gate passed" : "twin safety regression",
    report,
  };
}
