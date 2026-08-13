import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type { BusinessPeriodMetrics, BusinessSummary } from "./types";

export function buildBusinessSummary(input: {
  signals: SellerProgressSignals;
  metrics: BusinessPeriodMetrics;
  mainProblem: string | null;
  nextStepHint: string;
}): BusinessSummary {
  const { signals, metrics } = input;

  let headline = "Ваш магазин развивается.";
  if (signals.activeProducts === 0) {
    headline = "Магазин готов к первому товару.";
  } else if (signals.ordersCount === 0 && signals.viewsSum > 0) {
    headline = "Покупатели уже смотрят ваши товары.";
  } else if (signals.ordersCount > 0) {
    headline = "У вас есть продажи — можно расти дальше.";
  }

  const periodLines: string[] = [];
  if (metrics.viewsTotal > 0) {
    periodLines.push(`${metrics.viewsTotal.toLocaleString("ru-RU")} просмотров товаров`);
  }
  if (metrics.cartAdds7d > 0) {
    periodLines.push(
      `+${metrics.cartAdds7d} добавлений в корзину за 7 дней`,
    );
  } else if (signals.cartAdds > 0) {
    periodLines.push(`${signals.cartAdds} добавлений в корзину`);
  }
  if (metrics.orders7d > 0) {
    periodLines.push(`+${metrics.orders7d} заказов за 7 дней`);
  } else {
    periodLines.push(`${metrics.ordersTotal} заказов всего`);
  }

  if (periodLines.length === 0) {
    periodLines.push("Создайте первый товар, чтобы начать путь продавца");
  }

  return {
    headline,
    periodLines,
    mainProblem: input.mainProblem,
    nextStepHint: input.nextStepHint,
  };
}

export function detectMainProblem(signals: SellerProgressSignals): string | null {
  if (signals.activeProducts === 0) {
    return "Магазин пуст — без товара нет продаж.";
  }
  if (signals.viewsSum >= 20 && signals.ordersCount === 0) {
    return "Покупатели смотрят товар, но не принимают решение.";
  }
  if (signals.bestCompletenessScore < 70) {
    return "Слабые карточки снижают доверие покупателей.";
  }
  if (signals.ordersCount > 0 && signals.availableBalance === 0 && signals.pendingBalance > 0) {
    return "Есть продажи — завершите заказы, чтобы получить деньги.";
  }
  return null;
}
