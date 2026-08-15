import {
  DisputeStatus,
  FinanceTransactionStatus,
  FinanceTransactionType,
  OrderStatus,
} from "@prisma/client";

import { computeSellerTrustScore } from "@/lib/trust-safety/trust-score";
import {
  deriveBuyerProtectionState,
  type BuyerProtectionState,
} from "@/lib/trust-safety/buyer-protection";
import type { DisputeReason } from "@/lib/trust-safety/disputes";
import { isOpenDisputeStatus } from "@/lib/trust-safety/disputes";
import { formatDateMoscow } from "@/lib/format/datetime";
import { prisma } from "@/lib/prisma";

export async function getOrderTrustContext(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payment: true,
      disputes: { orderBy: { createdAt: "desc" }, take: 5 },
      financeTransactions: { where: { type: FinanceTransactionType.SALE } },
    },
  });
  if (!order) return null;

  const openDispute = order.disputes.find((d) => isOpenDisputeStatus(d.status));
  const saleTx = order.financeTransactions[0];
  const protection = deriveBuyerProtectionState({
    orderStatus: order.status,
    paymentStatus: order.payment?.status ?? null,
    hasOpenDispute: Boolean(openDispute),
    fundsReleased: saleTx?.status === FinanceTransactionStatus.RELEASED,
  });

  return {
    orderId: order.id,
    orderStatus: order.status,
    protection,
    openDispute: openDispute ?? null,
    disputes: order.disputes,
  };
}

export async function getSellerTrustScoreForProfile(sellerId: string) {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      isVerified: true,
      createdAt: true,
      storeName: true,
    },
  });
  if (!seller) return null;

  const [completedOrders, disputesOpened] = await Promise.all([
    prisma.orderItem.count({
      where: {
        product: { sellerId },
        order: {
          status: {
            in: [
              OrderStatus.COMPLETED,
              OrderStatus.DELIVERED,
              OrderStatus.PICKED_UP,
            ],
          },
        },
      },
    }),
    prisma.dispute.count({
      where: {
        order: {
          items: { some: { product: { sellerId } } },
        },
      },
    }),
  ]);

  const ageDays = Math.floor(
    (Date.now() - seller.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const result = computeSellerTrustScore({
    ordersCompleted: completedOrders,
    disputesOpened,
    responseTimeHours: null,
    productQualityAvg: null,
    accountAgeDays: ageDays,
    isVerified: seller.isVerified,
  });

  return {
    sellerId: seller.id,
    storeName: seller.storeName,
    joinedAt: formatDateMoscow(seller.createdAt),
    ordersCompleted: completedOrders,
    ...result,
  };
}

export async function getAdminTrustDashboard() {
  const [activeDisputes, sellers, riskNewSellers] = await Promise.all([
    prisma.dispute.findMany({
      where: {
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW],
        },
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
            items: {
              take: 1,
              select: {
                product: {
                  select: {
                    seller: { select: { storeName: true, slug: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 40,
    }),
    prisma.sellerProfile.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storeName: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { products: true, reviews: true } },
      },
    }),
    prisma.sellerProfile.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        isVerified: false,
      },
    }),
  ]);

  return {
    activeDisputes: activeDisputes.map((d) => ({
      ...d,
      seller:
        d.order.items[0]?.product.seller ?? {
          storeName: "—",
          slug: "",
        },
      order: {
        orderNumber: d.order.orderNumber,
        status: d.order.status,
      },
    })),
    resolutionQueue: activeDisputes.filter(
      (d) =>
        d.status === DisputeStatus.UNDER_REVIEW ||
        d.status === DisputeStatus.OPEN,
    ),
    sellers,
    riskSignals: {
      openDisputeCount: activeDisputes.length,
      unverifiedNewSellers: riskNewSellers,
    },
  };
}

export async function createDispute(input: {
  orderId: string;
  buyerUserId: string;
  reason: DisputeReason;
  description?: string;
}) {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, userId: input.buyerUserId },
    include: {
      disputes: {
        where: {
          status: {
            in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW],
          },
        },
        take: 1,
      },
    },
  });
  if (!order) return { ok: false as const, error: "Заказ не найден" };
  if (order.disputes.length > 0) {
    return { ok: false as const, error: "По заказу уже есть открытый спор" };
  }

  const dispute = await prisma.dispute.create({
    data: {
      orderId: order.id,
      openedBy: input.buyerUserId,
      reason: input.reason,
      status: DisputeStatus.OPEN,
      resolution: input.description?.slice(0, 2000) ?? null,
    },
  });

  return { ok: true as const, disputeId: dispute.id };
}

export type { BuyerProtectionState };
