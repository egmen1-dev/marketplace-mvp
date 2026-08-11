import { describe, expect, it } from "vitest";

import {
  NEUTRAL_TRUST,
  computeBuyerTrust,
  computeProductRisk,
  computeSellerTrust,
  computeTransactionRisk,
  decideSignal,
  detectDuplicateListing,
  detectPriceOutlier,
  detectRapidCreation,
  detectSelfDeal,
  riskLevel,
} from "@/features/trust-risk";

describe("risk levels & thresholds", () => {
  it("maps score to level", () => {
    expect(riskLevel(10)).toBe("LOW");
    expect(riskLevel(30)).toBe("MEDIUM");
    expect(riskLevel(60)).toBe("HIGH");
    expect(riskLevel(80)).toBe("CRITICAL");
  });
});

describe("TrustScoreEngine — neutral priors (sections 38/39)", () => {
  it("new seller with no history is neutral, not low", () => {
    const t = computeSellerTrust({
      isVerified: false,
      accountAgeDays: 0,
      completedTransactions: 0,
      avgRating: 0,
      ratingCount: 0,
      cancellationRate: null,
    });
    expect(t.score).toBe(NEUTRAL_TRUST);
  });

  it("new buyer is neutral", () => {
    const t = computeBuyerTrust({
      accountAgeDays: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      completedReservations: 0,
      cancelledReservations: 0,
    });
    expect(t.score).toBe(NEUTRAL_TRUST);
  });
});

describe("deterministic seller trust (section 46)", () => {
  it("A (verified, old, many sales, good rating) > B (new, weak)", () => {
    const A = computeSellerTrust({
      isVerified: true,
      accountAgeDays: 400,
      completedTransactions: 300,
      avgRating: 4.8,
      ratingCount: 120,
      cancellationRate: 0.02,
    });
    const B = computeSellerTrust({
      isVerified: false,
      accountAgeDays: 0,
      completedTransactions: 0,
      avgRating: 0,
      ratingCount: 0,
      cancellationRate: null,
    });
    expect(A.score).toBeGreaterThan(70);
    expect(A.score).toBeGreaterThan(B.score);
    expect(A.signals.length).toBeGreaterThan(0); // explainable
  });
});

describe("buyer risk (section 47)", () => {
  it("rapid + many cancellations → higher risk than normal buyer", () => {
    const A = computeTransactionRisk({
      sellerAccountAgeDays: 400,
      buyerAccountAgeDays: 300,
      sellerVerified: true,
      amount: 5000,
      typicalAmount: 5000,
    });
    const B = computeTransactionRisk({
      sellerAccountAgeDays: 400,
      buyerAccountAgeDays: 300,
      sellerVerified: true,
      amount: 5000,
      typicalAmount: 5000,
      recentActionCount: 8,
      buyerCancellationRate: 0.6,
    });
    expect(B.score).toBeGreaterThan(A.score);
  });

  it("a brand-new account alone is not high risk (section 6/38)", () => {
    const r = computeTransactionRisk({
      sellerAccountAgeDays: 0,
      buyerAccountAgeDays: 0,
      sellerVerified: false,
      amount: 5000,
      typicalAmount: null,
    });
    expect(r.level).not.toBe("HIGH");
    expect(r.level).not.toBe("CRITICAL");
  });
});

describe("product risk (section 48)", () => {
  const normal = computeProductRisk({
    priceOutlierScore: 0,
    duplicateRiskScore: 0,
    sellerRiskScore: 0,
    hasImages: true,
    hasDescription: true,
    hasProductType: true,
  });
  const outlier = computeProductRisk({
    priceOutlierScore: 80,
    duplicateRiskScore: 0,
    sellerRiskScore: 0,
    hasImages: true,
    hasDescription: true,
    hasProductType: true,
  });
  const newSellerNormal = computeProductRisk({
    priceOutlierScore: 0,
    duplicateRiskScore: 0,
    sellerRiskScore: 10,
    hasImages: true,
    hasDescription: true,
    hasProductType: true,
  });

  it("B (price outlier) > A (normal)", () => {
    expect(outlier.score).toBeGreaterThan(normal.score);
  });
  it("C (new seller, normal price/content) is not automatically fraudulent", () => {
    expect(newSellerNormal.level).toBe("LOW");
  });
});

describe("PriceOutlierDetector (section 19)", () => {
  it("flags an extreme low price with enough data", () => {
    const r = detectPriceOutlier({ price: 2000, median: 20000, sampleSize: 20 });
    expect(r.score).toBeGreaterThan(50);
    expect(r.confidence).toBeGreaterThan(40);
  });
  it("does not flag normal prices", () => {
    expect(detectPriceOutlier({ price: 18000, median: 20000, sampleSize: 20 }).score).toBe(0);
  });
  it("low data → no score, low confidence", () => {
    const r = detectPriceOutlier({ price: 100, median: 20000, sampleSize: 1 });
    expect(r.score).toBe(0);
    expect(r.confidence).toBeLessThan(40);
  });
});

describe("DuplicateListingDetector (section 49)", () => {
  const base = {
    id: "1",
    title: "Дрель Makita HR2470",
    description: "Ударная дрель для бетона",
    price: 10000,
    productTypeId: "pt-drills",
  };
  it("flags a near-identical listing by the same seller", () => {
    const r = detectDuplicateListing({ ...base, id: "2" }, [base]);
    expect(r.score).toBeGreaterThan(50);
    expect(r.matchId).toBe("1");
  });
  it("does not flag a different listing", () => {
    const r = detectDuplicateListing(
      { id: "2", title: "Кроссовки Nike беговые", price: 7000, productTypeId: "pt-sneakers" },
      [base],
    );
    expect(r.score).toBe(0);
  });
});

describe("SelfDealDetector (section 21)", () => {
  it("detects buyer == seller owner", () => {
    expect(detectSelfDeal({ buyerUserId: "u1", sellerOwnerUserId: "u1" }).isSelfDeal).toBe(true);
    expect(detectSelfDeal({ buyerUserId: "u1", sellerOwnerUserId: "u2" }).isSelfDeal).toBe(false);
  });
});

describe("rate detector", () => {
  it("flags rapid creation", () => {
    const now = Date.now();
    const ts = [0, 1000, 2000, 3000, 4000].map((d) => now + d);
    expect(detectRapidCreation(ts, { windowMs: 60_000, threshold: 5 }).triggered).toBe(true);
  });
});

describe("RuleEngine false-positive safety (sections 11/40/56)", () => {
  it("low confidence stays LOG_ONLY", () => {
    const d = decideSignal({ type: "PRICE_OUTLIER", severity: "MEDIUM", confidence: 20 });
    expect(d.effect).toBe("LOG_ONLY");
  });
  it("enforcing effects are downgraded to ADMIN_REVIEW when enforcement disabled", () => {
    // RISK_ENFORCEMENT_ENABLED is unset in tests → disabled.
    const d = decideSignal({ type: "SELF_DEAL_INDICATOR", severity: "HIGH", confidence: 100 });
    expect(["ADMIN_REVIEW", "LOG_ONLY"]).toContain(d.effect);
    expect(d.effect).not.toBe("BLOCK_ACTION");
  });
});
