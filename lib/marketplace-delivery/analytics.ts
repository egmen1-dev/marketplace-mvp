import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceDeliveryEnabled } from "./flags";

export function trackDeliveryCreated(orderId: string): void {
  if (!isMarketplaceDeliveryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.DELIVERY_CREATED,
    route: ROUTES.ACCOUNT_SALES,
    entityId: orderId,
  });
}

export function trackShipmentCreated(orderId: string): void {
  if (!isMarketplaceDeliveryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.SHIPMENT_CREATED,
    route: ROUTES.ACCOUNT_ORDERS_SHIP,
    entityId: orderId,
  });
}

export function trackDeliveryTrackingView(orderId: string): void {
  if (!isMarketplaceDeliveryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.DELIVERY_TRACKING_VIEW,
    route: ROUTES.ORDERS,
    entityId: orderId,
  });
}

export function trackDeliveryStatusChanged(orderId: string): void {
  if (!isMarketplaceDeliveryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.DELIVERY_STATUS_CHANGED,
    route: ROUTES.ORDERS,
    entityId: orderId,
  });
}

export function trackDeliveryCompleted(orderId: string): void {
  if (!isMarketplaceDeliveryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.DELIVERY_COMPLETED,
    route: ROUTES.ORDERS,
    entityId: orderId,
  });
}

export function trackReturnCreated(returnId: string): void {
  if (!isMarketplaceDeliveryEnabled()) return;
  void trackServerEvent({
    event: ANALYTICS_EVENTS.RETURN_CREATED,
    route: ROUTES.ORDERS,
    entityId: returnId,
  });
}
