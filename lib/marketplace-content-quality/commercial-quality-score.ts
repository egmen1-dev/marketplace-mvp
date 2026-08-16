import { COMMERCIAL_QUALITY_WEIGHTS_V1 } from "./weights";
import type { ProductQualityEvaluation, QualityFactorScore } from "./types";
import { clampScore, weightedAverage } from "./utils";

type FactorBundle = {
  photo: QualityFactorScore & { effectivePhotoCount: number; uploadedPhotoCount: number };
  thumbnail: QualityFactorScore;
  description: QualityFactorScore;
  seo: QualityFactorScore;
  attributes: QualityFactorScore;
  video: QualityFactorScore;
  consistency: QualityFactorScore;
  commercialValue: QualityFactorScore;
  compliance: QualityFactorScore;
  buyerValue: QualityFactorScore;
  manipulation: QualityFactorScore;
};

export function computeCommercialQualityScore(factors: FactorBundle): {
  overallScore: number;
  confidence: number;
} {
  const { score, confidence } = weightedAverage([
    { score: factors.photo.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.photo, confidence: factors.photo.confidence },
    { score: factors.thumbnail.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.thumbnail, confidence: factors.thumbnail.confidence },
    { score: factors.description.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.description, confidence: factors.description.confidence },
    { score: factors.seo.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.seo, confidence: factors.seo.confidence },
    { score: factors.attributes.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.attributes, confidence: factors.attributes.confidence },
    { score: factors.video.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.video, confidence: factors.video.confidence },
    { score: factors.consistency.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.consistency, confidence: factors.consistency.confidence },
    { score: factors.commercialValue.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.commercialValue, confidence: factors.commercialValue.confidence },
    { score: factors.compliance.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.compliance, confidence: factors.compliance.confidence },
    { score: factors.buyerValue.score, weight: COMMERCIAL_QUALITY_WEIGHTS_V1.buyerValue, confidence: factors.buyerValue.confidence },
  ]);

  const manipulationPenalty =
    factors.manipulation.score < 40 ? Math.round((40 - factors.manipulation.score) * 0.35) : 0;

  return {
    overallScore: clampScore(score - manipulationPenalty),
    confidence,
  };
}

export function buildFactorScores(evaluation: ProductQualityEvaluation): Record<string, number> {
  return {
    photo: evaluation.photo.score,
    thumbnail: evaluation.thumbnail.score,
    description: evaluation.description.score,
    seo: evaluation.seo.score,
    attributes: evaluation.attributes.score,
    video: evaluation.video.score,
    consistency: evaluation.consistency.score,
    commercialValue: evaluation.commercialValue.score,
    compliance: evaluation.compliance.score,
    manipulation: evaluation.manipulation.score,
    buyerValue: evaluation.buyerValue.score,
    photoRelevance: evaluation.photo.images.length
      ? Math.round(
          evaluation.photo.images.reduce((s, i) => s + i.relevance, 0) /
            evaluation.photo.images.length,
        )
      : 0,
    effectivePhotoCount: evaluation.photo.effectivePhotoCount,
  };
}
