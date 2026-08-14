import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";

import { DEVELOPING_SELLER_ORDERS, QUALITY_PHOTO_MIN_COUNT } from "./constants";
import type { SellerCoachSnapshot } from "./types";

export function buildSellerCoach(metrics: SellerMetricsInput): SellerCoachSnapshot | null {
  if (metrics.completedOrders >= DEVELOPING_SELLER_ORDERS) return null;

  const ordersRemaining = Math.max(0, 1 - metrics.completedOrders);
  const qualityPhotoProducts = metrics.products.filter(
    (p) => p.imageCount >= QUALITY_PHOTO_MIN_COUNT && p.hasPrimary,
  ).length;
  const photosRemaining = Math.max(0, 3 - qualityPhotoProducts);
  const reviewsRemaining = Math.max(0, 1 - metrics.reviewsCount);

  const items = [
    ordersRemaining > 0 ? { label: "заказ", remaining: ordersRemaining } : null,
    photosRemaining > 0 ? { label: "фото товара", remaining: photosRemaining } : null,
    reviewsRemaining > 0 ? { label: "отзыв", remaining: reviewsRemaining } : null,
  ].filter(Boolean) as SellerCoachSnapshot["items"];

  if (items.length === 0) return null;

  return {
    nextLevelLabel: "Развивается",
    items,
  };
}
