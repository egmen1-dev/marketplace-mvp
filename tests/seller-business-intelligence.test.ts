import { describe, expect, it, afterEach } from "vitest";

import { buildSellerAssistant } from "@/lib/seller-business-intelligence/assistant";
import { buildGrowthDiagnosis, countPromotionReady } from "@/lib/seller-business-intelligence/diagnosis";
import { buildSmartEmptyState } from "@/lib/seller-business-intelligence/empty-states";
import { isSellerBusinessIntelligenceEnabled } from "@/lib/seller-business-intelligence/flags";
import { buildMoneyEducation } from "@/lib/seller-business-intelligence/money";
import { buildNextBusinessAction } from "@/lib/seller-business-intelligence/next-action";
import { buildBusinessNotifications } from "@/lib/seller-business-intelligence/notifications";
import {
  assertSellerBusinessIntelligenceAccess,
  SellerBusinessIntelligenceForbiddenError,
} from "@/lib/seller-business-intelligence/permissions";
import { buildPromotionInsight } from "@/lib/seller-business-intelligence/promotion";
import { buildBusinessSummary, detectMainProblem } from "@/lib/seller-business-intelligence/summary";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

const PREV_FLAG = process.env.SELLER_BUSINESS_INTELLIGENCE_ENABLED;

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

describe("seller business intelligence flag", () => {
  afterEach(() => {
    process.env.SELLER_BUSINESS_INTELLIGENCE_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_BUSINESS_INTELLIGENCE_ENABLED;
    expect(isSellerBusinessIntelligenceEnabled()).toBe(false);
  });

  it("is on when env is true", () => {
    process.env.SELLER_BUSINESS_INTELLIGENCE_ENABLED = "true";
    expect(isSellerBusinessIntelligenceEnabled()).toBe(true);
  });
});

describe("detectMainProblem", () => {
  it("flags empty store", () => {
    expect(detectMainProblem(baseSignals)).toMatch(/пуст/i);
  });

  it("flags views without orders", () => {
    expect(
      detectMainProblem({
        ...baseSignals,
        activeProducts: 1,
        viewsSum: 50,
      }),
    ).toMatch(/не принимают решение/i);
  });
});

describe("buildNextBusinessAction", () => {
  it("returns single create-product action for new seller", () => {
    const action = buildNextBusinessAction({
      signals: baseSignals,
      topPriority: null,
      journeyCoach: null,
    });
    expect(action.id).toBe("create-product");
    expect(action.ctaHref).toContain("/account/products/new");
  });

  it("prefers top priority when present", () => {
    const action = buildNextBusinessAction({
      signals: { ...baseSignals, activeProducts: 2 },
      topPriority: {
        rank: 1,
        id: "task-new-orders",
        category: "order",
        priority: "high",
        title: "Обработайте новый заказ",
        why: "Покупатель ждёт",
        ctaLabel: "Открыть",
        ctaHref: "/account/sales",
      },
      journeyCoach: null,
    });
    expect(action.id).toBe("task-new-orders");
  });
});

describe("buildGrowthDiagnosis", () => {
  it("detects weak cards and sales funnel issues", () => {
    const problems = buildGrowthDiagnosis({
      signals: { ...baseSignals, activeProducts: 2, viewsSum: 300, ordersCount: 0 },
      products: [
        {
          id: "weak-1",
          productId: "1",
          productName: "Drill",
          type: "weak_card",
          headline: "Слабая карточка",
          reason: "Качество: 55 / 100",
          suggestion: "фото",
          qualityScore: 55,
          ctaLabel: "Исправить",
          ctaHref: "/account/products/1/edit",
        },
      ],
      weakCardCount: 1,
      lowStockCount: 0,
      promotionReadyCount: 0,
    });
    expect(problems.some((p) => p.category === "product_cards")).toBe(true);
    expect(problems.some((p) => p.category === "sales")).toBe(true);
  });
});

describe("buildMoneyEducation", () => {
  it("explains pending and available balances", () => {
    const education = buildMoneyEducation({
      balance: {
        pendingAmount: 15000,
        availableAmount: 8500,
        paidAmount: 20000,
      },
      payoutEnabled: true,
    });
    expect(education.pendingExplanation).toMatch(/не завершён/i);
    expect(education.availableExplanation).toMatch(/можно вывести/i);
    expect(education.flowSteps).toHaveLength(5);
  });
});

describe("buildPromotionInsight", () => {
  it("recommends promotion when card is strong", () => {
    const insight = buildPromotionInsight({
      signals: {
        ...baseSignals,
        activeProducts: 1,
        viewsSum: 40,
        bestCompletenessScore: 80,
      },
      topProductName: "Drill",
    });
    expect(insight.headline).toMatch(/потенциал/i);
    expect(insight.bullets.length).toBeGreaterThan(0);
  });
});

describe("buildSmartEmptyState", () => {
  it("shows no products state", () => {
    const state = buildSmartEmptyState({ signals: baseSignals });
    expect(state?.kind).toBe("no_products");
  });

  it("shows no sales state", () => {
    const state = buildSmartEmptyState({
      signals: { ...baseSignals, totalProducts: 1, activeProducts: 1 },
    });
    expect(state?.kind).toBe("no_sales");
  });
});

describe("buildBusinessNotifications", () => {
  it("emits milestone on first sale", () => {
    const notifications = buildBusinessNotifications({
      signals: { ...baseSignals, ordersCount: 1 },
      nextAction: {
        id: "x",
        title: "Step",
        why: "Why",
        benefit: "Benefit",
        ctaLabel: "Go",
        ctaHref: "/account",
      },
      problems: [],
    });
    expect(notifications.some((n) => n.type === "SELLER_MILESTONE")).toBe(true);
  });
});

describe("buildBusinessSummary", () => {
  it("builds period lines from metrics", () => {
    const summary = buildBusinessSummary({
      signals: { ...baseSignals, activeProducts: 1 },
      metrics: {
        viewsTotal: 340,
        cartAdds7d: 12,
        orders7d: 0,
        ordersTotal: 0,
      },
      mainProblem: "Покупатели смотрят товар, но не принимают решение.",
      nextStepHint: "Улучшите карточку",
    });
    expect(summary.periodLines.some((l) => l.includes("340"))).toBe(true);
    expect(summary.mainProblem).toBeTruthy();
  });
});

describe("buildSellerAssistant", () => {
  it("lists strengths and improvements", () => {
    const assistant = buildSellerAssistant({
      signals: {
        ...baseSignals,
        activeProducts: 2,
        bestCompletenessScore: 75,
        viewsSum: 10,
      },
      products: [],
      nextActionTitle: "Улучшите карточку",
      nextActionHref: "/account/products",
    });
    expect(assistant.strengths.length).toBeGreaterThan(0);
    expect(assistant.nextStep).toBe("Улучшите карточку");
  });
});

describe("countPromotionReady", () => {
  it("returns count when seller is promotion-ready", () => {
    const count = countPromotionReady({
      signals: {
        ...baseSignals,
        activeProducts: 2,
        viewsSum: 30,
        bestCompletenessScore: 80,
      },
      products: [
        {
          id: "low-1",
          productId: "1",
          productName: "X",
          type: "low_stock",
          headline: "Мало",
          reason: "3",
          suggestion: "Пополнить",
          ctaLabel: "Go",
          ctaHref: "/account/products/1/edit",
        },
      ],
    });
    expect(count).toBeGreaterThan(0);
  });
});

describe("permissions", () => {
  it("requires seller profile", () => {
    expect(() =>
      assertSellerBusinessIntelligenceAccess({
        role: "BUYER",
        sellerProfileId: null,
      }),
    ).toThrow(SellerBusinessIntelligenceForbiddenError);
  });
});
