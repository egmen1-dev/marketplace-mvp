import {
  ProductStatus,
  PromotionCampaignStatus,
  PromotionSurfaceType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertSellerOwnsProduct,
  DEFAULT_CAMPAIGN_PLACEMENTS,
  getPromotionBoostSignals,
  PromotionForbiddenError,
  SELLER_SURFACE_LABELS,
} from "@/lib/promotion";
import {
  activatePlacementsForCampaign,
  deactivatePlacementsForCampaign,
  listPlacementsForCampaign,
} from "@/lib/promotion/placements";
import {
  pausePromotionCampaign,
  startPromotionCampaign,
} from "@/lib/promotion/lifecycle";

describe("promotion surfaces", () => {
  it("defines all surface types with seller labels", () => {
    for (const spec of DEFAULT_CAMPAIGN_PLACEMENTS) {
      expect(SELLER_SURFACE_LABELS[spec.surface]).toBeTruthy();
    }
    expect(DEFAULT_CAMPAIGN_PLACEMENTS.map((s) => s.surface)).toEqual([
      PromotionSurfaceType.HOME_FEATURED,
      PromotionSurfaceType.CATALOG_TOP,
      PromotionSurfaceType.CATEGORY_TOP,
      PromotionSurfaceType.SEARCH_BOOST,
    ]);
  });
});

describe("promotion placement lifecycle", () => {
  it("creates active placements on campaign start and deactivates on pause", async () => {
    if (!process.env.DATABASE_URL) return;

    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findFirst({
      where: {
        status: ProductStatus.ACTIVE,
        stock: { gt: 0 },
        productTypeId: { not: null },
        images: { some: {} },
      },
      include: {
        productType: {
          select: {
            characteristics: { where: { required: true }, select: { id: true } },
          },
        },
        characteristicValues: true,
      },
    });
    if (!product) return;

    const requiredIds = new Set(
      product.productType?.characteristics.map((c) => c.id) ?? [],
    );
    const filledRequired = product.characteristicValues.filter((cv) => {
      if (!requiredIds.has(cv.definitionId)) return false;
      if (cv.valueText?.trim()) return true;
      if (cv.valueNumber != null) return true;
      if (cv.valueBoolean != null) return true;
      if (cv.valueJson != null) return true;
      return false;
    }).length;
    if (requiredIds.size > 0 && filledRequired < requiredIds.size) {
      return;
    }

    await prisma.promotionCampaign.deleteMany({
      where: { productId: product.id },
    });

    const started = await startPromotionCampaign(product.sellerId, product.id);
    expect(started.status).toBe(PromotionCampaignStatus.STARTED);

    const placements = await listPlacementsForCampaign(started.id);
    expect(placements.length).toBe(DEFAULT_CAMPAIGN_PLACEMENTS.length);
    expect(placements.every((p) => p.active)).toBe(true);

    await pausePromotionCampaign(product.sellerId, product.id);
    const pausedPlacements = await listPlacementsForCampaign(started.id);
    expect(pausedPlacements.every((p) => !p.active)).toBe(true);

    await prisma.promotionPlacement.deleteMany({
      where: { campaignId: started.id },
    });
    await prisma.promotionCampaign.deleteMany({
      where: { productId: product.id },
    });
  });

  it("returns search boost signals without mutating search", async () => {
    const signals = await getPromotionBoostSignals();
    expect(Array.isArray(signals)).toBe(true);
    for (const signal of signals) {
      expect(signal.reason).toBe("PROMOTION");
      expect(signal.boostWeight).toBeGreaterThan(0);
      expect(signal.productId.length).toBeGreaterThan(0);
    }
  });
});

describe("promotion permissions", () => {
  it("rejects cross-seller placement management", async () => {
    if (!process.env.DATABASE_URL) return;
    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findFirst({
      select: { id: true },
    });
    if (!product) return;
    await expect(
      assertSellerOwnsProduct("foreign-seller", product.id),
    ).rejects.toBeInstanceOf(PromotionForbiddenError);
  });
});

describe("placement helpers", () => {
  it("activates and deactivates placements in transaction", async () => {
    if (!process.env.DATABASE_URL) return;
    const { prisma } = await import("@/lib/prisma");

    const campaign = await prisma.promotionCampaign.findFirst({
      include: { product: { select: { id: true } } },
    });
    if (!campaign) return;

    await prisma.$transaction(async (tx) => {
      await activatePlacementsForCampaign(
        campaign.id,
        campaign.productId,
        tx,
      );
      const active = await listPlacementsForCampaign(campaign.id, tx);
      expect(active.some((p) => p.active)).toBe(true);

      await deactivatePlacementsForCampaign(campaign.id, tx);
      const inactive = await listPlacementsForCampaign(campaign.id, tx);
      expect(inactive.every((p) => !p.active)).toBe(true);
    });
  });
});
