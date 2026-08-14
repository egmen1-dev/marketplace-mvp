"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export function TrustCenterViewTracker({ sellerId }: { sellerId: string }) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.TRUST_CENTER_VIEW,
      entityId: sellerId,
      route: "/account/reputation",
    });
  }, [sellerId]);

  return null;
}

export function TrustLevelReachedTracker({ levelId }: { levelId: string }) {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.TRUST_LEVEL_REACHED,
      entityId: levelId,
      route: "/account/reputation",
    });
  }, [levelId]);

  return null;
}
