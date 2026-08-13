import {
  DisputeReason,
  DisputeStatus,
  FinanceTransactionStatus,
  OrderActorRole,
  OrderStatus,
} from "@prisma/client";

import { transitionOrderWithEffects } from "@/features/order-lifecycle/lib/transition";
import { refundTransaction } from "@/lib/finance/transaction";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/track-server";
import { ROUTES } from "@/lib/constants";
import { TrustError } from "@/lib/trust/errors";
import type { AdminDisputeRow, DisputeDto } from "@/lib/trust/types";
import { DISPUTE_REASON_LABELS } from "@/lib/trust/types";
import { prisma } from "@/lib/prisma";
import { BuyerOrderConfirmationStatus } from "@prisma/client";

function mapDispute(row: {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string | null;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DisputeDto {
  return {
    id: row.id,
    orderId: row.orderId,
    buyerId: row.buyerId,
    sellerId: row.sellerId,
    openedBy: row.openedBy,
    reason: row.reason,
    description: row.description,
    status: row.status,
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveSellerIdForOrder(orderId: string): Promise<string> {
  const item = await prisma.orderItem.findFirst({
    where: { orderId },
    select: { product: { select: { sellerId: true } } },
  });
  if (!item?.product.sellerId) {
    throw new TrustError("NOT_FOUND", "Продавец заказа не найден");
  }
  return item.product.sellerId;
}

async function markFinanceDisputed(orderId: string): Promise<void> {
  await prisma.financeTransaction.updateMany({
    where: {
      orderId,
      status: {
        in: [
          FinanceTransactionStatus.PAID,
          FinanceTransactionStatus.HELD,
          FinanceTransactionStatus.RELEASED,
        ],
      },
    },
    data: { status: FinanceTransactionStatus.DISPUTED },
  });
}

export async function openBuyerDispute(input: {
  orderId: string;
  buyerUserId: string;
  reason: DisputeReason;
  description?: string;
}): Promise<DisputeDto> {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.buyerUserId },
    select: { id: true, status: true },
  });

  if (!order) {
    throw new TrustError("NOT_FOUND", "Заказ не найден");
  }

  const allowedStatuses: OrderStatus[] = [
    OrderStatus.AWAITING_BUYER_CONFIRMATION,
    OrderStatus.PROTECTION_PERIOD,
    OrderStatus.DELIVERED,
    OrderStatus.PICKED_UP,
  ];

  if (!allowedStatuses.includes(order.status)) {
    throw new TrustError(
      "INVALID_STATE",
      "Спор можно открыть только после доставки",
    );
  }

  const existing = await prisma.dispute.findFirst({
    where: {
      orderId: input.orderId,
      status: { in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] },
    },
  });
  if (existing) {
    throw new TrustError("INVALID_STATE", "Спор уже открыт");
  }

  const sellerId = await resolveSellerIdForOrder(input.orderId);
  const now = new Date();

  const dispute = await prisma.$transaction(async (tx) => {
    await tx.buyerOrderConfirmation.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        buyerId: input.buyerUserId,
        status: BuyerOrderConfirmationStatus.REPORTED_ISSUE,
        confirmedAt: now,
      },
      update: {
        status: BuyerOrderConfirmationStatus.REPORTED_ISSUE,
        confirmedAt: now,
      },
    });

    return tx.dispute.create({
      data: {
        orderId: input.orderId,
        buyerId: input.buyerUserId,
        sellerId,
        openedBy: input.buyerUserId,
        reason: input.reason,
        description: input.description?.trim() || null,
        status: DisputeStatus.OPEN,
      },
    });
  });

  await markFinanceDisputed(input.orderId);

  await transitionOrderWithEffects({
    orderId: input.orderId,
    toStatus: OrderStatus.DISPUTE_OPEN,
    actorUserId: input.buyerUserId,
    actorRole: OrderActorRole.BUYER,
    reason: DISPUTE_REASON_LABELS[input.reason],
  });

  void trackServerEvent({
    event: ANALYTICS_EVENTS.DISPUTE_CREATED,
    route: `${ROUTES.ORDERS}/${input.orderId}`,
    entityId: input.orderId,
  });

  return mapDispute(dispute);
}

export async function resolveDisputeForBuyer(
  disputeId: string,
  adminUserId: string,
  resolution?: string,
): Promise<DisputeDto> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { order: { select: { id: true, status: true } } },
  });

  if (!dispute) {
    throw new TrustError("NOT_FOUND", "Спор не найден");
  }

  if (
    dispute.status !== DisputeStatus.OPEN &&
    dispute.status !== DisputeStatus.UNDER_REVIEW
  ) {
    throw new TrustError("INVALID_STATE", "Спор уже закрыт");
  }

  const txRow = await prisma.financeTransaction.findUnique({
    where: { orderId: dispute.orderId },
  });

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: DisputeStatus.REFUNDED,
        resolution: resolution?.trim() || "Решение в пользу покупателя",
      },
    });

    if (txRow) {
      await refundTransaction(txRow.id, tx);
    }

    return row;
  });

  if (dispute.order.status !== OrderStatus.REFUNDED) {
    await transitionOrderWithEffects({
      orderId: dispute.orderId,
      toStatus: OrderStatus.REFUNDED,
      actorUserId: adminUserId,
      actorRole: OrderActorRole.ADMIN,
      reason: "Спор решён в пользу покупателя",
    });
  }

  void trackServerEvent({
    event: ANALYTICS_EVENTS.DISPUTE_RESOLVED,
    route: ROUTES.ADMIN_DISPUTES,
    entityId: dispute.orderId,
  });

  return mapDispute(updated);
}

export async function resolveDisputeForSeller(
  disputeId: string,
  adminUserId: string,
  resolution?: string,
): Promise<DisputeDto> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { order: { select: { id: true, status: true } } },
  });

  if (!dispute) {
    throw new TrustError("NOT_FOUND", "Спор не найден");
  }

  if (
    dispute.status !== DisputeStatus.OPEN &&
    dispute.status !== DisputeStatus.UNDER_REVIEW
  ) {
    throw new TrustError("INVALID_STATE", "Спор уже закрыт");
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: DisputeStatus.SELLER_WON,
      resolution: resolution?.trim() || "Решение в пользу продавца",
    },
  });

  if (dispute.order.status !== OrderStatus.COMPLETED) {
    await transitionOrderWithEffects({
      orderId: dispute.orderId,
      toStatus: OrderStatus.COMPLETED,
      actorUserId: adminUserId,
      actorRole: OrderActorRole.ADMIN,
      reason: "Спор решён в пользу продавца",
    });
  }

  void trackServerEvent({
    event: ANALYTICS_EVENTS.DISPUTE_RESOLVED,
    route: ROUTES.ADMIN_DISPUTES,
    entityId: dispute.orderId,
  });

  return mapDispute(updated);
}

export async function listAdminDisputes(filter?: {
  status?: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "ALL";
}): Promise<AdminDisputeRow[]> {
  const statusFilter = filter?.status ?? "ALL";

  const where =
    statusFilter === "OPEN"
      ? { status: DisputeStatus.OPEN }
      : statusFilter === "UNDER_REVIEW"
        ? { status: DisputeStatus.UNDER_REVIEW }
        : statusFilter === "RESOLVED"
          ? {
              status: {
                in: [
                  DisputeStatus.BUYER_WON,
                  DisputeStatus.SELLER_WON,
                  DisputeStatus.REFUNDED,
                ],
              },
            }
          : {};

  const rows = await prisma.dispute.findMany({
    where,
    include: {
      order: {
        select: {
          orderNumber: true,
          items: {
            take: 1,
            select: { productName: true },
          },
        },
      },
      buyer: { select: { email: true } },
      seller: { select: { storeName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    buyerEmail: row.buyer.email,
    sellerName: row.seller.storeName,
    productName: row.order.items[0]?.productName ?? "—",
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getDisputeDetail(disputeId: string) {
  const row = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: {
        include: {
          statusHistory: { orderBy: { createdAt: "asc" }, take: 20 },
          items: { take: 3, select: { productName: true, quantity: true } },
        },
      },
      buyer: { select: { email: true, name: true } },
      seller: { select: { storeName: true } },
    },
  });
  if (!row) return null;

  return {
    dispute: mapDispute(row),
    orderNumber: row.order.orderNumber,
    buyerEmail: row.buyer.email,
    buyerName: row.buyer.name,
    sellerName: row.seller.storeName,
    items: row.order.items,
    history: row.order.statusHistory.map((h) => ({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export async function getActiveDisputeForOrder(
  orderId: string,
): Promise<DisputeDto | null> {
  const row = await prisma.dispute.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  return row ? mapDispute(row) : null;
}
