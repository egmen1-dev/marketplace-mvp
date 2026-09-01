import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { discountPercent } from "../apps/mobile/src/utils/format";
import {
  filterRelatedProducts,
  PDP_RELATED_QUERY_TYPE,
  PDP_RELATED_TITLE,
} from "../apps/mobile/src/product/pdp-related";
import { filterTruthfulSellerBadges, isUnsupportedSellerTrustLabel } from "../apps/mobile/src/product/pdp-trust";
import type { MobileProductListItem } from "../apps/mobile/src/api/endpoints";

const productSource = readFileSync("apps/mobile/app/product/[id].tsx", "utf8");
const gallerySource = readFileSync("apps/mobile/src/product/ui/ProductGallery.tsx", "utf8");
const stickySource = readFileSync("apps/mobile/src/product/ui/ProductStickyPurchaseBar.tsx", "utf8");
const sellerSource = readFileSync("apps/mobile/src/product/ui/ProductSellerCard.tsx", "utf8");
const priceSource = readFileSync("apps/mobile/src/product/ui/ProductPriceCard.tsx", "utf8");
const relatedRailSource = readFileSync("apps/mobile/src/product/ui/ProductRelatedRail.tsx", "utf8");
const skeletonSource = readFileSync("apps/mobile/src/product/ui/ProductDetailSkeleton.tsx", "utf8");
const headerSource = readFileSync("apps/mobile/src/product/ui/ProductDetailHeader.tsx", "utf8");

function item(id: string): MobileProductListItem {
  return { id, title: id, price: 1000 };
}

describe("WB-B3-01/02 — related semantics", () => {
  it("RELATED_TITLE_TRUTHFUL=PASS", () => {
    expect(PDP_RELATED_TITLE).toBe("Популярное в категории");
    expect(productSource).toContain("PDP_RELATED_TITLE");
    expect(productSource).not.toContain("Похожие товары");
  });

  it("RELATED_QUERY_TYPE=CATEGORY_POPULAR", () => {
    expect(PDP_RELATED_QUERY_TYPE).toBe("CATEGORY_POPULAR");
    expect(productSource).toContain('fetchCatalog({ sort: "popular", categoryId');
  });
});

describe("WB-B3-03 — related excludes current product", () => {
  it("RELATED_EXCLUDES_CURRENT_PRODUCT=PASS", () => {
    const filtered = filterRelatedProducts([item("a"), item("b"), item("a")], "a");
    expect(filtered.map((row) => row.id)).toEqual(["b"]);
    expect(productSource).toContain("filterRelatedProducts");
  });
});

describe("WB-B3-04/17 — related failure is non-fatal", () => {
  it("RELATED_FAILURE_NON_FATAL=PASS", () => {
    expect(productSource).toContain("loadRelated");
    expect(productSource).toContain("setSimilar([])");
    expect(productSource).not.toMatch(/setError\(true\)[\s\S]*fetchCatalog/);
  });
});

describe("WB-B3-05/15 — canonical related card", () => {
  it("PDP_RELATED_CANONICAL_CARD=PASS", () => {
    expect(relatedRailSource).toContain('from "../../commerce/product-card"');
    expect(relatedRailSource).toContain('variant="rail"');
    expect(productSource).toContain("ProductRelatedRail");
  });
});

describe("WB-B3-06/07/08 — gallery contracts", () => {
  it("GALLERY_NO_RELATED_OVERLAY=PASS", () => {
    expect(gallerySource).not.toContain("Похожие");
    expect(gallerySource).not.toContain("showSimilarButton");
    expect(productSource).not.toContain("showSimilarButton");
  });

  it("GALLERY_PAGINATION_TRUTHFUL=PASS", () => {
    expect(gallerySource).toContain("count > 1");
    expect(gallerySource).toContain("{index + 1} / {count}");
  });
});

describe("WB-B3-09/10 — price truth", () => {
  it("PDP_PRICE_TRUTHFUL=PASS", () => {
    expect(priceSource).toContain("compareAt > price");
    expect(discountPercent(1000, 1200)).toBe(17);
    expect(discountPercent(1000, 900)).toBeNull();
  });
});

describe("WB-B3-11/12 — unsupported claims absent", () => {
  it("unsupported seller trust labels are filtered", () => {
    expect(isUnsupportedSellerTrustLabel("Быстро отвечает")).toBe(true);
    expect(isUnsupportedSellerTrustLabel("Проверенный продавец")).toBe(true);
    expect(filterTruthfulSellerBadges(["Быстро отвечает", "Топ продавец"])).toEqual(["Топ продавец"]);
  });

  it("PDP source does not hardcode unsupported claims", () => {
    expect(productSource).not.toContain('label: "Быстро отвечает"');
    expect(sellerSource).not.toContain("Доставка сегодня");
  });
});

describe("WB-B3-13/14 — shared commerce state", () => {
  it("PDP_CART_STATE_SHARED=PASS", () => {
    expect(productSource).toContain("useCartQuantitiesStore");
    expect(productSource).toContain("addProductToCart");
    expect(productSource).toContain("isCartBusy");
  });

  it("PDP_FAVORITE_SHARED_STATE=PASS", () => {
    expect(productSource).toContain("toggleProductFavorite");
    expect(productSource).toContain("isFavorite");
    expect(productSource).toContain("isFavoriteBusy");
  });
});

describe("WB-B3-16 — buy now preserved", () => {
  it("PDP_BUY_NOW_FLOW_PRESERVED=PASS", () => {
    expect(stickySource).toContain("Купить сейчас");
    expect(productSource).toContain('router.push("/checkout")');
    expect(productSource).toContain("buy_now");
  });
});

describe("WB-B3-18/19 — error states", () => {
  it("PDP_ERROR_BUYER_READABLE=PASS", () => {
    expect(productSource).toContain("Не удалось загрузить товар");
    expect(productSource).not.toContain("err.stack");
    expect(productSource).not.toContain("JSON.stringify(err");
  });

  it("PDP_NOT_FOUND_TRUTHFUL=PASS", () => {
    expect(productSource).toContain("notFound");
    expect(productSource).toContain("Товар не найден");
    expect(productSource).toContain("status === 404");
  });
});

describe("WB-B3-20 — sticky safe area", () => {
  it("PDP_STICKY_SAFE_AREA=PASS", () => {
    expect(stickySource).toContain("useSafeAreaInsets");
    expect(stickySource).toContain("paddingBottom: Math.max(insets.bottom");
    expect(productSource).toContain("stickyBarContentInset");
  });
});

describe("WB-B3 — PDP hierarchy", () => {
  it("PDP_FIRST_VIEWPORT_COMMERCE_PRIORITY=PASS", () => {
    const gallery = productSource.indexOf("<ProductGallery");
    const title = productSource.indexOf("styles.title");
    const price = productSource.indexOf("<ProductPriceCard");
    const characteristics = productSource.indexOf("<ProductCharacteristicsCard");
    const seller = productSource.indexOf("<ProductSellerCard");
    expect(gallery).toBeGreaterThan(-1);
    expect(title).toBeGreaterThan(gallery);
    expect(price).toBeGreaterThan(title);
    expect(characteristics).toBeGreaterThan(price);
    expect(seller).toBeGreaterThan(characteristics);
  });

  it("PDP_TITLE_LAYOUT_STABLE=PASS", () => {
    expect(productSource).toContain("styles.titleBlock");
    expect(headerSource).not.toContain("chevron-down");
  });

  it("PDP_SELLER_CHAT_ACTION=PASS", () => {
    expect(sellerSource).toContain("Написать продавцу");
  });

  it("PDP_LOADING_STABLE=PASS", () => {
    expect(skeletonSource).toContain("PRODUCT_GALLERY_HEIGHT");
    expect(productSource).toContain("ProductDetailSkeleton");
  });

  it("PDP_PURCHASE_BUSY_SAFE=PASS", () => {
    expect(stickySource).toContain("cartBusy");
    expect(productSource).toContain("cartBusy={isCartBusy(id)}");
  });
});
