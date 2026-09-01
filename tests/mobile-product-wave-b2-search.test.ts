import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  createSuggestRequestGeneration,
  normalizeSearchQuery,
  SEARCH_DEBOUNCE_MS,
  SEARCH_HISTORY_LIMIT,
  shouldRequestSuggestions,
  updateSearchHistory,
} from "../apps/mobile/src/commerce/search-state";
import {
  buildCatalogQueryKey,
  canRequestCatalogPage,
  createRequestGeneration,
  isStaleCatalogRequest,
} from "../apps/mobile/src/commerce/catalog-query";

const catalogSource = readFileSync(
  "apps/mobile/app/(tabs)/catalog.tsx",
  "utf8",
);
const panelSource = readFileSync(
  "apps/mobile/src/catalog/ui/CatalogSearchPanel.tsx",
  "utf8",
);
const historySource = readFileSync(
  "apps/mobile/src/storage/search-history.ts",
  "utf8",
);

describe("Product Wave B2 — suggest lifecycle", () => {
  it("WB-B2-01/02 — skips empty and one-character input", () => {
    expect(shouldRequestSuggestions("")).toBe(false);
    expect(shouldRequestSuggestions(" i ")).toBe(false);
  });

  it("WB-B2-03 — requests >=2 characters after the 300ms contract", () => {
    expect(shouldRequestSuggestions(" ip ")).toBe(true);
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
    expect(catalogSource).toContain("setTimeout(() =>");
    expect(catalogSource).toContain("fetchProductSuggest(query)");
  });

  it("WB-B2-04/05 — stale responses are ignored and latest wins", () => {
    const requests = createSuggestRequestGeneration();
    const oldRequest = requests.invalidate();
    const latestRequest = requests.invalidate();
    expect(requests.isCurrent(oldRequest)).toBe(false);
    expect(requests.isCurrent(latestRequest)).toBe(true);
  });

  it("WB-B2-06/18 — clear invalidates pending suggestions", () => {
    const requests = createSuggestRequestGeneration();
    const pending = requests.next();
    requests.invalidate();
    expect(requests.isCurrent(pending)).toBe(false);
    expect(catalogSource).toContain(
      "suggestGenerationRef.current.invalidate()",
    );
  });

  it("WB-B2-07 — suggest failure remains local and non-fatal", () => {
    const suggestCall = catalogSource.slice(
      catalogSource.indexOf("fetchProductSuggest(query)"),
      catalogSource.indexOf("const openSearch"),
    );
    expect(suggestCall).toContain(".catch(() =>");
    expect(suggestCall).toContain("setSuggestions([])");
    expect(suggestCall).not.toContain("setError(");
  });
});

describe("Product Wave B2 — commit and history", () => {
  it("WB-B2-08/09 — manual submit commits normalized query and persists once", () => {
    expect(normalizeSearchQuery("  iphone   15  ")).toBe("iphone 15");
    expect(catalogSource).toContain(
      "onSubmit={() => void commitSearch(inputQuery)}",
    );
    const commitBlock = catalogSource.slice(
      catalogSource.indexOf("async function commitSearch"),
      catalogSource.indexOf("function clearSearch"),
    );
    expect(commitBlock.match(/pushSearchHistory\(/g)).toHaveLength(1);
  });

  it("WB-B2-10/11 — suggestion selection uses the same single commit path", () => {
    expect(catalogSource).toContain(
      "onSelect={(value) => void commitSearch(value)}",
    );
    expect(catalogSource.match(/pushSearchHistory\(/g)).toHaveLength(1);
  });

  it("WB-B2-12 — history dedupe is case-insensitive", () => {
    expect(updateSearchHistory(["iPhone"], " IPHONE ")).toEqual(["IPHONE"]);
  });

  it("WB-B2-13 — history is newest-first, whitespace-normalized, and bounded", () => {
    let history: string[] = [];
    for (let index = 0; index < SEARCH_HISTORY_LIMIT + 2; index += 1) {
      history = updateSearchHistory(history, `  query   ${index} `);
    }
    expect(history).toHaveLength(SEARCH_HISTORY_LIMIT);
    expect(history[0]).toBe(`query ${SEARCH_HISTORY_LIMIT + 1}`);
    expect(updateSearchHistory(history, "")).toEqual(history);
  });

  it("WB-B2-14 — history selection commits through the shared selection callback", () => {
    expect(panelSource).toContain("onPress={() => onSelect(value)}");
    expect(catalogSource).toContain(
      "onSelect={(value) => void commitSearch(value)}",
    );
  });

  it("WB-B2-15 — clear history deletes persisted state", () => {
    expect(historySource).toContain("SecureStore.deleteItemAsync(KEY)");
    expect(catalogSource).toContain(
      "clearSearchHistory().then(() => setSearchHistory([]))",
    );
  });

  it("WB-B2-16 — clear resets both input and committed query", () => {
    const clearBlock = catalogSource.slice(
      catalogSource.indexOf("function clearSearch"),
      catalogSource.indexOf("function clearFilters"),
    );
    expect(clearBlock).toContain('setInputQuery("")');
    expect(clearBlock).toContain('setCommittedQuery("")');
  });
});

describe("Product Wave B2 — B0 integration and truthful UI", () => {
  it("WB-B2-17/20 — committed query changes query key and therefore resets pagination", () => {
    const common = {
      sort: "popular",
      categoryId: null,
      sellerId: null,
      inStockOnly: false,
      dealsOnly: false,
    };
    expect(buildCatalogQueryKey({ ...common, q: "iphone" })).not.toBe(
      buildCatalogQueryKey({ ...common, q: "ipad" }),
    );
    expect(catalogSource).toContain("setCursor(null)");
    expect(catalogSource).toContain("lastRequestedCursorRef.current = null");
  });

  it("WB-B2-19 — committed query retains B0 stale-catalog protection", () => {
    const generation = createRequestGeneration();
    const oldRequest = generation.next();
    generation.next();
    expect(isStaleCatalogRequest(oldRequest, generation.current())).toBe(true);
    expect(
      canRequestCatalogPage({
        reset: false,
        hasMore: true,
        loading: false,
        loadingMore: false,
        paginationInFlight: false,
        cursor: "old-page",
        lastRequestedCursor: null,
        requestQueryKey: "old-query",
        activeQueryKey: "new-query",
      }),
    ).toBe(false);
  });

  it("WB-B2-21 — hardcoded popular searches are not rendered", () => {
    expect(catalogSource).not.toContain("POPULAR_SEARCHES");
    expect(panelSource).not.toMatch(/Популярн/);
    expect(historySource).not.toMatch(
      /наушники|кроссовки|iphone|доставка сегодня/i,
    );
  });
});
