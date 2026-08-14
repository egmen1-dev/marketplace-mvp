import { describe, expect, it, afterEach } from "vitest";
import { UserRole } from "@prisma/client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { buildBuyerFunnelDisplay, funnelSummaryLine } from "@/lib/marketplace-conversion/funnel";
import {
  detectFunnelDropOffs,
  detectProductDropOff,
} from "@/lib/marketplace-conversion/drop-offs";
import { isMarketplaceConversionEnabled } from "@/lib/marketplace-conversion/flags";
import {
  recommendationsFromDropOff,
  sellerConversionRecommendation,
} from "@/lib/marketplace-conversion/recommendations";
import { classifyBuyerSegment } from "@/lib/marketplace-conversion/segments";
import { assertConversionAdminAccess } from "@/lib/marketplace-conversion/permissions";

const PREV = process.env.MARKETPLACE_CONVERSION_ENABLED;

describe("conversion flags", () => {
  afterEach(() => {
    if (PREV === undefined) {
      delete process.env.MARKETPLACE_CONVERSION_ENABLED;
    } else {
      process.env.MARKETPLACE_CONVERSION_ENABLED = PREV;
    }
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_CONVERSION_ENABLED;
    expect(isMarketplaceConversionEnabled()).toBe(false);
  });

  it("enables when env is true", () => {
    process.env.MARKETPLACE_CONVERSION_ENABLED = "true";
    expect(isMarketplaceConversionEnabled()).toBe(true);
  });
});

describe("buyer funnel", () => {
  it("builds funnel steps from analytics counts", () => {
    const steps = buildBuyerFunnelDisplay({
      counts: {
        page_view: 1000,
        product_view: 650,
        add_to_cart: 120,
        checkout_start: 50,
        purchase_complete: 42,
      },
      uniques: {
        page_view: 1000,
        product_view: 650,
        add_to_cart: 120,
        checkout_start: 50,
        purchase_complete: 42,
      },
    });

    expect(steps.length).toBeGreaterThan(5);
    expect(steps.find((s) => s.id === "product")?.uniqueVisitors).toBe(650);
  });

  it("formats funnel summary lines", () => {
    const steps = buildBuyerFunnelDisplay({
      counts: { page_view: 1000, product_view: 650, purchase_complete: 42 },
      uniques: { page_view: 1000, product_view: 650, purchase_complete: 42 },
    });
    const summary = funnelSummaryLine(steps);
    expect(summary[0]).toContain("1000");
  });
});

describe("drop-off detection", () => {
  it("detects low PDP to cart conversion", () => {
    const steps = buildBuyerFunnelDisplay({
      counts: {
        page_view: 1000,
        product_view: 500,
        add_to_cart: 5,
      },
      uniques: {
        page_view: 1000,
        product_view: 500,
        add_to_cart: 5,
      },
    });
    const dropOffs = detectFunnelDropOffs(steps);
    expect(dropOffs.some((d) => d.id === "pdp-to-cart")).toBe(true);
  });

  it("detects product-level drop-off", () => {
    const drop = detectProductDropOff({ views: 500, addToCart: 5 });
    expect(drop?.headline).toContain("просмотров");
  });
});

describe("recommendations", () => {
  it("maps drop-off to actionable recommendation", () => {
    const drop = detectProductDropOff({ views: 100, addToCart: 2 })!;
    const rec = recommendationsFromDropOff(drop, "prod-1");
    expect(rec.checks?.length).toBeGreaterThan(0);
    expect(rec.ctaHref).toContain("prod-1");
  });

  it("builds seller recommendation from views and carts", () => {
    const rec = sellerConversionRecommendation({
      views: 250,
      cartAdds: 3,
      orders: 0,
      topProductId: "p1",
      topProductName: "Test",
    });
    expect(rec?.problem).toContain("смотрят");
    expect(rec?.data).toContain("250");
  });
});

describe("buyer segments", () => {
  it("classifies abandoned cart", () => {
    const segment = classifyBuyerSegment({
      ordersCount: 0,
      cartItemCount: 2,
      productViewsCount: 5,
      accountAgeDays: 3,
    });
    expect(segment.id).toBe("abandoned_cart");
  });

  it("classifies active buyer", () => {
    const segment = classifyBuyerSegment({
      ordersCount: 3,
      cartItemCount: 0,
      productViewsCount: 10,
      accountAgeDays: 30,
    });
    expect(segment.id).toBe("active_buyer");
  });
});

describe("conversion permissions", () => {
  it("requires admin role", () => {
    expect(() => assertConversionAdminAccess(UserRole.BUYER)).toThrow();
    expect(() => assertConversionAdminAccess(UserRole.ADMIN)).not.toThrow();
  });
});

describe("conversion analytics events", () => {
  it("registers conversion event names", () => {
    expect(ANALYTICS_EVENTS.CONVERSION_FUNNEL_VIEW).toBe("conversion_funnel_view");
    expect(ANALYTICS_EVENTS.DROPOFF_DETECTED).toBe("dropoff_detected");
    expect(ANALYTICS_EVENTS.SELLER_CONVERSION_VIEW).toBe("seller_conversion_view");
    expect(ANALYTICS_EVENTS.BUYER_SEGMENT_VIEW).toBe("buyer_segment_view");
  });
});
