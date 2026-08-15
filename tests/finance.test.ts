import { FinanceTransactionStatus, Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  calculateCommission,
  DEFAULT_COMMISSION_PERCENT,
  FinanceForbiddenError,
  assertSellerOwnsBalance,
} from "@/lib/finance";
import {
  createTransaction,
  getTransactionByOrderId,
  holdFunds,
  markPaid,
  releaseFunds,
} from "@/lib/finance/transaction";
import { prisma } from "@/lib/prisma";

describe("commission calculation", () => {
  it("uses category percent when provided", () => {
    const result = calculateCommission({ grossAmount: 10_000 }, 8);
    expect(result.commissionAmount).toBe(800);
    expect(result.sellerAmount).toBe(9200);
    expect(result.commissionPercent).toBe(8);
  });

  it("falls back to default percent", () => {
    const result = calculateCommission({ grossAmount: 1000 });
    expect(result.commissionPercent).toBe(DEFAULT_COMMISSION_PERCENT);
    expect(result.commissionAmount).toBe(100);
    expect(result.sellerAmount).toBe(900);
  });

  it("rounds to two decimals", () => {
    const result = calculateCommission({ grossAmount: 999.99 }, 8);
    expect(result.commissionAmount).toBe(80);
    expect(result.sellerAmount).toBe(919.99);
  });
});

describe("finance permissions", () => {
  it("rejects cross-seller balance access", async () => {
    await expect(assertSellerOwnsBalance("seller-a", "seller-b")).rejects.toBeInstanceOf(
      FinanceForbiddenError,
    );
  });
});

describe("transaction lifecycle integration", () => {
  it.skip("creates HELD transaction and updates seller pending balance", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true, userId: true },
    });
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: {
        sellerId: seller?.id,
        status: "ACTIVE",
        categoryId: { not: null },
      },
      select: { id: true, name: true, sellerId: true },
    });

    if (!seller || !buyer || !product) {
      return;
    }

    const marker = `finance-test-${Date.now()}`;
    const total = 2500;

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: buyer.id,
          orderNumber: `FT${Date.now()}`,
          status: "NEW",
          subtotal: new Prisma.Decimal(total.toFixed(2)),
          shippingCost: new Prisma.Decimal("0"),
          total: new Prisma.Decimal(total.toFixed(2)),
          currency: "RUB",
          items: {
            create: {
              productId: product.id,
              productName: marker,
              unitPrice: new Prisma.Decimal(total.toFixed(2)),
              quantity: 1,
              totalPrice: new Prisma.Decimal(total.toFixed(2)),
            },
          },
        },
      });
      return created;
    });

    try {
      const txRow = await createTransaction(order.id);
      expect(txRow.status).toBe(FinanceTransactionStatus.PENDING);

      const paid = await markPaid(txRow.id);
      expect(paid.status).toBe(FinanceTransactionStatus.PAID);

      const held = await holdFunds(paid.id);
      expect(held.status).toBe(FinanceTransactionStatus.HELD);
      expect(held.grossAmount).toBe(total);

      const balance = await prisma.sellerBalance.findUnique({
        where: { sellerId: product.sellerId },
      });
      expect(balance).not.toBeNull();
      expect(Number(balance!.pendingAmount)).toBeGreaterThanOrEqual(held.sellerAmount);

      const released = await releaseFunds(held.id);
      expect(released.status).toBe(FinanceTransactionStatus.RELEASED);

      const after = await getTransactionByOrderId(order.id);
      expect(after?.status).toBe(FinanceTransactionStatus.RELEASED);
    } finally {
      await prisma.financeTransaction.deleteMany({ where: { orderId: order.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
      await prisma.order.delete({ where: { id: order.id } });
    }
  });
});
