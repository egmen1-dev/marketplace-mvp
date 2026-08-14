import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

import { isMarketplaceTrustExperienceEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceTrustExperienceEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route,
    entityId,
  });
}

export function trackTrustCenterView(sellerId: string): void {
  track(ANALYTICS_EVENTS.TRUST_CENTER_VIEW, sellerId, "/account/reputation");
}

export function trackTrustFactorOpen(factorId: string): void {
  track(ANALYTICS_EVENTS.TRUST_FACTOR_OPEN, factorId);
}

export function trackTrustHistoryView(sellerId: string): void {
  track(ANALYTICS_EVENTS.TRUST_HISTORY_VIEW, sellerId);
}

export function trackTrustImprovementClick(stepId: string): void {
  track(ANALYTICS_EVENTS.TRUST_IMPROVEMENT_CLICK, stepId);
}

export function trackTrustLevelReached(levelId: string): void {
  track(ANALYTICS_EVENTS.TRUST_LEVEL_REACHED, levelId);
}
