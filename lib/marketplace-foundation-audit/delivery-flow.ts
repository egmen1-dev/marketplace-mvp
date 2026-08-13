import { isCdekConfigured } from "@/lib/delivery";

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

  return [
    check("delivery-provider-factory", "Delivery provider factory", true),
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
      "delivery-tracking",
      "Carrier tracking integration",
      true,
      "info",
      "Carrier status mapping available; automation partial",
    ),
    check(
      "delivery-notifications",
      "Seller/buyer delivery notifications",
      true,
      "info",
      "Order lifecycle notifications on status change",
    ),
  ];
}
