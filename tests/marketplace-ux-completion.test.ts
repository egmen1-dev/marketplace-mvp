import { describe, expect, it, afterEach } from "vitest";
import { UserRole } from "@prisma/client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { ROUTES } from "@/lib/constants";
import { isMarketplaceUxCompletionEnabled } from "@/lib/marketplace-ux-completion/flags";
import {
  getEmptyStateById,
  getFavoritesEmptyState,
  getOrdersEmptyState,
  getSellerProductsEmptyState,
} from "@/lib/marketplace-ux-completion/empty-states";
import {
  BUYER_UX_NAV,
  SELLER_UX_NAV,
  uxNavForMode,
} from "@/lib/marketplace-ux-completion/navigation";
import { buildSettingsSections } from "@/lib/marketplace-ux-completion/settings";
import { assertUxCompletionAdminAccess } from "@/lib/marketplace-ux-completion/permissions";

const PREV = process.env.MARKETPLACE_UX_COMPLETION_ENABLED;

describe("ux completion flags", () => {
  afterEach(() => {
    if (PREV === undefined) {
      delete process.env.MARKETPLACE_UX_COMPLETION_ENABLED;
    } else {
      process.env.MARKETPLACE_UX_COMPLETION_ENABLED = PREV;
    }
  });

  it("is off by default", () => {
    delete process.env.MARKETPLACE_UX_COMPLETION_ENABLED;
    expect(isMarketplaceUxCompletionEnabled()).toBe(false);
  });

  it("enables when env is true", () => {
    process.env.MARKETPLACE_UX_COMPLETION_ENABLED = "true";
    expect(isMarketplaceUxCompletionEnabled()).toBe(true);
  });
});

describe("ux completion navigation", () => {
  it("defines buyer nav with discovery and profile", () => {
    expect(BUYER_UX_NAV.some((n) => n.href === ROUTES.DISCOVER)).toBe(true);
    expect(BUYER_UX_NAV.some((n) => n.href === ROUTES.ACCOUNT)).toBe(true);
  });

  it("defines seller nav with business and money", () => {
    expect(SELLER_UX_NAV.some((n) => n.href === ROUTES.ACCOUNT_BUSINESS)).toBe(true);
    expect(SELLER_UX_NAV.some((n) => n.href === ROUTES.ACCOUNT_BALANCE)).toBe(true);
  });

  it("switches nav by account mode", () => {
    expect(uxNavForMode("buyer")).toEqual(BUYER_UX_NAV);
    expect(uxNavForMode("seller")).toEqual(SELLER_UX_NAV);
  });
});

describe("ux completion empty states", () => {
  it("provides favorites empty state with catalog CTA", () => {
    const state = getFavoritesEmptyState();
    expect(state.id).toBe("favorites");
    expect(state.ctaHref).toBe(ROUTES.CATALOG);
    expect(state.bullets.length).toBeGreaterThan(0);
  });

  it("provides orders empty state", () => {
    const state = getOrdersEmptyState();
    expect(state.id).toBe("orders");
    expect(state.ctaHref).toBe(ROUTES.CATALOG);
  });

  it("provides seller products empty state", () => {
    const state = getSellerProductsEmptyState();
    expect(state.id).toBe("seller-products");
    expect(state.ctaHref).toBe(ROUTES.ACCOUNT_PRODUCTS_NEW);
  });

  it("resolves empty state by id", () => {
    expect(getEmptyStateById("favorites")?.title).toContain("находки");
    expect(getEmptyStateById("unknown")).toBeNull();
  });
});

describe("ux completion settings", () => {
  it("includes seller sales section for sellers", () => {
    const sections = buildSettingsSections(true);
    expect(sections.some((s) => s.id === "sales")).toBe(true);
  });

  it("omits seller sales section for buyers", () => {
    const sections = buildSettingsSections(false);
    expect(sections.some((s) => s.id === "sales")).toBe(false);
  });
});

describe("ux completion permissions", () => {
  it("requires admin role", () => {
    expect(() => assertUxCompletionAdminAccess(UserRole.BUYER)).toThrow();
    expect(() => assertUxCompletionAdminAccess(UserRole.ADMIN)).not.toThrow();
  });
});

describe("ux completion analytics events", () => {
  it("registers ux event names", () => {
    expect(ANALYTICS_EVENTS.UX_PAGE_VIEW).toBe("ux_page_view");
    expect(ANALYTICS_EVENTS.ONBOARDING_STARTED).toBe("onboarding_started");
    expect(ANALYTICS_EVENTS.ONBOARDING_COMPLETED).toBe("onboarding_completed");
    expect(ANALYTICS_EVENTS.EMPTY_STATE_VIEW).toBe("empty_state_view");
    expect(ANALYTICS_EVENTS.ACCOUNT_MODE_SWITCH).toBe("account_mode_switch");
    expect(ANALYTICS_EVENTS.AI_EXPLANATION_VIEW).toBe("ai_explanation_view");
  });
});
