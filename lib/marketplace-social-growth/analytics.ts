import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceSocialGrowthEnabled } from "./flags";

function track(event: string, entityId?: string, route?: string): void {
  if (!isMarketplaceSocialGrowthEnabled()) return;
  void trackServerEvent({
    event: event as import("@/lib/analytics/events").AnalyticsEventName,
    route: route ?? ROUTES.HOME,
    entityId,
  });
}

export function trackShareCardView(productId: string): void {
  track(ANALYTICS_EVENTS.SHARE_CARD_VIEW, productId);
}

export function trackShareClicked(productId: string, channel?: string): void {
  track(ANALYTICS_EVENTS.SHARE_CLICKED, channel ? `${productId}:${channel}` : productId);
}

export function trackContentGenerated(productId: string, formatId: string): void {
  track(ANALYTICS_EVENTS.CONTENT_GENERATED, `${productId}:${formatId}`);
}

export function trackContentShared(productId: string): void {
  track(ANALYTICS_EVENTS.CONTENT_SHARED, productId);
}

export function trackViralCardOpened(productId: string): void {
  track(ANALYTICS_EVENTS.VIRAL_CARD_OPENED, productId);
}

export function trackExternalVisit(source: string): void {
  track(ANALYTICS_EVENTS.EXTERNAL_VISIT, source);
}

export function trackCollectionCreated(collectionId: string): void {
  track(ANALYTICS_EVENTS.COLLECTION_CREATED, collectionId);
}

export function trackCollectionShared(collectionId: string): void {
  track(ANALYTICS_EVENTS.COLLECTION_SHARED, collectionId);
}

export function trackCreatorCollectionView(collectionId: string): void {
  track(ANALYTICS_EVENTS.CREATOR_COLLECTION_VIEW, collectionId);
}

export function trackSocialPurchase(orderId: string): void {
  track(ANALYTICS_EVENTS.SOCIAL_PURCHASE, orderId);
}
