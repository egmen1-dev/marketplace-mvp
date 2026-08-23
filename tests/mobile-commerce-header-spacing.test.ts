import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tabsLayout = readFileSync("apps/mobile/app/(tabs)/_layout.tsx", "utf8");
const indexSource = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const commerceHeader = readFileSync("apps/mobile/src/components/CommerceHeader.tsx", "utf8");
const layoutSource = readFileSync("apps/mobile/src/components/ui/layout.tsx", "utf8");

describe("commerce header spacing — no duplicate tab titles", () => {
  it("hides native stack header on Home tab", () => {
    expect(tabsLayout).toMatch(/name="index"[\s\S]*headerShown:\s*false/);
  });

  it("hides native stack header on Catalog tab", () => {
    expect(tabsLayout).toMatch(/name="catalog"[\s\S]*headerShown:\s*false/);
  });

  it("Home uses CommerceHeader as primary top chrome", () => {
    expect(indexSource).toContain("CommerceHeader");
    expect(indexSource).not.toContain('title: "Главная"');
    expect(indexSource).toContain("compact");
  });

  it("Catalog uses compact CommerceHeader without extra page title", () => {
    expect(catalogSource).toContain("<CommerceHeader compact />");
    expect(catalogSource).not.toContain("AppHeader");
  });

  it("CommerceHeader supports compact reduced top padding", () => {
    expect(commerceHeader).toContain("wrapCompact");
    expect(commerceHeader).toContain("compact ? spacing.xs");
  });

  it("PageScroll compact mode tightens vertical rhythm on Home", () => {
    expect(layoutSource).toContain("scrollContentCompact");
    expect(indexSource).toContain("<PageScroll compact");
  });

  it("Catalog removes excess top container padding", () => {
    expect(catalogSource).toContain("paddingTop: 0");
  });
});
