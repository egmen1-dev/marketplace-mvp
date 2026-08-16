import { computeValidationCacheKey } from "./fingerprint";
import { appendEvolutionMemoryEvent } from "./memory";
import { getCandidate, updateCandidate } from "./candidate";
import { runShadowEvaluation } from "./shadow";
import { runTwinValidation } from "./twin-validation";
import { runGraphValidationGate, runRegressionValidation, runStructuralValidation } from "./validation";
import { computeBlastRadius, computeRiskScore } from "./risk";
import type { CognitiveBrainVersion, ValidationResultBundle } from "./types";

const validationCache = new Map<string, ValidationResultBundle>();

export function runCandidateValidationPipeline(candidateId: string): ValidationResultBundle {
  const candidate = getCandidate(candidateId);
  if (!candidate) throw new Error("Candidate not found");

  const cacheKey = computeValidationCacheKey(candidate);
  const cached = validationCache.get(cacheKey);
  if (cached) return cached;

  updateCandidate(candidateId, { status: "VALIDATING", validationStage: "STRUCTURAL_VALIDATION" });
  appendEvolutionMemoryEvent({
    kind: "validation_started",
    candidateId,
    actor: "evolution-engine",
    detail: "validation pipeline started",
  });

  const stages = [
    runStructuralValidation(candidate),
    runRegressionValidation(candidate),
    runGraphValidationGate(candidate),
  ];

  const twin = runTwinValidation(candidate);
  stages.push({ stage: twin.stage, passed: twin.passed, detail: twin.detail, metrics: { multiObjectivePass: twin.report.multiObjectivePass } });

  const shadow = runShadowEvaluation(candidate);
  stages.push({
    stage: "SHADOW_VALIDATION",
    passed: shadow.passed,
    detail: shadow.detail,
    metrics: { disagreementRate: shadow.disagreementRate, criticalDisagreement: shadow.criticalDisagreement },
  });

  const interim: ValidationResultBundle = {
    stages,
    passed: stages.every((s) => s.passed),
    completedAt: new Date().toISOString(),
    cacheKey,
  };

  const risk = computeRiskScore({
    candidate,
    validation: interim,
    shadowDisagreementRate: shadow.disagreementRate,
    criticalDisagreement: shadow.criticalDisagreement,
  });

  stages.push({
    stage: "RISK_VALIDATION",
    passed: risk.tier !== "CRITICAL",
    detail: `risk score ${risk.score} tier ${risk.tier}`,
    metrics: { riskScore: risk.score, riskTier: risk.tier },
  });

  const bundle: ValidationResultBundle = {
    stages,
    passed: stages.every((s) => s.passed),
    completedAt: new Date().toISOString(),
    cacheKey,
  };

  validationCache.set(cacheKey, bundle);

  updateCandidate(candidateId, {
    validationResults: bundle,
    validationStage: "HUMAN_APPROVAL",
    riskScore: risk.score,
    riskTier: risk.tier,
    blastRadius: computeBlastRadius(candidate),
    status: bundle.passed ? "VALIDATING" : "REJECTED",
  });

  appendEvolutionMemoryEvent({
    kind: bundle.passed ? "validation_passed" : "validation_failed",
    candidateId,
    actor: "evolution-engine",
    detail: bundle.passed ? "all stages passed" : "validation failed",
  });

  return bundle;
}

export function resetValidationCache(): void {
  validationCache.clear();
}

export function isCandidateVisibleToSeller(candidate: CognitiveBrainVersion): boolean {
  return candidate.status === "PROMOTED" || candidate.status === "CURRENT";
}
