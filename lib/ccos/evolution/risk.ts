import type { BlastRadius, CognitiveBrainVersion, RiskTier, ValidationResultBundle } from "./types";

export function computeBlastRadius(candidate: CognitiveBrainVersion): BlastRadius {
  const weightDelta = candidate.changeSet.entries.reduce(
    (acc, e) => acc + Math.abs(Number(e.to) - Number(e.from)),
    0,
  );

  return {
    affectedProducts: Math.min(5000, Math.round(weightDelta * 800)),
    affectedCategories: Math.min(40, Math.round(weightDelta * 12)),
    affectedSellers: Math.min(1200, Math.round(weightDelta * 200)),
    affectedBrainCapabilities: candidate.changeSet.entries.map((e) => e.field),
  };
}

export function computeRiskScore(input: {
  candidate: CognitiveBrainVersion;
  validation: ValidationResultBundle;
  shadowDisagreementRate: number;
  criticalDisagreement: boolean;
}): { score: number; tier: RiskTier } {
  let score = 10;

  const regression = input.validation.stages.find((s) => s.stage === "REGRESSION_VALIDATION");
  if (regression && !regression.passed) score += 40;

  const graph = input.validation.stages.find((s) => s.stage === "GRAPH_VALIDATION");
  if (graph?.metrics?.inflationDetected) score += 20;

  score += Math.round(input.shadowDisagreementRate * 30);
  if (input.criticalDisagreement) score += 35;

  const magnitude = input.candidate.changeSet.entries.reduce(
    (acc, e) => acc + Math.abs(Number(e.to) - Number(e.from)),
    0,
  );
  score += Math.min(25, Math.round(magnitude * 100));

  const blast = computeBlastRadius(input.candidate);
  if (blast.affectedCategories > 20) score += 10;

  score = Math.min(100, Math.max(0, score));

  let tier: RiskTier = "LOW";
  if (score >= 75) tier = "CRITICAL";
  else if (score >= 50) tier = "HIGH";
  else if (score >= 25) tier = "MEDIUM";

  return { score, tier };
}

export function canApproveWithRiskTier(tier: RiskTier): boolean {
  return tier !== "CRITICAL";
}
