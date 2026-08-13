import { ROUTES } from "@/lib/constants";

import type { OrderOperationsSnapshot } from "./types";

export function buildOrderOperations(input: {
  newCount: number;
  inProgress: number;
  awaitingShipment: number;
  readyForPickup: number;
  overdue: number;
}): OrderOperationsSnapshot {
  const shipToday = input.awaitingShipment + input.readyForPickup;

  return {
    newOrders: input.newCount,
    shipToday,
    overdue: input.overdue,
    inProgress: input.inProgress,
    awaitingShipment: input.awaitingShipment,
    ctaHref: ROUTES.ACCOUNT_SALES,
  };
}
