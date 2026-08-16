import type { CognitiveBrainVersion, ValidationStageResult } from "./types";
import { getGoldenBenchmark } from "./benchmark/golden-benchmark-v1";
import { getBrainVersionRegistry, resolveBrainVersionEntry } from "@/lib/ccos/knowledge/versions";
import { getActiveGraphVersion } from "@/lib/ccos/graph/versioning";

export function runStructuralValidation(candidate: CognitiveBrainVersion): ValidationStageResult {
  const issues: string[] = [];

  if (!candidate.parentVersionId) {
    issues.push("missing parent version");
  } else if (!getBrainVersionRegistry().some((r) => r.brainVersion === candidate.parentVersionId)) {
    issues.push("parent version not in registry");
  }

  if (candidate.changeSet.entries.length === 0) {
    issues.push("empty change set");
  }

  const weights = candidate.policyWeights;
  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (weightSum <= 0 || weightSum > 2) {
    issues.push("invalid weight sum");
  }
  for (const [k, v] of Object.entries(weights)) {
    if (v < 0 || v > 1) issues.push(`invalid weight ${k}=${v}`);
  }

  if (!candidate.knowledgePackVersion) issues.push("missing knowledge pack");
  if (!candidate.graphVersion) issues.push("missing graph version");
  if (!candidate.reasoningPolicyVersion) issues.push("missing reasoning policy");

  const graphVersion = getActiveGraphVersion();
  if (candidate.graphVersion !== graphVersion) {
    issues.push(`graph version mismatch candidate=${candidate.graphVersion} active=${graphVersion}`);
  }

  return {
    stage: "STRUCTURAL_VALIDATION",
    passed: issues.length === 0,
    detail: issues.length === 0 ? "structural checks passed" : issues.join("; "),
    metrics: { issueCount: issues.length },
  };
}

export function runRegressionValidation(candidate: CognitiveBrainVersion): ValidationStageResult {
  const benchmark = getGoldenBenchmark();
  const weights = candidate.policyWeights;
  let failures = 0;
  const metrics: Record<string, number> = {
    badProductTopExposure: 0,
    coldStartSuppression: 0,
    newSellerSuppression: 0,
    promotionDominance: 0,
  };

  for (const product of benchmark) {
    const score =
      product.qualityScore * weights.quality +
      product.relevanceScore * weights.relevance +
      (product.promotionActive ? 100 : 0) * weights.promotion +
      product.trustScore * weights.trust +
      (product.coldStart ? 50 : 0) * weights.coldStart +
      (product.newSeller ? 50 : 0) * weights.newSeller;

    const goodFan = benchmark.find((p) => p.id === "bench-good-fan")!;
    const dirtySocks = benchmark.find((p) => p.id === "bench-dirty-socks")!;

    if (product.segment === "bad" || product.segment === "promoted_junk") {
      if (score > 60) metrics.badProductTopExposure += 1;
    }

    if (product.segment === "cold_start" && score < 20) {
      metrics.coldStartSuppression += 1;
    }

    if (product.segment === "new_seller" && score < 15) {
      metrics.newSellerSuppression += 1;
    }

    if (product.segment === "promoted_junk" && weights.promotion > 0.25) {
      metrics.promotionDominance += 1;
    }

    if (product.id === dirtySocks.id) {
      const goodScore =
        goodFan.qualityScore * weights.quality + goodFan.relevanceScore * weights.relevance;
      if (score >= goodScore) failures += 1;
    }
  }

  const passed =
    failures === 0 &&
    metrics.badProductTopExposure === 0 &&
    metrics.coldStartSuppression === 0 &&
    metrics.newSellerSuppression === 0 &&
    metrics.promotionDominance === 0;

  return {
    stage: "REGRESSION_VALIDATION",
    passed,
    detail: passed ? "golden benchmark regression passed" : "regression failures detected",
    metrics: { ...metrics, dirtySocksFailures: failures },
  };
}

export function runGraphValidationGate(candidate: CognitiveBrainVersion): ValidationStageResult {
  const graphConfidenceCap = 0.55;
  const candidateConfidence = Math.min(
    0.95,
    candidate.policyWeights.quality + candidate.policyWeights.relevance,
  );

  const inflation = candidateConfidence > graphConfidenceCap + 0.15;
  const graphVersionOk = candidate.graphVersion === getActiveGraphVersion();
  const passed = graphVersionOk && !inflation;

  return {
    stage: "GRAPH_VALIDATION",
    passed,
    detail: passed
      ? "graph compatibility ok"
      : !graphVersionOk
        ? "graph version mismatch"
        : "confidence inflation vs graph evidence",
    metrics: {
      graphCoverage: graphConfidenceCap,
      candidateConfidence,
      inflationDetected: inflation,
    },
  };
}

export { runStructuralValidation as validateStructure };
