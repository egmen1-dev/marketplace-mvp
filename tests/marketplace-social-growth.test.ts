import { describe, expect, it, afterEach } from "vitest";
import { UserRole } from "@prisma/client";

import {
  isMarketplaceSocialGrowthEnabled,
  isSocialShareCardsEnabled,
  isSocialCollectionsEnabled,
  isSocialCreatorEnabled,
} from "@/lib/marketplace-social-growth/flags";
import { SOCIAL_LANDING_PAGES, getSocialLandingPage } from "@/lib/marketplace-social-growth/landing-definitions";
import { buildViralFormat, VIRAL_FORMAT_OPTIONS } from "@/lib/marketplace-social-growth/viral-formats";
import { assertSocialGrowthAdminAccess } from "@/lib/marketplace-social-growth/permissions";
import { detectProhibitedProduct } from "@/lib/marketplace-trust-loop/risk/prohibited-products";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

const PREV = {
  main: process.env.MARKETPLACE_SOCIAL_GROWTH_ENABLED,
  share: process.env.SOCIAL_SHARE_CARDS_ENABLED,
  collections: process.env.SOCIAL_COLLECTIONS_ENABLED,
  creator: process.env.SOCIAL_CREATOR_ENABLED,
};

function enableAllSocialFlags() {
  process.env.MARKETPLACE_SOCIAL_GROWTH_ENABLED = "true";
  process.env.SOCIAL_SHARE_CARDS_ENABLED = "true";
  process.env.SOCIAL_COLLECTIONS_ENABLED = "true";
  process.env.SOCIAL_CREATOR_ENABLED = "true";
}

const sampleProduct = {
  id: "p1",
  title: "Дрель Kolner",
  slug: "drel",
  description: "Инструмент",
  price: 1490,
  compareAt: 4990,
  currency: "RUB",
  stock: 3,
  city: "Москва",
  condition: "NEW" as const,
  status: "ACTIVE" as const,
  views: 120,
  favoritesCount: 12,
  createdAt: new Date().toISOString(),
  category: null,
  primaryImage: null,
  seller: { id: "s1", storeName: "Shop", slug: "shop" },
};

describe("social growth flags", () => {
  afterEach(() => {
    process.env.MARKETPLACE_SOCIAL_GROWTH_ENABLED = PREV.main;
    process.env.SOCIAL_SHARE_CARDS_ENABLED = PREV.share;
    process.env.SOCIAL_COLLECTIONS_ENABLED = PREV.collections;
    process.env.SOCIAL_CREATOR_ENABLED = PREV.creator;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_SOCIAL_GROWTH_ENABLED;
    expect(isMarketplaceSocialGrowthEnabled()).toBe(false);
  });

  it("enables sub-flags with master flag", () => {
    enableAllSocialFlags();
    expect(isSocialShareCardsEnabled()).toBe(true);
    expect(isSocialCollectionsEnabled()).toBe(true);
    expect(isSocialCreatorEnabled()).toBe(true);
  });
});

describe("viral formats", () => {
  it("builds price surprise format", () => {
    const content = buildViralFormat("price-surprise", sampleProduct, ["Рейтинг 4.9"]);
    expect(content.headline).toContain("₽");
    expect(content.bullets.length).toBeGreaterThan(0);
  });

  it("defines seller format options", () => {
    expect(VIRAL_FORMAT_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });
});

describe("social landing pages", () => {
  it("includes gifts and under-1000 pages", () => {
    expect(SOCIAL_LANDING_PAGES.length).toBeGreaterThanOrEqual(5);
    expect(getSocialLandingPage("gifts")?.maxPrice).toBe(5000);
    expect(getSocialLandingPage("under-1000")?.maxPrice).toBe(1000);
  });
});

describe("trust restrictions", () => {
  it("blocks prohibited products", () => {
    expect(detectProhibitedProduct({ name: "Пистолет игрушечный" }).hit).toBe(true);
  });
});

describe("permissions", () => {
  it("requires admin for social growth admin", () => {
    expect(() => assertSocialGrowthAdminAccess(UserRole.BUYER)).toThrow();
  });
});

describe("social analytics events", () => {
  it("registers social growth events", () => {
    expect(ANALYTICS_EVENTS.SHARE_CARD_VIEW).toBe("share_card_view");
    expect(ANALYTICS_EVENTS.SOCIAL_PURCHASE).toBe("social_purchase");
  });
});
