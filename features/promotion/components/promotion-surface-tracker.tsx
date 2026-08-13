"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import {
  promotionSurfaceRoute,
  type PromotionSurfaceType,
} from "@/lib/promotion/surfaces";

type PromotionSurfaceTrackerProps = {
  surface: PromotionSurfaceType;
  productIds: string[];
};

/** Fires promotion_impression once per surface block (no PII). */
export function PromotionSurfaceTracker({
  surface,
  productIds,
}: PromotionSurfaceTrackerProps) {
  useEffect(() => {
    if (productIds.length === 0) return;
    trackEvent({
      event: ANALYTICS_EVENTS.PROMOTION_IMPRESSION,
      route: promotionSurfaceRoute(surface),
      entityId: productIds.slice(0, 5).join(","),
    });
  }, [surface, productIds]);

  return null;
}

export function trackPromotionClick(
  surface: PromotionSurfaceType,
  productId: string,
): void {
  trackEvent({
    event: ANALYTICS_EVENTS.PROMOTION_CLICK,
    route: promotionSurfaceRoute(surface),
    entityId: productId,
  });
}
