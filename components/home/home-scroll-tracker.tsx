"use client";

import { useEffect, useRef } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { ROUTES } from "@/lib/constants";

/** Fire scroll_homepage once per session when user scrolls past 25% viewport. */
export function HomeScrollTracker() {
  const fired = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (fired.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const ratio = window.scrollY / max;
      if (ratio >= 0.25) {
        fired.current = true;
        trackEvent({
          event: ANALYTICS_EVENTS.SCROLL_HOMEPAGE,
          route: ROUTES.HOME,
          entityId: "25pct",
        });
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
