import type { RankingExplanation, RankingProductInput, RankingScoreBreakdown } from "./types";

function categoryCtrBaseline(input: RankingProductInput): number {
  return input.views > 20 ? 0.04 : 0.03;
}

export function buildRankingExplanation(
  input: RankingProductInput,
  score: RankingScoreBreakdown,
  estimatedPosition: number | null,
): RankingExplanation {
  const blockers: RankingExplanation["blockers"] = [];
  const strengths: string[] = [];

  const photoFactor = score.factors.find((f) => f.factorKey === "photos");
  if (photoFactor && photoFactor.score < 70) {
    blockers.push({
      title: `Только ${input.photoCount} фото`,
      estimatedLoss: input.photoCount <= 2 ? 5 : 2,
    });
  } else if (photoFactor && photoFactor.score >= 85) {
    strengths.push("Достаточно качественных фото");
  }

  const ctr = input.views > 0 ? input.favoritesCount / input.views : 0;
  if (ctr < categoryCtrBaseline(input)) {
    blockers.push({
      title: "CTR ниже среднего по категории",
      estimatedLoss: 4,
    });
  }

  if (input.sellerTrustScore > 0 && input.sellerTrustScore < 80) {
    blockers.push({
      title: `Trust score ${input.sellerTrustScore}`,
      estimatedLoss: 2,
    });
  } else if (input.sellerTrustScore >= 80) {
    strengths.push("Высокий trust score продавца");
  }

  if (!input.categoryId) {
    blockers.push({ title: "Не указана категория", estimatedLoss: 6 });
  }

  if (input.descriptionLength < 40) {
    blockers.push({ title: "Короткое описание", estimatedLoss: 3 });
  }

  return {
    estimatedPosition,
    blockers: blockers.sort((a, b) => b.estimatedLoss - a.estimatedLoss).slice(0, 5),
    strengths: strengths.slice(0, 4),
  };
}
