"use client";

import { useEffect, useRef } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";

type TrustBlockViewTrackerProps = {
  blockId:
    | "homepage"
    | "catalog"
    | "pdp"
    | "cart"
    | "checkout"
    | "safe-deal"
    | "why-trust";
  route?: string;
};

/** Fires trust_block_view once when block enters viewport. */
export function TrustBlockViewTracker({
  blockId,
  route,
}: TrustBlockViewTrackerProps) {
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
          event: ANALYTICS_EVENTS.TRUST_BLOCK_VIEW,
          route: route ?? (typeof window !== "undefined" ? window.location.pathname : "/"),
          entityId: blockId,
        });
        observer.disconnect();
      },
      { threshold: 0.25, rootMargin: "0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [blockId, route]);

  return (
    <span ref={ref} className="sr-only" aria-hidden>
      trust-{blockId}
    </span>
  );
}
