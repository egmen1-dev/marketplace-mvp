import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import type { ProductAttentionItem } from "@/lib/seller-operations/types";

import type { SellerAssistantSnapshot } from "./types";

export function buildSellerAssistant(input: {
  signals: SellerProgressSignals;
  products: ProductAttentionItem[];
  nextActionTitle: string;
  nextActionHref: string;
}): SellerAssistantSnapshot {
  const { signals } = input;
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (signals.bestCompletenessScore >= 70) {
    strengths.push("✓ заполненные характеристики");
  }
  if (signals.activeProducts > 0) {
    strengths.push("✓ опубликованные товары");
  }
  if (signals.ordersCount > 0) {
    strengths.push("✓ есть продажи");
  }
  if (signals.availableBalance > 0) {
    strengths.push("✓ средства доступны к выводу");
  }

  const weakCount = input.products.filter((p) => p.type === "weak_card").length;
  if (weakCount > 0) {
    improvements.push(`→ добавить фото у ${weakCount} товаров`);
  }
  if (signals.viewsSum > 0 && signals.ordersCount === 0) {
    improvements.push("→ улучшить карточку для конверсии");
  }
  if (signals.promotionCampaigns === 0 && signals.viewsSum > 10) {
    improvements.push("→ рассмотреть продвижение");
  }
  if (signals.activeProducts === 0) {
    improvements.push("→ создать первый товар");
  }

  if (strengths.length === 0) {
    strengths.push("✓ вы начали путь продавца");
  }
  if (improvements.length === 0) {
    improvements.push("→ поддерживайте качество карточек");
  }

  return {
    headline: "Ваш магазин сейчас:",
    strengths,
    improvements,
    nextStep: input.nextActionTitle,
    nextStepWhy: "AI рекомендует сфокусироваться на одном шаге за раз.",
    ctaLabel: "Следующий шаг",
    ctaHref: input.nextActionHref,
  };
}
