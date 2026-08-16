import type { CognitiveBrainVersion, EvolutionShadowResult } from "./types";
import { getActiveBrainVersion } from "@/lib/ccos/rollback/brain";
import { resolveBasePolicyWeights } from "./candidate";

const shadowResults: EvolutionShadowResult[] = [];
const MIN_SHADOW_SAMPLES = 3;

function evaluateDecision(
  weights: CognitiveBrainVersion["policyWeights"],
  entity: { quality: number; relevance: number; promotion: boolean },
  options?: { candidate?: boolean },
): Record<string, unknown> {
  const score =
    entity.quality * weights.quality +
    entity.relevance * weights.relevance +
    (entity.promotion ? 100 : 0) * weights.promotion;
  const blocked = entity.quality < 40 || entity.relevance < 30;
  const candidateIgnoresBlocker = Boolean(options?.candidate) && weights.promotion > 0.35;
  const nextAction = blocked && !candidateIgnoresBlocker
    ? "FIX_QUALITY"
    : score > 55
      ? "PROMOTE"
      : "IMPROVE";
  return {
    score,
    blocker: blocked && !candidateIgnoresBlocker ? "QUALITY_BLOCKED" : null,
    nextAction,
    confidence: Math.min(0.9, score / 100),
  };
}

export function runShadowEvaluation(candidate: CognitiveBrainVersion): {
  passed: boolean;
  detail: string;
  samples: EvolutionShadowResult[];
  disagreementRate: number;
  criticalDisagreement: boolean;
} {
  const currentVersion = getActiveBrainVersion();
  const currentWeights = resolveBasePolicyWeights(currentVersion);
  const entities = [
    { id: "shadow-good-1", quality: 80, relevance: 85, promotion: false },
    { id: "shadow-dirty-socks", quality: 35, relevance: 15, promotion: true },
    { id: "shadow-bad-1", quality: 22, relevance: 18, promotion: true },
  ];

  const samples: EvolutionShadowResult[] = [];
  let disagreements = 0;
  let criticalDisagreement = false;

  for (const entity of entities) {
    const currentDecision = evaluateDecision(currentWeights, entity);
    const candidateDecision = evaluateDecision(candidate.policyWeights, entity, { candidate: true });
    const deltas = [
      {
        metric: "score",
        current: Number(currentDecision.score),
        candidate: Number(candidateDecision.score),
        delta: Number(candidateDecision.score) - Number(currentDecision.score),
      },
      {
        metric: "confidence",
        current: Number(currentDecision.confidence),
        candidate: Number(candidateDecision.confidence),
        delta: Number(candidateDecision.confidence) - Number(currentDecision.confidence),
      },
    ];

    if (currentDecision.nextAction !== candidateDecision.nextAction) {
      disagreements += 1;
    }

    if (currentDecision.blocker === "QUALITY_BLOCKED" && candidateDecision.nextAction === "PROMOTE") {
      criticalDisagreement = true;
    }

    const result: EvolutionShadowResult = {
      currentVersion,
      candidateVersion: candidate.version,
      entityId: entity.id,
      contextFingerprint: `${entity.id}:${candidate.fingerprint}`,
      currentDecision,
      candidateDecision,
      deltas,
      disagreementRate: 0,
      criticalDisagreement:
        currentDecision.blocker === "QUALITY_BLOCKED" && candidateDecision.nextAction === "PROMOTE",
      createdAt: new Date().toISOString(),
    };
    samples.push(result);
    shadowResults.push(result);
  }

  const disagreementRate = disagreements / entities.length;
  for (const s of samples) s.disagreementRate = disagreementRate;

  const passed =
    samples.length >= MIN_SHADOW_SAMPLES && !criticalDisagreement && disagreementRate <= 0.67;

  return {
    passed,
    detail: criticalDisagreement
      ? "critical shadow disagreement — quality blocker removed"
      : passed
        ? "shadow evaluation passed"
        : "shadow disagreement too high",
    samples,
    disagreementRate,
    criticalDisagreement,
  };
}

export function listShadowResults(candidateVersion?: string): EvolutionShadowResult[] {
  if (!candidateVersion) return [...shadowResults];
  return shadowResults.filter((r) => r.candidateVersion === candidateVersion);
}

export function resetShadowResults(): void {
  shadowResults.length = 0;
}
