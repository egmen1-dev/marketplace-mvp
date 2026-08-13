import {
  OrderActorRole,
  OrderFulfillmentType,
  OrderStatus,
  UserRole,
} from "@prisma/client";

/**
 * Normalize legacy PAID into the OMS awaiting-confirmation state.
 * PAID remains in the Prisma enum for historical/compat reads only.
 */
export function normalizeOrderStatus(status: OrderStatus): OrderStatus {
  if (status === OrderStatus.PAID) {
    return OrderStatus.AWAITING_SELLER_CONFIRMATION;
  }
  return status;
}

/** Delivery fulfillment happy-path + side branches. */
export const DELIVERY_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [
    OrderStatus.AWAITING_SELLER_CONFIRMATION,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ],
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
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_SHIPMENT]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED],
  [OrderStatus.IN_TRANSIT]: [
    OrderStatus.ARRIVED,
    OrderStatus.DELIVERED,
  ],
  [OrderStatus.ARRIVED]: [OrderStatus.DELIVERED],
  [OrderStatus.READY_FOR_PICKUP]: [],
  [OrderStatus.PICKED_UP]: [],
  [OrderStatus.DELIVERED]: [
    OrderStatus.AWAITING_BUYER_CONFIRMATION,
    OrderStatus.RETURN_REQUESTED,
  ],
  [OrderStatus.AWAITING_BUYER_CONFIRMATION]: [
    OrderStatus.COMPLETED,
    OrderStatus.DISPUTE_OPEN,
    OrderStatus.RETURN_REQUESTED,
  ],
  [OrderStatus.PROTECTION_PERIOD]: [
    OrderStatus.COMPLETED,
    OrderStatus.DISPUTE_OPEN,
  ],
  [OrderStatus.DISPUTE_OPEN]: [
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURN_APPROVED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RETURN_APPROVED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

/** Seller-pickup happy-path + side branches. */
export const PICKUP_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [
    OrderStatus.AWAITING_SELLER_CONFIRMATION,
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
    OrderStatus.REJECTED,
  ],
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
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_SHIPMENT]: [],
  [OrderStatus.SHIPPED]: [],
  [OrderStatus.IN_TRANSIT]: [],
  [OrderStatus.ARRIVED]: [],
  [OrderStatus.READY_FOR_PICKUP]: [
    OrderStatus.PICKED_UP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKED_UP]: [OrderStatus.AWAITING_BUYER_CONFIRMATION],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.AWAITING_BUYER_CONFIRMATION]: [
    OrderStatus.COMPLETED,
    OrderStatus.DISPUTE_OPEN,
  ],
  [OrderStatus.PROTECTION_PERIOD]: [
    OrderStatus.COMPLETED,
    OrderStatus.DISPUTE_OPEN,
  ],
  [OrderStatus.DISPUTE_OPEN]: [
    OrderStatus.COMPLETED,
    OrderStatus.REFUNDED,
  ],
  [OrderStatus.COMPLETED]: [OrderStatus.RETURN_REQUESTED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REJECTED]: [],
  [OrderStatus.RETURN_REQUESTED]: [
    OrderStatus.RETURN_APPROVED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.RETURN_APPROVED]: [OrderStatus.RETURNED],
  [OrderStatus.RETURNED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

export type TransitionActorRole = OrderActorRole;

const SELLER_ALLOWED = new Set<OrderStatus>([
  OrderStatus.CONFIRMED,
  OrderStatus.REJECTED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_FOR_SHIPMENT,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.ARRIVED,
  OrderStatus.DELIVERED,
  OrderStatus.READY_FOR_PICKUP,
  OrderStatus.PICKED_UP,
  OrderStatus.CANCELLED,
  OrderStatus.RETURN_APPROVED,
  OrderStatus.RETURNED,
  OrderStatus.REFUNDED,
]);

const BUYER_ALLOWED = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
  OrderStatus.RETURN_REQUESTED,
  OrderStatus.DISPUTE_OPEN,
]);

const SYSTEM_PAYMENT_ALLOWED = new Set<OrderStatus>([
  OrderStatus.AWAITING_SELLER_CONFIRMATION,
  OrderStatus.CANCELLED,
]);

export function getTransitionMap(
  fulfillmentType: OrderFulfillmentType,
): Record<OrderStatus, OrderStatus[]> {
  return fulfillmentType === OrderFulfillmentType.SELLER_PICKUP
    ? PICKUP_TRANSITIONS
    : DELIVERY_TRANSITIONS;
}

export function getAllowedTransitions(opts: {
  from: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  actorRole: OrderActorRole;
}): OrderStatus[] {
  const from = normalizeOrderStatus(opts.from);
  const map = getTransitionMap(opts.fulfillmentType);
  const candidates = map[from] ?? [];

  return candidates.filter((to) =>
    isRoleAllowedToSetStatus(opts.actorRole, to, from),
  );
}

export function canTransition(opts: {
  from: OrderStatus;
  to: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  actorRole: OrderActorRole;
}): boolean {
  return getAllowedTransitions(opts).includes(opts.to);
}

function isRoleAllowedToSetStatus(
  role: OrderActorRole,
  to: OrderStatus,
  from: OrderStatus,
): boolean {
  switch (role) {
    case OrderActorRole.ADMIN:
      return true;
    case OrderActorRole.SYSTEM:
      return true;
    case OrderActorRole.PAYMENT:
      return SYSTEM_PAYMENT_ALLOWED.has(to);
    case OrderActorRole.SELLER:
      return SELLER_ALLOWED.has(to);
    case OrderActorRole.BUYER: {
      if (to === OrderStatus.CANCELLED) {
        return (
          from === OrderStatus.NEW ||
          from === OrderStatus.AWAITING_SELLER_CONFIRMATION ||
          from === OrderStatus.PAID
        );
      }
      if (to === OrderStatus.COMPLETED) {
        return (
          from === OrderStatus.DELIVERED ||
          from === OrderStatus.PICKED_UP ||
          from === OrderStatus.AWAITING_BUYER_CONFIRMATION ||
          from === OrderStatus.PROTECTION_PERIOD
        );
      }
      if (to === OrderStatus.DISPUTE_OPEN) {
        return (
          from === OrderStatus.AWAITING_BUYER_CONFIRMATION ||
          from === OrderStatus.PROTECTION_PERIOD ||
          from === OrderStatus.DELIVERED ||
          from === OrderStatus.PICKED_UP
        );
      }
      return BUYER_ALLOWED.has(to);
    }
    default:
      return false;
  }
}

export function userRoleToActorRole(role: UserRole): OrderActorRole {
  switch (role) {
    case UserRole.ADMIN:
      return OrderActorRole.ADMIN;
    case UserRole.SELLER:
      return OrderActorRole.SELLER;
    default:
      return OrderActorRole.BUYER;
  }
}

/** Human-readable next expected action for buyer/seller timelines. */
export function getExpectedNextAction(opts: {
  status: OrderStatus;
  fulfillmentType: OrderFulfillmentType;
  viewer: "BUYER" | "SELLER";
}): string {
  const status = normalizeOrderStatus(opts.status);
  const pickup =
    opts.fulfillmentType === OrderFulfillmentType.SELLER_PICKUP;

  if (opts.viewer === "BUYER") {
    switch (status) {
      case OrderStatus.NEW:
        return "Оплатите заказ";
      case OrderStatus.AWAITING_SELLER_CONFIRMATION:
      case OrderStatus.PAID:
        return "Ожидайте подтверждения продавца";
      case OrderStatus.CONFIRMED:
      case OrderStatus.PROCESSING:
        return pickup
          ? "Продавец комплектует заказ к самовывозу"
          : "Продавец комплектует заказ";
      case OrderStatus.READY_FOR_SHIPMENT:
        return "Ожидайте передачи в доставку";
      case OrderStatus.SHIPPED:
      case OrderStatus.IN_TRANSIT:
        return "Заказ в пути";
      case OrderStatus.ARRIVED:
        return "Заказ прибыл — ожидайте выдачи";
      case OrderStatus.READY_FOR_PICKUP:
        return "Заберите заказ в пункте самовывоза";
      case OrderStatus.PICKED_UP:
      case OrderStatus.DELIVERED:
      case OrderStatus.AWAITING_BUYER_CONFIRMATION:
      case OrderStatus.PROTECTION_PERIOD:
        return "Подтвердите получение";
      case OrderStatus.DISPUTE_OPEN:
        return "Спор открыт — ожидайте решения";
      case OrderStatus.COMPLETED:
        return "Заказ завершён";
      case OrderStatus.CANCELLED:
        return "Заказ отменён";
      case OrderStatus.REJECTED:
        return "Продавец отклонил заказ";
      case OrderStatus.RETURN_REQUESTED:
        return "Ожидайте решения по возврату";
      default:
        return "Следите за статусом заказа";
    }
  }

  switch (status) {
    case OrderStatus.NEW:
      return "Ожидайте оплату покупателя";
    case OrderStatus.AWAITING_SELLER_CONFIRMATION:
    case OrderStatus.PAID:
      return "Подтвердите или отклоните заказ";
    case OrderStatus.CONFIRMED:
      return "Начните комплектацию";
    case OrderStatus.PROCESSING:
      return pickup
        ? "Отметьте готовность к выдаче"
        : "Отметьте готовность к отправке";
    case OrderStatus.READY_FOR_SHIPMENT:
      return "Передайте заказ в доставку";
    case OrderStatus.SHIPPED:
      return "Отметьте, что заказ в пути (опционально)";
    case OrderStatus.IN_TRANSIT:
      return "Дождитесь доставки или отметьте прибытие";
    case OrderStatus.ARRIVED:
      return "Отметьте доставку покупателю";
    case OrderStatus.READY_FOR_PICKUP:
      return "Дождитесь выдачи покупателю";
    case OrderStatus.PICKED_UP:
    case OrderStatus.DELIVERED:
    case OrderStatus.AWAITING_BUYER_CONFIRMATION:
    case OrderStatus.PROTECTION_PERIOD:
      return "Покупатель подтверждает получение";
    case OrderStatus.DISPUTE_OPEN:
      return "Спор — ожидайте решения администратора";
    case OrderStatus.COMPLETED:
      return "Продажа завершена";
    default:
      return "Проверьте статус заказа";
  }
}
