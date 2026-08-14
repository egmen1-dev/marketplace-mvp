import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

import { isMarketplaceConversionEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceConversionEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route,
    entityId,
  });
}

export function trackConversionFunnelView(context: string): void {
  track(ANALYTICS_EVENTS.CONVERSION_FUNNEL_VIEW, context);
}

export function trackDropoffDetected(id: string): void {
  track(ANALYTICS_EVENTS.DROPOFF_DETECTED, id);
}

export function trackConversionProblemView(id: string): void {
  track(ANALYTICS_EVENTS.CONVERSION_PROBLEM_VIEW, id);
}

export function trackConversionActionClick(id: string): void {
  track(ANALYTICS_EVENTS.CONVERSION_ACTION_CLICK, id);
}

export function trackSellerConversionView(sellerId: string): void {
  track(ANALYTICS_EVENTS.SELLER_CONVERSION_VIEW, sellerId);
}

export function trackBuyerSegmentView(segmentId: string): void {
  track(ANALYTICS_EVENTS.BUYER_SEGMENT_VIEW, segmentId);
}
