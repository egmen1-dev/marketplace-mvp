import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  GROWTH_WEIGHTS,
  calculateSellerGrowthScore,
  growthLevelLabel,
  resolveGrowthLevel,
} from "@/lib/seller-growth/growth-score";
import { generateSellerInsights } from "@/lib/seller-growth/insights";
import {
  assertSellerGrowthAccess,
  getSellerGrowthDashboard,
} from "@/lib/seller-growth/queries";
import { generateSellerActions } from "@/lib/seller-growth/recommendations";
import type { SellerProductHealthRow } from "@/lib/seller-growth/seller-health";
import { PromotionForbiddenError } from "@/lib/promotion/permissions";
import { prisma } from "@/lib/prisma";

const PREV_GROWTH = process.env.SELLER_GROWTH_ENABLED;

const sampleProduct = (
  overrides: Partial<SellerProductHealthRow> = {},
): SellerProductHealthRow => ({
  id: "prod-1",
  name: "Перфоратор Bosch",
  price: 12_990,
  stock: 5,
  views: 150,
  status: "ACTIVE",
  categoryId: "cat-1",
  qualityScore: 75,
  ready: true,
  blockers: [],
  isPromoted: false,
  orderCount: 2,
  addToCart: 12,
  productViews: 150,
  ...overrides,
});

describe("SellerGrowthScore", () => {
  it("sums weighted factors to 0-100", () => {
    const totalWeight = Object.values(GROWTH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(totalWeight).toBe(100);
  });

  it("calculates strong seller profile", () => {
    const score = calculateSellerGrowthScore({
      avgQualityScore: 85,
      catalogCompletenessRatio: 0.8,
      conversionRate: 18,
      promotionUsageRatio: 0.5,
      salesVelocityScore: 70,
      customerTrustScore: 90,
      inventoryHealthRatio: 0.9,
    });
    expect(score).toBeGreaterThanOrEqual(50);
    expect(resolveGrowthLevel(score)).toBe("GROWING");
    expect(growthLevelLabel("GROWING")).toContain("растущий");
  });

  it("marks low activity as NEEDS_ATTENTION", () => {
    const score = calculateSellerGrowthScore({
      avgQualityScore: 30,
      catalogCompletenessRatio: 0.2,
      conversionRate: 0,
      promotionUsageRatio: 0,
      salesVelocityScore: 5,
      customerTrustScore: 40,
      inventoryHealthRatio: 0.3,
    });
    expect(score).toBeLessThan(50);
    expect(resolveGrowthLevel(score)).toBe("NEEDS_ATTENTION");
  });
});

describe("seller growth insights and actions", () => {
  it("detects conversion problem insight", () => {
    const insights = generateSellerInsights([
      sampleProduct({ addToCart: 0, productViews: 20, orderCount: 0 }),
    ]);
    expect(
      insights.some((i) => i.title.includes("смотрят товар, но не покупают")),
    ).toBe(true);
  });

  it("generates improve photo action", () => {
    const product = sampleProduct({
      blockers: ["Добавьте хотя бы одно фото"],
      ready: false,
    });
    const actions = generateSellerActions([product]);
    expect(actions.some((a) => a.type === "IMPROVE_PRODUCT")).toBe(true);
  });
});

describe("seller growth permissions and dashboard", () => {
  beforeEach(() => {
    process.env.SELLER_GROWTH_ENABLED = "true";
  });

  afterEach(() => {
    process.env.SELLER_GROWTH_ENABLED = PREV_GROWTH;
  });

  it("loads dashboard for seller with products", async () => {
    const seller = await prisma.sellerProfile.findFirst({
      select: { id: true },
      where: { products: { some: {} } },
    });
    if (!seller) return;

    const dashboard = await getSellerGrowthDashboard(seller.id);
    expect(dashboard).not.toBeNull();
    expect(dashboard!.score.score).toBeGreaterThanOrEqual(0);
    expect(dashboard!.score.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(dashboard!.insights)).toBe(true);
  });

  it("rejects cross-seller growth access", async () => {
    const sellers = await prisma.sellerProfile.findMany({
      select: { id: true },
      take: 2,
    });
    if (sellers.length < 2) return;

    await expect(
      assertSellerGrowthAccess(sellers[0].id, sellers[1].id),
    ).rejects.toBeInstanceOf(PromotionForbiddenError);
  });

  it("returns null dashboard when flag disabled", async () => {
    process.env.SELLER_GROWTH_ENABLED = "false";
    const seller = await prisma.sellerProfile.findFirst({ select: { id: true } });
    if (!seller) return;
    expect(await getSellerGrowthDashboard(seller.id)).toBeNull();
  });
});
