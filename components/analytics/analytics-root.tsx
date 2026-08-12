"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

/** Per-route page_view + landing_view on homepage. */
export function AnalyticsRoot() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    trackEvent({ event: ANALYTICS_EVENTS.PAGE_VIEW, route: pathname });
    if (pathname === ROUTES.HOME) {
      trackEvent({ event: ANALYTICS_EVENTS.LANDING_VIEW, route: pathname });
    }
  }, [pathname]);

  return null;
}
