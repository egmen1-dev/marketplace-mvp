import { PromotionOrderStatus } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import type { AdminPromotionBillingSummary } from "@/lib/promotion/billing/types";
import {
  countActivePaidCampaigns,
} from "@/lib/promotion/billing/orders";
import { prisma } from "@/lib/prisma";

const PAID_STATUSES: PromotionOrderStatus[] = [
  PromotionOrderStatus.PAID,
  PromotionOrderStatus.ACTIVE,
  PromotionOrderStatus.ENDED,
];

export async function getAdminPromotionBillingSummary(): Promise<AdminPromotionBillingSummary> {
  const [aggregate, paidOrders, activePaidCampaigns] = await Promise.all([
    prisma.promotionOrder.aggregate({
      where: { status: { in: PAID_STATUSES } },
      _sum: { amount: true },
    }),
    prisma.promotionOrder.count({
      where: { status: { in: PAID_STATUSES } },
    }),
    countActivePaidCampaigns(),
  ]);

  return {
    totalRevenue: aggregate._sum.amount
      ? toPriceNumber(aggregate._sum.amount)
      : 0,
    paidOrders,
    activePaidCampaigns,
  };
}

export async function listRecentPaidPromotionOrders(limit = 20) {
  const rows = await prisma.promotionOrder.findMany({
    where: { status: { in: PAID_STATUSES } },
    include: {
      plan: { select: { name: true, durationDays: true } },
      product: { select: { id: true, name: true } },
      seller: { select: { storeName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    productTitle: row.product.name,
    sellerName: row.seller.storeName,
    planName: row.plan.name,
    durationDays: row.plan.durationDays,
    amount: toPriceNumber(row.amount),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
  }));
}
