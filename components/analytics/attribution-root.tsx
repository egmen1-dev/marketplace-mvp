"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { ensureAttributionCookies } from "@/lib/analytics/attribution-client";

/** Capture UTM params + anonymous visitor id on first paint (non-blocking). */
export function AttributionRoot() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams?.toString() ?? "";
    ensureAttributionCookies(search ? `?${search}` : window.location.search);
  }, [searchParams]);

  return null;
}
