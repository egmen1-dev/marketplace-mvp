"use client";

import { useEffect } from "react";

import { trackCollectionOpened } from "@/lib/marketplace-discovery/analytics";

type DiscoveryCollectionTrackerProps = {
  slug: string;
};

export function DiscoveryCollectionTracker({ slug }: DiscoveryCollectionTrackerProps) {
  useEffect(() => {
    trackCollectionOpened(slug);
  }, [slug]);

  return null;
}
