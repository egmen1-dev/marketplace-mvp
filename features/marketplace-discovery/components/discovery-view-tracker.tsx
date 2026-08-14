"use client";

import { useEffect } from "react";

import { trackDiscoveryView } from "@/lib/marketplace-discovery/analytics";

export function DiscoveryViewTracker() {
  useEffect(() => {
    trackDiscoveryView();
  }, []);

  return null;
}
