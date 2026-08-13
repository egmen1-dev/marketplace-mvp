"use client";

import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

/** Fires once when seller opens promotions cabinet. */
export function PromotionViewTracker() {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.PROMOTION_DASHBOARD_VIEW,
      route: ROUTES.ACCOUNT_PROMOTIONS,
    });
  }, []);

  return null;
}
