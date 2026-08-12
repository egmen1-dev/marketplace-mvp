import { ProductStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  AD_ELIGIBILITY_REASONS,
  adEligibilityFixChecklist,
  buildCategoryAdsReport,
  buildProductAdSnapshot,
  computeCardQualityScore,
  evaluateProductAdvertisingEligibility,
} from "@/lib/product-advertising";

describe("product advertising eligibility", () => {
  const readyBase = {
    status: ProductStatus.ACTIVE,
    stock: 5,
    price: 1990,
    productTypeId: "pt_1",
    imageCount: 2,
    sellerId: "seller_1",
    sellerBlocked: false,
  };

  it("marks fully valid product as eligible", () => {
    const result = evaluateProductAdvertisingEligibility(readyBase);
    expect(result).toEqual({ eligible: true, reasons: [] });
  });

  it("returns multiple blockers", () => {
    const result = evaluateProductAdvertisingEligibility({
      status: ProductStatus.DRAFT,
      stock: 0,
      price: 0,
      productTypeId: null,
      imageCount: 0,
      sellerId: null,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.NOT_ACTIVE);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.NO_STOCK);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.NO_IMAGE);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.NO_PRICE);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.NO_PRODUCT_TYPE);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.NO_SELLER);
  });

  it("flags blocked seller", () => {
    const result = evaluateProductAdvertisingEligibility({
      ...readyBase,
      sellerBlocked: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(AD_ELIGIBILITY_REASONS.SELLER_BLOCKED);
  });

  it("builds seller fix checklist without duplicates", () => {
    const hints = adEligibilityFixChecklist([
      AD_ELIGIBILITY_REASONS.NO_IMAGE,
      AD_ELIGIBILITY_REASONS.NO_STOCK,
    ]);
    expect(hints.length).toBe(2);
    expect(hints[0]).toContain("фото");
  });

  it("Product A — ACTIVE with stock, photo, type, seller → READY", () => {
    const productA = evaluateProductAdvertisingEligibility({
      status: ProductStatus.ACTIVE,
      stock: 12,
      price: 4990,
      productTypeId: "pt_drill",
      imageCount: 3,
      sellerId: "seller_tools_pro",
      sellerBlocked: false,
    });
    expect(productA).toEqual({ eligible: true, reasons: [] });
  });

  it("Product B — no photo → BLOCKED with NO_IMAGE", () => {
    const productB = evaluateProductAdvertisingEligibility({
      status: ProductStatus.ACTIVE,
      stock: 5,
      price: 1990,
      productTypeId: "pt_lamp",
      imageCount: 0,
      sellerId: "seller_home",
      sellerBlocked: false,
    });
    expect(productB.eligible).toBe(false);
    expect(productB.reasons).toEqual([AD_ELIGIBILITY_REASONS.NO_IMAGE]);
  });
});

describe("card quality score", () => {
  it("scores a strong listing near 100", () => {
    const breakdown = computeCardQualityScore({
      imageCount: 4,
      titleLength: 32,
      hasCategory: true,
      hasProductType: true,
      characteristicCount: 5,
      requiredCharacteristicCount: 4,
      filledRequiredCharacteristicCount: 4,
      descriptionLength: 200,
      stock: 12,
      sellerVerified: true,
      sellerBlocked: false,
      sellerCompletedOrders: 10,
    });
    expect(breakdown.score).toBeGreaterThanOrEqual(90);
    expect(breakdown.photo).toBe(25);
  });

  it("scores empty listing low", () => {
    const breakdown = computeCardQualityScore({
      imageCount: 0,
      titleLength: 2,
      hasCategory: false,
      hasProductType: false,
      characteristicCount: 0,
      requiredCharacteristicCount: 0,
      filledRequiredCharacteristicCount: 0,
      descriptionLength: 0,
      stock: 0,
      sellerVerified: false,
      sellerBlocked: false,
      sellerCompletedOrders: 0,
    });
    expect(breakdown.score).toBeLessThan(20);
  });

  it("does not affect ranking — snapshot is advisory only", () => {
    const snapshot = buildProductAdSnapshot({
      status: ProductStatus.ACTIVE,
      stock: 1,
      price: 500,
      title: "Test",
      productTypeId: "pt",
      categoryId: "cat",
      imageCount: 1,
      sellerId: "s1",
    });
    expect(snapshot.quality.score).toBeGreaterThan(0);
    expect(snapshot.eligibility.eligible).toBe(true);
  });
});

describe("category ads report", () => {
  it("aggregates readiness by top-level slug", () => {
    const rows = buildCategoryAdsReport(
      [
        {
          status: ProductStatus.ACTIVE,
          stock: 3,
          price: 1000,
          title: "Hammer",
          productTypeId: "pt",
          categoryId: "c1",
          imageCount: 1,
          sellerId: "s1",
          topLevelSlug: "tools",
          categorySlug: "hand-tools",
          categoryName: "Hand tools",
        },
        {
          status: ProductStatus.DRAFT,
          stock: 0,
          price: 100,
          title: "Draft",
          productTypeId: null,
          categoryId: null,
          imageCount: 0,
          sellerId: "s1",
          topLevelSlug: "tools",
          categorySlug: null,
          categoryName: null,
        },
      ],
      { tools: "Инструменты" },
    );
    const tools = rows.find((r) => r.slug === "tools");
    expect(tools?.totalProducts).toBe(2);
    expect(tools?.readyCount).toBe(1);
    expect(tools?.blockedCount).toBe(1);
    expect(tools?.readinessPct).toBe(50);
  });
});
