import { isCdekConfigured } from "@/lib/delivery";
import {
  getAdminDeliveryHealth,
  isMarketplaceDeliveryEnabled,
} from "@/lib/marketplace-delivery";

import { launchCheck } from "./audit";
import { isMarketplaceLaunchReadinessEnabled } from "./flags";
import type { DeliveryProductionHealth } from "./types";

export async function getDeliveryProductionHealth(): Promise<DeliveryProductionHealth> {
  const disabled: DeliveryProductionHealth = {
    enabled: false,
    providerStatus: "ERROR",
    cdekConfigured: false,
    deliveryLayerEnabled: false,
    inTransit: 0,
    overdue: 0,
    problems: 0,
    checks: [],
  };

  if (!isMarketplaceLaunchReadinessEnabled()) return disabled;

  const cdekConfigured = isCdekConfigured();
  const deliveryLayerEnabled = isMarketplaceDeliveryEnabled();
  const health = deliveryLayerEnabled
    ? await getAdminDeliveryHealth()
    : { enabled: false, inTransit: 0, overdue: 0, problems: 0 };

  let providerStatus: DeliveryProductionHealth["providerStatus"] = "ERROR";
  if (deliveryLayerEnabled) {
    providerStatus = cdekConfigured ? "OK" : "MOCK";
  }

  const checks = [
    launchCheck(
      "delivery-layer-enabled",
      "Marketplace delivery layer",
      deliveryLayerEnabled,
      "critical",
      deliveryLayerEnabled
        ? undefined
        : "Enable MARKETPLACE_DELIVERY_ENABLED",
    ),
    launchCheck(
      "delivery-cdek-credentials",
      "CDEK credentials configured",
      cdekConfigured,
      "warning",
      cdekConfigured ? "Real CDEK provider" : "Mock provider — OK for staging",
    ),
    launchCheck(
      "delivery-shipment-create",
      "Shipment creation action",
      deliveryLayerEnabled,
      "warning",
    ),
    launchCheck(
      "delivery-tracking-sync",
      "Tracking sync action",
      deliveryLayerEnabled,
      "info",
    ),
    launchCheck(
      "delivery-overdue",
      "Overdue delivery orders",
      health.overdue === 0,
      health.overdue > 0 ? "warning" : "info",
      health.overdue > 0 ? `${health.overdue} overdue` : undefined,
    ),
    launchCheck(
      "delivery-problems",
      "Failed/cancelled shipments",
      health.problems === 0,
      health.problems > 0 ? "warning" : "info",
      health.problems > 0 ? `${health.problems} problems` : undefined,
    ),
  ];

  return {
    enabled: true,
    providerStatus,
    cdekConfigured,
    deliveryLayerEnabled,
    inTransit: health.inTransit,
    overdue: health.overdue,
    problems: health.problems,
    checks,
  };
}

export function auditDeliveryProduction(
  health: DeliveryProductionHealth,
): import("./types").LaunchAuditCheck[] {
  return health.checks;
}
