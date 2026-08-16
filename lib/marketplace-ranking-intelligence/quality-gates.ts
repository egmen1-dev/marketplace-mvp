import type { RankingProductInput, RankingScoreBreakdown, QualityGateResult } from "./types";
import { isMarketplaceContentQualityEnabled } from "@/lib/marketplace-content-quality/flags";

export function evaluateQualityGates(
  input: RankingProductInput,
  score: RankingScoreBreakdown,
): QualityGateResult {
  if (
    isMarketplaceContentQualityEnabled() &&
    input.contentQualityTopBlocked
  ) {
    return {
      passed: false,
      topBlocked: true,
      reason: input.contentQualityGateReason ?? "Content quality gate FAIL",
    };
  }
  if (input.photoCount <= 0) {
    return { passed: false, topBlocked: true, reason: "Нет главного фото" };
  }
  if (input.photoCount < 2) {
    return { passed: false, topBlocked: true, reason: "Мало фото для TOP" };
  }
  if (input.stock <= 0) {
    return { passed: false, topBlocked: true, reason: "Нет остатка" };
  }
  if (input.prohibitedHit) {
    return { passed: false, topBlocked: true, reason: "Запрещённый товар" };
  }
  if (!input.name || input.name.length < 8) {
    return { passed: false, topBlocked: true, reason: "Спам или слишком короткое название" };
  }
  if (input.moderationStatus === "REJECTED") {
    return { passed: false, topBlocked: true, reason: "Модерация не пройдена" };
  }
  if (score.overall < 45) {
    return { passed: false, topBlocked: true, reason: "Низкое качество карточки" };
  }
  return { passed: true, topBlocked: false, reason: null };
}
