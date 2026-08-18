import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";

export type SellerInventoryTelemetryEvent =
  | "inventory_opened"
  | "stock_updated"
  | "stock_adjusted"
  | "inventory_filtered"
  | "inventory_searched";

const EVENT_MAP = {
  inventory_opened: ANALYTICS_EVENTS.INVENTORY_OPENED,
  stock_updated: ANALYTICS_EVENTS.STOCK_UPDATED,
  stock_adjusted: ANALYTICS_EVENTS.STOCK_ADJUSTED,
  inventory_filtered: ANALYTICS_EVENTS.INVENTORY_FILTERED,
  inventory_searched: ANALYTICS_EVENTS.INVENTORY_SEARCHED,
} as const;

export function trackSellerInventoryEvent(
  event: SellerInventoryTelemetryEvent,
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
    route: "/seller/inventory",
    entityId,
  });
}
