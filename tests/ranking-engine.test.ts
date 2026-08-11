import { describe, expect, it } from "vitest";

import {
  LOT_RANKING_V1_WEIGHTS,
  RANKING_VERSION,
  assertWeightsSumToOne,
  rankProducts,
  scoreProduct,
  type RankingProductInput,
} from "@/lib/ranking";

const NOW = new Date("2026-08-11T00:00:00.000Z");

function base(overrides: Partial<RankingProductInput> = {}): RankingProductInput {
  return {
    productId: "p",
    textRelevance: 1,
    price: 10000,
    categoryMedianPrice: 10000,
    contentQuality: 80,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    stats: {
      views: 0,
      completedOrders: 0,
      unitsOrdered: 0,
      unitsBoughtOut: 0,
    },
    seller: { isVerified: false },
    logistics: { stock: 5, pickupAvailable: false, shippingConfigured: true },
    ...overrides,
  };
}

describe("LOT Ranking v1 weights", () => {
  it("weights sum to 1", () => {
    expect(() => assertWeightsSumToOne(LOT_RANKING_V1_WEIGHTS)).not.toThrow();
  });
  it("carries a version tag", () => {
    expect(scoreProduct(base(), { now: NOW }).rankingVersion).toBe(RANKING_VERSION);
  });
});

describe("cold start (section 36)", () => {
  it("new quality product with no history is not destroyed", () => {
    const cold = scoreProduct(
      base({
        productId: "cold",
        stats: { views: 0, completedOrders: 0, unitsOrdered: 0, unitsBoughtOut: 0 },
        seller: { isVerified: true },
        createdAt: NOW,
        contentQuality: 90,
      }),
      { now: NOW },
    );
    // Neutral priors + content + stock + freshness keep it viable.
    expect(cold.organicScore).toBeGreaterThan(0.4);
    // Buyout Beta prior (2,2) → 0.5, so commercial floor ≈ 0.4*0.5 = 0.2 (not 0).
    expect(cold.breakdown.commercial).toBeGreaterThanOrEqual(0.2);
    expect(cold.breakdown.conversion).toBeGreaterThan(0.1);
  });
});

describe("deterministic ranking scenario (section 48)", () => {
  // Three equally text-relevant products.
  const A = base({
    productId: "A",
    seller: { isVerified: true, rating: 4.8, ratingCount: 120, cancellationRate: 0.02 },
    stats: { views: 4000, completedOrders: 300, unitsOrdered: 320, unitsBoughtOut: 300 },
    logistics: { stock: 40, pickupAvailable: true, shippingConfigured: true },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const B = base({
    productId: "B",
    seller: { isVerified: false, rating: 3.5, ratingCount: 15, cancellationRate: 0.25 },
    stats: { views: 2000, completedOrders: 20, unitsOrdered: 40, unitsBoughtOut: 25 },
    logistics: { stock: 10, pickupAvailable: false, shippingConfigured: true },
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  const C = base({
    productId: "C",
    seller: { isVerified: true },
    stats: { views: 0, completedOrders: 0, unitsOrdered: 0, unitsBoughtOut: 0 },
    logistics: { stock: 15, pickupAvailable: true, shippingConfigured: true },
    createdAt: NOW,
    contentQuality: 88,
  });

  const ranked = rankProducts([C, B, A], { now: NOW });
  const byId = Object.fromEntries(ranked.map((r) => [r.productId, r]));

  it("A ranks above B (better trust + commercial history)", () => {
    expect(byId.A.finalScore).toBeGreaterThan(byId.B.finalScore);
  });

  it("C (new quality product) keeps a healthy cold-start score", () => {
    expect(byId.C.organicScore).toBeGreaterThan(0.45);
    // Not destroyed: within striking distance, above out-of-stock floor.
    expect(byId.C.finalScore).toBeGreaterThan(byId.B.finalScore * 0.6);
  });

  it("results are deterministic and sorted desc", () => {
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].finalScore).toBeGreaterThanOrEqual(ranked[i].finalScore);
    }
  });
});

describe("review rating integration (TASK 059)", () => {
  it("A (4.9, 100 reviews) is not beaten by B (5.0, 1 review) — section 39", () => {
    const A = scoreProduct(
      base({ productId: "A", productRating: { avg: 4.9, count: 100 } }),
      { now: NOW },
    );
    const B = scoreProduct(
      base({ productId: "B", productRating: { avg: 5.0, count: 1 } }),
      { now: NOW },
    );
    expect(A.breakdown.trust).toBeGreaterThan(B.breakdown.trust);
    expect(A.finalScore).toBeGreaterThan(B.finalScore);
  });

  it("C (0 reviews) keeps a neutral rating, not zero — section 40", () => {
    const C = scoreProduct(
      base({ productId: "C", productRating: { avg: 0, count: 0 }, seller: { isVerified: true } }),
      { now: NOW },
    );
    // Trust is driven by the neutral prior, not a hard zero.
    expect(C.breakdown.trust).toBeGreaterThan(0.5);
    expect(C.finalScore).toBeGreaterThan(0.4);
  });

  it("a genuinely bad product rating lowers trust vs an unrated one", () => {
    const bad = scoreProduct(base({ productRating: { avg: 1.5, count: 50 } }), { now: NOW });
    const unrated = scoreProduct(base({ productRating: null }), { now: NOW });
    expect(bad.breakdown.trust).toBeLessThan(unrated.breakdown.trust);
  });
});

describe("signal behaviors", () => {
  it("out-of-stock is strongly demoted (section 33)", () => {
    const inStock = scoreProduct(base({ logistics: { stock: 5, pickupAvailable: false, shippingConfigured: true } }), { now: NOW });
    const out = scoreProduct(base({ logistics: { stock: 0, pickupAvailable: false, shippingConfigured: true } }), { now: NOW });
    expect(out.finalScore).toBeLessThan(inStock.finalScore * 0.6);
    expect(out.breakdown.stock).toBe(0);
  });

  it("cheaper than segment median scores higher on price (section 31)", () => {
    const cheap = scoreProduct(base({ price: 5000, categoryMedianPrice: 10000 }), { now: NOW });
    const dear = scoreProduct(base({ price: 15000, categoryMedianPrice: 10000 }), { now: NOW });
    expect(cheap.breakdown.price).toBeGreaterThan(dear.breakdown.price);
    expect(scoreProduct(base({ price: 10000, categoryMedianPrice: 10000 }), { now: NOW }).breakdown.price).toBeCloseTo(0.5, 5);
  });

  it("promotion boost is tracked separately from organic (section 35)", () => {
    const organic = scoreProduct(base(), { now: NOW });
    const promoted = scoreProduct(base({ promotionBoost: 0.5 }), { now: NOW });
    expect(promoted.organicScore).toBeCloseTo(organic.organicScore, 6);
    expect(promoted.promotionBoost).toBe(0.5);
    expect(promoted.finalScore).toBeGreaterThan(organic.finalScore);
  });
});
