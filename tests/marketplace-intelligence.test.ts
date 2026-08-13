import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { detectMarketplaceOpportunities } from "@/lib/marketplace-intelligence/opportunities";
import {
  assertMarketplaceIntelligenceAccess,
  MarketplaceIntelligenceForbiddenError,
} from "@/lib/marketplace-intelligence/queries";
import { generateMarketplaceRecommendations } from "@/lib/marketplace-intelligence/recommendations";
import type { MarketplaceSignal } from "@/lib/marketplace-intelligence/types";

const PREV_FLAG = process.env.MARKETPLACE_INTELLIGENCE_ENABLED;

const sampleSignals: MarketplaceSignal[] = [
  {
    type: "CATEGORY_TREND",
    category: "Электроинструмент",
    severity: "HIGH",
    message: "1200 поисков, низкое предложение",
    metric: 1200,
    source: "analytics.category_search",
  },
  {
    type: "PRODUCT_GAP",
    category: "Дрели",
    severity: "HIGH",
    message: "Высокий спрос, мало качественных предложений",
    metric: 80,
    source: "buyer_demand_vs_supply",
  },
  {
    type: "REVENUE_OPPORTUNITY",
    category: null,
    severity: "HIGH",
    message: "500 товаров имеют просмотры, но 0 продаж",
    metric: 500,
    source: "conversion.views_no_sales",
  },
  {
    type: "BUYER_DEMAND",
    category: "Дрели",
    severity: "HIGH",
    message: "Покупатели ищут «дрель для дома» (42×)",
    metric: 42,
    source: "analytics.search_used",
  },
];

describe("MarketplaceSignal aggregation", () => {
  it("maps category trend to growth opportunity", () => {
    const opportunities = detectMarketplaceOpportunities(sampleSignals);
    expect(opportunities.some((o) => o.title.includes("Электроинструмент"))).toBe(
      true,
    );
  });

  it("maps product gap to seller acquisition action", () => {
    const opportunities = detectMarketplaceOpportunities(sampleSignals);
    const gap = opportunities.find((o) => o.title.includes("Дефицит"));
    expect(gap?.recommendedAction).toContain("продавцов");
  });
});

describe("detectMarketplaceOpportunities", () => {
  it("returns prioritized opportunities with impact", () => {
    const opportunities = detectMarketplaceOpportunities(sampleSignals);
    expect(opportunities.length).toBeGreaterThan(0);
    expect(opportunities[0].impact).toBe("HIGH");
    expect(opportunities[0].reason.length).toBeGreaterThan(0);
  });

  it("builds admin recommendations from opportunities", () => {
    const opportunities = detectMarketplaceOpportunities(sampleSignals);
    const recs = generateMarketplaceRecommendations({
      signals: sampleSignals,
      opportunities,
      revenueOpportunities: [
        {
          title: "Улучшение карточек",
          forecast: "Если улучшить карточки 100 товаров, потенциальный рост конверсии +15%",
          affectedProducts: 100,
          potentialLiftPct: 15,
        },
      ],
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.action.length > 0)).toBe(true);
  });
});

describe("permissions", () => {
  it("allows admin access", () => {
    expect(() => assertMarketplaceIntelligenceAccess("ADMIN")).not.toThrow();
  });

  it("denies non-admin", () => {
    expect(() => assertMarketplaceIntelligenceAccess("SELLER")).toThrow(
      MarketplaceIntelligenceForbiddenError,
    );
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.MARKETPLACE_INTELLIGENCE_ENABLED = "true";
  });
  afterEach(() => {
    process.env.MARKETPLACE_INTELLIGENCE_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isMarketplaceIntelligenceEnabled } = await import(
      "@/lib/marketplace-intelligence/flags"
    );
    expect(isMarketplaceIntelligenceEnabled()).toBe(true);
  });
});
