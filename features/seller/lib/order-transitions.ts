import { OrderActorRole, OrderStatus, UserRole } from "@prisma/client";

import {
  getAllowedTransitions,
  userRoleToActorRole,
} from "@/features/order-lifecycle/lib/state-machine";

/**
 * @deprecated Prefer order-lifecycle state machine.
 * Kept as thin adapter for existing seller UI / tests.
 */
export const SELLER_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [
    OrderStatus.CONFIRMED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.AWAITING_SELLER_CONFIRMATION]: [
    OrderStatus.CONFIRMED,
    OrderStatus.REJECTED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_SHIPMENT]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED],
  [OrderStatus.IN_TRANSIT]: [OrderStatus.ARRIVED, OrderStatus.DELIVERED],
  [OrderStatus.ARRIVED]: [OrderStatus.DELIVERED],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.PICKED_UP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKED_UP]: [],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.AWAITING_BUYER_CONFIRMATION]: [],
  [OrderStatus.PROTECTION_PERIOD]: [],
  [OrderStatus.DISPUTE_OPEN]: [],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.RETURN_REQUESTED]: [OrderStatus.RETURN_APPROVED],
  [OrderStatus.RETURN_APPROVED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

export function getAllowedOrderTransitions(
  from: OrderStatus,
  role: UserRole,
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP" = "DELIVERY",
): OrderStatus[] {
  return getAllowedTransitions({
    from,
    fulfillmentType,
    actorRole: userRoleToActorRole(role),
  });
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
  role: UserRole,
  fulfillmentType: "DELIVERY" | "SELLER_PICKUP" = "DELIVERY",
): boolean {
  return getAllowedOrderTransitions(from, role, fulfillmentType).includes(to);
}

export { OrderActorRole };
