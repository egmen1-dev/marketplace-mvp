import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { resolveImageUrl } from "../apps/mobile/src/utils/format";

const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const indexSource = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
const cartSource = readFileSync("apps/mobile/app/cart.tsx", "utf8");
const chipSource = readFileSync("apps/mobile/src/components/ui/Chip.tsx", "utf8");
const productCardSource = readFileSync("apps/mobile/src/components/ui/ProductCard.tsx", "utf8");
const bootSource = readFileSync("apps/mobile/src/components/BootSplash.tsx", "utf8");
const betaBannerSource = readFileSync("apps/mobile/src/beta/BetaBanner.tsx", "utf8");
const commerceHeaderSource = readFileSync("apps/mobile/src/components/CommerceHeader.tsx", "utf8");

describe("mobile physical fixes — category UI contract", () => {
  it("Chip uses pill rail dimensions without square aspect ratio", () => {
    expect(chipSource).toContain("maxHeight: 42");
    expect(chipSource).toContain('numberOfLines={1}');
    expect(chipSource).not.toMatch(/aspectRatio:\s*1/);
    expect(chipSource).not.toMatch(/width:\s*88/);
  });

  it("catalog loads full category list for rail (not sliced)", () => {
    expect(catalogSource).toContain("setCategories(list)");
    expect(catalogSource).not.toMatch(/slice\(0,\s*12\)/);
  });

  it("clears stale search when category route param is focused", () => {
    expect(catalogSource).toContain("useFocusEffect");
    expect(catalogSource).toContain('setQ("")');
    expect(indexSource).toContain('params: { categoryId: cat.id, q: "", deals: "0" }');
  });

  it("reset filters clears all filter dimensions", () => {
    expect(catalogSource).toContain("function clearFilters()");
    expect(catalogSource).toContain("setInStockOnly(false)");
    expect(catalogSource).toContain("setDealsOnly(false)");
    expect(catalogSource).toContain('onResetFilters={clearFilters}');
  });
});

describe("mobile physical fixes — cart image data flow", () => {
  it("cart resolves relative image URLs like Home/PDP", () => {
    expect(cartSource).toContain("resolveImageUrl");
    expect(cartSource).toContain("loadAppConfig");
    const resolved = resolveImageUrl("/images/seed/test.jpg", "https://example.com");
    expect(resolved).toBe("https://example.com/images/seed/test.jpg");
  });
});

describe("mobile physical fixes — product card layout invariant", () => {
  it("reserves stable meta row slots for social and views", () => {
    expect(productCardSource).toContain("minHeight: 18");
    expect(productCardSource).toContain("flex: 1");
    expect(productCardSource).toContain("numberOfLines={1}");
    expect(productCardSource).toContain("просм.");
  });
});

describe("mobile physical fixes — boot and beta UX", () => {
  it("BootSplash uses branded logo ring and indeterminate progress", () => {
    expect(bootSource).toContain("logoRing");
    expect(bootSource).toContain("translateX");
    expect(bootSource).not.toContain("width: \"42%\"");
  });

  it("BetaBanner is compact and does not show full version string", () => {
    expect(betaBannerSource).toContain("useSafeAreaInsets");
    expect(betaBannerSource).toContain('"Beta"');
    expect(betaBannerSource).not.toContain("build.appVersion");
  });
});

describe("mobile physical fixes — RC6 regression guard", () => {
  it("preserves CommerceHeader on catalog", () => {
    expect(catalogSource).toContain("CommerceHeader");
    expect(commerceHeaderSource).toContain("/messages");
    expect(commerceHeaderSource).toContain("focusSearch");
  });
});
