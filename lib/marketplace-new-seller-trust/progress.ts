import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";

import { QUALITY_PHOTO_MIN_COUNT } from "./constants";
import type { TrustProgressStep } from "./types";

export function buildTrustProgressSteps(metrics: SellerMetricsInput): TrustProgressStep[] {
  const accountConfirmed =
    metrics.phoneVerified && (metrics.paymentVerified || metrics.isVerified);
  const qualityPhotos = metrics.products.some(
    (p) => p.imageCount >= QUALITY_PHOTO_MIN_COUNT && p.hasPrimary,
  );
  const hasFirstOrder = metrics.completedOrders >= 1;
  const hasFirstReview = metrics.reviewsCount >= 1;
  const tenDeliveries = metrics.completedOrders >= 10;

  return [
    { id: "account", label: "Подтвердите аккаунт", done: accountConfirmed },
    { id: "photos", label: "Добавьте качественные фото", done: qualityPhotos },
    { id: "first-order", label: "Получите первый заказ", done: hasFirstOrder },
    { id: "first-review", label: "Получите первый отзыв", done: hasFirstReview },
    { id: "ten-deliveries", label: "Выполните 10 доставок", done: tenDeliveries },
  ];
}
