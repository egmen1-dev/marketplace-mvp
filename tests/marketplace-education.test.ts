import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  buildSellerOnboardingChecklist,
  guideToContent,
} from "@/lib/marketplace-education/checklists";
import { ProductStatus } from "@prisma/client";

import { buildSellerCoachMessage } from "@/lib/marketplace-education/coach";
import {
  buildEducationGuides,
  guideByContext,
  guidesForTarget,
} from "@/lib/marketplace-education/guides";
import {
  assertMarketplaceEducationAccess,
  assertSellerEducationView,
  MarketplaceEducationForbiddenError,
} from "@/lib/marketplace-education/permissions";
import {
  buildEducationContentRegistry,
  selectEducationContent,
} from "@/lib/marketplace-education/queries";
import {
  buildEducationTooltips,
  productFormTips,
  selectEducationContent as selectFromTooltips,
  tooltipById,
} from "@/lib/marketplace-education/tooltips";
import { computeProductCompletenessScore } from "@/lib/conversion/completeness";
import { explainQualityScore } from "@/lib/marketplace-education/coach";

const PREV_FLAG = process.env.MARKETPLACE_EDUCATION_ENABLED;

describe("EducationContent registry", () => {
  it("builds unified content from guides, tooltips, checklists, coach", () => {
    const content = buildEducationContentRegistry();
    expect(content.some((c) => c.type === "GUIDE")).toBe(true);
    expect(content.some((c) => c.type === "TOOLTIP")).toBe(true);
    expect(content.some((c) => c.type === "CHECKLIST")).toBe(true);
    expect(content.some((c) => c.type === "COACH_MESSAGE")).toBe(true);
  });

  it("selects enabled seller onboarding content by context", () => {
    const content = buildEducationContentRegistry();
    const selected = selectEducationContent(content, {
      audience: "SELLER",
      context: "ONBOARDING",
    });
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.every((c) => c.enabled)).toBe(true);
  });

  it("maps guide to EducationContent", () => {
    const guide = buildEducationGuides()[0];
    const mapped = guideToContent(guide);
    expect(mapped.type).toBe("GUIDE");
    expect(mapped.audience).toBe("SELLER");
  });
});

describe("buildEducationGuides", () => {
  it("includes seller onboarding with five steps", () => {
    const guides = buildEducationGuides();
    const seller = guides.find((g) => g.id === "guide-seller-first-sale");
    expect(seller?.steps).toHaveLength(5);
    expect(seller?.steps[4].title).toContain("продаж");
  });

  it("filters guides by target", () => {
    const guides = buildEducationGuides();
    expect(guidesForTarget(guides, "BUYER").every((g) => g.target === "BUYER")).toBe(
      true,
    );
  });

  it("resolves guide by context", () => {
    const guides = buildEducationGuides();
    expect(guideByContext(guides, "ONBOARDING")?.context).toBe("ONBOARDING");
  });
});

describe("tooltips and product coach tips", () => {
  it("includes growth and quality tooltips", () => {
    const tooltips = buildEducationTooltips();
    expect(tooltipById(tooltips, "tooltip-growth-score")).not.toBeNull();
    expect(tooltipById(tooltips, "tooltip-quality-score")).not.toBeNull();
  });

  it("selects tooltips via content selector", () => {
    const content = buildEducationContentRegistry().filter(
      (c) => c.type === "TOOLTIP",
    );
    const selected = selectFromTooltips(content, { type: "TOOLTIP", context: "GROWTH" });
    expect(selected.length).toBeGreaterThan(0);
  });

  it("provides product form coaching copy", () => {
    const tips = productFormTips();
    expect(tips.find((t) => t.field === "title")?.good).toContain("18В");
  });
});

describe("quality score explanation", () => {
  it("includes good, improve and next action", () => {
    const result = computeProductCompletenessScore({
      photoCount: 1,
      titleLength: 5,
      descriptionLength: 0,
      characteristicCount: 0,
      hasCategory: false,
      price: 0,
      hasSeller: true,
    });
    const explanation = explainQualityScore(result);
    const photos = explanation.factors.find((f) => f.key === "photos");
    expect(photos?.improvePoints.length).toBeGreaterThan(0);
    expect(photos?.nextAction).toBeTruthy();
  });
});

describe("seller AI coach", () => {
  it("builds metrics-based analysis", () => {
    const coach = buildSellerCoachMessage({
      sellerProfileId: "s1",
      health: {
        sellerId: "s1",
        productCount: 1,
        activeProductCount: 1,
        products: [
          {
            id: "p1",
            name: "Дрель",
            price: 5000,
            stock: 5,
            views: 120,
            status: ProductStatus.ACTIVE,
            categoryId: "c1",
            qualityScore: 72,
            ready: true,
            blockers: [],
            isPromoted: false,
            orderCount: 0,
            addToCart: 2,
            productViews: 120,
          },
        ],
        growthInput: {
          avgQualityScore: 72,
          catalogCompletenessRatio: 0.5,
          conversionRate: 10,
          promotionUsageRatio: 0,
          salesVelocityScore: 0,
          customerTrustScore: 50,
          inventoryHealthRatio: 1,
        },
        isVerified: true,
        isBlocked: false,
        sellerRating: 4,
        recentOrderCount: 0,
        daysSinceLastOrder: null,
      },
    });

    expect(coach.headline).toBe("Ваш AI помощник");
    expect(coach.metrics?.views).toBe(120);
    expect(coach.analysis).toContain("довер");
    expect(coach.steps.length).toBeGreaterThan(0);
  });
});

describe("onboarding checklist", () => {
  it("tracks first sale as final step", () => {
    const checklist = buildSellerOnboardingChecklist({
      hasProduct: true,
      hasPhotos: true,
      hasCharacteristics: true,
      hasStockConfigured: true,
      hasFirstSale: false,
    });
    expect(checklist.items[4].title).toContain("продаж");
    expect(checklist.completedCount).toBe(4);
  });
});

describe("permissions", () => {
  it("allows admin education access", () => {
    expect(() => assertMarketplaceEducationAccess("ADMIN")).not.toThrow();
  });

  it("denies seller from admin CMS", () => {
    expect(() => assertMarketplaceEducationAccess("SELLER")).toThrow(
      MarketplaceEducationForbiddenError,
    );
  });

  it("allows seller education view", () => {
    expect(() => assertSellerEducationView("SELLER")).not.toThrow();
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_EDUCATION_ENABLED = "true";
  });
  afterEach(() => {
    process.env.MARKETPLACE_EDUCATION_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isMarketplaceEducationEnabled } = await import(
      "@/lib/marketplace-education/flags"
    );
    expect(isMarketplaceEducationEnabled()).toBe(true);
  });
});
