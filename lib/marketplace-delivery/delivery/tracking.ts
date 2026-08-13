import { DeliveryStatus, OrderStatus } from "@prisma/client";

import type { DeliveryTrackingSnapshot } from "./types";

export function mapDeliveryStatusToOrderStatus(
  status: DeliveryStatus,
): OrderStatus | null {
  switch (status) {
    case DeliveryStatus.CREATED:
    case DeliveryStatus.READY_FOR_PICKUP:
    case DeliveryStatus.PICKED_UP:
      return OrderStatus.SHIPPED;
    case DeliveryStatus.IN_TRANSIT:
      return OrderStatus.IN_TRANSIT;
    case DeliveryStatus.AT_PICKUP_POINT:
      return OrderStatus.ARRIVED;
    case DeliveryStatus.DELIVERED:
      return OrderStatus.DELIVERED;
    case DeliveryStatus.CANCELLED:
    case DeliveryStatus.FAILED:
      return OrderStatus.CANCELLED;
    default:
      return null;
  }
}

export function buildBuyerDeliverySteps(input: {
  orderStatus: OrderStatus;
  deliveryStatus: DeliveryStatus | null;
  isPaid: boolean;
}): Array<{ id: string; label: string; done: boolean; active: boolean }> {
  const order = input.orderStatus;
  const delivery = input.deliveryStatus;

  const paid =
    input.isPaid &&
    order !== OrderStatus.NEW &&
    order !== OrderStatus.CANCELLED &&
    order !== OrderStatus.REJECTED;

  const handedToSeller =
    paid &&
    ([
      OrderStatus.AWAITING_SELLER_CONFIRMATION,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.READY_FOR_SHIPMENT,
      OrderStatus.SHIPPED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.ARRIVED,
      OrderStatus.DELIVERED,
      OrderStatus.COMPLETED,
    ] as OrderStatus[]).includes(order);

  const inTransit =
    delivery === DeliveryStatus.IN_TRANSIT ||
    delivery === DeliveryStatus.PICKED_UP ||
    order === OrderStatus.IN_TRANSIT ||
    order === OrderStatus.SHIPPED;

  const atPickup =
    delivery === DeliveryStatus.AT_PICKUP_POINT || order === OrderStatus.ARRIVED;

  const delivered =
    delivery === DeliveryStatus.DELIVERED ||
    order === OrderStatus.DELIVERED ||
    order === OrderStatus.COMPLETED;

  const steps = [
    { id: "paid", label: "Оплачен", done: paid, active: paid && !handedToSeller },
    {
      id: "seller",
      label: "Передан продавцу",
      done: handedToSeller,
      active: handedToSeller && !inTransit && !atPickup && !delivered,
    },
    {
      id: "transit",
      label: "В пути",
      done: inTransit || atPickup || delivered,
      active: inTransit && !atPickup && !delivered,
    },
    {
      id: "pickup",
      label: "В пункте выдачи",
      done: atPickup || delivered,
      active: atPickup && !delivered,
    },
    {
      id: "delivered",
      label: "Получен",
      done: delivered,
      active: delivered,
    },
  ];

  return steps;
}

export function isDeliveryTerminal(status: DeliveryStatus): boolean {
  return (
    status === DeliveryStatus.DELIVERED ||
    status === DeliveryStatus.CANCELLED ||
    status === DeliveryStatus.FAILED ||
    status === DeliveryStatus.RETURNED
  );
}

export function trackingSnapshotFromDelivery(input: {
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: DeliveryStatus;
  externalStatus?: string | null;
  updatedAt: Date;
}): DeliveryTrackingSnapshot | null {
  if (!input.trackingNumber) return null;
  return {
    status: input.status,
    rawStatus: input.externalStatus ?? null,
    trackingNumber: input.trackingNumber,
    trackingUrl: input.trackingUrl,
    updatedAt: input.updatedAt.toISOString(),
  };
}
