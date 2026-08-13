import {
  OrderEventType,
  OrderFulfillmentType,
  OrderStatus,
} from "@prisma/client";

import { normalizeOrderStatus } from "@/features/order-lifecycle/lib/state-machine";

const STATUS_TO_EVENT: Partial<Record<OrderStatus, OrderEventType>> = {
  [OrderStatus.AWAITING_SELLER_CONFIRMATION]: OrderEventType.PAYMENT_RECORDED,
  [OrderStatus.PAID]: OrderEventType.PAYMENT_RECORDED,
  [OrderStatus.CONFIRMED]: OrderEventType.CONFIRMED,
  [OrderStatus.REJECTED]: OrderEventType.REJECTED,
  [OrderStatus.PROCESSING]: OrderEventType.PROCESSING_STARTED,
  [OrderStatus.READY_FOR_SHIPMENT]: OrderEventType.READY_FOR_SHIPMENT,
  [OrderStatus.SHIPPED]: OrderEventType.SHIPPED,
  [OrderStatus.IN_TRANSIT]: OrderEventType.IN_TRANSIT,
  [OrderStatus.ARRIVED]: OrderEventType.ARRIVED,
  [OrderStatus.READY_FOR_PICKUP]: OrderEventType.READY_FOR_PICKUP,
  [OrderStatus.PICKED_UP]: OrderEventType.PICKED_UP,
  [OrderStatus.DELIVERED]: OrderEventType.DELIVERED,
  [OrderStatus.AWAITING_BUYER_CONFIRMATION]:
    OrderEventType.AWAITING_BUYER_CONFIRMATION,
  [OrderStatus.PROTECTION_PERIOD]: OrderEventType.PROTECTION_PERIOD,
  [OrderStatus.DISPUTE_OPEN]: OrderEventType.DISPUTE_OPENED,
  [OrderStatus.COMPLETED]: OrderEventType.COMPLETED,
  [OrderStatus.CANCELLED]: OrderEventType.CANCELLED,
  [OrderStatus.RETURN_REQUESTED]: OrderEventType.RETURN_REQUESTED,
  [OrderStatus.RETURN_APPROVED]: OrderEventType.RETURN_APPROVED,
  [OrderStatus.RETURNED]: OrderEventType.RETURNED,
  [OrderStatus.REFUNDED]: OrderEventType.REFUNDED,
};

export function eventTypeForStatus(status: OrderStatus): OrderEventType | null {
  return STATUS_TO_EVENT[normalizeOrderStatus(status)] ?? null;
}

export function chatMessageForTransition(opts: {
  to: OrderStatus;
  orderNumber: string;
  fulfillmentType: OrderFulfillmentType;
}): string | null {
  const to = normalizeOrderStatus(opts.to);
  const n = opts.orderNumber;
  switch (to) {
    case OrderStatus.AWAITING_SELLER_CONFIRMATION:
      return `Заказ ${n}: оплата получена, ожидает подтверждения продавца`;
    case OrderStatus.CONFIRMED:
      return `Заказ ${n}: подтверждён продавцом`;
    case OrderStatus.REJECTED:
      return `Заказ ${n}: отклонён продавцом`;
    case OrderStatus.PROCESSING:
      return `Заказ ${n}: комплектуется`;
    case OrderStatus.READY_FOR_SHIPMENT:
      return `Заказ ${n}: готов к отправке`;
    case OrderStatus.SHIPPED:
      return `Заказ ${n}: передан в доставку`;
    case OrderStatus.IN_TRANSIT:
      return `Заказ ${n}: в пути`;
    case OrderStatus.ARRIVED:
      return `Заказ ${n}: прибыл`;
    case OrderStatus.READY_FOR_PICKUP:
      return `Заказ ${n}: готов к выдаче`;
    case OrderStatus.PICKED_UP:
      return `Заказ ${n}: выдан покупателю`;
    case OrderStatus.DELIVERED:
      return `Заказ ${n}: доставлен`;
    case OrderStatus.AWAITING_BUYER_CONFIRMATION:
      return `Заказ ${n}: ожидает подтверждения получения`;
    case OrderStatus.PROTECTION_PERIOD:
      return `Заказ ${n}: период защиты покупателя`;
    case OrderStatus.DISPUTE_OPEN:
      return `Заказ ${n}: открыт спор`;
    case OrderStatus.COMPLETED:
      return `Заказ ${n}: завершён`;
    case OrderStatus.CANCELLED:
      return `Заказ ${n}: отменён`;
    case OrderStatus.RETURN_REQUESTED:
      return `Заказ ${n}: запрошен возврат`;
    case OrderStatus.RETURN_APPROVED:
      return `Заказ ${n}: возврат одобрен`;
    case OrderStatus.RETURNED:
      return `Заказ ${n}: товар возвращён`;
    case OrderStatus.REFUNDED:
      return `Заказ ${n}: средства возвращены`;
    default:
      return null;
  }
}
