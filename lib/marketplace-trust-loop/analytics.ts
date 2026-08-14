import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceTrustLoopEnabled } from "./flags";

export function trackReviewView(productId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.REVIEW_VIEW,
    route: `${ROUTES.PRODUCT}/${productId}`,
    entityId: productId,
  });
}

export function trackReviewStarted(orderId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.REVIEW_STARTED,
    route: ROUTES.ORDERS,
    entityId: orderId,
  });
}

export function trackReviewCreated(reviewId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.REVIEW_CREATED,
    route: ROUTES.ORDERS,
    entityId: reviewId,
  });
}

export function trackReviewPublished(reviewId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.REVIEW_PUBLISHED,
    route: ROUTES.ADMIN_MODERATION,
    entityId: reviewId,
  });
}

export function trackRatingUpdated(entityId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.RATING_UPDATED,
    entityId,
  });
}

export function trackModerationItemCreated(entityId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.MODERATION_ITEM_CREATED,
    route: ROUTES.ADMIN_MODERATION,
    entityId,
  });
}

export function trackModerationApproved(entityId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.MODERATION_APPROVED,
    route: ROUTES.ADMIN_MODERATION,
    entityId,
  });
}

export function trackModerationRejected(entityId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.MODERATION_REJECTED,
    route: ROUTES.ADMIN_MODERATION,
    entityId,
  });
}

export function trackTrustSignalView(productId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.TRUST_SIGNAL_VIEW,
    route: `${ROUTES.PRODUCT}/${productId}`,
    entityId: productId,
  });
}

export function trackPhotoQualityIssueFound(productId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PHOTO_QUALITY_ISSUE_FOUND,
    route: ROUTES.SELLER_PRODUCTS,
    entityId: productId,
  });
}

export function trackProductQualityIssueFound(productId: string): void {
  if (!isMarketplaceTrustLoopEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.PRODUCT_QUALITY_ISSUE_FOUND,
    route: ROUTES.SELLER_PRODUCTS,
    entityId: productId,
  });
}
