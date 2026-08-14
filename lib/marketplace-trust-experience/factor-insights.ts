import type { TrustScoreEventType } from "@prisma/client";

import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";
import { fulfillmentPercent, averageShippingHours } from "@/lib/marketplace-trust-score/calculator";
import type { SellerFactorScore, TrustScoreHistoryEntry } from "@/lib/marketplace-trust-score/types";

import type { TrustFactorInsight } from "./types";

const EVENT_FACTOR_MAP: Partial<Record<TrustScoreEventType, SellerFactorScore["id"]>> = {
  ORDER_DELIVERED: "orderFulfillment",
  ORDER_CANCELLED: "orderFulfillment",
  ORDER_SHIPPED: "shippingSpeed",
  REVIEW_CREATED: "reviews",
  PRODUCT_UPDATED: "productQuality",
  ACCOUNT_VERIFIED: "accountVerification",
  ORDER_CREATED: "activity",
};

function factorSummary(
  factor: SellerFactorScore,
  metrics: SellerMetricsInput,
): string {
  switch (factor.id) {
    case "orderFulfillment": {
      const pct = fulfillmentPercent(metrics);
      return pct > 0 ? `✓ ${pct}% заказов выполнено` : "Пока нет завершённых заказов";
    }
    case "shippingSpeed": {
      const avg = averageShippingHours(metrics.shippingHoursSamples);
      if (avg == null) return "Данных об отправке пока нет";
      if (avg <= 24) return "✓ Средняя отправка до 24 часов";
      return `Средняя отправка ${Math.round(avg / 24)} дн.`;
    }
    case "productQuality": {
      const weak = metrics.products.filter((p) => p.imageCount < 2).length;
      if (weak > 0) return `Можно улучшить: ${weak} товар(ов) с малым числом фото`;
      return "✓ Карточки товаров в хорошем состоянии";
    }
    case "reviews":
      if (metrics.reviewsCount === 0) return "Отзывов пока нет";
      return `${metrics.reviewsCount} отзывов · средняя ${metrics.averageReviewRating.toFixed(1)}`;
    case "activity":
      return metrics.recentProductUpdates > 0
        ? "✓ Недавно обновляли товары"
        : "Обновите карточки или добавьте товары";
    case "accountVerification":
      if (metrics.phoneVerified && metrics.paymentVerified) return "✓ Данные подтверждены";
      if (!metrics.phoneVerified) return "Подтвердите телефон";
      return "Добавьте реквизиты для выплат";
    default:
      return "";
  }
}

function factorImprovementHint(factor: SellerFactorScore): string | null {
  if (factor.score >= 85) return null;
  switch (factor.id) {
    case "productQuality":
      return "Добавьте фотографии использования";
    case "shippingSpeed":
      return "Отправляйте заказы в течение 24–48 часов";
    case "reviews":
      return "Попросите покупателей оставить отзыв";
    case "activity":
      return "Обновите карточки товаров";
    case "accountVerification":
      return "Подтвердите контактные данные";
    case "orderFulfillment":
      return "Старайтесь не отменять заказы";
    default:
      return null;
  }
}

export function buildFactorInsights(input: {
  factors: SellerFactorScore[];
  metrics: SellerMetricsInput;
  history: TrustScoreHistoryEntry[];
}): TrustFactorInsight[] {
  return input.factors.map((factor) => {
    const lastEntry = input.history.find(
      (entry) => EVENT_FACTOR_MAP[entry.eventType] === factor.id,
    );

    return {
      id: factor.id,
      name: factor.name,
      weight: factor.weight,
      score: factor.score,
      summary: factorSummary(factor, input.metrics),
      lastChange: lastEntry
        ? {
            delta: lastEntry.delta,
            reason: lastEntry.reason,
            createdAt: lastEntry.createdAt,
          }
        : null,
      improvementHint: factorImprovementHint(factor),
    };
  });
}
