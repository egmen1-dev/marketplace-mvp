import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

export type SellerPromotionTelemetryEvent =
  | "promotion_opened"
  | "promotion_created"
  | "promotion_updated"
  | "promotion_deleted"
  | "promotion_published"
  | "promotion_finished";

const EVENT_MAP = {
  promotion_opened: ANALYTICS_EVENTS.PROMOTION_OPENED,
  promotion_created: ANALYTICS_EVENTS.PROMOTION_CREATED,
  promotion_updated: ANALYTICS_EVENTS.PROMOTION_UPDATED,
  promotion_deleted: ANALYTICS_EVENTS.PROMOTION_DELETED,
  promotion_published: ANALYTICS_EVENTS.PROMOTION_PUBLISHED,
  promotion_finished: ANALYTICS_EVENTS.PROMOTION_FINISHED,
} as const;

export function trackSellerPromotionEvent(
  event: SellerPromotionTelemetryEvent,
  payload?: Record<string, string | number | boolean | null>,
): void {
  const entityId = payload
    ? Object.entries(payload)
        .map(([key, value]) => `${key}:${String(value)}`)
        .join("|")
        .slice(0, 100)
    : undefined;

  void trackServerEvent({
    event: EVENT_MAP[event],
    route: "/seller/promotion",
    entityId,
  });
}
