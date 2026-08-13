import { describe, expect, it, afterEach } from "vitest";

import {
  buildOperationsNotifications,
  buildTodaySummary,
} from "@/lib/seller-operations/alerts";
import { isSellerOperationsEnabled } from "@/lib/seller-operations/flags";
import { buildOrderOperations } from "@/lib/seller-operations/orders";
import {
  assertSellerOperationsAccess,
  SellerOperationsForbiddenError,
} from "@/lib/seller-operations/permissions";
import { getSellerDailyPriorities } from "@/lib/seller-operations/priorities";
import { buildOperationsEmptyState } from "@/lib/seller-operations/products";
import { buildAiDailyAdvice } from "@/lib/seller-operations/recommendations";
import { buildCandidateTasks } from "@/lib/seller-operations/tasks";
import type { SellerProgressSignals } from "@/lib/seller-lifecycle/progress";

const PREV_FLAG = process.env.SELLER_OPERATIONS_ENABLED;

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

const baseOrders = buildOrderOperations({
  newCount: 0,
  inProgress: 0,
  awaitingShipment: 0,
  readyForPickup: 0,
  overdue: 0,
});

describe("seller operations flag", () => {
  afterEach(() => {
    process.env.SELLER_OPERATIONS_ENABLED = PREV_FLAG;
  });

  it("is off by default", () => {
    delete process.env.SELLER_OPERATIONS_ENABLED;
    expect(isSellerOperationsEnabled()).toBe(false);
  });

  it("is on when env is true", () => {
    process.env.SELLER_OPERATIONS_ENABLED = "true";
    expect(isSellerOperationsEnabled()).toBe(true);
  });
});

describe("getSellerDailyPriorities", () => {
  it("returns at most 5 priorities", () => {
    const orders = buildOrderOperations({
      newCount: 3,
      inProgress: 2,
      awaitingShipment: 2,
      readyForPickup: 1,
      overdue: 1,
    });
    const products = Array.from({ length: 8 }, (_, i) => ({
      id: `no-sales-p${i}`,
      productId: `p${i}`,
      productName: `Product ${i}`,
      type: "no_sales" as const,
      headline: "Товар смотрят, но не покупают",
      reason: `${100 + i} просмотров, 0 заказов`,
      suggestion: "Улучшите карточку",
      views: 100 + i,
      ctaLabel: "Исправить",
      ctaHref: `/account/products/${i}/edit`,
    }));

    const priorities = getSellerDailyPriorities({
      orders,
      products,
      availableBalance: 5000,
      aiAction: {
        title: "Улучшите фото",
        why: "Низкая конверсия",
        ctaLabel: "Сделать",
        ctaHref: "/account/products",
      },
    });

    expect(priorities.length).toBeLessThanOrEqual(5);
    expect(priorities[0]?.rank).toBe(1);
    expect(priorities.every((p) => p.title && p.why && p.ctaHref)).toBe(true);
  });

  it("prioritizes overdue orders over AI advice", () => {
    const orders = buildOrderOperations({
      newCount: 0,
      inProgress: 0,
      awaitingShipment: 0,
      readyForPickup: 0,
      overdue: 2,
    });

    const priorities = getSellerDailyPriorities({
      orders,
      products: [],
      availableBalance: 0,
      aiAction: {
        title: "AI совет",
        why: "Рост",
        ctaLabel: "Сделать",
        ctaHref: "/account/growth",
      },
    });

    expect(priorities[0]?.id).toBe("task-overdue-orders");
  });
});

describe("buildCandidateTasks", () => {
  it("includes order, product, money and growth tasks", () => {
    const tasks = buildCandidateTasks({
      orders: buildOrderOperations({
        newCount: 1,
        inProgress: 0,
        awaitingShipment: 1,
        readyForPickup: 0,
        overdue: 0,
      }),
      products: [
        {
          id: "low-stock-1",
          productId: "1",
          productName: "Drill",
          type: "low_stock",
          headline: "Мало остатков",
          reason: "Осталось: 3 шт.",
          suggestion: "Пополните запас",
          stockLeft: 3,
          ctaLabel: "Добавить остаток",
          ctaHref: "/account/products/1/edit",
        },
      ],
      availableBalance: 8500,
      aiAction: {
        title: "Улучшите фото",
        why: "Конверсия",
        ctaLabel: "Сделать",
        ctaHref: "/account/growth",
      },
    });

    expect(tasks.some((t) => t.category === "order")).toBe(true);
    expect(tasks.some((t) => t.category === "product")).toBe(true);
    expect(tasks.some((t) => t.category === "money")).toBe(true);
    expect(tasks.some((t) => t.category === "growth")).toBe(true);
  });
});

describe("buildOperationsEmptyState", () => {
  it("shows no products state", () => {
    const state = buildOperationsEmptyState({
      activeProducts: 0,
      totalProducts: 0,
      ordersCount: 0,
    });
    expect(state?.kind).toBe("no_products");
    expect(state?.ctaLabel).toBe("Создать товар");
  });

  it("shows no sales state", () => {
    const state = buildOperationsEmptyState({
      activeProducts: 2,
      totalProducts: 2,
      ordersCount: 0,
    });
    expect(state?.kind).toBe("no_sales");
  });

  it("returns null for active sellers with orders", () => {
    const state = buildOperationsEmptyState({
      activeProducts: 2,
      totalProducts: 2,
      ordersCount: 5,
    });
    expect(state).toBeNull();
  });
});

describe("buildTodaySummary", () => {
  it("includes new orders and AI recommendation", () => {
    const aiAdvice = buildAiDailyAdvice({ signals: baseSignals });
    const summary = buildTodaySummary({
      orders: buildOrderOperations({
        newCount: 3,
        inProgress: 0,
        awaitingShipment: 0,
        readyForPickup: 0,
        overdue: 0,
      }),
      productAttentionCount: 2,
      aiAdvice,
      availableBalance: 5000,
      revenue: 45000,
    });

    expect(summary.some((line) => line.id === "new-orders")).toBe(true);
    expect(summary.some((line) => line.id === "products-attention")).toBe(true);
    expect(summary.some((line) => line.id === "ai-rec")).toBe(true);
    expect(summary.some((line) => line.id === "payout")).toBe(true);
  });
});

describe("buildOperationsNotifications", () => {
  it("emits required notification types", () => {
    const aiAdvice = buildAiDailyAdvice({
      signals: { ...baseSignals, viewsSum: 50, activeProducts: 1 },
    });
    const notifications = buildOperationsNotifications({
      orders: buildOrderOperations({
        newCount: 2,
        inProgress: 0,
        awaitingShipment: 0,
        readyForPickup: 0,
        overdue: 1,
      }),
      products: [
        {
          id: "low-stock-1",
          productId: "1",
          productName: "Vacuum",
          type: "low_stock",
          headline: "Мало остатков",
          reason: "Осталось: 3 шт.",
          suggestion: "Пополните запас",
          stockLeft: 3,
          ctaLabel: "Добавить остаток",
          ctaHref: "/account/products/1/edit",
        },
      ],
      aiAdvice,
      availableBalance: 8500,
    });

    const types = notifications.map((n) => n.type);
    expect(types).toEqual(
      expect.arrayContaining([
        "ORDER_ACTION_REQUIRED",
        "PRODUCT_NEEDS_ATTENTION",
        "STOCK_WARNING",
        "AI_DAILY_RECOMMENDATION",
        "PAYOUT_AVAILABLE",
      ]),
    );
  });
});

describe("permissions", () => {
  it("requires seller profile", () => {
    expect(() =>
      assertSellerOperationsAccess({ role: "BUYER", sellerProfileId: null }),
    ).toThrow(SellerOperationsForbiddenError);
  });

  it("allows admin without seller profile", () => {
    expect(() =>
      assertSellerOperationsAccess({ role: "ADMIN", sellerProfileId: null }),
    ).not.toThrow();
  });
});
