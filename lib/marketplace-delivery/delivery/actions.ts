"use server";

import {
  DeliveryStatus,
  OrderActorRole,
  OrderFulfillmentType,
  OrderStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAdminSession, requireSellerCabinetAccess, requireUserSession } from "@/features/auth";
import { transitionOrderWithEffects } from "@/features/order-lifecycle/lib/transition";
import { prisma } from "@/lib/prisma";
import { ROUTES } from "@/lib/constants";

import { isMarketplaceDeliveryEnabled } from "../flags";
import {
  trackDeliveryCreated,
  trackDeliveryTrackingView,
  trackReturnCreated,
  trackShipmentCreated,
} from "../analytics";
import {
  applyDeliveryTrackingUpdate,
  notifyShipmentCreatedForOrder,
  syncDeliveryOnOrderTransition,
} from "./lifecycle";
import { assertAdminDeliveryAccess, assertBuyerDeliveryAccess } from "./permissions";
import { getMarketplaceDeliveryProvider } from "./providers-factory";
import { createReturnRequestFoundation } from "./queries";

export type DeliveryActionState = { ok: boolean; error?: string };

export async function createShipmentAction(
  orderId: string,
): Promise<DeliveryActionState> {
  if (!isMarketplaceDeliveryEnabled()) {
    return { ok: false, error: "MARKETPLACE_DELIVERY_ENABLED=false" };
  }

  const seller = await requireSellerCabinetAccess(ROUTES.ACCOUNT_ORDERS_SHIP);
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      fulfillmentType: OrderFulfillmentType.DELIVERY,
      items: { some: { product: { sellerId: seller.sellerProfileId } } },
    },
    include: {
      delivery: true,
      shippingAddress: true,
      user: { select: { id: true, name: true, phone: true } },
    },
  });

  if (!order?.delivery) {
    return { ok: false, error: "Заказ не найден" };
  }

  const shippable: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PROCESSING,
    OrderStatus.READY_FOR_SHIPMENT,
  ];
  if (!shippable.includes(order.status)) {
    return { ok: false, error: "Заказ не готов к отправке" };
  }

  if (order.delivery.trackingNumber) {
    return { ok: false, error: "Отправление уже создано" };
  }

  const provider = getMarketplaceDeliveryProvider();
  const shipment = await provider.createShipment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    method: order.delivery.method,
    pickupPointId: order.delivery.pickupPointId,
    recipientName: order.shippingAddress?.fullName ?? order.user.name ?? "Покупатель",
    recipientPhone: order.shippingAddress?.phone ?? order.user.phone,
    city: order.shippingAddress?.city ?? "",
    address:
      order.delivery.pickupAddress ??
      `${order.shippingAddress?.street ?? ""}, ${order.shippingAddress?.city ?? ""}`,
  });

  await prisma.delivery.update({
    where: { id: order.delivery.id },
    data: {
      status: shipment.status,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      externalId: shipment.externalId,
      shippedAt: new Date(),
    },
  });

  trackDeliveryCreated(order.id);
  trackShipmentCreated(order.id);

  await transitionOrderWithEffects({
    orderId: order.id,
    toStatus: OrderStatus.SHIPPED,
    actorRole: OrderActorRole.SELLER,
    actorUserId: seller.userId,
    reason: "Отправление создано",
  });

  await notifyShipmentCreatedForOrder({
    orderId: order.id,
    orderNumber: order.orderNumber,
    sellerUserId: seller.userId,
    buyerUserId: order.user.id,
    trackingNumber: shipment.trackingNumber,
  });

  revalidatePath(ROUTES.ACCOUNT_ORDERS_SHIP);
  revalidatePath(ROUTES.ACCOUNT_SALES);
  revalidatePath(`${ROUTES.ORDERS}/${order.id}`);

  return { ok: true };
}

export async function syncOrderTrackingAction(
  orderId: string,
): Promise<DeliveryActionState> {
  if (!isMarketplaceDeliveryEnabled()) {
    return { ok: false, error: "MARKETPLACE_DELIVERY_ENABLED=false" };
  }

  const user = await requireUserSession();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      delivery: true,
      items: {
        take: 1,
        select: { product: { select: { seller: { select: { userId: true } } } } },
      },
    },
  });
  if (!order?.delivery?.trackingNumber) {
    return { ok: false, error: "Трек-номер не найден" };
  }

  const isBuyer = order.userId === user.id;
  const isSeller = order.items[0]?.product.seller.userId === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isBuyer && !isSeller && !isAdmin) {
    return { ok: false, error: "Нет доступа" };
  }

  trackDeliveryTrackingView(order.id);
  const provider = getMarketplaceDeliveryProvider();
  const snapshot = await provider.getTracking(order.delivery.trackingNumber);
  if (!snapshot) {
    return { ok: false, error: "Статус недоступен" };
  }

  await applyDeliveryTrackingUpdate({
    orderId: order.id,
    snapshot,
    actorUserId: user.id,
  });

  revalidatePath(`${ROUTES.ORDERS}/${order.id}`);
  return { ok: true };
}

export async function createReturnRequestAction(input: {
  orderId: string;
  reason?: string;
}): Promise<DeliveryActionState & { returnId?: string }> {
  if (!isMarketplaceDeliveryEnabled()) {
    return { ok: false, error: "MARKETPLACE_DELIVERY_ENABLED=false" };
  }

  const user = await requireUserSession();
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: user.id },
    include: {
      items: { take: 1, select: { product: { select: { sellerId: true } } } },
    },
  });
  if (!order) return { ok: false, error: "Заказ не найден" };

  assertBuyerDeliveryAccess({ buyerId: order.userId, userId: user.id });

  const sellerId = order.items[0]?.product.sellerId;
  if (!sellerId) return { ok: false, error: "Продавец не найден" };

  const existing = await prisma.returnRequest.findFirst({
    where: { orderId: order.id, buyerId: user.id },
  });
  if (existing) return { ok: false, error: "Заявка уже создана" };

  const created = await createReturnRequestFoundation({
    orderId: order.id,
    buyerId: user.id,
    sellerId,
    reason: input.reason,
  });

  trackReturnCreated(created.id);
  revalidatePath(`${ROUTES.ORDERS}/${order.id}`);
  return { ok: true, returnId: created.id };
}

export async function adminSyncAllTrackingAction(): Promise<DeliveryActionState> {
  if (!isMarketplaceDeliveryEnabled()) {
    return { ok: false, error: "MARKETPLACE_DELIVERY_ENABLED=false" };
  }

  const admin = await requireAdminSession();
  assertAdminDeliveryAccess(admin.role);

  const deliveries = await prisma.delivery.findMany({
    where: {
      trackingNumber: { not: null },
      status: {
        notIn: [
          DeliveryStatus.DELIVERED,
          DeliveryStatus.CANCELLED,
          DeliveryStatus.FAILED,
        ],
      },
    },
    take: 20,
  });

  const provider = getMarketplaceDeliveryProvider();
  for (const delivery of deliveries) {
    if (!delivery.trackingNumber) continue;
    const snapshot = await provider.getTracking(delivery.trackingNumber);
    if (!snapshot) continue;
    await applyDeliveryTrackingUpdate({
      orderId: delivery.orderId,
      snapshot,
      actorUserId: admin.id,
    });
  }

  revalidatePath(ROUTES.ADMIN_DELIVERY);
  return { ok: true };
}

export { syncDeliveryOnOrderTransition };
