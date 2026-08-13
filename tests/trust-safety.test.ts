import { describe, expect, it, afterEach } from "vitest";

import {
  BUYER_PROTECTION_STATES,
  buildOrderTrustTimeline,
  canAdminManageDisputes,
  canBuyerConfirmReceipt,
  canBuyerOpenDispute,
  canTransitionDispute,
  canViewTrustTimeline,
  computeSellerTrustScore,
  deriveBuyerProtectionState,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";

describe("trust-safety flag", () => {
  const prev = process.env.TRUST_SAFETY_ENABLED;
  const prevPub = process.env.NEXT_PUBLIC_TRUST_SAFETY_ENABLED;

  afterEach(() => {
    if (prev === undefined) delete process.env.TRUST_SAFETY_ENABLED;
    else process.env.TRUST_SAFETY_ENABLED = prev;
    if (prevPub === undefined) delete process.env.NEXT_PUBLIC_TRUST_SAFETY_ENABLED;
    else process.env.NEXT_PUBLIC_TRUST_SAFETY_ENABLED = prevPub;
  });

  it("defaults to false", () => {
    delete process.env.TRUST_SAFETY_ENABLED;
    delete process.env.NEXT_PUBLIC_TRUST_SAFETY_ENABLED;
    expect(isTrustSafetyEnabled()).toBe(false);
  });

  it("enables when TRUST_SAFETY_ENABLED=true", () => {
    process.env.TRUST_SAFETY_ENABLED = "true";
    expect(isTrustSafetyEnabled()).toBe(true);
  });
});

describe("buyer protection lifecycle", () => {
  it("exposes required states", () => {
    expect(BUYER_PROTECTION_STATES).toEqual([
      "PAYMENT_PROTECTED",
      "SELLER_PROCESSING",
      "DELIVERY_PENDING",
      "BUYER_CONFIRMATION",
      "FUNDS_RELEASED",
      "DISPUTE_OPEN",
    ]);
  });

  it("maps payment → processing → delivery → confirmation → funds", () => {
    expect(
      deriveBuyerProtectionState({
        orderStatus: "PAID",
        paymentStatus: "SUCCEEDED",
      }),
    ).toBe("SELLER_PROCESSING");

    expect(
      deriveBuyerProtectionState({
        orderStatus: "SHIPPED",
        paymentStatus: "SUCCEEDED",
      }),
    ).toBe("DELIVERY_PENDING");

    expect(
      deriveBuyerProtectionState({
        orderStatus: "DELIVERED",
        paymentStatus: "SUCCEEDED",
      }),
    ).toBe("BUYER_CONFIRMATION");

    expect(
      deriveBuyerProtectionState({
        orderStatus: "COMPLETED",
        paymentStatus: "SUCCEEDED",
        fundsReleased: true,
      }),
    ).toBe("FUNDS_RELEASED");
  });

  it("prefers DISPUTE_OPEN over intermediate states", () => {
    expect(
      deriveBuyerProtectionState({
        orderStatus: "DELIVERED",
        paymentStatus: "SUCCEEDED",
        hasOpenDispute: true,
      }),
    ).toBe("DISPUTE_OPEN");
  });

  it("builds order timeline steps", () => {
    const steps = buildOrderTrustTimeline({
      orderStatus: "DELIVERED",
      protection: "BUYER_CONFIRMATION",
    });
    expect(steps).toHaveLength(6);
    expect(steps.find((s) => s.id === "confirm")?.state).toBe("current");
    expect(steps.find((s) => s.id === "paid")?.state).toBe("done");
    expect(steps.find((s) => s.id === "payout")?.state).toBe("upcoming");
  });
});

describe("dispute states", () => {
  it("allows OPEN → UNDER_REVIEW → RESOLVED_*", () => {
    expect(canTransitionDispute("OPEN", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionDispute("UNDER_REVIEW", "RESOLVED_BUYER")).toBe(true);
    expect(canTransitionDispute("UNDER_REVIEW", "RESOLVED_SELLER")).toBe(true);
    expect(canTransitionDispute("RESOLVED_BUYER", "OPEN")).toBe(false);
  });
});

describe("seller trust score", () => {
  it("scores 0–100 and does not require ranking inputs", () => {
    const low = computeSellerTrustScore({
      ordersCompleted: 0,
      disputesOpened: 0,
      responseTimeHours: null,
      productQualityAvg: null,
      accountAgeDays: 1,
      isVerified: false,
    });
    expect(low.score).toBeGreaterThanOrEqual(0);
    expect(low.score).toBeLessThanOrEqual(100);

    const high = computeSellerTrustScore({
      ordersCompleted: 20,
      disputesOpened: 0,
      responseTimeHours: 2,
      productQualityAvg: 90,
      accountAgeDays: 400,
      isVerified: true,
    });
    expect(high.score).toBeGreaterThanOrEqual(80);
    expect(high.label).toBe("Надёжный продавец");
    expect(high.factors.map((f) => f.key)).toContain("orders_completed");
    expect(high.factors.map((f) => f.key)).toContain("dispute_rate");
  });
});

describe("permissions", () => {
  it("gates timeline by actor + flag", () => {
    process.env.TRUST_SAFETY_ENABLED = "true";
    expect(canViewTrustTimeline("buyer")).toBe(true);
    expect(canViewTrustTimeline("guest")).toBe(false);
    delete process.env.TRUST_SAFETY_ENABLED;
    expect(canViewTrustTimeline("buyer", false)).toBe(false);
  });

  it("buyer confirm and dispute rules", () => {
    expect(canBuyerConfirmReceipt("DELIVERED")).toBe(true);
    expect(canBuyerConfirmReceipt("PAID")).toBe(false);
    expect(
      canBuyerOpenDispute({
        orderStatus: "DELIVERED",
        hasOpenDispute: false,
        isBuyer: true,
      }),
    ).toBe(true);
    expect(
      canBuyerOpenDispute({
        orderStatus: "DELIVERED",
        hasOpenDispute: true,
        isBuyer: true,
      }),
    ).toBe(false);
    expect(canAdminManageDisputes("admin")).toBe(true);
    expect(canAdminManageDisputes("buyer")).toBe(false);
  });
});
