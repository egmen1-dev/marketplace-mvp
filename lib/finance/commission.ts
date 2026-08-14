import { Prisma } from "@prisma/client";

import { toPriceNumber } from "@/features/products/mappers";
import type { CommissionBreakdown } from "@/lib/finance/types";
import { prisma } from "@/lib/prisma";

/** Platform default when no category rule matches. */
export const DEFAULT_COMMISSION_PERCENT = 10;

export type CommissionOrderInput = {
  grossAmount: number;
  categoryId?: string | null;
};

/**
 * Pure commission calculation — category rule first, then default.
 */
export function calculateCommission(
  input: CommissionOrderInput,
  categoryPercent?: number | null,
  defaultPercent: number = DEFAULT_COMMISSION_PERCENT,
): CommissionBreakdown {
  const grossAmount = roundMoney(input.grossAmount);
  const commissionPercent =
    categoryPercent != null && categoryPercent >= 0
      ? categoryPercent
      : defaultPercent;
  const commissionAmount = roundMoney(
    (grossAmount * commissionPercent) / 100,
  );
  const sellerAmount = roundMoney(grossAmount - commissionAmount);

  return {
    grossAmount,
    commissionAmount,
    sellerAmount,
    commissionPercent,
  };
}

export async function resolveCommissionPercent(
  categoryId: string | null | undefined,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  if (categoryId) {
    const categoryRule = await tx.commissionRule.findFirst({
      where: { categoryId, active: true },
      select: { percentage: true },
    });
    if (categoryRule) {
      return toPriceNumber(categoryRule.percentage);
    }
  }

  const defaultRule = await tx.commissionRule.findFirst({
    where: { categoryId: null, active: true },
    select: { percentage: true },
  });

  return defaultRule
    ? toPriceNumber(defaultRule.percentage)
    : DEFAULT_COMMISSION_PERCENT;
}

/** Load order totals + primary category and compute commission split. */
export async function calculateCommissionForOrder(
  orderId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<CommissionBreakdown & { sellerId: string; buyerId: string }> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        take: 1,
        orderBy: { totalPrice: "desc" },
        select: {
          product: { select: { sellerId: true, categoryId: true } },
        },
      },
    },
  });

  if (!order || order.items.length === 0) {
    throw new Error(`Order ${orderId} not found or has no items`);
  }

  const primary = order.items[0]!.product;
  const categoryPercent = await resolveCommissionPercent(
    primary.categoryId,
    tx,
  );
  const breakdown = calculateCommission(
    { grossAmount: toPriceNumber(order.total), categoryId: primary.categoryId },
    categoryPercent,
  );

  return {
    ...breakdown,
    sellerId: primary.sellerId,
    buyerId: order.userId,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
