import { describe, expect, it, afterEach } from "vitest";

import { buildTodayActions } from "@/lib/seller-operating-desk/actions";
import { isSellerOperatingDeskEnabled } from "@/lib/seller-operating-desk/flags";
import { detectOperatingDeskIssues } from "@/lib/seller-operating-desk/issues";
import {
  assertSellerOperatingDeskAccess,
  SellerOperatingDeskForbiddenError,
} from "@/lib/seller-operating-desk/permissions";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

const PREV_FLAG = process.env.SELLER_OPERATING_DESK_ENABLED;

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

const baseStats = {
  totalProducts: 0,
  activeProducts: 0,
  salesCount: 0,
  ordersCount: 0,
  revenue: 0,
  viewsSum: 0,
  favoritesSum: 0,
  lowStockCount: 0,
};

describe("seller operating desk flag", () => {
  afterEach(() => {
    process.env.SELLER_OPERATING_DESK_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_OPERATING_DESK_ENABLED;
    expect(isSellerOperatingDeskEnabled()).toBe(false);
  });
});

describe("detectOperatingDeskIssues", () => {
  it("flags empty store", () => {
    const issues = detectOperatingDeskIssues({
      stats: baseStats,
      signals: baseSignals,
      orderCounters: { newCount: 0, overdue: 0 },
    });
    expect(issues.some((i) => i.id === "no-products")).toBe(true);
  });

  it("flags overdue and new orders", () => {
    const issues = detectOperatingDeskIssues({
      stats: { ...baseStats, activeProducts: 2 },
      signals: baseSignals,
      orderCounters: { newCount: 2, overdue: 1 },
    });
    expect(issues.map((i) => i.id)).toEqual(
      expect.arrayContaining(["overdue-orders", "new-orders"]),
    );
  });

  it("flags views without sales", () => {
    const issues = detectOperatingDeskIssues({
      stats: { ...baseStats, activeProducts: 1 },
      signals: { ...baseSignals, activeProducts: 1, viewsSum: 20 },
      orderCounters: { newCount: 0, overdue: 0 },
    });
    expect(issues.some((i) => i.id === "views-no-sales")).toBe(true);
  });
});

describe("buildTodayActions", () => {
  it("prioritizes journey coach then issues", () => {
    const actions = buildTodayActions({
      coach: {
        headline: "Создайте товар",
        why: "Без товара нет продаж",
        body: "",
        bullets: [],
        ctaLabel: "Создать",
        ctaHref: "/account/products/new",
        tone: "info",
      },
      issues: [
        {
          id: "new-orders",
          severity: "warning",
          title: "Новые заказы",
          description: "",
          why: "Быстро",
          ctaLabel: "Заказы",
          ctaHref: "/account/sales",
        },
      ],
    });
    expect(actions[0]?.id).toBe("journey-coach");
    expect(actions.length).toBeGreaterThan(1);
  });
});

describe("permissions", () => {
  it("requires seller profile", () => {
    expect(() =>
      assertSellerOperatingDeskAccess({ role: "BUYER", sellerProfileId: null }),
    ).toThrow(SellerOperatingDeskForbiddenError);
  });
});
