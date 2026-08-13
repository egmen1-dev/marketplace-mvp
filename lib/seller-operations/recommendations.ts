import { ROUTES } from "@/lib/constants";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import type {
  AiDailyAdvice,
  MoneyOperationsSnapshot,
  PromotionTodaySnapshot,
} from "./types";

export function buildAiDailyAdvice(input: {
  signals: SellerProgressSignals;
  topProductName?: string;
}): AiDailyAdvice {
  const { signals } = input;

  if (signals.activeProducts === 0) {
    return {
      headline: "Я посмотрел ваш магазин",
      opportunity: "Магазин пока пуст — продажи начнутся с первой карточки",
      action: "Создайте первый товар с фото и характеристиками",
      why: "Без товара покупатели не смогут оформить заказ",
      ctaLabel: "Создать товар",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS_NEW,
    };
  }

  if (signals.viewsSum > 0 && signals.ordersCount === 0) {
    return {
      headline: "Я посмотрел ваш магазин",
      opportunity:
        "Ваши товары получают просмотры, но мало заказов",
      action: "Улучшите первые фотографии и описание",
      why: "У похожих товаров после улучшения карточки росла конверсия",
      ctaLabel: "Сделать",
      ctaHref: ROUTES.ACCOUNT_PRODUCTS,
    };
  }

  if (signals.ordersCount > 0 && signals.availableBalance === 0 && signals.pendingBalance > 0) {
    return {
      headline: "Я посмотрел ваш магазин",
      opportunity: "Есть продажи — скоро появятся средства к выводу",
      action: "Завершите активные заказы вовремя",
      why: "После завершения сделки деньги переходят в доступные",
      ctaLabel: "Открыть заказы",
      ctaHref: ROUTES.ACCOUNT_SALES,
    };
  }

  if (signals.availableBalance > 0) {
    return {
      headline: "Я посмотрел ваш магазин",
      opportunity: `Доступно к выводу: ${signals.availableBalance.toLocaleString("ru-RU")} ₽`,
      action: "Создайте заявку на вывод или reinvest в продвижение",
      why: "Регулярный вывод помогает планировать денежный поток",
      ctaLabel: "Вывести",
      ctaHref: ROUTES.ACCOUNT_PAYOUTS,
    };
  }

  return {
    headline: "Я посмотрел ваш магазин",
    opportunity: "Добавьте ассортимент или усилите лучшие карточки",
    action: signals.bestCompletenessScore < 70
      ? "Улучшите качество карточек до 70+"
      : "Рассмотрите продвижение для роста просмотров",
    why: "Сильные карточки и видимость — основа первых продаж",
    ctaLabel: "AI помощник",
    ctaHref: ROUTES.ACCOUNT_GROWTH,
  };
}

export function buildPromotionToday(input: {
  signals: SellerProgressSignals;
  topProductName?: string;
}): PromotionTodaySnapshot {
  const campaigns = input.signals.promotionCampaigns;

  if (campaigns === 0) {
    return {
      activeCampaigns: 0,
      bestCampaign: null,
      weakCampaign: input.signals.bestCompletenessScore < 70
        ? {
            name: input.topProductName ?? "Товар",
            recommendation: "Улучшите карточку перед продвижением",
          }
        : null,
      ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
    };
  }

  return {
    activeCampaigns: campaigns,
    bestCampaign: {
      name: input.topProductName ?? "Кампания",
      metric: "CTR: 4.2%",
    },
    weakCampaign: null,
    ctaHref: ROUTES.ACCOUNT_PROMOTION_CENTER,
  };
}

export function buildMoneyOperations(input: {
  revenue: number;
  pendingAmount: number;
  availableAmount: number;
  paidAmount: number;
}): MoneyOperationsSnapshot {
  return {
    salesTotal: input.revenue,
    pendingAmount: input.pendingAmount,
    availableAmount: input.availableAmount,
    paidAmount: input.paidAmount,
    ctaLabel: input.availableAmount > 0 ? "Вывести" : "Открыть баланс",
    ctaHref:
      input.availableAmount > 0 ? ROUTES.ACCOUNT_PAYOUTS : ROUTES.ACCOUNT_BALANCE,
  };
}
