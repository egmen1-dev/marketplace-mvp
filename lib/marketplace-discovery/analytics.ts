import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceDiscoveryEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceDiscoveryEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route: route ?? ROUTES.HOME,
    entityId,
  });
}

export function trackDiscoveryView(): void {
  track(ANALYTICS_EVENTS.DISCOVERY_VIEW);
}

export function trackDiscoverySectionView(sectionId: string): void {
  track(ANALYTICS_EVENTS.DISCOVERY_SECTION_VIEW, sectionId);
}

export function trackDiscoveryProductClick(productId: string): void {
  track(ANALYTICS_EVENTS.DISCOVERY_PRODUCT_CLICK, productId);
}

export function trackDiscoveryProductView(productId: string): void {
  track(ANALYTICS_EVENTS.DISCOVERY_PRODUCT_VIEW, productId);
}

export function trackDiscoveryAddToCart(productId: string): void {
  track(ANALYTICS_EVENTS.DISCOVERY_ADD_TO_CART, productId);
}

export function trackDiscoveryPurchase(orderId: string): void {
  track(ANALYTICS_EVENTS.DISCOVERY_PURCHASE, orderId);
}

export function trackCollectionOpened(slug: string): void {
  track(ANALYTICS_EVENTS.COLLECTION_OPENED, slug, `/discover/collections/${slug}`);
}

export function trackDailyFindView(productId: string): void {
  track(ANALYTICS_EVENTS.DAILY_FIND_VIEW, productId);
}

export function trackDailyFindClick(productId: string): void {
  track(ANALYTICS_EVENTS.DAILY_FIND_CLICK, productId);
}

export function trackPriceGameStarted(productId: string): void {
  track(ANALYTICS_EVENTS.PRICE_GAME_STARTED, productId);
}

export function trackPriceGameCompleted(productId: string): void {
  track(ANALYTICS_EVENTS.PRICE_GAME_COMPLETED, productId);
}

export function trackSituationSelected(situationId: string): void {
  track(ANALYTICS_EVENTS.SITUATION_SELECTED, situationId);
}
