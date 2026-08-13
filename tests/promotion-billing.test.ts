import { PromotionOrderStatus } from "@prisma/client";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  resolvePromotionPeriod,
} from "@/lib/promotion/billing/orders";
import {
  calculatePromotionEndDate,
  DEFAULT_PROMOTION_PLANS,
  formatPromotionPeriodLabel,
} from "@/lib/promotion/billing/plans";
import { finalizePaidPromotionOrder } from "@/lib/promotion/billing/finalize";
import {
  assertSellerOwnsProduct,
  PromotionForbiddenError,
} from "@/lib/promotion/permissions";
import { prisma } from "@/lib/prisma";

const PREV_BILLING = process.env.PROMOTION_BILLING_ENABLED;

describe("promotion billing plans", () => {
  it("defines starter, growth, boost tariffs", () => {
    expect(DEFAULT_PROMOTION_PLANS).toEqual([
      { name: "STARTER", durationDays: 7, price: 990 },
      { name: "GROWTH", durationDays: 14, price: 1790 },
      { name: "BOOST", durationDays: 30, price: 2990 },
    ]);
    expect(formatPromotionPeriodLabel(7)).toBe("7 дней");
    expect(formatPromotionPeriodLabel(14)).toBe("14 дней");
  });

  it("calculates end date from duration", () => {
    const start = new Date("2026-08-13T12:00:00.000Z");
    const end = calculatePromotionEndDate(start, 7);
    expect(end.toISOString()).toBe("2026-08-20T12:00:00.000Z");
  });

  it("extends active period from existing end date", () => {
    const now = new Date("2026-08-13T12:00:00.000Z");
    const existingEnd = new Date("2026-08-20T12:00:00.000Z");
    const period = resolvePromotionPeriod({
      now,
      plan: {
        id: "plan_starter",
        name: "STARTER",
        durationDays: 7,
        price: 990,
        active: true,
      },
      existingEnd,
    });
    expect(period.startedAt.toISOString()).toBe(existingEnd.toISOString());
    expect(period.endedAt.toISOString()).toBe("2026-08-27T12:00:00.000Z");
  });
});

describe("promotion billing permissions", () => {
  it("rejects cross-seller promotion purchase target", async () => {
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    const foreignProduct = await prisma.product.findFirst({
      where: seller ? { sellerId: { not: seller.id } } : undefined,
      select: { id: true },
    });
    if (!seller || !foreignProduct) return;

    await expect(
      assertSellerOwnsProduct(seller.id, foreignProduct.id),
    ).rejects.toBeInstanceOf(PromotionForbiddenError);
  });
});

describe("promotion billing lifecycle", () => {
  beforeEach(() => {
    process.env.PROMOTION_BILLING_ENABLED = "true";
  });

  afterEach(() => {
    process.env.PROMOTION_BILLING_ENABLED = PREV_BILLING;
  });

  it("activates campaign and order after finalize", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
      where: { products: { some: { status: "ACTIVE" } } },
    });
    const product = await prisma.product.findFirst({
      where: { sellerId: seller?.id, status: "ACTIVE" },
      select: { id: true },
    });
    const plan = await prisma.promotionPlan.findFirst({
      where: { name: "STARTER" },
      select: { id: true, price: true },
    });
    if (!seller || !product || !plan) return;

    await prisma.promotionOrder.deleteMany({ where: { productId: product.id } });
    await prisma.promotionPlacement.deleteMany({ where: { productId: product.id } });
    await prisma.promotionCampaign.deleteMany({ where: { productId: product.id } });

    const order = await prisma.promotionOrder.create({
      data: {
        sellerId: seller.id,
        productId: product.id,
        planId: plan.id,
        amount: plan.price,
        status: PromotionOrderStatus.PAYMENT_PENDING,
      },
    });

    try {
      const result = await finalizePaidPromotionOrder({
        promotionOrderId: order.id,
        paidAmount: 990,
        currency: "rub",
      });
      expect(result.alreadyPaid).toBe(false);

      const updated = await prisma.promotionOrder.findUnique({
        where: { id: order.id },
      });
      expect(updated?.status).toBe(PromotionOrderStatus.ACTIVE);
      expect(updated?.campaignId).toBeTruthy();
      const campaign = await prisma.promotionCampaign.findUnique({
        where: { id: updated!.campaignId! },
      });
      expect(campaign?.status).toBe("STARTED");
      expect(updated?.startedAt).toBeTruthy();
      expect(updated?.endedAt).toBeTruthy();
    } finally {
      await prisma.promotionOrder.deleteMany({ where: { id: order.id } });
      await prisma.promotionPlacement.deleteMany({
        where: { productId: product.id },
      });
      await prisma.promotionCampaign.deleteMany({
        where: { productId: product.id },
      });
    }
  });
});
