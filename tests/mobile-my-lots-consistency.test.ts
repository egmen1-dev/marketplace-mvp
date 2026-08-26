import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const screenSource = readFileSync("apps/mobile/app/(tabs)/seller-products.tsx", "utf8");
const hookSource = readFileSync("apps/mobile/src/seller/use-seller-products-list.ts", "utf8");
const dataSource = readFileSync("lib/mobile/seller-products-data.ts", "utf8");
const sectionSource = readFileSync("lib/mobile/seller-lots-section.ts", "utf8");
const endpointsSource = readFileSync("apps/mobile/src/api/endpoints.ts", "utf8");
const routeSource = readFileSync("app/api/mobile/seller/products/route.ts", "utf8");

describe("P0 — My LOTs consistency wiring", () => {
  it("uses dedicated hook with request sequencing", () => {
    expect(screenSource).toContain("useSellerProductsList");
    expect(hookSource).toContain("requestSeq");
    expect(hookSource).toContain("requestId !== requestSeq.current");
  });

  it("clears stale rows on tab change", () => {
    expect(hookSource).toContain("setItems([])");
    expect(hookSource).toMatch(/\[tab\]/);
  });

  it("routes tab switches through URL params (authoritative tab state)", () => {
    expect(screenSource).toContain("router.setParams({ tab:");
    expect(screenSource).toContain("resolveInitialTab(params.tab)");
  });

  it("uses server-side search parameter", () => {
    expect(endpointsSource).toContain('search.set("q"');
    expect(dataSource).toContain("titleSearchFilter");
    expect(routeSource).toContain('searchParams.get("q")');
  });

  it("distinguishes search empty state from global empty state", () => {
    expect(screenSource).toContain("По вашему запросу ничего не найдено");
    expect(screenSource).toContain("У вас пока нет ЛОТов");
  });

  it("active tab excludes non-approved ACTIVE rows at query level", () => {
    expect(dataSource).toContain("ModerationStatus.APPROVED");
    expect(dataSource).toContain("whereForTab");
  });

  it("shares canonical section mapping module", () => {
    expect(dataSource).toContain("resolveSellerLotSection");
    expect(dataSource).toContain("sellerSectionLabel");
    expect(sectionSource).toContain("sellerLotSectionMatchesTab");
  });

  it("does not client-filter only for search", () => {
    expect(screenSource).not.toContain("items.filter((item) => item.title");
  });
});
