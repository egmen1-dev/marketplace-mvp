"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

export function AdminTrustConversionViewTracker() {
  useEffect(() => {
    trackEvent({
      event: ANALYTICS_EVENTS.TRUST_CONVERSION_VIEW,
      entityId: "admin",
      route: "/admin/trust-center",
    });
  }, []);

  return null;
}
