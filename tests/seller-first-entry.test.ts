import { describe, expect, it, afterEach } from "vitest";

import { isSellerFirstEntryEnabled } from "@/lib/seller-first-entry/flags";
import {
  isExperiencedSeller,
  shouldRedirectToSellerStart,
  shouldShowNextStepBanner,
  shouldShowWelcomeScreen,
} from "@/lib/seller-first-entry/eligibility";
import {
  buildFirstEntryJourney,
  computeFirstEntryProgress,
  isFirstEntryComplete,
  resolveFirstEntryStep,
} from "@/lib/seller-first-entry/progress";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

const PREV_FLAG = process.env.SELLER_FIRST_ENTRY_ENABLED;

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

describe("seller first entry flag", () => {
  afterEach(() => {
    process.env.SELLER_FIRST_ENTRY_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_FIRST_ENTRY_ENABLED;
    expect(isSellerFirstEntryEnabled()).toBe(false);
  });
});

describe("resolveFirstEntryStep", () => {
  it("starts at SELLER_START for new seller", () => {
    expect(resolveFirstEntryStep(baseSignals)).toBe("SELLER_START");
  });

  it("detects draft product", () => {
    expect(
      resolveFirstEntryStep({ ...baseSignals, totalProducts: 1 }),
    ).toBe("PRODUCT_CREATED");
  });

  it("detects published product with weak card", () => {
    expect(
      resolveFirstEntryStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 55,
      }),
    ).toBe("PRODUCT_PUBLISHED");
  });

  it("advances through views, order, balance, payout", () => {
    expect(
      resolveFirstEntryStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 80,
      }),
    ).toBe("CARD_IMPROVED");

    expect(
      resolveFirstEntryStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 80,
        viewsSum: 12,
      }),
    ).toBe("FIRST_VIEWS");

    expect(
      resolveFirstEntryStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        bestCompletenessScore: 80,
        viewsSum: 12,
        ordersCount: 1,
      }),
    ).toBe("FIRST_ORDER");

    expect(
      resolveFirstEntryStep({
        ...baseSignals,
        totalProducts: 1,
        activeProducts: 1,
        availableBalance: 5000,
        ordersCount: 1,
      }),
    ).toBe("BALANCE_AVAILABLE");

    expect(
      resolveFirstEntryStep({
        ...baseSignals,
        paidAmount: 2000,
      }),
    ).toBe("FIRST_PAYOUT");
  });
});

describe("first entry journey progress", () => {
  it("shows 0/5 for new seller", () => {
    const step = resolveFirstEntryStep(baseSignals);
    const progress = computeFirstEntryProgress(step);
    expect(progress).toEqual({ current: 1, total: 5 });
    expect(buildFirstEntryJourney(step).filter((j) => j.done)).toHaveLength(0);
  });

  it("marks completed path at FIRST_PAYOUT", () => {
    const step = resolveFirstEntryStep({
      ...baseSignals,
      paidAmount: 1000,
    });
    expect(isFirstEntryComplete(step)).toBe(true);
    expect(computeFirstEntryProgress(step).current).toBe(5);
  });
});

describe("eligibility", () => {
  it("shows welcome for brand-new seller", () => {
    expect(
      shouldShowWelcomeScreen({ signals: baseSignals, experience: null }),
    ).toBe(true);
  });

  it("skips welcome for experienced seller", () => {
    expect(
      isExperiencedSeller({
        ...baseSignals,
        ordersCount: 5,
        activeProducts: 3,
      }),
    ).toBe(true);
    expect(
      shouldShowWelcomeScreen({
        signals: { ...baseSignals, ordersCount: 5, activeProducts: 3 },
        experience: null,
      }),
    ).toBe(false);
  });

  it("redirects to seller-start before onboarding starts", () => {
    expect(
      shouldRedirectToSellerStart({
        signals: baseSignals,
        experience: null,
        pathname: "/account/products",
      }),
    ).toBe(true);
  });

  it("does not redirect after onboarding started", () => {
    expect(
      shouldRedirectToSellerStart({
        signals: baseSignals,
        experience: {
          sellerId: "s1",
          startedAt: new Date().toISOString(),
          completedAt: null,
          dismissedAt: null,
          currentStep: "SELLER_START",
        },
        pathname: "/account/products",
      }),
    ).toBe(false);
  });

  it("shows next step banner until path complete", () => {
    expect(
      shouldShowNextStepBanner({
        signals: {
          ...baseSignals,
          totalProducts: 1,
          activeProducts: 1,
          bestCompletenessScore: 80,
        },
        experience: null,
      }),
    ).toBe(true);

    expect(
      shouldShowNextStepBanner({
        signals: { ...baseSignals, paidAmount: 500 },
        experience: null,
      }),
    ).toBe(false);
  });
});
