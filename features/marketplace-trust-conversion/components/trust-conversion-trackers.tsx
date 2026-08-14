"use client";

import { useEffect, useRef } from "react";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics/events";
import { markTrustViewedOnClient } from "@/lib/marketplace-trust-conversion/attribution-client";

type TrustConversionViewTrackerProps = {
  event: AnalyticsEventName;
  entityId: string;
  route?: string;
  markTrustViewed?: boolean;
};

/** Fires a trust conversion analytics event once when element enters viewport. */
export function TrustConversionViewTracker({
  event,
  entityId,
  route,
  markTrustViewed = false,
}: TrustConversionViewTrackerProps) {
  const fired = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || fired.current) return;
        fired.current = true;
        trackEvent({
          event,
          entityId,
          route: route ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
        });
        if (markTrustViewed) markTrustViewedOnClient(entityId);
        observer.disconnect();
      },
      { threshold: 0.25, rootMargin: "0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [event, entityId, route, markTrustViewed]);

  return (
    <span ref={ref} className="sr-only" aria-hidden>
      {event}-{entityId}
    </span>
  );
}

export function trackTrustDetailsOpenClient(productId: string): void {
  trackEvent({
    event: ANALYTICS_EVENTS.TRUST_DETAILS_OPEN,
    entityId: productId,
    route: `/product/${productId}`,
  });
  markTrustViewedOnClient(productId);
}

export function trackSellerReputationOpenClient(sellerId: string, route: string): void {
  trackEvent({
    event: ANALYTICS_EVENTS.SELLER_REPUTATION_OPEN,
    entityId: sellerId,
    route,
  });
}

export function trackTrustPurchaseAfterViewClient(productId: string): void {
  trackEvent({
    event: ANALYTICS_EVENTS.TRUST_PURCHASE_AFTER_VIEW,
    entityId: productId,
    route: `/product/${productId}`,
  });
}
