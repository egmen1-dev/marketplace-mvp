#!/usr/bin/env node
/** Generate artifacts/closed-beta-rc5/interaction-matrix.json */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const screens = [
  {
    screen: "Boot",
    elements: [
      { element: "BootSplash", action: "Show branded loading", handler: "BootSplash", route: "app/index.tsx", automated: "mobile-visual-polish.test.ts", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Session restore", action: "Warm token on mount", handler: "warmSessionFromStorage", route: "_layout.tsx", automated: "mobile-session-resilience.test.ts", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Home",
    elements: [
      { element: "Add to cart", action: "Add product", handler: "useCommerceActions.addProductToCart", route: "POST /api/cart", automated: "mobile-commerce-integration.test.ts", staging: "staging-runtime-smoke cart_add", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Favorite heart", action: "Toggle favorite", handler: "useCommerceActions.toggleProductFavorite", route: "POST /api/mobile/favorites", automated: "mobile-commerce-integration.test.ts", staging: "staging-runtime-smoke favorites_toggle", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Category chip", action: "Filter catalog", handler: "router.push categoryId", route: "/(tabs)/catalog", automated: "mobile-visual-polish.test.ts", staging: "catalog_category_filter", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Seller tap", action: "Open storefront", handler: "openSellerStorefront", route: "/seller/[id]", automated: "mobile-interaction-audit.test.ts", staging: "seller_catalog", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Catalog",
    elements: [
      { element: "CategoryRail", action: "Filter by categoryId", handler: "fetchCatalog({ categoryId })", route: "GET /api/mobile/catalog/products", automated: "mobile-commerce-integration.test.ts", staging: "catalog_category_filter", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Sort dropdown", action: "Change sort", handler: "fetchCatalog({ sort })", route: "GET /api/mobile/catalog/products", automated: "mobile-visual-polish.test.ts", staging: "catalog_popular/newest", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Filters modal", action: "In stock / deals", handler: "inStock param + client dealsOnly", route: "GET /api/mobile/catalog/products", automated: "NOT_TESTABLE", staging: "catalog_popular", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "ProductCard cart", action: "Add to cart", handler: "useCommerceActions", route: "POST /api/cart", automated: "mobile-commerce-integration.test.ts", staging: "cart_add", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "PDP",
    elements: [
      { element: "Add to cart", action: "Add product", handler: "useCommerceActions", route: "POST /api/cart", automated: "mobile-commerce-integration.test.ts", staging: "cart_add", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Seller link", action: "Open seller", handler: "openSellerStorefront", route: "/seller/[id]", automated: "mobile-interaction-audit.test.ts", staging: "seller_catalog", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Seller",
    elements: [
      { element: "Storefront", action: "Load seller products", handler: "fetchCatalog({ sellerId })", route: "GET /api/mobile/catalog/products", automated: "NOT_TESTABLE", staging: "seller_catalog", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Deep link", action: "lot://seller/{id}", handler: "mapLotDeepLinkToHref", route: "/seller/[id]", automated: "mobile-interaction-audit.test.ts", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Favorites",
    elements: [
      { element: "List", action: "Show favorites", handler: "fetchFavorites", route: "GET /api/mobile/favorites", automated: "NOT_TESTABLE", staging: "favorites_get", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Remove", action: "Toggle off", handler: "toggleProductFavorite", route: "POST /api/mobile/favorites", automated: "mobile-commerce-integration.test.ts", staging: "favorites_remove", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Cart",
    elements: [
      { element: "List items", action: "Fetch cart", handler: "fetchCart", route: "GET /api/cart", automated: "NOT_TESTABLE", staging: "cart_get", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Badge", action: "Refresh count", handler: "refreshTabBadges", route: "GET /api/cart", automated: "NOT_TESTABLE", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Profile",
    elements: [
      { element: "Cart menu", action: "Navigate", handler: "router.push /cart", route: "/cart", automated: "ProfileMenu source", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "About", action: "Show build identity", handler: "router.push /about", route: "/about", automated: "about.tsx exists", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Check update", action: "MRP check + browser handoff", handler: "fetchMobileUpdate + startApkDownload", route: "/api/mobile/update", automated: "mobile-update-state.test.ts", staging: "update_v8 returns NO_UPDATE until RC5 published", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Russian labels", action: "No internal route names", handler: "ProfileMenu labels", route: "N/A", automated: "mobile-visual-polish.test.ts", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
  {
    screen: "Update flow",
    elements: [
      { element: "Version check", action: "Compare versionCode", handler: "isUpdateEligibleForInstall", route: "/api/mobile/update", automated: "mobile-interaction-audit.test.ts", staging: "update_v7/v8", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Download handoff", action: "Open browser URL", handler: "Linking.openURL", route: "downloadUrl", automated: "download-apk.ts (no false downloaded telemetry)", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
      { element: "Android install", action: "User confirms install", handler: "OS package installer", route: "N/A", automated: "NOT_SUPPORTED in-app", staging: "NOT_TESTABLE", physicalRequired: true, verdict: "PHYSICAL_REQUIRED" },
    ],
  },
];

const flat = screens.flatMap((s) => s.elements.map((e) => ({ screen: s.screen, ...e })));
const report = {
  generatedAt: new Date().toISOString(),
  candidate: "RC5",
  summary: {
    total: flat.length,
    pass: 0,
    fail: 0,
    physicalRequired: flat.filter((e) => e.verdict === "PHYSICAL_REQUIRED").length,
    notTestable: flat.filter((e) => e.verdict === "NOT_TESTABLE").length,
  },
  policy: "UNKNOWN=0 is forbidden — untested interactions marked PHYSICAL_REQUIRED",
  screens,
};

const outDir = resolve("artifacts/closed-beta-rc5");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "interaction-matrix.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
