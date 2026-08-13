import { describe, expect, it, afterEach } from "vitest";
import { UserRole } from "@prisma/client";

import {
  isDiscoveryAiContextEnabled,
  isDiscoveryCollectionsEnabled,
  isDiscoveryDailyFindsEnabled,
  isDiscoveryPriceGameEnabled,
  isMarketplaceDiscoveryEnabled,
} from "@/lib/marketplace-discovery/flags";
import { DISCOVERY_COLLECTIONS, getDiscoveryCollection } from "@/lib/marketplace-discovery/collection-definitions";
import { assertDiscoveryAdminAccess } from "@/lib/marketplace-discovery/permissions";
import { DISCOVERY_SITUATIONS } from "@/lib/marketplace-discovery/situations";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

const PREV = {
  main: process.env.MARKETPLACE_DISCOVERY_ENABLED,
  daily: process.env.DISCOVERY_DAILY_FINDS_ENABLED,
  collections: process.env.DISCOVERY_COLLECTIONS_ENABLED,
  priceGame: process.env.DISCOVERY_PRICE_GAME_ENABLED,
  ai: process.env.DISCOVERY_AI_CONTEXT_ENABLED,
};

function enableAllDiscoveryFlags() {
  process.env.MARKETPLACE_DISCOVERY_ENABLED = "true";
  process.env.DISCOVERY_DAILY_FINDS_ENABLED = "true";
  process.env.DISCOVERY_COLLECTIONS_ENABLED = "true";
  process.env.DISCOVERY_PRICE_GAME_ENABLED = "true";
  process.env.DISCOVERY_AI_CONTEXT_ENABLED = "true";
}

describe("discovery flags", () => {
  afterEach(() => {
    process.env.MARKETPLACE_DISCOVERY_ENABLED = PREV.main;
    process.env.DISCOVERY_DAILY_FINDS_ENABLED = PREV.daily;
    process.env.DISCOVERY_COLLECTIONS_ENABLED = PREV.collections;
    process.env.DISCOVERY_PRICE_GAME_ENABLED = PREV.priceGame;
    process.env.DISCOVERY_AI_CONTEXT_ENABLED = PREV.ai;
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_DISCOVERY_ENABLED;
    expect(isMarketplaceDiscoveryEnabled()).toBe(false);
  });

  it("requires master flag for sub-flags", () => {
    delete process.env.MARKETPLACE_DISCOVERY_ENABLED;
    process.env.DISCOVERY_DAILY_FINDS_ENABLED = "true";
    expect(isDiscoveryDailyFindsEnabled()).toBe(false);
  });

  it("enables sub-flags when master is on", () => {
    enableAllDiscoveryFlags();
    expect(isMarketplaceDiscoveryEnabled()).toBe(true);
    expect(isDiscoveryDailyFindsEnabled()).toBe(true);
    expect(isDiscoveryCollectionsEnabled()).toBe(true);
    expect(isDiscoveryPriceGameEnabled()).toBe(true);
    expect(isDiscoveryAiContextEnabled()).toBe(true);
  });
});

describe("discovery collections", () => {
  it("defines SEO collections", () => {
    expect(DISCOVERY_COLLECTIONS.length).toBeGreaterThanOrEqual(5);
    expect(getDiscoveryCollection("nakhodki-do-500")?.seoTitle).toContain("500");
  });

  it("returns null for unknown slug", () => {
    expect(getDiscoveryCollection("missing-slug")).toBeNull();
  });
});

describe("discovery situations", () => {
  it("includes gift and home situations", () => {
    expect(DISCOVERY_SITUATIONS.some((s) => s.id === "gift")).toBe(true);
    expect(DISCOVERY_SITUATIONS.some((s) => s.id === "home")).toBe(true);
  });
});

describe("discovery permissions", () => {
  it("requires admin role", () => {
    expect(() => assertDiscoveryAdminAccess(UserRole.BUYER)).toThrow();
    expect(() => assertDiscoveryAdminAccess(UserRole.ADMIN)).not.toThrow();
  });
});

describe("discovery analytics events", () => {
  it("registers discovery event names", () => {
    expect(ANALYTICS_EVENTS.DISCOVERY_VIEW).toBe("discovery_view");
    expect(ANALYTICS_EVENTS.PRICE_GAME_COMPLETED).toBe("price_game_completed");
    expect(ANALYTICS_EVENTS.SITUATION_SELECTED).toBe("situation_selected");
  });
});
