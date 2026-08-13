import { describe, expect, it, afterEach } from "vitest";

import { isSellerJourneyEnabled } from "@/lib/seller-journey/flags";
import { detectJourneyMilestones } from "@/lib/seller-journey/milestones";
import {
  assertSellerJourneyAccess,
  SellerJourneyForbiddenError,
} from "@/lib/seller-journey/permissions";
import {
  hasViewsWithoutOrders,
  isJourneyComplete,
  resolveSellerJourneyStep,
} from "@/lib/seller-journey/progress";
import { buildSellerJourneyCoach } from "@/lib/seller-journey/recommendations";
import {
  buildJourneyChecklist,
  computeJourneyProgress,
  pickNextAction,
} from "@/lib/seller-journey/steps";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

const PREV_FLAG = process.env.SELLER_JOURNEY_ENABLED;

const baseSignals: SellerProgressSignals = {
  isSeller: true,
  totalProducts: 0,
  activeProducts: 0,
  bestCompletenessScore: 0,
  viewsSum: 0,
  favoritesSum: 0,
  cartAdds: 0,
  ordersCount: 0,
  completedOrdersCount: 0,
  promotionCampaigns: 0,
  availableBalance: 0,
  pendingBalance: 0,
  paidAmount: 0,
  completedPayouts: 0,
};

describe("seller journey flag", () => {
  afterEach(() => {
    process.env.SELLER_JOURNEY_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_JOURNEY_ENABLED;
    expect(isSellerJourneyEnabled()).toBe(false);
  });
});

describe("resolveSellerJourneyStep", () => {
  it("starts at SELLER_STARTED for new seller", () => {
    expect(resolveSellerJourneyStep(baseSignals)).toBe("SELLER_STARTED");
  });

  it("advances through product, visits, order, payout", () => {
    expect(
      resolveSellerJourneyStep({ ...baseSignals, totalProducts: 1 }),
    ).toBe("FIRST_PRODUCT_CREATED");

    expect(
      resolveSellerJourneyStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 55,
      }),
    ).toBe("PRODUCT_PUBLISHED");

    expect(
      resolveSellerJourneyStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 80,
      }),
    ).toBe("PRODUCT_READY");

    expect(
      resolveSellerJourneyStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 80,
        viewsSum: 3,
      }),
    ).toBe("FIRST_VISITS");

    expect(
      resolveSellerJourneyStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        ordersCount: 1,
      }),
    ).toBe("FIRST_ORDER");

    expect(
      resolveSellerJourneyStep({ ...baseSignals, paidAmount: 1000 }),
    ).toBe("FIRST_PAYOUT");
  });
});

describe("journey progress", () => {
  it("computes checklist and percent", () => {
    const step = resolveSellerJourneyStep(baseSignals);
    const checklist = buildJourneyChecklist(step);
    const progress = computeJourneyProgress(checklist);
    expect(progress.total).toBe(6);
    expect(progress.current).toBeGreaterThan(0);
    expect(progress.percent).toBeGreaterThanOrEqual(0);
    expect(pickNextAction(checklist)?.id).toBe("product");
  });

  it("marks journey complete at payout", () => {
    const step = resolveSellerJourneyStep({ ...baseSignals, paidAmount: 500 });
    expect(isJourneyComplete(step)).toBe(true);
  });
});

describe("coach and milestones", () => {
  it("builds coach with why for empty store", () => {
    const step = resolveSellerJourneyStep(baseSignals);
    const coach = buildSellerJourneyCoach({ step, signals: baseSignals });
    expect(coach.headline).toContain("товар");
    expect(coach.why.length).toBeGreaterThan(0);
    expect(coach.ctaHref).toContain("/account/products/new");
  });

  it("detects views without orders", () => {
    expect(
      hasViewsWithoutOrders({
        ...baseSignals,
        viewsSum: 10,
        ordersCount: 0,
      }),
    ).toBe(true);
  });

  it("detects milestones", () => {
    const milestones = detectJourneyMilestones({
      ...baseSignals,
      activeProducts: 1,
      viewsSum: 5,
      ordersCount: 1,
    });
    expect(milestones.filter((m) => m.achievedAt)).toHaveLength(3);
  });
});

describe("permissions", () => {
  it("requires seller profile", () => {
    expect(() =>
      assertSellerJourneyAccess({ role: "BUYER", sellerProfileId: null }),
    ).toThrow(SellerJourneyForbiddenError);
  });
});
