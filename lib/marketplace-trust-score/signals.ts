import type { SellerMetricsInput } from "./calculator";
import {
  averageShippingHours,
  fulfillmentPercent,
} from "./calculator";
import type { SellerTrustScoreSnapshot } from "./types";

export function buildSellerTrustSignals(input: {
  metrics: SellerMetricsInput;
  trustScore: number;
  lastHistoryReason?: string | null;
}): Pick<SellerTrustScoreSnapshot, "helps" | "hurts" | "nextImprovement"> {
  const helps: string[] = [];
  const hurts: string[] = [];

  const fulfillment = fulfillmentPercent(input.metrics);
  if (fulfillment >= 95 && input.metrics.completedOrders > 0) {
    helps.push(`✓ ${fulfillment}% заказов выполнено`);
  }

  const avgShip = averageShippingHours(input.metrics.shippingHoursSamples);
  if (avgShip != null && avgShip <= 24) {
    helps.push("✓ Быстро отправляете заказы");
  } else if (avgShip != null && avgShip <= 48) {
    helps.push(`✓ Средняя отправка ${Math.round(avgShip)} ч`);
  } else if (avgShip != null && avgShip > 72) {
    hurts.push(`⚠ Последний заказ отправлен через ${Math.round(avgShip / 24)} дня`);
  }

  if (input.metrics.averageReviewRating >= 4 && input.metrics.reviewsCount > 0) {
    helps.push("✓ Хорошие отзывы");
  }
  if (input.metrics.reviewsCount >= 10) {
    helps.push(`✓ ${input.metrics.reviewsCount} отзывов покупателей`);
  }

  if (input.metrics.phoneVerified && input.metrics.paymentVerified) {
    helps.push("✓ Данные продавца подтверждены");
  }

  if (input.lastHistoryReason && input.lastHistoryReason.includes("−")) {
    hurts.push(`⚠ ${input.lastHistoryReason.replace(/\([^)]*\)/, "").trim()}`);
  }

  if (input.metrics.cancelledBySeller > 0) {
    hurts.push("⚠ Были отмены заказов по вашей вине");
  }

  const nextImprovement = resolveNextImprovement(input.metrics);

  return {
    helps: helps.slice(0, 4),
    hurts: hurts.slice(0, 3),
    nextImprovement,
  };
}

function resolveNextImprovement(metrics: SellerMetricsInput): string | null {
  const weakProduct = metrics.products.find(
    (p) => !p.hasPrimary || p.imageCount < 2 || p.descriptionLength < 30,
  );
  if (weakProduct) {
    if (!weakProduct.hasPrimary || weakProduct.imageCount < 2) {
      return "Добавьте фото товаров";
    }
    if (weakProduct.descriptionLength < 30) {
      return "Дополните описание товаров";
    }
  }

  if (!metrics.phoneVerified) return "Подтвердите телефон";
  if (!metrics.paymentVerified) return "Добавьте реквизиты для выплат";

  const avgShip = averageShippingHours(metrics.shippingHoursSamples);
  if (avgShip != null && avgShip > 48) {
    return "Отправляйте заказы в течение 24–48 часов";
  }

  if (metrics.reviewsCount < 5) return "Попросите покупателей оставить отзыв";

  return null;
}

export function buildBuyerTrustReasons(input: {
  metrics: SellerMetricsInput;
  trustScore: number;
}): string[] {
  const reasons: string[] = [];
  const fulfillment = fulfillmentPercent(input.metrics);

  if (input.metrics.completedOrders > 0 && fulfillment > 0) {
    reasons.push(`✓ ${fulfillment}% заказов выполнено`);
  }

  const avgShip = averageShippingHours(input.metrics.shippingHoursSamples);
  if (avgShip != null) {
    if (avgShip <= 24) reasons.push("✓ Средняя отправка 24 часа");
    else if (avgShip <= 48) reasons.push(`✓ Средняя отправка ${Math.round(avgShip)} ч`);
  }

  if (input.metrics.reviewsCount > 0) {
    reasons.push(`✓ ${input.metrics.reviewsCount} отзывов покупателей`);
  } else if (input.trustScore >= 70) {
    reasons.push("✓ Аккаунт проверен, история на площадке формируется");
  }

  return reasons.slice(0, 4);
}

export function buildVerificationDetails(input: {
  phoneVerified: boolean;
  paymentVerified: boolean;
  isVerified: boolean;
  completedOrders: number;
}): string[] {
  const lines: string[] = [];
  if (input.phoneVerified) lines.push("✓ телефон");
  if (input.isVerified) lines.push("✓ аккаунт");
  if (input.paymentVerified) lines.push("✓ реквизиты");
  if (input.completedOrders > 0) lines.push("✓ история заказов");
  return lines;
}

export const VERIFIED_SELLER_EXPLANATION = "Данные продавца подтверждены";
