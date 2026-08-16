import type { RankingProductInput } from "@/lib/marketplace-ranking-intelligence/types";

import type { ProductQualityEvaluation } from "./types";

/** Map content quality evaluation into advisory ranking signals. */
export function applyContentQualityToRankingInput(
  input: RankingProductInput,
  evaluation: ProductQualityEvaluation | null,
): RankingProductInput {
  if (!evaluation) return input;

  const avgRelevance =
    evaluation.photo.images.length === 0
      ? 0
      : Math.round(
          evaluation.photo.images.reduce((s, i) => s + i.relevance, 0) /
            evaluation.photo.images.length,
        );

  return {
    ...input,
    photoQuality: evaluation.photo.score,
    thumbnailQuality: evaluation.thumbnail.score,
    descriptionQuality: evaluation.description.score,
    seoQuality: evaluation.seo.score,
    attributesQuality: evaluation.attributes.score,
    videoQuality: evaluation.video.score,
    consistencyQuality: evaluation.consistency.score,
    commercialQuality: evaluation.commercialValue.score,
    photoRelevance: avgRelevance,
    effectivePhotoCount: evaluation.photo.effectivePhotoCount,
    contentQualityScore: evaluation.commercialQualityScore,
    contentQualityGateFailed: evaluation.qualityGateFailed,
    contentQualityTopBlocked: evaluation.topEligibility === "BLOCKED",
    contentQualityGateReason: evaluation.blockers[0] ?? null,
    qualityScore: evaluation.commercialQualityScore,
  };
}

export function rankingUsesContentQualitySignals(input: RankingProductInput): boolean {
  return (
    input.photoQuality != null ||
    input.thumbnailQuality != null ||
    input.descriptionQuality != null
  );
}
