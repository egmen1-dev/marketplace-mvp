import {
  FinanceTransactionStatus,
  FinanceTransactionType,
  Prisma,
} from "@prisma/client";

import {
  MARKETPLACE_COMMISSION_BPS,
  splitCommission,
} from "@/features/finance/lib/commission";
import { toPriceNumber } from "@/features/products/mappers";
import { log } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/**
 * After successful payment: create SALE FinanceTransaction(s) and credit
 * SellerBalance.pending. Idempotent per (orderId, sellerId, SALE).
 * Does not touch Order / Payment / inventory (OMS stays authoritative).
 */
export async function recordSaleForPaidOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { sellerId: true } },
        },
      },
    },
  });

  if (!order) {
    log.error("finance_order_not_found", { orderId });
    return;
  }

  const bySeller = new Map<string, number>();
  for (const item of order.items) {
    const sellerId = item.product.sellerId;
    const line = toPriceNumber(item.totalPrice);
    bySeller.set(sellerId, (bySeller.get(sellerId) ?? 0) + line);
  }

  if (bySeller.size === 0) {
    log.warn("finance_order_no_sellers", { orderId });
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const [sellerId, grossMajor] of bySeller) {
      const existing = await tx.financeTransaction.findUnique({
        where: {
          orderId_sellerId_type: {
            orderId,
            sellerId,
            type: FinanceTransactionType.SALE,
          },
        },
      });
      if (existing) continue;

      const split = splitCommission(grossMajor, MARKETPLACE_COMMISSION_BPS);

      await tx.financeTransaction.create({
        data: {
          orderId,
          sellerId,
          type: FinanceTransactionType.SALE,
          status: FinanceTransactionStatus.PENDING,
          grossAmount: split.gross,
          commissionAmount: split.commission,
          sellerAmount: split.sellerAmount,
          currency: order.currency,
          commissionBps: split.commissionBps,
        },
      });

      await tx.sellerBalance.upsert({
        where: { sellerId },
        create: {
          sellerId,
          pendingAmount: split.sellerAmount,
          availableAmount: new Prisma.Decimal(0),
          currency: order.currency,
        },
        update: {
          pendingAmount: { increment: split.sellerAmount },
        },
      });

      log.info("finance_sale_recorded", {
        orderId,
        sellerId,
        gross: split.gross.toString(),
        commission: split.commission.toString(),
        sellerAmount: split.sellerAmount.toString(),
      });
    }
  });
}

/**
 * When order reaches COMPLETED: move SALE sellerAmount from pending → available.
 * Idempotent via RELEASE transaction row.
 */
export async function releaseSellerFundsOnOrderCompleted(
  orderId: string,
): Promise<void> {
  const sales = await prisma.financeTransaction.findMany({
    where: {
      orderId,
      type: FinanceTransactionType.SALE,
      status: FinanceTransactionStatus.PENDING,
    },
  });

  if (sales.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const sale of sales) {
      const existingRelease = await tx.financeTransaction.findUnique({
        where: {
          orderId_sellerId_type: {
            orderId,
            sellerId: sale.sellerId,
            type: FinanceTransactionType.RELEASE,
          },
        },
      });
      if (existingRelease) continue;

      await tx.financeTransaction.create({
        data: {
          orderId,
          sellerId: sale.sellerId,
          type: FinanceTransactionType.RELEASE,
          status: FinanceTransactionStatus.AVAILABLE,
          grossAmount: sale.grossAmount,
          commissionAmount: sale.commissionAmount,
          sellerAmount: sale.sellerAmount,
          currency: sale.currency,
          commissionBps: sale.commissionBps,
        },
      });

      await tx.financeTransaction.update({
        where: { id: sale.id },
        data: { status: FinanceTransactionStatus.AVAILABLE },
      });

      const balance = await tx.sellerBalance.findUnique({
        where: { sellerId: sale.sellerId },
      });
      if (!balance) continue;

      const pending = toPriceNumber(balance.pendingAmount);
      const release = toPriceNumber(sale.sellerAmount);
      const nextPending = Math.max(0, pending - release);

      await tx.sellerBalance.update({
        where: { sellerId: sale.sellerId },
        data: {
          pendingAmount: new Prisma.Decimal(nextPending.toFixed(2)),
          availableAmount: { increment: sale.sellerAmount },
        },
      });

      log.info("finance_funds_released", {
        orderId,
        sellerId: sale.sellerId,
        sellerAmount: sale.sellerAmount.toString(),
      });
    }
  });
}
