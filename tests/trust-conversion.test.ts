import { describe, expect, it, afterEach } from "vitest";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  buildAdminTrustLossInsights,
  buildSellerTrustFeedback,
} from "@/lib/marketplace-trust-conversion/seller-feedback";
import { buildBuyerDoubtSnapshot } from "@/lib/marketplace-trust-conversion/doubt-detection";
import { buildProductTrustExplanation } from "@/lib/marketplace-trust-conversion/product-explanation";
import { computeTrustImpactFromEvents } from "@/lib/marketplace-trust-conversion/correlation";
import { buildTrustConversionFunnel } from "@/lib/marketplace-trust-conversion/funnel";
import {
  getTrustExperimentFoundation,
  TRUST_EXPERIMENT_REGISTRY,
} from "@/lib/marketplace-trust-conversion/experiments";
import {
  resolvePdpTrustBlockOrder,
  NEW_SELLER_BLOCK_PRIORITY,
  EXPERIENCED_BLOCK_PRIORITY,
} from "@/lib/marketplace-trust-conversion/trust-order";
import { isMarketplaceTrustConversionEnabled } from "@/lib/marketplace-trust-conversion/flags";

const PREV = process.env.MARKETPLACE_TRUST_CONVERSION_ENABLED;

describe("trust conversion flag", () => {
  afterEach(() => {
    if (PREV === undefined) delete process.env.MARKETPLACE_TRUST_CONVERSION_ENABLED;
    else process.env.MARKETPLACE_TRUST_CONVERSION_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_TRUST_CONVERSION_ENABLED;
    expect(isMarketplaceTrustConversionEnabled()).toBe(false);
  });
});

describe("trust conversion funnel", () => {
  it("builds buyer path steps", () => {
    const steps = buildTrustConversionFunnel({
      counts: {
        product_view: 1000,
        trust_block_view: 700,
        trust_details_open: 200,
        add_to_cart: 120,
        purchase_complete: 42,
      },
      uniques: {
        product_view: 800,
        trust_block_view: 500,
        trust_details_open: 150,
        add_to_cart: 90,
        purchase_complete: 30,
      },
    });

    expect(steps[0]?.id).toBe("product");
    expect(steps[1]?.id).toBe("trust-block");
    expect(steps.at(-1)?.id).toBe("purchase");
  });
});

describe("trust impact correlation", () => {
  it("compares conversion with and without trust views", () => {
    const impact = computeTrustImpactFromEvents({
      windowDays: 7,
      rows: [
        { event: "product_view", visitorId: "v1", entityId: "p1" },
        { event: "trust_block_view", visitorId: "v1", entityId: "pdp" },
        { event: "add_to_cart", visitorId: "v1", entityId: "p1" },
        { event: "product_view", visitorId: "v2", entityId: "p2" },
      ],
    });

    expect(impact.withTrustBlock.views).toBe(1);
    expect(impact.withTrustBlock.cartAdds).toBe(1);
    expect(impact.withoutTrustBlock.views).toBe(1);
    expect(impact.withoutTrustBlock.cartAdds).toBe(0);
  });
});

describe("buyer doubt detection", () => {
  it("shows doubt block when views exist without cart adds", () => {
    const snapshot = buildBuyerDoubtSnapshot({
      views: 10,
      cartAdds: 0,
      reviewsCount: 0,
      imageCount: 1,
      isNewSeller: true,
      deliverySlow: false,
      characteristicCount: 1,
    });

    expect(snapshot.show).toBe(true);
    expect(snapshot.reasons.filter((r) => r.active).length).toBeGreaterThan(0);
  });

  it("hides doubt block when cart adds exist", () => {
    const snapshot = buildBuyerDoubtSnapshot({
      views: 10,
      cartAdds: 2,
      reviewsCount: 0,
      imageCount: 1,
      isNewSeller: true,
      deliverySlow: false,
      characteristicCount: 1,
    });

    expect(snapshot.show).toBe(false);
  });
});

describe("product trust explanation", () => {
  it("builds positive trust lines", () => {
    const snapshot = buildProductTrustExplanation({
      imageCount: 8,
      characteristicCount: 6,
      reviewsCount: 45,
      sellerTierLabel: "Надёжный продавец",
      sellerReliable: true,
    });

    expect(snapshot.lines.some((l) => l.text.includes("8 фотографий"))).toBe(true);
    expect(snapshot.lines.some((l) => l.text.includes("45 отзывов"))).toBe(true);
  });
});

describe("seller trust feedback", () => {
  it("ranks top buyer doubts", () => {
    const feedback = buildSellerTrustFeedback([
      {
        productId: "p1",
        name: "Item",
        views: 20,
        cartAdds: 0,
        reviewsCount: 0,
        imageCount: 1,
        characteristicCount: 1,
        isNewSeller: true,
      },
    ]);

    expect(feedback.doubts.length).toBeGreaterThan(0);
    expect(feedback.fixes.length).toBeGreaterThan(0);
  });
});

describe("trust block order", () => {
  it("prioritizes new seller layout", () => {
    expect(resolvePdpTrustBlockOrder({ isNewSeller: true, completedOrders: 0 })).toBe(
      "new_seller",
    );
    expect(resolvePdpTrustBlockOrder({ isNewSeller: false, completedOrders: 25 })).toBe(
      "experienced",
    );
    expect(NEW_SELLER_BLOCK_PRIORITY[0]).toBe("protection");
    expect(EXPERIENCED_BLOCK_PRIORITY[0]).toBe("reviews");
  });
});

describe("admin trust insights", () => {
  it("ranks trust loss reasons", () => {
    const insights = buildAdminTrustLossInsights({
      noReviews: 50,
      newSeller: 30,
      slowShipping: 10,
      noPhotos: 40,
      noSpecs: 20,
    });

    expect(insights[0]?.reason).toBe("Нет отзывов");
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});

describe("trust experiments foundation", () => {
  it("provides experiment registry", () => {
    expect(TRUST_EXPERIMENT_REGISTRY.length).toBeGreaterThan(0);
    expect(getTrustExperimentFoundation().experiments[0]?.metric).toBeTruthy();
  });
});

describe("analytics events", () => {
  it("defines trust conversion events", () => {
    expect(ANALYTICS_EVENTS.TRUST_DETAILS_OPEN).toBe("trust_details_open");
    expect(ANALYTICS_EVENTS.SELLER_REPUTATION_OPEN).toBe("seller_reputation_open");
    expect(ANALYTICS_EVENTS.NEW_SELLER_TRUST_VIEW).toBe("new_seller_trust_view");
    expect(ANALYTICS_EVENTS.TRUST_PURCHASE_AFTER_VIEW).toBe("trust_purchase_after_view");
    expect(ANALYTICS_EVENTS.TRUST_BLOCK_VIEW).toBe("trust_block_view");
  });
});
