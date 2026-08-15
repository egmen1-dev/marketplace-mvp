import { ROUTES } from "@/lib/constants";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

import { isMarketplaceRankingIntelligenceEnabled } from "./flags";

function track(event: (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS], entityId?: string) {
  if (!isMarketplaceRankingIntelligenceEnabled()) return;
  void trackServerEvent({
    event,
    route: ROUTES.ACCOUNT_RANKING,
    entityId,
  });
}

export function trackRankingView(entityId?: string): void {
  track(ANALYTICS_EVENTS.RANKING_VIEW, entityId);
}

export function trackRankingSimulation(entityId?: string): void {
  track(ANALYTICS_EVENTS.RANKING_SIMULATION, entityId);
}

export function trackRankingRecommendationClick(entityId?: string): void {
  track(ANALYTICS_EVENTS.RANKING_RECOMMENDATION_CLICK, entityId);
}

export function trackRankingFactorOpen(factorKey: string): void {
  track(ANALYTICS_EVENTS.RANKING_FACTOR_OPEN, factorKey);
}

export function trackRankingHistoryView(productId: string): void {
  track(ANALYTICS_EVENTS.RANKING_HISTORY_VIEW, productId);
}

export function trackRankingLabRun(experimentId: string): void {
  track(ANALYTICS_EVENTS.RANKING_LAB_RUN, experimentId);
}

export function trackRankingExperimentCreated(experimentId: string): void {
  track(ANALYTICS_EVENTS.RANKING_EXPERIMENT_CREATED, experimentId);
}

export function trackRankingVersionChanged(version: string): void {
  track(ANALYTICS_EVENTS.RANKING_VERSION_CHANGED, version);
}

export function trackRankingWeightChanged(version: string): void {
  track(ANALYTICS_EVENTS.RANKING_WEIGHT_CHANGED, version);
}

export function trackRankingQualityGateFailed(productId: string): void {
  track(ANALYTICS_EVENTS.RANKING_QUALITY_GATE_FAILED, productId);
}
