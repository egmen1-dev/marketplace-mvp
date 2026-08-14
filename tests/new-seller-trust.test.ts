import { describe, expect, it, afterEach } from "vitest";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  buildBuyerProtectionLines,
  buildFirstBuyerExperienceLines,
  buildFirstReviewPrompt,
  buildSellerCoach,
  buildTrustProgressSteps,
  formatDaysAgoLabel,
  isMarketplaceNewSellerTrustEnabled,
  isNewSellerStatus,
  NEW_SELLER_TRUST_SCORE,
  productHasQualityCard,
  resolveTrustTier,
  shouldShowVerifiedBadge,
} from "@/lib/marketplace-new-seller-trust";
import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";

const PREV = process.env.MARKETPLACE_NEW_SELLER_TRUST_ENABLED;

const emptyMetrics: SellerMetricsInput = {
  products: [{ imageCount: 1, hasPrimary: true, characteristicCount: 0, descriptionLength: 0 }],
  completedOrders: 0,
  cancelledBySeller: 0,
  problematicOrders: 0,
  shippingHoursSamples: [],
  averageReviewRating: 0,
  reviewsCount: 0,
  activeProducts: 1,
  recentProductUpdates: 0,
  phoneVerified: false,
  paymentVerified: false,
  isVerified: false,
};

describe("new seller trust flag", () => {
  afterEach(() => {
    if (PREV === undefined) delete process.env.MARKETPLACE_NEW_SELLER_TRUST_ENABLED;
    else process.env.MARKETPLACE_NEW_SELLER_TRUST_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_NEW_SELLER_TRUST_ENABLED;
    expect(isMarketplaceNewSellerTrustEnabled()).toBe(false);
  });
});

describe("trust tiers", () => {
  it("starts at new seller tier", () => {
    expect(resolveTrustTier({ trustScore: NEW_SELLER_TRUST_SCORE, completedOrders: 0 }).id).toBe(
      "new_seller",
    );
  });

  it("promotes to developing after 10 orders", () => {
    expect(resolveTrustTier({ trustScore: 75, completedOrders: 10 }).id).toBe("developing");
  });

  it("promotes to reliable after 50 deliveries", () => {
    expect(resolveTrustTier({ trustScore: 80, completedOrders: 50 }).id).toBe("reliable");
  });

  it("promotes to high trust at 90+ score with history", () => {
    expect(resolveTrustTier({ trustScore: 92, completedOrders: 10 }).id).toBe("high_trust");
  });
});

describe("new seller status", () => {
  it("detects sellers without sales history", () => {
    expect(isNewSellerStatus({ completedOrders: 0, reviewsCount: 0 })).toBe(true);
    expect(isNewSellerStatus({ completedOrders: 9, reviewsCount: 4 })).toBe(true);
    expect(isNewSellerStatus({ completedOrders: 10, reviewsCount: 0 })).toBe(false);
  });

  it("formats joined labels", () => {
    expect(formatDaysAgoLabel(0)).toBe("сегодня");
    expect(formatDaysAgoLabel(1)).toBe("1 день назад");
    expect(formatDaysAgoLabel(15)).toBe("15 дней назад");
  });
});

describe("verified badge gating", () => {
  it("hides verified badge for new sellers without orders when enabled", () => {
    expect(
      shouldShowVerifiedBadge({
        isVerified: true,
        completedOrders: 0,
        newSellerTrustEnabled: true,
      }),
    ).toBe(false);
  });

  it("shows verified badge after first order when enabled", () => {
    expect(
      shouldShowVerifiedBadge({
        isVerified: true,
        completedOrders: 1,
        newSellerTrustEnabled: true,
      }),
    ).toBe(true);
  });
});

describe("trust progress path", () => {
  it("tracks onboarding milestones", () => {
    const steps = buildTrustProgressSteps({
      ...emptyMetrics,
      phoneVerified: true,
      isVerified: true,
      products: [{ imageCount: 3, hasPrimary: true, characteristicCount: 0, descriptionLength: 20 }],
    });

    expect(steps.map((s) => s.done)).toEqual([true, true, false, false, false]);
    expect(steps.map((s) => s.label)).toContain("Получите первый заказ");
  });
});

describe("seller coach", () => {
  it("lists remaining items until developing tier", () => {
    const coach = buildSellerCoach({
      ...emptyMetrics,
      products: [{ imageCount: 1, hasPrimary: true, characteristicCount: 0, descriptionLength: 0 }],
    });

    expect(coach?.nextLevelLabel).toBe("Развивается");
    expect(coach?.items).toEqual([
      { label: "заказ", remaining: 1 },
      { label: "фото товара", remaining: 3 },
      { label: "отзыв", remaining: 1 },
    ]);
  });

  it("returns null after enough orders", () => {
    expect(buildSellerCoach({ ...emptyMetrics, completedOrders: 10 })).toBeNull();
  });
});

describe("buyer copy", () => {
  it("builds first buyer experience lines", () => {
    const lines = buildFirstBuyerExperienceLines({
      metrics: { ...emptyMetrics, isVerified: true },
      productHasQualityCard: true,
    });

    expect(lines[0]).toContain("начинает работу");
    expect(lines).toContain("✓ подтверждён аккаунт");
    expect(lines).toContain("✓ товар проверен");
    expect(lines).toContain("✓ доставка через ЛОТ");
  });

  it("builds buyer protection lines", () => {
    expect(buildBuyerProtectionLines()).toEqual([
      "✓ Оплата через ЛОТ",
      "✓ Отслеживание доставки",
      "✓ Возможность оставить отзыв",
    ]);
  });

  it("builds first review prompt", () => {
    expect(buildFirstReviewPrompt("Кроссовки")).toContain("первый покупатель");
    expect(buildFirstReviewPrompt("Кроссовки")).toContain("Кроссовки");
  });

  it("detects quality product cards", () => {
    expect(
      productHasQualityCard({ imageCount: 1, hasPrimary: true, descriptionLength: 20 }),
    ).toBe(true);
    expect(
      productHasQualityCard({ imageCount: 0, hasPrimary: false, descriptionLength: 0 }),
    ).toBe(false);
  });
});

describe("analytics events", () => {
  it("defines new seller trust events", () => {
    expect(ANALYTICS_EVENTS.NEW_SELLER_STARTED).toBe("new_seller_started");
    expect(ANALYTICS_EVENTS.FIRST_ORDER_COMPLETED).toBe("first_order_completed");
    expect(ANALYTICS_EVENTS.FIRST_REVIEW_RECEIVED).toBe("first_review_received");
    expect(ANALYTICS_EVENTS.BUYER_NEW_SELLER_PURCHASE).toBe("buyer_new_seller_purchase");
    expect(ANALYTICS_EVENTS.TRUST_LEVEL_REACHED).toBe("trust_level_reached");
  });
});
