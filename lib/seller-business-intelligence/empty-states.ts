import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { SmartEmptyState } from "./types";

export function buildSmartEmptyState(input: {
  signals: SellerProgressSignals;
}): SmartEmptyState {
  const { signals } = input;

  if (signals.totalProducts === 0) {
    return {
      kind: "no_products",
      title: "Создайте первый товар",
      body: "Это первый шаг к продажам.",
      bullets: ["✓ название", "✓ характеристики", "✓ описание"],
      ctaLabel: "Добавить товар",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
    };
  }

  if (signals.activeProducts > 0 && signals.ordersCount === 0) {
    return {
      kind: "no_sales",
      title: "Продаж пока нет",
      body: "Проверьте:",
      bullets: [
        "✓ карточку",
        "✓ цену",
        "✓ остатки",
        "✓ доверие покупателей",
        "✓ продвижение",
      ],
      ctaLabel: "Получить рекомендации",
      ctaHref: ROUTES.ACCOUNT_GROWTH,
    };
  }

  return null;
}
