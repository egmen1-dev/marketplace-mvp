"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

type SellerTrustViewTrackerProps = {
  sellerId: string;
};

export function SellerTrustViewTracker({ sellerId }: SellerTrustViewTrackerProps) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.SELLER_TRUST_VIEW,
      route: ROUTES.PRODUCT,
      entityId: sellerId,
    });
  }, [sellerId]);

  return null;
}
