import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";
import { averageShippingHours } from "@/lib/marketplace-trust-score/calculator";

import { TRUST_ACHIEVEMENTS } from "./constants";
import type { TrustAchievement } from "./types";

function countOnTimeShipments(samples: number[]): number {
  return samples.filter((hours) => hours <= 48).length;
}

function countPositiveReviews(metrics: SellerMetricsInput): number {
  return Math.round(metrics.averageReviewRating >= 4 ? metrics.reviewsCount * 0.85 : 0);
}

export function buildTrustAchievements(metrics: SellerMetricsInput): TrustAchievement[] {
  const onTime = countOnTimeShipments(metrics.shippingHoursSamples);
  const positiveReviews = countPositiveReviews(metrics);
  const successfulDeliveries = metrics.completedOrders;

  const progressById: Record<string, number> = {
    fast_seller: onTime,
    buyer_favorite: positiveReviews,
    reliable_delivery: successfulDeliveries,
  };

  return TRUST_ACHIEVEMENTS.map((achievement) => {
    const progress = progressById[achievement.id] ?? 0;
    return {
      id: achievement.id,
      icon: achievement.icon,
      title: achievement.title,
      description: achievement.description,
      unlocked: progress >= achievement.threshold,
      progress: Math.min(progress, achievement.threshold),
      target: achievement.threshold,
    };
  });
}

export function newlyUnlockedAchievements(
  before: TrustAchievement[],
  after: TrustAchievement[],
): TrustAchievement[] {
  const beforeIds = new Set(before.filter((a) => a.unlocked).map((a) => a.id));
  return after.filter((a) => a.unlocked && !beforeIds.has(a.id));
}

export function shippingOnTimeRate(metrics: SellerMetricsInput): number | null {
  if (metrics.shippingHoursSamples.length === 0) return null;
  const onTime = countOnTimeShipments(metrics.shippingHoursSamples);
  return Math.round((onTime / metrics.shippingHoursSamples.length) * 100);
}

export function averageShippingLabel(metrics: SellerMetricsInput): string | null {
  const avg = averageShippingHours(metrics.shippingHoursSamples);
  if (avg == null) return null;
  if (avg <= 24) return "24 часа";
  if (avg <= 48) return `${Math.round(avg)} ч`;
  return `${Math.round(avg / 24)} дн.`;
}
