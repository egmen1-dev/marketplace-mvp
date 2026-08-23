import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const headerSource = readFileSync("apps/mobile/src/components/CommerceHeader.tsx", "utf8");
const indexSource = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const endpointsSource = readFileSync("apps/mobile/src/api/endpoints.ts", "utf8");
const badgesSource = readFileSync("apps/mobile/src/commerce/refresh-tab-badges.ts", "utf8");

describe("mobile commerce header", () => {
  it("exposes LOT brand home navigation", () => {
    expect(headerSource).toContain('router.push("/(tabs)")');
    expect(headerSource).toContain("ЛОТ");
  });

  it("wires search to catalog with focusSearch param", () => {
    expect(headerSource).toContain('focusSearch: "1"');
    expect(catalogSource).toContain("focusSearch");
    expect(catalogSource).toContain("searchInputRef");
  });

  it("wires messages and cart with real badge sources", () => {
    expect(headerSource).toContain("badges.messages");
    expect(headerSource).toContain("badges.cart");
    expect(headerSource).not.toMatch(/badge\s*=\s*\{?\s*3\s*\}?/);
  });

  it("uses CommerceHeader on home and catalog", () => {
    expect(indexSource).toContain("CommerceHeader");
    expect(catalogSource).toContain("CommerceHeader");
  });

  it("cart badge uses shared refreshTabBadges cart count", () => {
    expect(badgesSource).toContain("fetchCart");
    expect(badgesSource).toContain("cart: cartItems.length");
    expect(endpointsSource).toContain("fetchConversationsUnread");
  });
});
