"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ensureAttributionCookies } from "@/lib/analytics/attribution-client";
import { ROUTES } from "@/lib/constants";

/** Capture UTM params + anonymous visitor id on first paint (non-blocking). */
export function AttributionRoot() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const adLandingTracked = useRef(false);

  useEffect(() => {
    const search = searchParams?.toString() ?? "";
    const attr = ensureAttributionCookies(
      search ? `?${search}` : window.location.search,
    );

    if (
      !adLandingTracked.current &&
      pathname === ROUTES.HOME &&
      attr.utmSource
    ) {
      adLandingTracked.current = true;
      trackEvent({
        event: ANALYTICS_EVENTS.AD_LANDING_VIEW,
        route: pathname,
        visitorId: attr.visitorId,
        utmSource: attr.utmSource,
        utmMedium: attr.utmMedium,
        utmCampaign: attr.utmCampaign,
        utmContent: attr.utmContent,
      });
    }
  }, [searchParams, pathname]);

  return null;
}
