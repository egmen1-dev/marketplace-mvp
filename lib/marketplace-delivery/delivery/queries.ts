import {
  DeliveryStatus,
  OrderFulfillmentType,
  OrderStatus,
  ReturnRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { toPriceNumber } from "@/features/products/mappers";

import { isMarketplaceDeliveryEnabled } from "../flags";
import { buildBuyerDeliverySteps } from "./tracking";
import type {
  AdminDeliveryHealth,
  AdminShipmentRow,
  SellerShipQueueItem,
} from "./types";

const SHIP_STATUSES: OrderStatus[] = [
  OrderStatus.AWAITING_SELLER_CONFIRMATION,
  OrderStatus.CONFIRMED,
  OrderStatus.PROCESSING,
  OrderStatus.READY_FOR_SHIPMENT,
];

export async function listSellerShipQueue(
  sellerProfileId: string,
): Promise<SellerShipQueueItem[]> {
  if (!isMarketplaceDeliveryEnabled()) return [];

  const orders = await prisma.order.findMany({
    where: {
      fulfillmentType: OrderFulfillmentType.DELIVERY,
      status: { in: SHIP_STATUSES },
      items: { some: { product: { sellerId: sellerProfileId } } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: {
      user: { select: { name: true } },
      delivery: {
        select: {
          status: true,
          trackingNumber: true,
          pickupAddress: true,
        },
      },
    },
  });

  return orders.map((order) => ({
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: toPriceNumber(order.total),
    currency: order.currency,
    shipmentDeadline: order.shipmentDeadline?.toISOString() ?? null,
    pickupAddress: order.delivery?.pickupAddress ?? null,
    deliveryStatus: order.delivery?.status ?? null,
    trackingNumber: order.delivery?.trackingNumber ?? null,
    buyerName: order.user.name ?? "Покупатель",
    createdAt: order.createdAt.toISOString(),
  }));
}

export async function getBuyerDeliveryProgress(orderId: string, buyerId: string) {
  if (!isMarketplaceDeliveryEnabled()) return null;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: buyerId },
    include: { delivery: true },
  });
  if (!order) return null;

  const isPaid =
    order.status !== OrderStatus.NEW &&
    order.status !== OrderStatus.CANCELLED &&
    order.status !== OrderStatus.REJECTED;

  return {
    steps: buildBuyerDeliverySteps({
      orderStatus: order.status,
      deliveryStatus: order.delivery?.status ?? null,
      isPaid,
    }),
    trackingNumber: order.delivery?.trackingNumber ?? null,
    trackingUrl: order.delivery?.trackingUrl ?? null,
    deliveryStatus: order.delivery?.status ?? null,
  };
}

export async function getAdminDeliveryHealth(): Promise<AdminDeliveryHealth> {
  if (!isMarketplaceDeliveryEnabled()) {
    return { enabled: false, inTransit: 0, overdue: 0, problems: 0 };
  }

  const [inTransit, overdue, problems] = await Promise.all([
    prisma.delivery.count({
      where: {
        status: {
          in: [
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.AT_PICKUP_POINT,
          ],
        },
      },
    }),
    prisma.order.count({
      where: {
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        isOverdue: true,
        status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] },
      },
    }),
    prisma.delivery.count({
      where: { status: { in: [DeliveryStatus.FAILED, DeliveryStatus.CANCELLED] } },
    }),
  ]);

  return { enabled: true, inTransit, overdue, problems };
}

export async function listAdminShipments(limit = 50): Promise<AdminShipmentRow[]> {
  if (!isMarketplaceDeliveryEnabled()) return [];

  const rows = await prisma.delivery.findMany({
    where: { trackingNumber: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          items: {
            take: 1,
            select: {
              product: {
                select: { seller: { select: { storeName: true } } },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    orderId: row.order.id,
    orderNumber: row.order.orderNumber,
    sellerName: row.order.items[0]?.product.seller.storeName ?? "—",
    provider: row.provider,
    trackingNumber: row.trackingNumber,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function createReturnRequestFoundation(input: {
  orderId: string;
  buyerId: string;
  sellerId: string;
  reason?: string;
}) {
  return prisma.returnRequest.create({
    data: {
      orderId: input.orderId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      reason: input.reason?.trim() || null,
      status: ReturnRequestStatus.CREATED,
    },
  });
}

export async function getPdpDeliveryHint(input: {
  city: string | null;
  minDays?: number | null;
  maxDays?: number | null;
}): Promise<{ headline: string; subline: string } | null> {
  if (!isMarketplaceDeliveryEnabled()) return null;
  if (!input.city?.trim()) {
    return {
      headline: "Доставка СДЭК",
      subline: "Пункт выдачи рядом — укажите город при оформлении",
    };
  }
  const min = input.minDays ?? 1;
  const max = input.maxDays ?? 3;
  const headline = min <= 1 ? "Получите завтра" : `Доставка ${min}–${max} дн.`;
  return {
    headline,
    subline: "Пункт выдачи рядом",
  };
}
