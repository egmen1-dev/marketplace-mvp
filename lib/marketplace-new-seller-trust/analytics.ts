import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

import { isMarketplaceNewSellerTrustEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceNewSellerTrustEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route,
    entityId,
  });
}

export function trackNewSellerStarted(sellerId: string): void {
  track(ANALYTICS_EVENTS.NEW_SELLER_STARTED, sellerId, "/account/reputation");
}

export function trackFirstOrderCompleted(sellerId: string): void {
  track(ANALYTICS_EVENTS.FIRST_ORDER_COMPLETED, sellerId);
}

export function trackFirstReviewReceived(sellerId: string): void {
  track(ANALYTICS_EVENTS.FIRST_REVIEW_RECEIVED, sellerId);
}

export function trackBuyerNewSellerPurchase(input: {
  sellerId: string;
  productId: string;
}): void {
  track(ANALYTICS_EVENTS.BUYER_NEW_SELLER_PURCHASE, input.productId, `/product/${input.productId}`);
}
