import type { RankingEligibilityReason, RankingEligibilityResult, RankingProductInput } from "./types";

const REASON_MESSAGES: Record<RankingEligibilityReason, string> = {
  no_photos: "Нет фото",
  no_stock: "Нет в наличии",
  seller_blocked: "Продавец заблокирован",
  under_moderation: "Товар на модерации",
  prohibited: "Запрещённый товар",
  trust_rejected: "Отклонено системой доверия",
  poor_content: "Очень слабое содержание карточки",
  missing_category: "Не указана категория",
  missing_title: "Нет названия",
  invalid_price: "Некорректная цена",
  archived: "Товар в архиве",
  deleted: "Товар удалён",
  not_active: "Товар не опубликован",
};

export function evaluateRankingEligibility(
  input: RankingProductInput,
): RankingEligibilityResult {
  const reasons: RankingEligibilityReason[] = [];

  if (!input.name?.trim()) reasons.push("missing_title");
  if (input.photoCount <= 0) reasons.push("no_photos");
  if (input.stock <= 0) reasons.push("no_stock");
  if (!input.categoryId) reasons.push("missing_category");
  if (input.price <= 0) reasons.push("invalid_price");
  if (input.status === "ARCHIVED") reasons.push("archived");
  if (input.status !== "ACTIVE") reasons.push("not_active");
  if (input.sellerBlocked) reasons.push("seller_blocked");
  if (input.prohibitedHit) reasons.push("prohibited");
  if (
    input.moderationStatus === "PENDING_REVIEW" ||
    input.moderationStatus === "NEEDS_FIX" ||
    input.moderationStatus === "REJECTED"
  ) {
    reasons.push("under_moderation");
  }
  if (input.moderationStatus === "REJECTED" || input.qualityScore != null && input.qualityScore < 30) {
    if (!reasons.includes("trust_rejected")) reasons.push("trust_rejected");
  }
  if (
    input.photoCount === 0 &&
    input.descriptionLength < 20 &&
    input.characteristicCount === 0
  ) {
    reasons.push("poor_content");
  }

  const unique = [...new Set(reasons)];
  return {
    status: unique.length === 0 ? "ELIGIBLE" : "NOT_ELIGIBLE",
    reasons: unique,
    messages: unique.map((r) => REASON_MESSAGES[r]),
  };
}

export function eligibilityIntroMessage(result: RankingEligibilityResult): string {
  if (result.status === "ELIGIBLE") {
    return "Товар участвует в оценке позиции в каталоге.";
  }
  return "Ваш товар сейчас не может участвовать в поиске, потому что:";
}
