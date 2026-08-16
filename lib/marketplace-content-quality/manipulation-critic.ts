import type { ProductQualityInput } from "./types";
import { clampScore, detectKeywordStuffing } from "./utils";
import { evaluateDescriptionQuality, evaluateSeoQuality } from "./description-quality";
import { evaluatePhotoQuality } from "./photo-quality";

export function evaluateManipulationRisk(input: ProductQualityInput): {
  score: number;
  confidence: number;
  reasons: string[];
  warnings: string[];
} {
  const hints = input.hints;
  const warnings: string[] = [];
  const reasons: string[] = [];
  let risk = hints?.manipulationRisk ?? 15;

  const photo = evaluatePhotoQuality(input);
  if (photo.photo.uploadedPhotoCount >= 8 && photo.photo.effectivePhotoCount <= 2) {
    risk += 35;
    warnings.push("Много загруженных фото, но мало уникальных кадров");
    reasons.push("duplicate photos manipulation");
  }

  if (photo.photo.uploadedPhotoCount >= 10 && photo.relevance.irrelevant) {
    risk += 40;
    warnings.push("Много нерелевантных фото при идеальном тексте");
    reasons.push("irrelevant photos manipulation");
  }

  const desc = evaluateDescriptionQuality(input);
  const seo = evaluateSeoQuality(input);
  if (
    detectKeywordStuffing(`${input.description ?? ""} ${input.seoTitle ?? ""}`) ||
    hints?.keywordStuffing
  ) {
    risk += hints?.keywordStuffing ? 50 : 30;
    warnings.push("Keyword stuffing");
  }

  if (desc.score >= 85 && seo.score >= 85 && photo.relevance.score < 25) {
    risk += 25;
    warnings.push("Идеальный текст при нулевой photo relevance");
  }

  if (input.characteristics.length >= 20 && photo.photo.score < 40) {
    risk += 12;
    warnings.push("Механическое заполнение характеристик");
  }

  const manipulationScore = clampScore(100 - Math.min(95, risk));
  return {
    score: manipulationScore,
    confidence: 0.84,
    reasons,
    warnings,
  };
}
