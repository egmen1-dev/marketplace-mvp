"use client";

import { useEffect } from "react";

import { trackExternalVisit } from "@/lib/marketplace-social-growth/analytics";

type SocialExternalVisitTrackerProps = {
  source: string;
};

export function SocialExternalVisitTracker({ source }: SocialExternalVisitTrackerProps) {
  useEffect(() => {
    trackExternalVisit(source);
  }, [source]);

  return null;
}
