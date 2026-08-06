import { OrderStatus, UserRole } from "@prisma/client";

/** Allowed seller-driven transitions (payment sets PAID). */
export const SELLER_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Admin may also reverse CANCELLED → PAID in edge cases; keep same as seller for MVP. */
export function getAllowedOrderTransitions(
  from: OrderStatus,
  role: UserRole,
): OrderStatus[] {
  void role;
  return SELLER_ORDER_TRANSITIONS[from] ?? [];
}

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
  role: UserRole,
): boolean {
  return getAllowedOrderTransitions(from, role).includes(to);
}
