"use client";

import { useEffect, useRef } from "react";

import type { AnalyticsEventName } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

type FunnelTrackerProps = {
  event: AnalyticsEventName;
  route?: string;
  entityId?: string;
};

/** Fire a single funnel event once per mount (PDP, catalog, checkout). */
export function FunnelTracker({ event, route, entityId }: FunnelTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent({ event, route, entityId });
  }, [event, route, entityId]);

  return null;
}
