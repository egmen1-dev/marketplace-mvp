import { ProductStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  evaluatePromotionReadiness,
  PROMOTION_MIN_QUALITY_SCORE,
} from "@/lib/promotion/readiness";
import { isPromotionActive } from "@/lib/promotion/permissions";
import { PromotionCampaignStatus } from "@prisma/client";

describe("promotion readiness", () => {
  const readySource = {
    status: ProductStatus.ACTIVE,
    stock: 5,
    price: 1990,
    title: "Дрель ударная Bosch Professional 750W",
    description: "Мощная дрель для дома и работы",
    productTypeId: "type-1",
    categoryId: "cat-1",
    imageCount: 2,
    sellerId: "seller-1",
    sellerBlocked: false,
    sellerVerified: true,
    requiredCharacteristicCount: 2,
    filledRequiredCharacteristicCount: 2,
    characteristicCount: 3,
  };

  it("marks ready when ad eligibility and quality pass", () => {
    const result = evaluatePromotionReadiness(readySource);
    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.qualityScore).toBeGreaterThanOrEqual(
      PROMOTION_MIN_QUALITY_SCORE,
    );
  });

  it("blocks promotion without photo", () => {
    const result = evaluatePromotionReadiness({
      ...readySource,
      imageCount: 0,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("фото"))).toBe(true);
  });

  it("blocks promotion without stock", () => {
    const result = evaluatePromotionReadiness({
      ...readySource,
      stock: 0,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers.some((b) => b.includes("остат"))).toBe(true);
  });

  it("blocks promotion when required characteristics missing", () => {
    const result = evaluatePromotionReadiness({
      ...readySource,
      filledRequiredCharacteristicCount: 0,
      requiredCharacteristicCount: 3,
    });
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain("Заполните обязательные характеристики");
  });
});

describe("promotion lifecycle helpers", () => {
  it("treats only STARTED as active promotion", () => {
    expect(isPromotionActive(PromotionCampaignStatus.STARTED)).toBe(true);
    expect(isPromotionActive(PromotionCampaignStatus.PAUSED)).toBe(false);
    expect(isPromotionActive(PromotionCampaignStatus.ENDED)).toBe(false);
    expect(isPromotionActive(null)).toBe(false);
  });
});

describe("promotion permissions integration", () => {
  it("rejects cross-seller product access", async () => {
    const { assertSellerOwnsProduct, PromotionForbiddenError } = await import(
      "@/lib/promotion/permissions"
    );
    if (!process.env.DATABASE_URL) {
      return;
    }
    const { prisma } = await import("@/lib/prisma");
    const foreign = await prisma.product.findFirst({
      select: { id: true, sellerId: true },
    });
    if (!foreign) return;
    await expect(
      assertSellerOwnsProduct("non-existent-seller", foreign.id),
    ).rejects.toBeInstanceOf(PromotionForbiddenError);
  });
});

describe("promotion lifecycle integration", () => {
  it("starts and pauses campaign for seller-owned active product", async () => {
    if (!process.env.DATABASE_URL) return;

    const { prisma } = await import("@/lib/prisma");
    const {
      pausePromotionCampaign,
      startPromotionCampaign,
    } = await import("@/lib/promotion/lifecycle");

    const product = await prisma.product.findFirst({
      where: { status: ProductStatus.ACTIVE, stock: { gt: 0 } },
      include: {
        images: { take: 1 },
        productType: {
          select: {
            characteristics: { where: { required: true }, select: { id: true } },
          },
        },
        characteristicValues: true,
        seller: { select: { isBlocked: true } },
      },
    });
    if (!product || product.images.length === 0 || !product.productTypeId) {
      return;
    }

    await prisma.promotionCampaign.deleteMany({
      where: { productId: product.id },
    });

    const started = await startPromotionCampaign(product.sellerId, product.id);
    expect(started.status).toBe(PromotionCampaignStatus.STARTED);

    const paused = await pausePromotionCampaign(product.sellerId, product.id);
    expect(paused.status).toBe(PromotionCampaignStatus.PAUSED);

    await prisma.promotionCampaign.deleteMany({
      where: { productId: product.id },
    });
  });
});
