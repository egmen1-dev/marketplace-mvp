import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

import { isMarketplaceTrustConversionEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceTrustConversionEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route,
    entityId,
  });
}

export function trackTrustDetailsOpen(productId: string): void {
  track(ANALYTICS_EVENTS.TRUST_DETAILS_OPEN, productId, `/product/${productId}`);
}

export function trackSellerReputationOpen(sellerId: string): void {
  track(ANALYTICS_EVENTS.SELLER_REPUTATION_OPEN, sellerId);
}

export function trackNewSellerTrustView(productId: string): void {
  track(ANALYTICS_EVENTS.NEW_SELLER_TRUST_VIEW, productId, `/product/${productId}`);
}

export function trackTrustPurchaseAfterView(productId: string): void {
  track(
    ANALYTICS_EVENTS.TRUST_PURCHASE_AFTER_VIEW,
    productId,
    `/product/${productId}`,
  );
}

export function trackTrustConversionView(route: string): void {
  track(ANALYTICS_EVENTS.TRUST_CONVERSION_VIEW, "admin", route);
}
