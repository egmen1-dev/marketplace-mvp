import {
  DisputeReason,
  DisputeStatus,
  FinanceTransactionStatus,
  OrderActorRole,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  canTransition,
  normalizeOrderStatus,
} from "@/features/order-lifecycle/lib/state-machine";
import { OrderFulfillmentType } from "@prisma/client";
import {
  createTransaction,
  holdFunds,
  markPaid,
} from "@/lib/finance/transaction";
import {
  confirmBuyerOrder,
  enterBuyerProtectionPeriod,
  openBuyerDispute,
  processExpiredProtectionWindows,
  resolveDisputeForBuyer,
  resolveDisputeForSeller,
} from "@/lib/trust";
import { prisma } from "@/lib/prisma";

async function createTestOrder(opts: {
  buyerId: string;
  sellerId: string;
  productId: string;
  marker: string;
  total?: number;
}) {
  const total = opts.total ?? 3000;
  return prisma.order.create({
    data: {
      userId: opts.buyerId,
      orderNumber: `TR${Date.now()}${Math.random().toString(36).slice(2, 5)}`,
      status: OrderStatus.NEW,
      subtotal: new Prisma.Decimal(total.toFixed(2)),
      shippingCost: new Prisma.Decimal("0"),
      total: new Prisma.Decimal(total.toFixed(2)),
      currency: "RUB",
      items: {
        create: {
          productId: opts.productId,
          productName: opts.marker,
          unitPrice: new Prisma.Decimal(total.toFixed(2)),
          quantity: 1,
          totalPrice: new Prisma.Decimal(total.toFixed(2)),
        },
      },
    },
  });
}

async function prepareHeldDeliveredOrder(orderId: string) {
  const txRow = await createTransaction(orderId);
  await markPaid(txRow.id);
  await holdFunds(txRow.id);
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.DELIVERED },
  });
  await enterBuyerProtectionPeriod(orderId);
}

describe("trust protection lifecycle", () => {
  it("allows buyer confirmation path after delivery", () => {
    expect(
      canTransition({
        from: OrderStatus.AWAITING_BUYER_CONFIRMATION,
        to: OrderStatus.COMPLETED,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.BUYER,
      }),
    ).toBe(true);
    expect(
      canTransition({
        from: OrderStatus.AWAITING_BUYER_CONFIRMATION,
        to: OrderStatus.DISPUTE_OPEN,
        fulfillmentType: OrderFulfillmentType.DELIVERY,
        actorRole: OrderActorRole.BUYER,
      }),
    ).toBe(true);
  });

  it("runs payment hold → delivery → confirmation → release", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
    });
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });

    if (!seller || !buyer || !product) return;

    const marker = `trust-happy-${Date.now()}`;
    const order = await createTestOrder({
      buyerId: buyer.id,
      sellerId: seller.id,
      productId: product.id,
      marker,
    });

    try {
      await prepareHeldDeliveredOrder(order.id);

      const afterDelivery = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(afterDelivery?.status).toBe(
        OrderStatus.AWAITING_BUYER_CONFIRMATION,
      );
      expect(afterDelivery?.protectionEndsAt).toBeTruthy();

      await confirmBuyerOrder(order.id, buyer.id);

      const finance = await prisma.financeTransaction.findUnique({
        where: { orderId: order.id },
      });
      expect(finance?.status).toBe(FinanceTransactionStatus.RELEASED);

      const completed = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(completed?.status).toBe(OrderStatus.COMPLETED);
    } finally {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => undefined);
    }
  });

  it("blocks release on dispute and refunds on buyer win", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
    });
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });

    if (!seller || !buyer || !admin || !product) return;

    const marker = `trust-dispute-${Date.now()}`;
    const order = await createTestOrder({
      buyerId: buyer.id,
      sellerId: seller.id,
      productId: product.id,
      marker,
    });

    try {
      await prepareHeldDeliveredOrder(order.id);

      const dispute = await openBuyerDispute({
        orderId: order.id,
        buyerUserId: buyer.id,
        reason: DisputeReason.NOT_AS_DESCRIBED,
        description: "Test dispute",
      });

      const held = await prisma.financeTransaction.findUnique({
        where: { orderId: order.id },
      });
      expect(held?.status).toBe(FinanceTransactionStatus.DISPUTED);

      await resolveDisputeForBuyer(dispute.id, admin.id);

      const refunded = await prisma.financeTransaction.findUnique({
        where: { orderId: order.id },
      });
      expect(refunded?.status).toBe(FinanceTransactionStatus.REFUNDED);

      const orderRow = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(orderRow?.status).toBe(OrderStatus.REFUNDED);
    } finally {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => undefined);
    }
  });

  it("releases funds when admin resolves for seller", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
    });
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    const admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });

    if (!seller || !buyer || !admin || !product) return;

    const marker = `trust-seller-win-${Date.now()}`;
    const order = await createTestOrder({
      buyerId: buyer.id,
      sellerId: seller.id,
      productId: product.id,
      marker,
    });

    try {
      await prepareHeldDeliveredOrder(order.id);

      const dispute = await openBuyerDispute({
        orderId: order.id,
        buyerUserId: buyer.id,
        reason: DisputeReason.WRONG_ITEM,
      });

      await resolveDisputeForSeller(dispute.id, admin.id);

      const finance = await prisma.financeTransaction.findUnique({
        where: { orderId: order.id },
      });
      expect(finance?.status).toBe(FinanceTransactionStatus.RELEASED);

      const resolved = await prisma.dispute.findUnique({
        where: { id: dispute.id },
      });
      expect(resolved?.status).toBe(DisputeStatus.SELLER_WON);
    } finally {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => undefined);
    }
  });

  it("auto-confirms expired protection windows via cron hook", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
    });
    const buyer = await prisma.user.findFirst({
      where: { role: "BUYER" },
      select: { id: true },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });

    if (!seller || !buyer || !product) return;

    const marker = `trust-auto-${Date.now()}`;
    const order = await createTestOrder({
      buyerId: buyer.id,
      sellerId: seller.id,
      productId: product.id,
      marker,
    });

    try {
      await prepareHeldDeliveredOrder(order.id);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          protectionEndsAt: new Date(Date.now() - 60_000),
        },
      });

      const result = await processExpiredProtectionWindows();
      expect(result.autoConfirmed).toBeGreaterThanOrEqual(1);

      const finance = await prisma.financeTransaction.findUnique({
        where: { orderId: order.id },
      });
      expect(finance?.status).toBe(FinanceTransactionStatus.RELEASED);
    } finally {
      await prisma.order.delete({ where: { id: order.id } }).catch(() => undefined);
    }
  });

  it("normalizes legacy PAID unchanged", () => {
    expect(normalizeOrderStatus(OrderStatus.PAID)).toBe(
      OrderStatus.AWAITING_SELLER_CONFIRMATION,
    );
  });
});
