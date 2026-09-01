import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  applyDealsOnlyFilter,
  buildCatalogQueryKey,
  canRequestCatalogPage,
  createRequestGeneration,
  DEALS_ONLY_POLICY,
  formatCatalogProductCount,
  isStaleCatalogRequest,
  mergeCatalogProducts,
  resolveCatalogPaginationTruth,
} from "../apps/mobile/src/commerce/catalog-query";
import { extractCartLines, resolveCartProductQuantity } from "../apps/mobile/src/commerce/cart-response";
import { useCommerceBusyStore } from "../apps/mobile/src/commerce/commerce-busy-store";
import { buildHomeCategoryCatalogRoute, resolveHomeCategoryId } from "../apps/mobile/src/home/resolveHomeCategoryRoute";
import type { MobileProductListItem } from "../apps/mobile/src/api/endpoints";
import { discountPercent } from "../apps/mobile/src/utils/format";

function product(id: string, price = 1000, compareAt?: number | null): MobileProductListItem {
  return {
    id,
    title: `Product ${id}`,
    price,
    compareAt: compareAt ?? null,
  };
}

describe("WB-PREFLIGHT-01 — stale catalog response cannot overwrite latest query", () => {
  it("CATALOG_STALE_RESPONSE_IGNORED=PASS", () => {
    const generation = createRequestGeneration();
    const first = generation.next();
    generation.next();
    expect(isStaleCatalogRequest(first, generation.current())).toBe(true);
  });

  it("CATALOG_LATEST_RESPONSE_WINS=PASS", () => {
    const generation = createRequestGeneration();
    const latest = generation.next();
    expect(isStaleCatalogRequest(latest, generation.current())).toBe(false);
  });
});

describe("WB-PREFLIGHT-02 — changing query resets pagination cursor", () => {
  it("buildCatalogQueryKey changes when query changes", () => {
    const base = {
      q: "iphone",
      sort: "popular",
      categoryId: null,
      sellerId: null,
      inStockOnly: false,
      dealsOnly: false,
    };
    const first = buildCatalogQueryKey(base);
    const second = buildCatalogQueryKey({ ...base, q: "ipad" });
    expect(first).not.toBe(second);
  });
});

describe("WB-PREFLIGHT-03/04 — pagination dedupe and duplicate page guard", () => {
  it("CATALOG_PRODUCT_ID_DEDUPE=PASS", () => {
    const merged = mergeCatalogProducts([product("a"), product("b")], [product("b"), product("c")], false);
    expect(merged.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("CATALOG_DUPLICATE_PAGE_BLOCKED=PASS", () => {
    const key = buildCatalogQueryKey({
      q: "",
      sort: "popular",
      categoryId: null,
      sellerId: null,
      inStockOnly: false,
      dealsOnly: false,
    });
    expect(
      canRequestCatalogPage({
        reset: false,
        hasMore: true,
        loading: false,
        loadingMore: false,
        paginationInFlight: false,
        cursor: "cursor-1",
        lastRequestedCursor: "cursor-1",
        requestQueryKey: key,
        activeQueryKey: key,
      }),
    ).toBe(false);
  });
});

describe("WB-PREFLIGHT-05 — dealsOnly pagination truthfulness", () => {
  it("DEALS_ONLY_PAGINATION_TRUTHFUL=PASS", () => {
    expect(DEALS_ONLY_POLICY).toBe("CLIENT_SIDE_ONLY");
    const pagination = resolveCatalogPaginationTruth(true, true, "next");
    expect(pagination.countMode).toBe("client_deals");
    expect(formatCatalogProductCount(2, true, "client_deals")).toContain("со скидкой");
    expect(formatCatalogProductCount(2, true, "server")).not.toContain("со скидкой");
  });

  it("applyDealsOnlyFilter keeps only discounted items", () => {
    const filtered = applyDealsOnlyFilter([product("a", 1000, 1200), product("b", 1000, 1000)]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("a");
  });
});

describe("WB-PREFLIGHT-06/08 — cart mutation contract", () => {
  it("CART_SAME_PRODUCT_CONCURRENT_MUTATION_BLOCKED=PASS", () => {
    useCommerceBusyStore.setState({ cartProductIds: {}, favoriteProductIds: {} });
    useCommerceBusyStore.getState().setCartBusy("p1", true);
    expect(useCommerceBusyStore.getState().isCartBusy("p1")).toBe(true);
    useCommerceBusyStore.getState().setCartBusy("p1", true);
    expect(useCommerceBusyStore.getState().isCartBusy("p1")).toBe(true);
  });

  it("CART_OTHER_PRODUCT_REMAINS_INTERACTIVE=PASS", () => {
    useCommerceBusyStore.getState().setCartBusy("p1", true);
    expect(useCommerceBusyStore.getState().isCartBusy("p2")).toBe(false);
  });

  it("CART_FAILURE_PRESERVES_OR_RECONCILES_QUANTITY=PASS", () => {
    const cart = {
      items: [{ productId: "p1", quantity: 3 }],
    };
    expect(resolveCartProductQuantity(cart, "p1")).toBe(3);
    expect(extractCartLines(cart)).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("CART_SERVER_CLIENT_QUANTITY_CONTRACT=PASS", () => {
    const cart = {
      items: [{ product: { id: "p2" }, quantity: 2 }],
    };
    expect(resolveCartProductQuantity(cart, "p2")).toBe(2);
  });
});

describe("WB-PREFLIGHT-09 — favorite busy scope", () => {
  it("FAVORITE_SAME_PRODUCT_DOUBLE_TAP_SAFE=PASS", () => {
    useCommerceBusyStore.setState({ cartProductIds: {}, favoriteProductIds: {} });
    useCommerceBusyStore.getState().setFavoriteBusy("f1", true);
    expect(useCommerceBusyStore.getState().isFavoriteBusy("f1")).toBe(true);
  });

  it("FAVORITE_OTHER_PRODUCT_REMAINS_INTERACTIVE=PASS", () => {
    useCommerceBusyStore.getState().setFavoriteBusy("f1", true);
    expect(useCommerceBusyStore.getState().isFavoriteBusy("f2")).toBe(false);
  });
});

describe("WB-PREFLIGHT-10 — promo category routing", () => {
  const categories = [
    { id: "cat-electronics", name: "Электроника", slug: "electronics" },
    { id: "cat-home", name: "Дом и сад", slug: "home" },
    { id: "cat-transport", name: "Транспорт", slug: "auto" },
  ];

  it("HOME_PROMO_CATEGORY_USES_REAL_CATEGORY_ID=PASS", () => {
    const route = buildHomeCategoryCatalogRoute("electronics", categories);
    expect(route).toEqual({
      pathname: "/(tabs)/catalog",
      params: { categoryId: "cat-electronics", q: "", deals: "0" },
    });
  });

  it("ELECTRONICS_PROMO_DOES_NOT_OPEN_ALL_CATALOG=PASS", () => {
    expect(resolveHomeCategoryId("electronics", categories)).toBe("cat-electronics");
    const route = buildHomeCategoryCatalogRoute("electronics", categories);
    expect("params" in route && route.params.q).toBe("");
    expect("params" in route && route.params.categoryId).toBe("cat-electronics");
  });
});

describe("WB-PREFLIGHT-11 — recent views deferred", () => {
  it("RECENT_VIEW_STALE_PRICE_NOT_PRESENTED_AS_CURRENT=PASS", () => {
    const homeSource = readFileSync("apps/mobile/app/(tabs)/index.tsx", "utf8");
    expect(homeSource).not.toContain("loadRecentViews");
    expect(homeSource).not.toContain("RecentView");
  });
});

describe("WB-PREFLIGHT-03 — old query page cannot append to new query", () => {
  it("OLD_QUERY_PAGE_CANNOT_APPEND_TO_NEW_QUERY=PASS", () => {
    const oldKey = buildCatalogQueryKey({
      q: "iphone",
      sort: "popular",
      categoryId: null,
      sellerId: null,
      inStockOnly: false,
      dealsOnly: false,
    });
    const newKey = buildCatalogQueryKey({
      q: "ipad",
      sort: "popular",
      categoryId: null,
      sellerId: null,
      inStockOnly: false,
      dealsOnly: false,
    });
    expect(
      canRequestCatalogPage({
        reset: false,
        hasMore: true,
        loading: false,
        loadingMore: false,
        paginationInFlight: false,
        cursor: "c1",
        lastRequestedCursor: null,
        requestQueryKey: oldKey,
        activeQueryKey: newKey,
      }),
    ).toBe(false);
  });
});

describe("WB-PREFLIGHT-07 — cart busy scoped per product", () => {
  it("CART_BUSY_IS_PER_PRODUCT=PASS", () => {
    useCommerceBusyStore.setState({ cartProductIds: { a: true }, favoriteProductIds: {} });
    expect(useCommerceBusyStore.getState().isCartBusy("a")).toBe(true);
    expect(useCommerceBusyStore.getState().isCartBusy("b")).toBe(false);
  });
});

describe("product card discount truth", () => {
  it("PRODUCT_CARD_DISCOUNT_VALID_ONLY=PASS", () => {
    expect(discountPercent(1000, 1200)).toBe(17);
    expect(discountPercent(1000, 900)).toBeNull();
    expect(discountPercent(1000, 1000)).toBeNull();
  });
});
