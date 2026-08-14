import { describe, expect, it, afterEach } from "vitest";

import {
  NEW_SELLER_TRUST_SCORE,
  MAX_DAILY_TRUST_DELTA,
  MAX_EVENT_TRUST_DELTA,
  computeSellerTrustScore,
  applyTrustDeltaCaps,
  reviewRatingDelta,
  shippingSpeedDelta,
  sellerCancellationDelta,
  getTrustLevel,
  isMarketplaceTrustScoreModelEnabled,
  type SellerMetricsInput,
} from "@/lib/marketplace-trust-score";

const PREV = process.env.MARKETPLACE_TRUST_SCORE_MODEL_ENABLED;

const emptyMetrics: SellerMetricsInput = {
  products: [],
  completedOrders: 0,
  cancelledBySeller: 0,
  problematicOrders: 0,
  shippingHoursSamples: [],
  averageReviewRating: 0,
  reviewsCount: 0,
  activeProducts: 0,
  recentProductUpdates: 0,
  phoneVerified: false,
  paymentVerified: false,
  isVerified: false,
};

describe("trust score flag", () => {
  afterEach(() => {
    if (PREV === undefined) delete process.env.MARKETPLACE_TRUST_SCORE_MODEL_ENABLED;
    else process.env.MARKETPLACE_TRUST_SCORE_MODEL_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_TRUST_SCORE_MODEL_ENABLED;
    expect(isMarketplaceTrustScoreModelEnabled()).toBe(false);
  });

  it("enables when env is true", () => {
    process.env.MARKETPLACE_TRUST_SCORE_MODEL_ENABLED = "true";
    expect(isMarketplaceTrustScoreModelEnabled()).toBe(true);
  });
});

describe("initial seller trust score", () => {
  it("assigns 70/100 to new seller without history", () => {
    const result = computeSellerTrustScore(emptyMetrics);
    expect(result.score).toBe(NEW_SELLER_TRUST_SCORE);
    expect(result.level).toBe("Хороший уровень доверия");
  });
});

describe("order influence", () => {
  it("rewards fast shipping", () => {
    expect(shippingSpeedDelta(12)).toBe(0.5);
    expect(shippingSpeedDelta(36)).toBe(0);
    expect(shippingSpeedDelta(72)).toBe(-2);
    expect(shippingSpeedDelta(130)).toBe(-5);
  });

  it("penalizes seller cancellations", () => {
    expect(sellerCancellationDelta(false)).toBe(-5);
    expect(sellerCancellationDelta(true)).toBe(-10);
  });

  it("raises fulfillment factor with completed orders", () => {
    const result = computeSellerTrustScore({
      ...emptyMetrics,
      completedOrders: 20,
      cancelledBySeller: 1,
      problematicOrders: 0,
    });
    expect(result.score).toBeGreaterThan(NEW_SELLER_TRUST_SCORE);
  });
});

describe("review influence", () => {
  it("maps star ratings to deltas", () => {
    expect(reviewRatingDelta(5)).toBe(0.5);
    expect(reviewRatingDelta(4)).toBe(0.2);
    expect(reviewRatingDelta(3)).toBe(0);
    expect(reviewRatingDelta(2)).toBe(-1);
    expect(reviewRatingDelta(1)).toBe(-2);
    expect(reviewRatingDelta(5, true)).toBe(0.7);
  });

  it("improves score with strong reviews", () => {
    const result = computeSellerTrustScore({
      ...emptyMetrics,
      reviewsCount: 12,
      averageReviewRating: 4.8,
      completedOrders: 5,
    });
    expect(result.score).toBeGreaterThan(75);
  });
});

describe("delta caps", () => {
  it("limits single event delta to ±5", () => {
    const positive = applyTrustDeltaCaps({
      currentScore: 70,
      rawDelta: 12,
      dailyDeltaUsed: 0,
    });
    expect(positive.appliedDelta).toBe(MAX_EVENT_TRUST_DELTA);
    expect(positive.newScore).toBe(75);

    const negative = applyTrustDeltaCaps({
      currentScore: 70,
      rawDelta: -8,
      dailyDeltaUsed: 0,
    });
    expect(negative.appliedDelta).toBe(-MAX_EVENT_TRUST_DELTA);
    expect(negative.newScore).toBe(65);
  });

  it("limits daily total change to ±10", () => {
    const capped = applyTrustDeltaCaps({
      currentScore: 80,
      rawDelta: 5,
      dailyDeltaUsed: 8,
    });
    expect(capped.appliedDelta).toBe(2);
    expect(capped.newScore).toBe(82);
  });

  it("respects remaining daily budget for negative deltas", () => {
    const capped = applyTrustDeltaCaps({
      currentScore: 80,
      rawDelta: -5,
      dailyDeltaUsed: 8,
    });
    expect(capped.appliedDelta).toBe(-2);
    expect(capped.newScore).toBe(78);
  });
});

describe("trust levels", () => {
  it("maps score ranges to buyer-facing labels", () => {
    expect(getTrustLevel(95).label).toBe("Высокий уровень доверия");
    expect(getTrustLevel(80).label).toBe("Хороший уровень доверия");
    expect(getTrustLevel(60).label).toBe("Есть что улучшить");
    expect(getTrustLevel(30).label).toBe("Низкий уровень доверия");
  });
});

describe("history delta math", () => {
  it("records transparent delta from old to new score", () => {
    const oldScore = 92;
    const applied = applyTrustDeltaCaps({
      currentScore: oldScore,
      rawDelta: -3,
      dailyDeltaUsed: 0,
    });
    expect(applied.newScore).toBe(89);
    expect(applied.newScore - oldScore).toBe(-3);
  });
});

describe("recalculation baseline", () => {
  it("keeps neutral factors at 70 for sellers without history", () => {
    const result = computeSellerTrustScore({
      ...emptyMetrics,
      phoneVerified: true,
      paymentVerified: true,
      isVerified: true,
    });
    expect(result.score).toBe(70);
  });
});
