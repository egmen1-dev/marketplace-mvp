import type { TwinRiskAssessment, TwinScenario } from "./types";

export function assessScenarioRisk(
  scenario: TwinScenario,
  predicted: { revenueDeltaPct?: number; ctrDeltaPct?: number; positionDelta?: number },
): TwinRiskAssessment {
  let score = 25;
  const factors: string[] = [];

  const priceAction = scenario.actions.find((a) => a.type === "change_price");
  const pricePct = Number(priceAction?.params?.percent ?? 0);
  if (pricePct <= -10) {
    score += 35;
    factors.push("Margin ↓↓ при сильном снижении цены");
  } else if (pricePct < 0) {
    score += 15;
    factors.push("Revenue может снизиться при росте CTR");
  }

  if (scenario.actions.some((a) => a.type === "enable_promotion")) {
    score += 20;
    factors.push("Promotion: CTR ↑, ROI может ↓");
  }

  if ((predicted.revenueDeltaPct ?? 0) < 0) {
    score += 12;
    factors.push("Прогноз revenue отрицательный");
  }

  if ((predicted.positionDelta ?? 0) < 0) {
    score += 18;
    factors.push("Риск ухудшения позиции");
  }

  score = Math.min(100, score);
  const level = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  const summary =
    level === "high"
      ? `Risk ${score}% — осторожно, проверьте маржу и ROI`
      : level === "medium"
        ? `Risk Medium (${score}%)`
        : `Risk Low (${score}%)`;

  return { level, score, factors, summary };
}
