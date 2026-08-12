"use client";

import { useEffect, useRef } from "react";

import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

type PdpSectionViewTrackerProps = {
  /** Section key stored as entityId (no PII). */
  section:
    | "why_buy"
    | "seller"
    | "characteristics"
    | "delivery"
    | "description"
    | "reviews";
  productId: string;
  event?: AnalyticsEventName;
  threshold?: number;
};

/** Fires once when a PDP section enters the viewport. */
export function PdpSectionViewTracker({
  section,
  productId,
  event = ANALYTICS_EVENTS.PDP_SECTION_VIEW,
  threshold = 0.25,
}: PdpSectionViewTrackerProps) {
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
          route: `/product/${productId}`,
          entityId: `${productId}:${section}`,
        });
        observer.disconnect();
      },
      { threshold, rootMargin: "0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [event, productId, section, threshold]);

  return (
    <span ref={ref} className="sr-only" aria-hidden>
      pdp-section-{section}
    </span>
  );
}
