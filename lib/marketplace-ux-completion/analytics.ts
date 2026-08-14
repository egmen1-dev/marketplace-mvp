import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceUxCompletionEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceUxCompletionEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route: route ?? ROUTES.ACCOUNT,
    entityId,
  });
}

export function trackUxPageView(page: string): void {
  track(ANALYTICS_EVENTS.UX_PAGE_VIEW, page);
}

export function trackOnboardingStarted(): void {
  track(ANALYTICS_EVENTS.ONBOARDING_STARTED);
}

export function trackOnboardingCompleted(kind: string): void {
  track(ANALYTICS_EVENTS.ONBOARDING_COMPLETED, kind);
}

export function trackEmptyStateView(id: string): void {
  track(ANALYTICS_EVENTS.EMPTY_STATE_VIEW, id);
}

export function trackEmptyStateActionClick(id: string): void {
  track(ANALYTICS_EVENTS.EMPTY_STATE_ACTION_CLICK, id);
}

export function trackSettingsOpened(): void {
  track(ANALYTICS_EVENTS.SETTINGS_OPENED);
}

export function trackAccountModeSwitch(mode: string): void {
  track(ANALYTICS_EVENTS.ACCOUNT_MODE_SWITCH, mode);
}

export function trackTrustBlockView(context: string): void {
  track(ANALYTICS_EVENTS.TRUST_BLOCK_VIEW, context);
}

export function trackAiExplanationView(id: string): void {
  track(ANALYTICS_EVENTS.AI_EXPLANATION_VIEW, id);
}

export function trackSellerDashboardActionClick(actionId: string): void {
  track(ANALYTICS_EVENTS.SELLER_DASHBOARD_ACTION_CLICK, actionId);
}

export function trackBuyerDiscoveryOpened(): void {
  track(ANALYTICS_EVENTS.BUYER_DISCOVERY_OPENED);
}
