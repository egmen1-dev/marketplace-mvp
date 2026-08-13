import {
  BuyerOrderConfirmationStatus,
  OrderActorRole,
  OrderStatus,
} from "@prisma/client";

import { transitionOrderWithEffects } from "@/features/order-lifecycle/lib/transition";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { TrustError } from "@/lib/trust/errors";
import {
  computeProtectionEndsAt,
  getProtectionPolicy,
} from "@/lib/trust/policy";
import type { BuyerOrderConfirmationDto } from "@/lib/trust/types";
import { prisma } from "@/lib/prisma";

const BUYER_CONFIRM_STATUSES = new Set<OrderStatus>([
  OrderStatus.AWAITING_BUYER_CONFIRMATION,
  OrderStatus.PROTECTION_PERIOD,
  OrderStatus.DELIVERED,
  OrderStatus.PICKED_UP,
]);

function mapConfirmation(row: {
  id: string;
  orderId: string;
  buyerId: string;
  status: BuyerOrderConfirmationStatus;
  confirmedAt: Date | null;
  createdAt: Date;
}): BuyerOrderConfirmationDto {
  return {
    id: row.id,
    orderId: row.orderId,
    buyerId: row.buyerId,
    status: row.status,
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadBuyerOrder(orderId: string, buyerUserId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: buyerUserId },
    select: {
      id: true,
      status: true,
      userId: true,
      protectionEndsAt: true,
    },
  });
  if (!order) {
    throw new TrustError("NOT_FOUND", "Заказ не найден");
  }
  return order;
}

/** After seller marks DELIVERED/PICKED_UP — enter buyer protection window. */
export async function enterBuyerProtectionPeriod(
  orderId: string,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, protectionEndsAt: true },
  });
  if (!order) return;

  if (
    order.status !== OrderStatus.DELIVERED &&
    order.status !== OrderStatus.PICKED_UP
  ) {
    return;
  }

  const policy = await getProtectionPolicy();
  const protectionEndsAt =
    order.protectionEndsAt ??
    computeProtectionEndsAt(new Date(), policy.defaultProtectionDays);

  await prisma.order.update({
    where: { id: orderId },
    data: { protectionEndsAt },
  });

  await transitionOrderWithEffects({
    orderId,
    toStatus: OrderStatus.AWAITING_BUYER_CONFIRMATION,
    actorRole: OrderActorRole.SYSTEM,
    reason: "Период защиты покупателя",
    silent: true,
  });
}

export async function confirmBuyerOrder(
  orderId: string,
  buyerUserId: string,
): Promise<BuyerOrderConfirmationDto> {
  const order = await loadBuyerOrder(orderId, buyerUserId);

  if (!BUYER_CONFIRM_STATUSES.has(order.status)) {
    throw new TrustError(
      "INVALID_STATE",
      "Подтверждение доступно после доставки заказа",
    );
  }

  if (
    order.status === OrderStatus.DELIVERED ||
    order.status === OrderStatus.PICKED_UP
  ) {
    await enterBuyerProtectionPeriod(orderId);
  }

  const now = new Date();

  const confirmation = await prisma.buyerOrderConfirmation.upsert({
    where: { orderId },
    create: {
      orderId,
      buyerId: buyerUserId,
      status: BuyerOrderConfirmationStatus.CONFIRMED,
      confirmedAt: now,
    },
    update: {
      status: BuyerOrderConfirmationStatus.CONFIRMED,
      confirmedAt: now,
    },
  });

  await transitionOrderWithEffects({
    orderId,
    toStatus: OrderStatus.COMPLETED,
    actorUserId: buyerUserId,
    actorRole: OrderActorRole.BUYER,
    reason: "Покупатель подтвердил получение",
  });

  void trackServerEvent({
    event: ANALYTICS_EVENTS.ORDER_CONFIRMED,
    route: `${ROUTES.ORDERS}/${orderId}`,
    entityId: orderId,
  });

  return mapConfirmation(confirmation);
}

/** System auto-confirm when protection window expires. */
export async function autoConfirmBuyerOrder(
  orderId: string,
): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      protectionEndsAt: true,
    },
  });

  if (!order) return false;
  if (order.status !== OrderStatus.AWAITING_BUYER_CONFIRMATION) return false;
  if (!order.protectionEndsAt || order.protectionEndsAt > new Date()) {
    return false;
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.buyerOrderConfirmation.upsert({
      where: { orderId },
      create: {
        orderId,
        buyerId: order.userId,
        status: BuyerOrderConfirmationStatus.CONFIRMED,
        confirmedAt: now,
      },
      update: {
        status: BuyerOrderConfirmationStatus.CONFIRMED,
        confirmedAt: now,
      },
    });
  });

  await transitionOrderWithEffects({
    orderId,
    toStatus: OrderStatus.COMPLETED,
    actorRole: OrderActorRole.SYSTEM,
    reason: "Автоподтверждение после периода защиты",
  });

  return true;
}

export async function getBuyerConfirmation(
  orderId: string,
): Promise<BuyerOrderConfirmationDto | null> {
  const row = await prisma.buyerOrderConfirmation.findUnique({
    where: { orderId },
  });
  return row ? mapConfirmation(row) : null;
}
