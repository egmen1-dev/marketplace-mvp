import { describe, expect, it, afterEach } from "vitest";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import {
  buildTrustAchievements,
  buildHistoryTimeline,
  buildTrustNextStep,
  buildTrustScoreNotifications,
  computeTrendSummary,
  getTrustLevelUx,
  isMarketplaceTrustExperienceEnabled,
} from "@/lib/marketplace-trust-experience";
import type { SellerMetricsInput } from "@/lib/marketplace-trust-score/calculator";
import type { TrustScoreHistoryEntry } from "@/lib/marketplace-trust-score/types";

const PREV = process.env.MARKETPLACE_TRUST_EXPERIENCE_ENABLED;

const emptyMetrics: SellerMetricsInput = {
  products: [{ imageCount: 1, hasPrimary: true, characteristicCount: 0, descriptionLength: 0 }],
  completedOrders: 0,
  cancelledBySeller: 0,
  problematicOrders: 0,
  shippingHoursSamples: [],
  averageReviewRating: 0,
  reviewsCount: 0,
  activeProducts: 1,
  recentProductUpdates: 0,
  phoneVerified: false,
  paymentVerified: false,
  isVerified: false,
};

describe("trust experience flag", () => {
  afterEach(() => {
    if (PREV === undefined) delete process.env.MARKETPLACE_TRUST_EXPERIENCE_ENABLED;
    else process.env.MARKETPLACE_TRUST_EXPERIENCE_ENABLED = PREV;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_TRUST_EXPERIENCE_ENABLED;
    expect(isMarketplaceTrustExperienceEnabled()).toBe(false);
  });
});

describe("trust levels ux", () => {
  it("maps score to motivational labels", () => {
    expect(getTrustLevelUx(95).label).toBe("Высокое доверие");
    expect(getTrustLevelUx(80).label).toBe("Хороший продавец");
    expect(getTrustLevelUx(60).label).toBe("Есть возможности роста");
    expect(getTrustLevelUx(30).label).toBe("Нужно внимание");
  });
});

describe("next step", () => {
  it("returns single actionable improvement", () => {
    const step = buildTrustNextStep({
      ...emptyMetrics,
      products: [
        { imageCount: 1, hasPrimary: true, characteristicCount: 2, descriptionLength: 10 },
        { imageCount: 1, hasPrimary: true, characteristicCount: 1, descriptionLength: 5 },
        { imageCount: 1, hasPrimary: true, characteristicCount: 0, descriptionLength: 0 },
      ],
    });
    expect(step?.title).toContain("фото");
    expect(step?.why).toContain("3");
    expect(step?.ctaLabel).toBe("Исправить");
  });
});

describe("history timeline", () => {
  it("adds advice to each entry", () => {
    const history: TrustScoreHistoryEntry[] = [
      {
        id: "1",
        oldScore: 90,
        newScore: 87,
        delta: -3,
        reason: "Заказ отправлен через 4 дня",
        eventType: "ORDER_SHIPPED",
        createdAt: new Date().toISOString(),
      },
    ];
    const timeline = buildHistoryTimeline(history);
    expect(timeline[0]?.advice).toContain("быстрее");
  });

  it("computes 30-day trend", () => {
    const now = new Date();
    const history: TrustScoreHistoryEntry[] = [
      {
        id: "1",
        oldScore: 84,
        newScore: 88,
        delta: 4,
        reason: "Быстро отправляете заказы",
        eventType: "ORDER_SHIPPED",
        createdAt: now.toISOString(),
      },
    ];
    const trend = computeTrendSummary({ history, windowDays: 30 });
    expect(trend.delta).toBe(4);
    expect(trend.direction).toBe("up");
  });
});

describe("achievements", () => {
  it("unlocks fast seller achievement", () => {
    const achievements = buildTrustAchievements({
      ...emptyMetrics,
      shippingHoursSamples: Array.from({ length: 50 }, () => 20),
    });
    expect(achievements.find((a) => a.id === "fast_seller")?.unlocked).toBe(true);
  });
});

describe("notifications", () => {
  it("builds up and down score notifications", () => {
    const notes = buildTrustScoreNotifications([
      {
        id: "up",
        oldScore: 85,
        newScore: 87,
        delta: 2,
        reason: "5 успешных доставок подряд",
        eventType: "ORDER_DELIVERED",
        createdAt: new Date().toISOString(),
      },
      {
        id: "down",
        oldScore: 90,
        newScore: 87,
        delta: -3,
        reason: "Заказ отправлен позже срока",
        eventType: "ORDER_SHIPPED",
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(notes[0]?.title).toContain("+2");
    expect(notes[1]?.action).toContain("быстрее");
  });
});

describe("analytics events", () => {
  it("registers trust experience events", () => {
    expect(ANALYTICS_EVENTS.TRUST_CENTER_VIEW).toBe("trust_center_view");
    expect(ANALYTICS_EVENTS.TRUST_FACTOR_OPEN).toBe("trust_factor_open");
    expect(ANALYTICS_EVENTS.TRUST_HISTORY_VIEW).toBe("trust_history_view");
    expect(ANALYTICS_EVENTS.TRUST_IMPROVEMENT_CLICK).toBe("trust_improvement_click");
    expect(ANALYTICS_EVENTS.TRUST_LEVEL_REACHED).toBe("trust_level_reached");
  });
});
