import { computeRankingScore } from "@/lib/marketplace-ranking-intelligence/ranking-score";
import { DEFAULT_RANKING_WEIGHTS_V1 } from "@/lib/marketplace-ranking-intelligence/ranking-weights";
import type {
  RankingProductInput,
  RankingWeightRow,
} from "@/lib/marketplace-ranking-intelligence/types";

import type { LabFactorContribution, LabProductReport } from "./types";

const BASELINE = 50;

function factorLabel(key: string, weights: RankingWeightRow[]): string {
  return weights.find((w) => w.factorKey === key)?.label ?? key;
}

/** Per-factor point contribution: (score - baseline) * weight / 100 */
export function computeFactorContributions(
  input: RankingProductInput,
  weights: RankingWeightRow[] = DEFAULT_RANKING_WEIGHTS_V1,
): LabFactorContribution[] {
  const score = computeRankingScore(input, weights);
  return score.factors.map((f) => ({
    factorKey: f.factorKey,
    label: f.label,
    score: f.score,
    weightPercent: f.weightPercent,
    points: Math.round(((f.score - BASELINE) * f.weightPercent) / 10) / 10,
  }));
}

export function buildProductFactorReport(input: {
  product: RankingProductInput;
  position: number;
  totalScore: number;
  organicScore: number;
  promotionContribution: number;
  topBlocked: boolean;
  eligibility: string;
  weights?: RankingWeightRow[];
}): LabProductReport {
  const contributions = computeFactorContributions(input.product, input.weights);
  return {
    productId: input.product.id,
    name: input.product.name,
    category: input.product.categoryName ?? "—",
    position: input.position,
    totalScore: input.totalScore,
    organicScore: input.organicScore,
    promotionContribution: input.promotionContribution,
    topBlocked: input.topBlocked,
    eligibility: input.eligibility,
    contributions: contributions.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)),
  };
}

export function formatContributionsText(contributions: LabFactorContribution[]): string {
  return contributions
    .slice(0, 8)
    .map((c) => `${c.label}\n\n${c.points >= 0 ? "+" : ""}${c.points}`)
    .join("\n\n");
}

export { factorLabel };
