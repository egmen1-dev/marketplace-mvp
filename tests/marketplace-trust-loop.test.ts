import { describe, expect, it, afterEach } from "vitest";

import { detectProhibitedProduct } from "@/lib/marketplace-trust-loop/risk/prohibited-products";
import { analyzeProductPhotos } from "@/lib/marketplace-trust-loop/content-quality/photo-analysis";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import {
  canCreateReview,
  validateReviewRating,
} from "@/lib/marketplace-trust-loop/reviews/lifecycle";
import { assertAdminTrustAccess } from "@/lib/marketplace-trust-loop/permissions";
import { OrderStatus } from "@prisma/client";

const PREV = process.env.MARKETPLACE_TRUST_LOOP_ENABLED;

describe("trust loop flag", () => {
  afterEach(() => {
    process.env.MARKETPLACE_TRUST_LOOP_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_TRUST_LOOP_ENABLED;
    expect(isMarketplaceTrustLoopEnabled()).toBe(false);
  });
});

describe("review lifecycle", () => {
  it("validates rating range", () => {
    expect(validateReviewRating(5)).toBe(true);
    expect(validateReviewRating(0)).toBe(false);
  });

  it("allows review on completed order", () => {
    expect(
      canCreateReview({
        order: {
          status: OrderStatus.COMPLETED,
          reviewEligibleAt: new Date(),
          userId: "u1",
        },
        buyerId: "u1",
        existingReview: false,
      }).ok,
    ).toBe(true);
  });
});

describe("prohibited products", () => {
  it("detects weapon keywords", () => {
    expect(detectProhibitedProduct({ name: "Пистолет игрушечный" }).hit).toBe(true);
  });

  it("passes normal products", () => {
    expect(detectProhibitedProduct({ name: "Дрель Kolner" }).hit).toBe(false);
  });
});

describe("photo quality", () => {
  it("flags missing photos", () => {
    const report = analyzeProductPhotos({ imageCount: 0, hasPrimary: false });
    expect(report.score).toBeLessThan(60);
    expect(report.issues.some((i) => i.id === "no-photos")).toBe(true);
  });
});

describe("permissions", () => {
  it("requires admin for trust admin", () => {
    expect(() => assertAdminTrustAccess("BUYER")).toThrow();
  });
});
