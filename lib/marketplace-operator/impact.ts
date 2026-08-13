import type { MarketplaceSignal } from "@/lib/marketplace-intelligence/types";

import type { MarketplaceDiagnosis } from "./types";
import { IMPACT_WEIGHTS } from "./types";

type ImpactInput = {
  diagnosis: MarketplaceDiagnosis;
  signal?: MarketplaceSignal;
  actionCount: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Advisory impact score 0–100 — no exact revenue promises. */
export function calculateImpactScore(input: ImpactInput): {
  impactScore: number;
  expectedEffect: string;
  breakdown: import("./types").ImpactBreakdown;
} {
  const severityPts =
    input.diagnosis.severity === "HIGH"
      ? 1
      : input.diagnosis.severity === "MEDIUM"
        ? 0.65
        : 0.35;

  const revenueOpportunity = clamp(
    Math.round(
      (input.diagnosis.category === "Revenue" ? 0.9 : 0.5) *
        severityPts *
        IMPACT_WEIGHTS.revenueOpportunity,
    ),
    0,
    IMPACT_WEIGHTS.revenueOpportunity,
  );

  const demandGrowth = clamp(
    Math.round(
      (input.diagnosis.category === "Demand" ||
      input.diagnosis.category === "Supply"
        ? 0.85
        : 0.4) *
        severityPts *
        IMPACT_WEIGHTS.demandGrowth,
    ),
    0,
    IMPACT_WEIGHTS.demandGrowth,
  );

  const currentWeakness = clamp(
    Math.round(severityPts * IMPACT_WEIGHTS.currentWeakness),
    0,
    IMPACT_WEIGHTS.currentWeakness,
  );

  const difficulty =
    input.actionCount <= 2 ? 1 : input.actionCount <= 4 ? 0.7 : 0.45;
  const executionEase = clamp(
    Math.round(difficulty * IMPACT_WEIGHTS.executionDifficulty),
    0,
    IMPACT_WEIGHTS.executionDifficulty,
  );

  const confidence = clamp(
    Math.round(
      (input.diagnosis.causes.length >= 2 ? 0.85 : 0.6) *
        IMPACT_WEIGHTS.confidence,
    ),
    0,
    IMPACT_WEIGHTS.confidence,
  );

  const impactScore = clamp(
    revenueOpportunity +
      demandGrowth +
      currentWeakness +
      executionEase +
      confidence,
    0,
    100,
  );

  const expectedEffect =
    input.diagnosis.category === "Conversion"
      ? "Рост конверсии категории"
      : input.diagnosis.category === "Demand" ||
          input.diagnosis.category === "Supply"
        ? "Рост продаж категории"
        : input.diagnosis.category === "Revenue"
          ? "Восстановление потенциальной выручки"
          : "Улучшение здоровья площадки";

  return {
    impactScore,
    expectedEffect,
    breakdown: {
      revenueOpportunity,
      demandGrowth,
      currentWeakness,
      executionEase,
      confidence,
    },
  };
}
