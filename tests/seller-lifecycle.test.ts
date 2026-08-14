import { describe, expect, it, afterEach } from "vitest";

import { isSellerLifecycleEnabled } from "@/lib/seller-lifecycle/flags";
import {
  buildJourneySteps,
  computeJourneyProgress,
  pickNextJourneyStep,
  resolveLifecycleStage,
} from "@/lib/seller-lifecycle/journey";
import { detectMilestones } from "@/lib/seller-lifecycle/milestones";
import {
  assertAdminSellerLifecycleAccess,
  assertSellerLifecycleAccess,
  SellerLifecycleForbiddenError,
} from "@/lib/seller-lifecycle/permissions";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";
import { buildSellerJourneyCoach } from "@/lib/seller-lifecycle/recommendations";
import { stageIndex } from "@/lib/seller-lifecycle/types";

const PREV_FLAG = process.env.SELLER_LIFECYCLE_ENABLED;

const activatedSignals: SellerProgressSignals = {
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

describe("seller lifecycle flag", () => {
  afterEach(() => {
    process.env.SELLER_LIFECYCLE_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_LIFECYCLE_ENABLED;
    expect(isSellerLifecycleEnabled()).toBe(false);
  });
});

describe("resolveLifecycleStage", () => {
  it("detects seller activated without products", () => {
    expect(resolveLifecycleStage(activatedSignals)).toBe("SELLER_ACTIVATED");
  });

  it("advances through product and order stages", () => {
    expect(
      resolveLifecycleStage({
        ...activatedSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 80,
        viewsSum: 10,
        ordersCount: 3,
        completedOrdersCount: 3,
        availableBalance: 5000,
        completedPayouts: 1,
        paidAmount: 2000,
      }),
    ).toBe("GROWING_SELLER");
  });

  it("detects balance available before payout", () => {
    expect(
      resolveLifecycleStage({
        ...activatedSignals,
        totalProducts: 1,
        activeProducts: 1,
        completedOrdersCount: 1,
        availableBalance: 12500,
      }),
    ).toBe("BALANCE_AVAILABLE");
  });
});

describe("journey steps", () => {
  it("builds 8 steps with next action", () => {
    const stage = resolveLifecycleStage(activatedSignals);
    const steps = buildJourneySteps({ stage, signals: activatedSignals });
    expect(steps).toHaveLength(8);
    expect(steps[0]?.done).toBe(true);
    expect(pickNextJourneyStep(steps)?.id).toBe("product");
  });

  it("computes progress current/total", () => {
    const steps = buildJourneySteps({
      stage: "FIRST_VIEWS",
      signals: { ...activatedSignals, activeProducts: 1, viewsSum: 5 },
    });
    const progress = computeJourneyProgress(steps);
    expect(progress.total).toBe(8);
    expect(progress.current).toBeGreaterThan(1);
  });
});

describe("milestones", () => {
  it("detects first product and first order milestones", () => {
    const milestones = detectMilestones({
      ...activatedSignals,
      activeProducts: 1,
      ordersCount: 1,
    });
    expect(milestones.find((m) => m.type === "FIRST_PRODUCT")?.achievedAt).toBeTruthy();
    expect(milestones.find((m) => m.type === "FIRST_ORDER")?.achievedAt).toBeTruthy();
  });
});

describe("seller journey coach", () => {
  it("guides new seller to create product", () => {
    const coach = buildSellerJourneyCoach({
      stage: "SELLER_ACTIVATED",
      signals: activatedSignals,
    });
    expect(coach.headline).toContain("нет товаров");
    expect(coach.ctaLabel).toBe("Создать товар");
  });

  it("guides seller with available balance to payout", () => {
    const coach = buildSellerJourneyCoach({
      stage: "BALANCE_AVAILABLE",
      signals: { ...activatedSignals, availableBalance: 12500 },
    });
    expect(coach.ctaLabel).toBe("Вывести деньги");
  });
});

describe("permissions", () => {
  it("requires seller profile", () => {
    expect(() =>
      assertSellerLifecycleAccess({ role: "SELLER", sellerProfileId: null }),
    ).toThrow(SellerLifecycleForbiddenError);
  });

  it("requires admin for funnel", () => {
    expect(() => assertAdminSellerLifecycleAccess("SELLER")).toThrow(
      SellerLifecycleForbiddenError,
    );
  });
});

describe("stage ordering", () => {
  it("orders stages monotonically", () => {
    expect(stageIndex("FIRST_PAYOUT")).toBeGreaterThan(stageIndex("SELLER_ACTIVATED"));
  });
});
