import {
  DeliveryStatus,
  OrderActorRole,
  OrderFulfillmentType,
  OrderStatus,
} from "@prisma/client";

import { transitionOrderWithEffects } from "@/features/order-lifecycle/lib/transition";
import { prisma } from "@/lib/prisma";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";

import { isMarketplaceDeliveryEnabled } from "../flags";
import { mapDeliveryStatusToOrderStatus } from "./tracking";
import {
  notifyBuyerDeliveryStatus,
  notifySellerDeliveryCompleted,
  notifySellerNewOrderToShip,
  notifySellerShipmentCreated,
} from "./notifications";
import {
  trackDeliveryCompleted,
  trackDeliveryStatusChanged,
} from "../analytics";

export async function syncDeliveryOnOrderTransition(input: {
  orderId: string;
  previousStatus: OrderStatus;
  status: OrderStatus;
}): Promise<void> {
  if (!isMarketplaceDeliveryEnabled()) return;

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      delivery: true,
      items: {
        take: 1,
        select: { product: { select: { sellerId: true, seller: { select: { userId: true } } } } },
      },
    },
  });
  if (!order?.delivery || order.fulfillmentType !== OrderFulfillmentType.DELIVERY) return;

  let deliveryStatus: DeliveryStatus | null = null;
  if (input.status === OrderStatus.READY_FOR_SHIPMENT) {
    deliveryStatus = DeliveryStatus.READY_FOR_PICKUP;
  } else if (input.status === OrderStatus.SHIPPED) {
    deliveryStatus = DeliveryStatus.PICKED_UP;
  } else if (input.status === OrderStatus.IN_TRANSIT) {
    deliveryStatus = DeliveryStatus.IN_TRANSIT;
  } else if (input.status === OrderStatus.ARRIVED) {
    deliveryStatus = DeliveryStatus.AT_PICKUP_POINT;
  } else if (input.status === OrderStatus.DELIVERED) {
    deliveryStatus = DeliveryStatus.DELIVERED;
  }

  if (!deliveryStatus) return;

  await prisma.delivery.update({
    where: { id: order.delivery.id },
    data: {
      status: deliveryStatus,
      ...(deliveryStatus === DeliveryStatus.DELIVERED
        ? { deliveredAt: new Date() }
        : {}),
      ...(deliveryStatus === DeliveryStatus.PICKED_UP ||
      deliveryStatus === DeliveryStatus.IN_TRANSIT
        ? { shippedAt: order.delivery.shippedAt ?? new Date() }
        : {}),
    },
  });

  trackDeliveryStatusChanged(order.id);

  if (deliveryStatus === DeliveryStatus.DELIVERED) {
    if (isMarketplaceTrustLoopEnabled()) {
      await prisma.order.update({
        where: { id: order.id },
        data: { reviewEligibleAt: new Date() },
      });
    }
    trackDeliveryCompleted(order.id);
    const sellerUserId = order.items[0]?.product.seller.userId;
    if (sellerUserId) {
      await notifySellerDeliveryCompleted({
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerUserId,
      });
    }
  }

  if (
    input.status === OrderStatus.AWAITING_SELLER_CONFIRMATION &&
    input.previousStatus === OrderStatus.NEW
  ) {
    const sellerUserId = order.items[0]?.product.seller.userId;
    if (sellerUserId) {
      await notifySellerNewOrderToShip({
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerUserId,
      });
    }
  }
}

export async function applyDeliveryTrackingUpdate(input: {
  orderId: string;
  snapshot: {
    status: DeliveryStatus;
    rawStatus?: string | null;
    trackingNumber: string;
    trackingUrl?: string | null;
  };
  actorUserId?: string | null;
}): Promise<void> {
  if (!isMarketplaceDeliveryEnabled()) return;

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { delivery: true },
  });
  if (!order?.delivery) return;

  await prisma.delivery.update({
    where: { id: order.delivery.id },
    data: {
      status: input.snapshot.status,
      trackingNumber: input.snapshot.trackingNumber,
      trackingUrl: input.snapshot.trackingUrl ?? order.delivery.trackingUrl,
      externalStatus: input.snapshot.rawStatus ?? null,
      ...(input.snapshot.status === DeliveryStatus.DELIVERED
        ? { deliveredAt: new Date() }
        : {}),
    },
  });

  trackDeliveryStatusChanged(order.id);

  const suggested = mapDeliveryStatusToOrderStatus(input.snapshot.status);
  if (suggested && suggested !== order.status) {
    await transitionOrderWithEffects({
      orderId: order.id,
      toStatus: suggested,
      actorRole: OrderActorRole.SYSTEM,
      actorUserId: input.actorUserId ?? null,
      reason: "Обновление статуса доставки",
    });
  }

  await notifyBuyerDeliveryStatus({
    orderId: order.id,
    orderNumber: order.orderNumber,
    buyerUserId: order.userId,
    deliveryStatus: input.snapshot.status,
  });

  if (input.snapshot.status === DeliveryStatus.DELIVERED) {
    trackDeliveryCompleted(order.id);
  }
}

export async function notifyShipmentCreatedForOrder(input: {
  orderId: string;
  orderNumber: string;
  sellerUserId: string;
  buyerUserId: string;
  trackingNumber: string;
}): Promise<void> {
  await notifySellerShipmentCreated({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    sellerUserId: input.sellerUserId,
    trackingNumber: input.trackingNumber,
  });
  await notifyBuyerDeliveryStatus({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    buyerUserId: input.buyerUserId,
    deliveryStatus: DeliveryStatus.IN_TRANSIT,
  });
}
