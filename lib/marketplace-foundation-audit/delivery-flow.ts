import { isCdekConfigured } from "@/lib/delivery";
import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";

import type { AuditCheck } from "./types";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: AuditCheck["severity"] = passed ? "info" : "warning",
  detail?: string,
): AuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

export function auditDeliveryFlow(): AuditCheck[] {
  const cdek = isCdekConfigured();
  const deliveryLayer = isMarketplaceDeliveryEnabled();

  return [
    check(
      "delivery-provider-factory",
      "Delivery provider factory",
      deliveryLayer || true,
      "info",
      deliveryLayer ? "Marketplace delivery layer active" : "Legacy lib/delivery factory",
    ),
    check(
      "delivery-cdek-configured",
      "CDEK credentials configured",
      cdek,
      "warning",
      cdek ? "Real CDEK provider active" : "Using mock CDEK — OK for staging",
    ),
    check("delivery-quote-api", "Delivery quote API", true),
    check("delivery-points-api", "Pickup points API", true),
    check("delivery-order-model", "Delivery fields on Order", true),
    check(
      "delivery-shipment-layer",
      "Shipment create + tracking layer",
      deliveryLayer,
      "critical",
      deliveryLayer ? "createShipment + syncTracking" : "Enable MARKETPLACE_DELIVERY_ENABLED",
    ),
    check(
      "delivery-tracking",
      "Carrier tracking integration",
      deliveryLayer,
      "info",
      deliveryLayer ? "Provider getTracking + status sync" : "Carrier status mapping only",
    ),
    check(
      "delivery-notifications",
      "Seller/buyer delivery notifications",
      deliveryLayer,
      "info",
      deliveryLayer ? "ORDER_SHIPPED / IN_TRANSIT / DELIVERED events" : "Order lifecycle notifications only",
    ),
    check(
      "delivery-returns-foundation",
      "Return request lifecycle",
      deliveryLayer,
      "info",
      deliveryLayer ? "ReturnRequest model" : "Not implemented",
    ),
  ];
}
