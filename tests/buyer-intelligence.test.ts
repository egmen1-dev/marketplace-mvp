import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { buildBuyerProfile } from "@/lib/buyer-intelligence/buyer-profile";
import {
  parseBuyerIntent,
  purchaseIntentLabel,
} from "@/lib/buyer-intelligence/intent-parser";
import {
  computeBuyerProductMatch,
  generateBuyerRecommendations,
} from "@/lib/buyer-intelligence/recommendations";
import { understandSearchQuery } from "@/lib/buyer-intelligence/search-understanding";
import { MATCH_WEIGHTS } from "@/lib/buyer-intelligence/types";

const PREV_FLAG = process.env.BUYER_INTELLIGENCE_ENABLED;

describe("BuyerIntent parser", () => {
  it("detects household repair drill query", () => {
    const intent = parseBuyerIntent("дрель для дома");
    expect(intent.category).toBe("Дрели");
    expect(intent.intent).toBe("HOUSEHOLD_REPAIR");
    expect(intent.buyerLevel).toBe("BEGINNER");
    expect(intent.needs).toContain("простота");
  });

  it("maps research vs ready-to-buy purchase intent", () => {
    expect(parseBuyerIntent("посоветуй хороший ноутбук").purchaseIntent).toBe(
      "RESEARCH",
    );
    expect(parseBuyerIntent("купить айфон 15 сегодня").purchaseIntent).toBe(
      "URGENT_PURCHASE",
    );
    expect(parseBuyerIntent("купить дрель").purchaseIntent).toBe(
      "READY_TO_BUY",
    );
  });

  it("extracts budget from query", () => {
    const intent = parseBuyerIntent("дрель до 5000 руб");
    expect(intent.budget).toBe(5000);
  });

  it("exposes human labels", () => {
    expect(purchaseIntentLabel("RESEARCH")).toContain("Изучает");
  });
});

describe("BuyerProfile", () => {
  it("returns anonymous defaults", async () => {
    const profile = await buildBuyerProfile(null);
    expect(profile.buyerType).toBe("GENERAL");
    expect(profile.viewedProductCount).toBe(0);
  });
});

describe("Search understanding", () => {
  it("enriches intent with profile budget hint", () => {
    const understanding = understandSearchQuery("дрель", {
      buyerType: "HOME_USER",
      favoriteCategories: ["Дрели"],
      priceSensitivity: "HIGH",
      recentSearchQueries: [],
      viewedProductCount: 3,
      cartItemCount: 1,
      purchaseCount: 0,
      averageViewPrice: 4000,
      viewedProductIds: [],
    });
    expect(understanding.intent.budget).toBe(4800);
    expect(understanding.summary).toContain("Бюджет");
  });
});

describe("BuyerProductMatchScore", () => {
  it("weights sum to 100", () => {
    const total = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("scores candidate with explanations", () => {
    const intent = parseBuyerIntent("дрель для дома до 5000");
    const profile = {
      buyerType: "HOME_USER" as const,
      favoriteCategories: ["Дрели"],
      priceSensitivity: "HIGH" as const,
      recentSearchQueries: [],
      viewedProductCount: 0,
      cartItemCount: 0,
      purchaseCount: 0,
      averageViewPrice: null,
      viewedProductIds: [],
    };
    const match = computeBuyerProductMatch(
      {
        id: "p1",
        title: "Дрель ударная для дома",
        category: "Дрели",
        price: 4500,
        currency: "RUB",
        stock: 5,
        imageUrl: null,
        seller: { isVerified: true, rating: 4.8 },
      },
      intent,
      profile,
    );
    expect(match.matchScore).toBeGreaterThanOrEqual(50);
    expect(match.reasons.length).toBeGreaterThan(0);
  });
});

describe("generateBuyerRecommendations", () => {
  it("returns ranked items with mandatory reasons", () => {
    const intent = parseBuyerIntent("дрель для дома");
    const profile = {
      buyerType: "HOME_USER" as const,
      favoriteCategories: [],
      priceSensitivity: "MEDIUM" as const,
      recentSearchQueries: [],
      viewedProductCount: 0,
      cartItemCount: 0,
      purchaseCount: 0,
      averageViewPrice: null,
      viewedProductIds: [],
    };
    const recs = generateBuyerRecommendations(
      [
        {
          id: "a",
          title: "Дрель бытовая",
          category: "Дрели",
          price: 3000,
          currency: "RUB",
          stock: 2,
          imageUrl: null,
          seller: { isVerified: true, rating: 4.5 },
        },
        {
          id: "b",
          title: "Ноутбук игровой",
          category: "Электроника",
          price: 90000,
          currency: "RUB",
          stock: 1,
          seller: { isVerified: false, rating: 3 },
        },
      ],
      intent,
      profile,
    );
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].productId).toBe("a");
    expect(recs[0].reason).toContain("Подходит потому что");
    expect(recs[0].reasons.length).toBeGreaterThan(0);
    expect(recs[0].confidence).toBeGreaterThan(0);
  });
});

describe("Feature flag", () => {
  beforeEach(() => {
    process.env.BUYER_INTELLIGENCE_ENABLED = "true";
  });
  afterEach(() => {
    process.env.BUYER_INTELLIGENCE_ENABLED = PREV_FLAG;
  });

  it("is enabled when env true", async () => {
    const { isBuyerIntelligenceEnabled } = await import(
      "@/lib/buyer-intelligence/flags"
    );
    expect(isBuyerIntelligenceEnabled()).toBe(true);
  });
});
