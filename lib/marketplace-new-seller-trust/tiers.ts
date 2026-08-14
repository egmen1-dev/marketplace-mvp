import {
  DEVELOPING_SELLER_ORDERS,
  HIGH_TRUST_SCORE,
  RELIABLE_SELLER_DELIVERIES,
} from "./constants";
import type { TrustTier, TrustTierId } from "./types";

export function resolveTrustTier(input: {
  trustScore: number;
  completedOrders: number;
}): TrustTier {
  if (input.trustScore >= HIGH_TRUST_SCORE && input.completedOrders >= DEVELOPING_SELLER_ORDERS) {
    return {
      id: "high_trust",
      label: "Высокое доверие",
      subtitle: "90+ Trust Score",
    };
  }
  if (input.completedOrders >= RELIABLE_SELLER_DELIVERIES) {
    return {
      id: "reliable",
      label: "Надёжный продавец",
      subtitle: "50+ успешных доставок",
    };
  }
  if (input.completedOrders >= DEVELOPING_SELLER_ORDERS) {
    return {
      id: "developing",
      label: "Развивается",
      subtitle: "10+ успешных заказов",
    };
  }
  return {
    id: "new_seller",
    label: "Новый продавец",
    subtitle: "Старт продаж",
  };
}

export function isNewSellerStatus(input: {
  completedOrders: number;
  reviewsCount: number;
}): boolean {
  return input.completedOrders < DEVELOPING_SELLER_ORDERS && input.reviewsCount < 5;
}

export function daysSinceJoined(joinedAt: Date | string): number {
  const joinedMs = new Date(joinedAt).getTime();
  return Math.max(0, Math.floor((Date.now() - joinedMs) / (1000 * 60 * 60 * 24)));
}

export function formatDaysAgoLabel(days: number): string {
  if (days === 0) return "сегодня";
  if (days === 1) return "1 день назад";
  if (days < 5) return `${days} дня назад`;
  return `${days} дней назад`;
}

export function shouldShowVerifiedBadge(input: {
  isVerified: boolean;
  completedOrders: number;
  newSellerTrustEnabled: boolean;
}): boolean {
  if (!input.isVerified) return false;
  if (!input.newSellerTrustEnabled) return true;
  return input.completedOrders > 0;
}

export function tierAnalyticsId(tierId: TrustTierId): string {
  return tierId;
}
