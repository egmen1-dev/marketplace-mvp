import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  assertSellerTrustCoachAccess,
  assertTrustSafetyAdminAccess,
  TrustSafetyForbiddenError,
} from "@/lib/trust-safety/permissions";
import { computeProductTrustScore } from "@/lib/trust-safety/product-trust";
import { buildSellerTrustImprovements } from "@/lib/trust-safety/recommendations";
import {
  detectProductRiskSignals,
  detectSellerRiskSignals,
} from "@/lib/trust-safety/risk-signals";
import {
  computeSellerTrustScore,
  type SellerTrustInput,
} from "@/lib/trust-safety/seller-trust";
import { trustLevelLabel } from "@/lib/trust-safety/trust-score";
import { getTransactionProtectionFlow } from "@/lib/trust-safety/transaction-protection";
import { isTrustSafetyEnabled } from "@/lib/trust-safety/flags";

const PREV_FLAG = process.env.TRUST_SAFETY_ENABLED;

const baseSellerInput: SellerTrustInput = {
  joinedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
  isVerified: true,
  completedOrders: 25,
  successfulDeliveries: 25,
  totalOrders: 30,
  cancelledOrders: 2,
  disputeCount: 0,
  avgProductQuality: 82,
  responseActivityScore: 0.8,
};

describe("computeSellerTrustScore", () => {
  it("returns score 0-100 with level label", () => {
    const score = computeSellerTrustScore(baseSellerInput);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.levelLabel).toBe(trustLevelLabel(score.score));
    expect(score.factors.length).toBeGreaterThan(0);
  });

  it("lowers score for new sellers with weak cards", () => {
    const weak = computeSellerTrustScore({
      ...baseSellerInput,
      joinedAt: new Date().toISOString(),
      completedOrders: 0,
      successfulDeliveries: 0,
      totalOrders: 0,
      isVerified: false,
      avgProductQuality: 30,
      responseActivityScore: 0.2,
    });
    const strong = computeSellerTrustScore(baseSellerInput);
    expect(weak.score).toBeLessThan(strong.score);
  });
});

describe("computeProductTrustScore", () => {
  it("rewards photos and characteristics", () => {
    const input = {
      imageCount: 3,
      title: "Товар с полным описанием",
      description: "Подробное описание товара для покупателя".repeat(4),
      characteristicCount: 5,
      requiredCharacteristicCount: 3,
      filledRequiredCharacteristicCount: 3,
      hasCategory: true,
      hasProductType: true,
      stock: 5,
      sellerVerified: true,
      sellerBlocked: false,
      sellerCompletedOrders: 10,
      sellerTrustScore: 85,
      price: 4990,
    };
    const good = computeProductTrustScore(input);
    const weak = computeProductTrustScore({
      ...input,
      imageCount: 0,
      filledRequiredCharacteristicCount: 0,
      description: null,
      stock: 0,
    });
    expect(good.score).toBeGreaterThan(weak.score);
    expect(good.checklist.some((c) => c.ok && c.label.includes("фото"))).toBe(
      true,
    );
  });
});

describe("risk detection", () => {
  it("detects seller_new and high cancel rate", () => {
    const signals = detectSellerRiskSignals({
      ...baseSellerInput,
      joinedAt: new Date().toISOString(),
      completedOrders: 1,
      totalOrders: 10,
      cancelledOrders: 4,
    });
    expect(signals.some((s) => s.type === "SELLER_NEW")).toBe(true);
    expect(signals.some((s) => s.type === "HIGH_CANCEL_RATE")).toBe(true);
  });

  it("detects missing product photo", () => {
    const signals = detectProductRiskSignals({
      imageCount: 0,
      price: 1000,
    });
    expect(signals[0]?.type).toBe("NO_PRODUCT_PHOTO");
  });
});

describe("seller trust recommendations", () => {
  it("builds improvement actions", () => {
    const score = computeSellerTrustScore({
      ...baseSellerInput,
      avgProductQuality: 50,
      completedOrders: 2,
      isVerified: false,
    });
    const improvements = buildSellerTrustImprovements({
      trustInput: { ...baseSellerInput, avgProductQuality: 50, completedOrders: 2, isVerified: false },
      trustScore: score,
      riskSignals: detectSellerRiskSignals({
        ...baseSellerInput,
        avgProductQuality: 50,
        completedOrders: 2,
        isVerified: false,
      }),
    });
    expect(improvements.length).toBeGreaterThan(0);
    expect(improvements.some((i) => i.action.includes("фото"))).toBe(true);
  });
});

describe("transaction protection", () => {
  it("describes safe deal flow without changing payments", () => {
    const flow = getTransactionProtectionFlow();
    expect(flow.steps.length).toBe(5);
    expect(flow.steps[0]?.label).toBe("Оплата");
    expect(flow.steps.some((s) => s.label.includes("удерж"))).toBe(true);
  });
});

describe("permissions", () => {
  it("allows admin trust center", () => {
    expect(() => assertTrustSafetyAdminAccess("ADMIN")).not.toThrow();
  });

  it("blocks non-admin", () => {
    expect(() => assertTrustSafetyAdminAccess("BUYER")).toThrow(
      TrustSafetyForbiddenError,
    );
  });

  it("requires seller profile for coach", () => {
    expect(() =>
      assertSellerTrustCoachAccess({ role: "BUYER", sellerProfileId: null }),
    ).toThrow(TrustSafetyForbiddenError);
  });
});

describe("TRUST_SAFETY_ENABLED flag", () => {
  beforeEach(() => {
    process.env.TRUST_SAFETY_ENABLED = "true";
  });

  afterEach(() => {
    if (PREV_FLAG === undefined) delete process.env.TRUST_SAFETY_ENABLED;
    else process.env.TRUST_SAFETY_ENABLED = PREV_FLAG;
  });

  it("is on when env true", () => {
    expect(isTrustSafetyEnabled()).toBe(true);
  });
});
