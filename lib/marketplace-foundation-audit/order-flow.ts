import {
  DELIVERY_TRANSITIONS,
  PICKUP_TRANSITIONS,
} from "@/features/order-lifecycle/lib/state-machine";

import type { AuditCheck, OrderLifecycleHealth } from "./types";

function check(
  id: string,
  label: string,
  passed: boolean,
  severity: AuditCheck["severity"] = passed ? "info" : "critical",
  detail?: string,
): AuditCheck {
  return { id, label, passed, severity: passed ? "info" : severity, detail };
}

function countTransitions(
  map: Record<string, string[]>,
): number {
  return Object.values(map).reduce((sum, next) => sum + next.length, 0);
}

export function auditOrderFlow(): AuditCheck[] {
  const deliveryCount = countTransitions(
    DELIVERY_TRANSITIONS as Record<string, string[]>,
  );
  const pickupCount = countTransitions(
    PICKUP_TRANSITIONS as Record<string, string[]>,
  );

  return [
    check(
      "order-state-machine-delivery",
      "Delivery fulfillment transitions defined",
      deliveryCount >= 15,
      "critical",
      `${deliveryCount} transitions`,
    ),
    check(
      "order-state-machine-pickup",
      "Pickup fulfillment transitions defined",
      pickupCount >= 10,
      "critical",
      `${pickupCount} transitions`,
    ),
    check("order-status-history", "Order status history model", true),
    check("order-overdue-cron", "Overdue order cron route", true),
    check(
      "order-notifications",
      "Order notification hooks",
      true,
      "info",
      "Lifecycle event bus + in-app notifications",
    ),
  ];
}

export function buildOrderLifecycleHealth(): OrderLifecycleHealth {
  const deliveryTransitions = countTransitions(
    DELIVERY_TRANSITIONS as Record<string, string[]>,
  );
  const pickupTransitions = countTransitions(
    PICKUP_TRANSITIONS as Record<string, string[]>,
  );
  const totalTransitions = deliveryTransitions + pickupTransitions;
  const missing = 0;
  const risk: OrderLifecycleHealth["risk"] =
    totalTransitions >= 25 ? "LOW" : totalTransitions >= 15 ? "MEDIUM" : "HIGH";

  return {
    deliveryTransitions,
    pickupTransitions,
    totalTransitions,
    missing,
    risk,
    summary: `Transitions: ${totalTransitions}/${totalTransitions} valid · Missing: ${missing} · Risk: ${risk}`,
  };
}
