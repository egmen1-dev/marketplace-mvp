import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { PromotionInsight } from "./types";

export function buildPromotionInsight(input: {
  signals: SellerProgressSignals;
  topProductName?: string;
}): PromotionInsight {
  const { signals } = input;

  if (signals.promotionCampaigns > 0) {
    return {
      headline: `${signals.promotionCampaigns} кампании работают`,
      bullets: ["✓ активное продвижение", "✓ отслеживайте CTR и заказы"],
      recommendation: "Улучшайте слабые карточки перед масштабированием.",
      ctaLabel: "Открыть продвижение",
      ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
    };
  }

  if (
    signals.viewsSum > 0 &&
    signals.bestCompletenessScore >= 70 &&
    signals.activeProducts > 0
  ) {
    return {
      headline: `Товар «${input.topProductName ?? "ваш"}» уже показывает потенциал`,
      bullets: [
        "✓ есть просмотры",
        "✓ хорошая карточка",
        "✓ конкурентная цена",
      ],
      recommendation: "Можно увеличить количество показов без «продажи рекламы».",
      ctaLabel: "Запустить продвижение",
      ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
    };
  }

  return {
    headline: "Подготовьте карточки перед продвижением",
    bullets: ["✓ фото", "✓ характеристики", "✓ описание"],
    recommendation: "Продвижение работает лучше на сильных карточках.",
    ctaLabel: "Улучшить карточки",
    ctaHref: ROUTES.ACCOUNT_PRODUCTS,
  };
}
