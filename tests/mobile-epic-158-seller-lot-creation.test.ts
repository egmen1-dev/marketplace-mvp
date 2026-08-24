import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sellSource = readFileSync("apps/mobile/app/(tabs)/sell.tsx", "utf8");
const sellerProductsSource = readFileSync("apps/mobile/app/(tabs)/seller-products.tsx", "utf8");
const createLotSource = readFileSync("apps/mobile/app/sell/create.tsx", "utf8");
const hookSource = readFileSync("apps/mobile/src/seller/use-lot-create-form.ts", "utf8");
const sellerLotApiSource = readFileSync("apps/mobile/src/api/seller-lot.ts", "utf8");
const draftStorageSource = readFileSync("apps/mobile/src/seller/lot-draft-storage.ts", "utf8");
const endpointsSource = readFileSync("apps/mobile/src/api/endpoints.ts", "utf8");
const productsRouteSource = readFileSync("app/api/mobile/seller/products/route.ts", "utf8");
const productPatchRouteSource = readFileSync("app/api/mobile/seller/products/[id]/route.ts", "utf8");
const uploadsRouteSource = readFileSync("app/api/mobile/seller/uploads/route.ts", "utf8");
const authBridgeSource = readFileSync("features/auth/resolve-request-user.ts", "utf8");
const sellerProductsDataSource = readFileSync("lib/mobile/seller-products-data.ts", "utf8");
const rootLayoutSource = readFileSync("apps/mobile/app/_layout.tsx", "utf8");
const sellerProductCardSource = readFileSync("apps/mobile/src/components/ui/SellerProductCard.tsx", "utf8");
const catalogSource = readFileSync("apps/mobile/app/(tabs)/catalog.tsx", "utf8");
const favoritesSource = readFileSync("apps/mobile/app/(tabs)/favorites.tsx", "utf8");
const sellerSalesSource = readFileSync("apps/mobile/app/(tabs)/seller-sales.tsx", "utf8");

describe("EPIC 158 — mobile seller LOT creation APIs", () => {
  it("bridges Bearer JWT to seller mutations via requireSellerFromRequest", () => {
    expect(authBridgeSource).toContain("requireSellerFromRequest");
    expect(authBridgeSource).toContain("verifyAccessToken");
    expect(productsRouteSource).toContain("requireSellerFromRequest");
    expect(productsRouteSource).toContain("createProduct");
    expect(productPatchRouteSource).toContain("updateProduct");
    expect(uploadsRouteSource).toContain("requireSellerFromRequest");
  });

  it("exposes mobile seller product create/upload client contracts", () => {
    expect(sellerLotApiSource).toContain("/api/mobile/seller/products");
    expect(sellerLotApiSource).toContain("/api/mobile/seller/uploads");
    expect(sellerLotApiSource).toContain("createSellerLot");
    expect(sellerLotApiSource).toContain("uploadSellerLotImage");
    expect(endpointsSource).toContain('tab?: "active" | "drafts" | "sold"');
  });

  it("filters seller lots by tab on the backend", () => {
    expect(sellerProductsDataSource).toContain('tab === "drafts"');
    expect(sellerProductsDataSource).toContain('tab === "sold"');
    expect(sellerProductsDataSource).toContain("ProductStatus.ACTIVE");
  });
});

describe("EPIC 158 — sell entry and create flow", () => {
  it("routes sellers to native LOT creation and non-sellers to onboarding", () => {
    expect(sellSource).toContain("Создать ЛОТ");
    expect(sellSource).toContain('router.push("/sell/create")');
    expect(sellSource).toContain("Начните продавать на LOT");
    expect(sellSource).toContain("Создайте свой первый ЛОТ");
    expect(sellSource).toContain("openWebHandoff");
    expect(sellSource).toContain("/account/seller-start");
    expect(sellSource).not.toContain("Добавить товар");
    expect(sellSource).not.toContain("объявлен");
  });

  it("implements multi-step LOT wizard with preview and publish", () => {
    expect(createLotSource).toContain("LOT_CREATE_COPY.photosTitle");
    expect(createLotSource).toContain("LOT_CREATE_COPY.detailsTitle");
    expect(createLotSource).toContain("Опубликовать ЛОТ");
    expect(createLotSource).toContain("ЛОТ опубликован");
    expect(createLotSource).toContain("useLotCreateForm");
    expect(rootLayoutSource).toContain('name="sell"');
  });

  it("persists local draft when seller exits mid-flow", () => {
    expect(draftStorageSource).toContain("lot-draft-v2");
    expect(draftStorageSource).toContain("isUnfinishedLot");
    expect(createLotSource).toContain("LotRestorePrompt");
    expect(hookSource).toContain("saveLotDraft");
    expect(hookSource).toContain("clearLotDraft");
  });
});

describe("EPIC 158 — Мои ЛОТы", () => {
  it("renames seller inventory screen and adds status tabs", () => {
    expect(sellerProductsSource).toContain("Мои ЛОТы");
    expect(sellerProductsSource).toContain("Активные");
    expect(sellerProductsSource).toContain("Сохранённые");
    expect(sellerProductsSource).toContain("Проданные");
    expect(sellerProductsSource).toContain('fetchSellerProducts({ tab })');
    expect(sellerProductsSource).not.toContain("Мои товары");
  });

  it("shows branded image fallback in seller list cards", () => {
    expect(sellerProductCardSource).toContain("ProductImageFallback");
    expect(sellerProductCardSource).not.toContain("thumbFallback");
  });
});

describe("EPIC 158 — seller loop regression", () => {
  it("keeps buyer catalog, favorites, cart, chat, and seller orders intact", () => {
    expect(catalogSource).toContain("fetchCatalog");
    expect(favoritesSource).toContain("fetchFavorites");
    expect(endpointsSource).toContain("/api/cart");
    expect(endpointsSource).toContain("/api/mobile/conversations");
    expect(sellerSalesSource).toContain("fetchSellerOrders");
    expect(sellerSalesSource).toContain("patchSellerOrderStatus");
  });
});
