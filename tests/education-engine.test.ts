import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { buildSellerOnboardingChecklist } from "@/lib/marketplace-education/checklists";
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
import { explainQualityScore } from "@/lib/marketplace-education/progress";
import {
  buildEducationTooltips,
  productFormTips,
  tooltipById,
} from "@/lib/marketplace-education/tooltips";
import { computeProductCompletenessScore } from "@/lib/conversion/completeness";

const PREV_FLAG = process.env.MARKETPLACE_EDUCATION_ENABLED;

describe("buildEducationGuides", () => {
  it("includes seller first sale and buyer safe purchase guides", () => {
    const guides = buildEducationGuides();
    expect(guides.some((g) => g.id === "guide-seller-first-sale")).toBe(true);
    expect(guides.some((g) => g.id === "guide-buyer-safe-purchase")).toBe(true);
    expect(guides.find((g) => g.id === "guide-seller-first-sale")?.steps).toHaveLength(
      5,
    );
  });

  it("filters guides by target", () => {
    const guides = buildEducationGuides();
    const sellerGuides = guidesForTarget(guides, "SELLER");
    expect(sellerGuides.every((g) => g.target === "SELLER")).toBe(true);
  });

  it("resolves onboarding guide by context", () => {
    const guides = buildEducationGuides();
    const onboarding = guideByContext(guides, "ONBOARDING");
    expect(onboarding?.context).toBe("ONBOARDING");
  });
});

describe("buildEducationTooltips", () => {
  it("includes quality and promotion tooltips", () => {
    const tooltips = buildEducationTooltips();
    expect(tooltipById(tooltips, "tooltip-quality-score")).not.toBeNull();
    expect(tooltipById(tooltips, "tooltip-promotion")?.body).toContain(
      "не гарантирует",
    );
  });

  it("provides product form contextual tips", () => {
    const tips = productFormTips();
    expect(tips.find((t) => t.field === "title")?.good).toContain("18В");
  });
});

describe("explainQualityScore", () => {
  it("breaks down score with why and fix hints", () => {
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
    expect(explanation.score).toBe(result.score);
    expect(explanation.factors.find((f) => f.key === "photos")?.fixHint).toContain(
      "фото",
    );
  });
});

describe("buildSellerOnboardingChecklist", () => {
  it("marks completed steps from signals", () => {
    const checklist = buildSellerOnboardingChecklist({
      hasProduct: true,
      hasPhotos: true,
      hasCharacteristics: false,
      hasStockConfigured: false,
      hasPromotion: false,
    });
    expect(checklist.completedCount).toBe(2);
    expect(checklist.items[0].completed).toBe(true);
    expect(checklist.items[2].completed).toBe(false);
  });
});

describe("permissions", () => {
  it("allows admin education access", () => {
    expect(() => assertMarketplaceEducationAccess("ADMIN")).not.toThrow();
  });

  it("denies seller from admin education", () => {
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
