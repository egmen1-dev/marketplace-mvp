import type { PromotionRecommendation } from "@/lib/promotion/intelligence/types";
import type { SellerPromotionRow } from "@/lib/promotion/types";

import type { PromotionAiAdvice } from "./types";

export function buildPromotionAiAdvice(input: {
  rows: SellerPromotionRow[];
  topRecommendation: PromotionRecommendation | null;
}): PromotionAiAdvice[] {
  const advice: PromotionAiAdvice[] = [];

  const lowConversion = input.rows.find(
    (r) =>
      r.performance &&
      r.performance.productViews >= 50 &&
      r.performance.orders === 0 &&
      r.isPromoted,
  );

  if (lowConversion) {
    const blocker = lowConversion.readiness.blockers[0];
    advice.push({
      id: "advice-low-conversion",
      headline: "Ваш товар получает много просмотров, но мало заказов.",
      reason: blocker ?? "Недостаточно характеристик или доверия к карточке.",
      action: blocker
        ? "Улучшите карточку перед продвижением"
        : "Добавьте фото и характеристики",
      tone: "warning",
    });
  }

  const working = input.rows.find(
    (r) =>
      r.performance &&
      r.isPromoted &&
      r.performance.orders > 0 &&
      (r.performance.roiPercent ?? 0) > 0,
  );

  if (working) {
    advice.push({
      id: "advice-working",
      headline: "Продвижение работает.",
      reason:
        working.performance!.ctr > 0
          ? `CTR ${(Math.round(working.performance!.ctr * 10) / 10).toFixed(1)}% · ${working.performance!.roiLabel}`
          : working.performance!.roiLabel,
      action: "Можно продлить кампанию или масштабировать на похожие товары",
      tone: "success",
    });
  }

  if (input.topRecommendation && !input.topRecommendation.ready) {
    advice.push({
      id: "advice-not-ready",
      headline: "Сначала подготовьте карточку",
      reason:
        input.topRecommendation.improvements[0] ??
        "Карточка не готова к продвижению",
      action: input.topRecommendation.improvements.join(" · ") || "Исправьте блокеры",
      tone: "neutral",
    });
  }

  if (advice.length === 0) {
    advice.push({
      id: "advice-default",
      headline: "AI советует начать с одного товара",
      reason: "Выберите товар с высоким Promotion Score из блока рекомендаций",
      action: "Запустите продвижение и отслеживайте ROI в аналитике",
      tone: "neutral",
    });
  }

  return advice.slice(0, 3);
}

export function lowPerformanceCampaigns(
  rows: SellerPromotionRow[],
): SellerPromotionRow[] {
  return rows.filter(
    (r) =>
      r.isPromoted &&
      r.performance &&
      r.performance.impressions >= 100 &&
      r.performance.clicks > 0 &&
      r.performance.orders === 0,
  );
}
