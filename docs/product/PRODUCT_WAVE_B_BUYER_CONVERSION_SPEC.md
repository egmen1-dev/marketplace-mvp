# Product Wave B — Buyer Conversion

**Status:** Implementation spec (analysis only)  
**Baseline:** RC26 + Wave A (reconciled `cursor/product-wave-a-real-beta-blockers-12fd`)  
**Audit verdict:** `REAL_BETA_WITH_FIXES`  
**Scope:** Home → Search/Catalog → Product → Cart discovery funnel  
**Out of scope:** Checkout, seller editing, Profile, updater, MRP, release infrastructure

---

## Executive summary

Wave B should make buyer discovery feel like **one coherent marketplace** by:

1. **Demoting demo chrome** on Home and surfacing real inventory earlier in the viewport.
2. **Unifying product cards** around a single `ProductCardV2` derived from the catalog grid implementation.
3. **Wiring existing search infrastructure** (`fetchProductSuggest`, `CommerceSearchBar`, persisted history) that is already built but unused on buyer surfaces.
4. **Aligning add-to-cart feedback** across Home rail, Catalog, PDP, and related products.
5. **Tightening PDP first-viewport hierarchy** without changing seller/trust architecture beyond Wave A.

No new ML, AI search, or personalization platform is required. All recommendations use APIs and local storage that already exist.

---

## 1 — Current implementation map

### Home

| FILE | COMPONENT | PURPOSE | DATA SOURCE | CURRENT PROBLEM |
|------|-----------|---------|-------------|-----------------|
| `apps/mobile/app/(tabs)/index.tsx` | `BuyerHomeScreen` | Home screen orchestration | `fetchBuyerHome`, `fetchCatalog`, `fetchCategories` | `fetchBuyerHome` payload not rendered; duplicate catalog fetch for products |
| `apps/mobile/src/home/HomeHeader.tsx` | `HomeHeader` | City, brand, cart/messages badges | Static city; `useAppStore` badges | Fake city selector; no search entry in header |
| `apps/mobile/src/home/HomeSearchRow.tsx` | `HomeSearchRow` | Search input + filter shortcut | Local state | No suggest/history; filter opens catalog only |
| `apps/mobile/src/home/HomeCategoryRow.tsx` | `HomeCategoryRow` | Category shortcut circles | Static shortcuts + API category ID map | Hardcoded shortcut IDs; fragile slug/name mapping |
| `apps/mobile/src/home/HomeHeroBanner.tsx` | `HomeHeroBanner` | Marketing hero block | Static `HOME_HERO`; optional image from popular[0] | ~200px decorative block pushes products down; fake carousel dots |
| `apps/mobile/src/home/HomeProductRail.tsx` | `HomeProductRail` | Horizontal product section | `MobileProductListItem[]` | No add-to-cart; separate card implementation |
| `apps/mobile/src/home/HomeProductCard.tsx` | `HomeProductCard` | Rail product card | Product API fields | No cart CTA; `cover` image vs catalog `contain` |
| `apps/mobile/src/home/HomeTrustStrip.tsx` | `HomeTrustStrip` | Trust capability strip | Static `HOME_TRUST_ITEMS` | Wave A fixed copy; still static (acceptable post-Wave A) |
| `apps/mobile/src/home/HomePromoTiles.tsx` | `HomePromoTiles` | Promo discovery tiles | Static `HOME_PROMO_TILES` | Hardcoded catalog `q` params, not category IDs |
| `apps/mobile/src/home/content.ts` | constants | Hero, trust, promos, shortcuts | Static | Marketing shell not tied to inventory |
| `apps/mobile/src/home/constants.ts` | layout | Card widths, padding | Static dimensions | Rail card width ≠ catalog grid width |

### Catalog

| FILE | COMPONENT | PURPOSE | DATA SOURCE | CURRENT PROBLEM |
|------|-----------|---------|-------------|-----------------|
| `apps/mobile/app/(tabs)/catalog.tsx` | `CatalogScreen` | Search + grid + filters | `fetchCatalog`, `fetchCategories` | Heavy header stack; live search on every keystroke |
| `apps/mobile/src/catalog/ui/CatalogSearchRow.tsx` | `CatalogSearchRow` | Search + filter button | Local `q` | No suggest/history panel |
| `apps/mobile/src/catalog/ui/CatalogCategoryRow.tsx` | `CatalogCategoryRow` | Category rail | API categories via `selectRailCategories` | Duplicates home shortcuts pattern |
| `apps/mobile/src/catalog/ui/CatalogTitleRow.tsx` | `CatalogTitleRow` | Title + loaded count | Client `items.length` | Not server total; misleading with pagination |
| `apps/mobile/src/catalog/ui/CatalogFilterBar.tsx` | `CatalogFilterBar` | Sort + deals + in-stock | Local filter state | `dealsOnly` client-side only; no price range |
| `apps/mobile/src/catalog/ui/CatalogProductCard.tsx` | `CatalogProductCard` | Grid product card | Product + cart store | Canonical candidate; best commerce UX |
| `apps/mobile/src/catalog/ui/CatalogCartCta.tsx` | `CatalogCartCta` | Card cart stepper | Cart quantities store | Outlined style differs from `ProductCartCta` |
| `apps/mobile/src/catalog/rail-categories.ts` | `selectRailCategories` | Filter categories with products | API `catalogProductCount` | — |

### Search infrastructure (shared)

| FILE | COMPONENT | PURPOSE | DATA SOURCE | CURRENT PROBLEM |
|------|-----------|---------|-------------|-----------------|
| `apps/mobile/src/components/ui/CommerceSearchBar.tsx` | `CommerceSearchBar` | Search + history + popular panel | Props-driven | **Not used** on buyer Home/Catalog |
| `apps/mobile/src/storage/search-history.ts` | helpers | Persist recent queries | SecureStore | **Write-only** on buyer surfaces |
| `apps/mobile/src/api/endpoints.ts` | `fetchProductSuggest` | Autocomplete API client | `GET /api/products/suggest` | **Never called** on mobile buyer |
| `apps/mobile/src/components/ui/CatalogToolbar.tsx` | `CatalogToolbar` | Legacy toolbar | — | **Unused** (superseded by catalog/ui) |

### Product cards (three buyer systems)

| FILE | COMPONENT | USED ON | CURRENT PROBLEM |
|------|-----------|---------|-----------------|
| `apps/mobile/src/home/HomeProductCard.tsx` | `HomeProductCard` | Home rail, PDP related rail | No cart; rail-only layout |
| `apps/mobile/src/catalog/ui/CatalogProductCard.tsx` | `CatalogProductCard` | Catalog grid | Best commerce pattern; not reused |
| `apps/mobile/src/components/ui/ProductCard.tsx` | `ProductCard` | Favorites, seller storefront | Fake static **«Доставка»** badge on every card |
| `apps/mobile/src/components/ui/SellerProductCard.tsx` | `SellerProductCard` | Seller products tab | Seller-ops only (out of Wave B) |

### Product Detail

| FILE | COMPONENT | PURPOSE | DATA SOURCE | CURRENT PROBLEM |
|------|-----------|---------|-------------|-----------------|
| `apps/mobile/app/product/[id].tsx` | `ProductScreen` | PDP orchestration | `fetchProduct`, `fetchCatalog`, `fetchSellerStorefront` | Related = category popular, not true related |
| `apps/mobile/src/product/ui/ProductGallery.tsx` | `ProductGallery` | Image carousel | Product images | «Похожие» jump button OK when related exist |
| `apps/mobile/src/product/ui/ProductPriceCard.tsx` | `ProductPriceCard` | Price + savings | Product price/compareAt | Below fold after title block |
| `apps/mobile/src/product/ui/ProductStickyPurchaseBar.tsx` | `ProductStickyPurchaseBar` | Sticky CTA | Cart store | Correct hierarchy; related rail has no cart |
| `apps/mobile/src/product/ui/ProductRelatedRail.tsx` | `ProductRelatedRail` | Related horizontal rail | `fetchCatalog` same-category popular | **IMPROVE** labeling; not truly related |
| `apps/mobile/src/storage/recent-views.ts` | `trackRecentView` / `loadRecentViews` | Recently viewed persistence | SecureStore | Written on PDP open; **never displayed** |

### APIs

| FUNCTION | ENDPOINT | USED BY | NOTES |
|----------|----------|---------|-------|
| `fetchBuyerHome` | `GET /api/mobile/buyer/home` | Home (fetch only), tab badges | Advisory counts only; no product lists |
| `fetchCatalog` | `GET /api/mobile/catalog/products` | Home, Catalog, PDP related | Primary discovery API |
| `fetchCategories` | `GET /api/categories` | Home, Catalog | Category rails |
| `fetchProductSuggest` | `GET /api/products/suggest` | **Unused mobile** | Web wired; returns products + categories |
| `fetchFavorites` | `GET /api/mobile/favorites` | Favorites tab, store hydrate | Can power Home «Избранное» section |
| `fetchProduct` | `GET /api/products/:id` | PDP | Full product record |

---

## 2 — Home audit (classification)

| Element | Classification | Evidence |
|---------|----------------|----------|
| Product rail («Популярные товары») | **REAL_API_BACKED** | `fetchCatalog({ sort: "popular" }).slice(0, 12)` |
| Category chips (with API ID resolution) | **REAL_API_BACKED** (partial) | `fetchCategories` + `resolveCategoryId` |
| Cart/messages badges | **REAL_API_BACKED** | `refreshTabBadges` |
| Trust strip (post-Wave A) | **STATIC_BUT_ACCEPTABLE** | Truthful capability copy in `content.ts` |
| Hero marketing copy | **STATIC_BUT_ACCEPTABLE** | Non-guarantee language post-Wave A |
| City label «Екатеринбург» | **DEMO_LEAK** | `HOME_LOCATION_LABEL` hardcoded; tap opens catalog |
| Hero carousel dots | **DEMO_LEAK** | `activeDot` state with no slides |
| Hero CTA → deals catalog | **SHOULD_BE_API_BACKED** | Static route `{ deals: "1" }` not inventory-driven |
| Promo tiles | **DEMO_LEAK** | Static tiles + hardcoded `q` search strings |
| `fetchBuyerHome` summary | **SHOULD_BE_API_BACKED** (unused) | Fetched, cached, never rendered |
| `loadSearchHistory` on Home | **SHOULD_BE_API_BACKED** | Imported but never called |
| `loadRecentViews` | **SHOULD_BE_API_BACKED** | Persisted on PDP; no Home UI |
| Duplicate `fetchCatalog` vs buyer-home | **SHOULD_BE_REMOVED** | buyer-home does not supply products; keep catalog fetch |

---

## 3 — Proposed Home commercial structure

Derived from current components and APIs. Goal: first viewport answers **what can I buy**, **how do I find it**, **what should I look at now**.

### Target vertical order (top → bottom)

```
1. HomeHeader          — keep; reduce city chrome prominence (optional: rename to «Каталог»)
2. HomeSearchRow       — upgrade to CommerceSearchBar (history + suggest on focus)
3. HomeCategoryRow     — keep; prefer API category names where shortcut maps
4. HomeProductRail     — «Популярные товары» (MOVED UP — before hero)
   OR compact «Для вас» when recent views / favorites exist
5. HomeProductRail     — «Недавно смотрели» (loadRecentViews) when ≥1 item
6. HomeProductRail     — «Избранное» teaser (fetchFavorites top N) when logged in + count > 0
7. HomePromoTiles      — SHRINK or demote below first product rail; use categoryId deeplinks
8. HomeHeroBanner      — COMPACT mode (≤96px) or remove from default Home; optional secondary slot
9. HomeTrustStrip      — keep at bottom (post-Wave A truthful copy)
```

### Component reuse

| Block | Implementation |
|-------|----------------|
| Commerce header | Existing `HomeHeader` |
| Search | Replace `HomeSearchRow` inner field with `CommerceSearchBar` |
| Category entry | Existing `HomeCategoryRow` |
| Product feed | `HomeProductRail` + unified `ProductCardV2` `variant="rail"` |
| Continue browsing | New section using `loadRecentViews()` |
| Favorites teaser | `fetchFavorites()` when `buyer-home.favourites.count > 0` |
| Promo | Compact `HomePromoTiles` with `categoryId` params from API |

**Do not build:** personalization ML, city picker, rotating hero carousel.

---

## 4 — Buyer Home API (`fetchBuyerHome`)

### Contract (current)

```typescript
// GET /api/mobile/buyer/home
{
  discovery: { featuredCount: number };      // always 0 in production builder
  favourites: { count: number };             // real when authenticated
  orders: { active: number };                // real when authenticated
  recommendations: { available: boolean };   // flag only — no product IDs
  advisoryOnly: true;
}
```

**Backend:** `lib/mobile/buyer-home-data.ts` → `buildMobileBuyerHomeForUser`

### Usage today

| Consumer | Uses field | Renders UI |
|----------|------------|------------|
| `index.tsx` | Full payload | **No** (snapshot + skeleton gate only) |
| `refresh-tab-badges.ts` | `orders.active` | Orders tab badge |

### Duplication analysis

- **Does not duplicate catalog queries** — returns counts/flags only.
- **Cannot replace** `fetchCatalog` for product rails without backend extension.
- `discovery.featuredCount` is always `0` — not production-useful today.
- `recommendations.available` is boolean only — no SKUs.

### Recommendation: **FIX_THEN_USE** (partial near-term workaround)

| Field | Wave B action |
|-------|---------------|
| `favourites.count` | **USE_NOW** — gate «Избранное» Home teaser + link to favorites tab |
| `orders.active` | Already used for badges — no Home UI needed |
| `discovery` / `recommendations` | **DO_NOT_USE_YET** for product sections — use `fetchCatalog`, `loadRecentViews`, `fetchFavorites` instead |
| Future | Extend buyer-home to return `featuredProductIds[]` or `recentCategorySlugs[]` before relying on it for feeds |

**Reasoning:** Using buyer-home counts for section visibility is safe. Using it for product discovery would require backend work not present in RC26.

---

## 5 — Product card inventory

### Variant A — `HomeProductCard`

| Attribute | Value |
|-----------|-------|
| **FILE** | `apps/mobile/src/home/HomeProductCard.tsx` |
| **USED_ON** | Home popular rail, `ProductRelatedRail` |
| **PROPS** | `product`, `onPress`, `onFavorite`, `isFavorite` |
| **DATA_MODEL** | `MobileProductListItem` |
| **IMAGE_LAYOUT** | 120px height, `contentFit="cover"` |
| **TITLE_RULES** | 2 lines, `minHeight: 34` |
| **PRICE_RULES** | `formatPrice`; compareAt strikethrough when `compareAt > price` |
| **FAVORITE_CONTROL** | Top-right heart |
| **CART_CONTROL** | **None** |
| **BADGES** | Discount % bottom-left |
| **DIFFERENCES** | Fixed width `HOME_PRODUCT_CARD_WIDTH`, height 244 |

### Variant B — `CatalogProductCard`

| Attribute | Value |
|-----------|-------|
| **FILE** | `apps/mobile/src/catalog/ui/CatalogProductCard.tsx` |
| **USED_ON** | Catalog grid |
| **PROPS** | `product`, cart handlers, `isFavorite`, `cartQuantity?` |
| **DATA_MODEL** | `MobileProductListItem` |
| **IMAGE_LAYOUT** | 148px height, `contentFit="contain"` |
| **TITLE_RULES** | 2 lines, `minHeight: 38` |
| **PRICE_RULES** | Same discount rules; larger price font (18px) |
| **FAVORITE_CONTROL** | Top-right heart |
| **CART_CONTROL** | `CatalogCartCta` — «В корзину» → `− qty +` |
| **BADGES** | Discount % bottom-left |
| **DIFFERENCES** | Fixed height 318; reserved slots for rating + CTA |

### Variant C — `ProductCard` (legacy shared)

| Attribute | Value |
|-----------|-------|
| **FILE** | `apps/mobile/src/components/ui/ProductCard.tsx` |
| **USED_ON** | Favorites, seller storefront |
| **PROPS** | Full commerce + seller + compact modes |
| **DATA_MODEL** | `MobileProductCardData` |
| **IMAGE_LAYOUT** | Aspect ~0.92, `cover` |
| **TITLE_RULES** | `PRODUCT_CARD_LAYOUT.titleLines` |
| **PRICE_RULES** | Same |
| **FAVORITE_CONTROL** | Optional slot |
| **CART_CONTROL** | `ProductCartCta` (filled orange) |
| **BADGES** | Discount + **static «Доставка»** (misleading) |
| **DIFFERENCES** | Press scale animation; social proof row; city; seller name |

### Canonical recommendation: **`CatalogProductCard` → `ProductCardV2`**

**Why not the largest (`ProductCard`)?** It carries a fake delivery badge and inconsistent CTA styling.

**Why catalog base?** Highest-conversion surface already has stable heights, cart stepper, and fixed layout slots. Minimizes catalog regression risk.

**Migration path:** Extract `ProductCardV2` into `apps/mobile/src/commerce/ProductCardV2.tsx`; thin wrappers for rail vs grid width; migrate Home → Catalog → Favorites → Related rail → Seller storefront (last).

---

## 6 — Canonical ProductCard V2 specification

### Layout variants

| Variant | Width | Height | Image H | Image fit | Cart CTA |
|---------|-------|--------|---------|-----------|----------|
| `grid` | `CATALOG_CARD_WIDTH` | 318 | 148 | `contain` | Required |
| `rail` | `HOME_PRODUCT_CARD_WIDTH` | 244 | 120 | `cover` | Optional compact stepper |
| `grid-compact` | `48%` | 290 | 132 | `cover` | Required (favorites) |

### Rules

| Rule | Specification |
|------|---------------|
| Image ratio | Grid: 148px fixed height in card; Rail: 120px / full width |
| Image fallback | `ProductImageFallback` or headphones/icon per variant |
| Favorite button | Top-right; heart outline/filled; `stopPropagation` on press |
| Title | `numberOfLines={2}`; grid `minHeight: 38`, rail `minHeight: 34` |
| Current price | `formatPrice(price)`; brand orange; bold |
| Old price | Only when `compareAt > price`; strikethrough |
| Discount badge | Only when `discountPercent(price, compareAt) > 0` |
| Delivery/trust | **Never static** — omit unless API provides `deliveryLabel` (future) |
| Cart CTA | `quantity <= 0` → «В корзину»; else `−` `qty` `+` |
| Sold out | When `stock <= 0` or `status !== "ACTIVE"`: disable CTA, show «Нет в наличии» |
| Loading | `ProductCardSkeleton` matching variant dimensions |
| Rating row | Show when `averageRating > 0` or `reviewsCount > 0`; reserve 16px height |

### Unified cart CTA styling

Merge `CatalogCartCta` + `ProductCartCta` into `CommerceCartCta`:

- **Grid default:** outlined white «В корзину» (catalog style — less aggressive in dense grid)
- **Rail / PDP related:** same stepper semantics
- **Favorites:** may keep filled orange for emphasis (config flag `ctaTone: "filled" | "outlined"`)

---

## 7 — Add-to-cart interaction spec

### Current behavior

| Surface | Add | Increment | Decrement | Remove@0 | Loading | Error |
|---------|-----|-----------|-----------|----------|---------|-------|
| Catalog | ✅ toast | ✅ | ✅ DELETE | ✅ | busyRef guard | toast + rollback qty |
| Favorites | ✅ | ✅ | ✅ | ✅ | same | same |
| PDP sticky | ✅ | ✅ | ✅ | ✅ | buyNowLoading separate | same |
| Home rail | ❌ | ❌ | ❌ | — | — | — |
| Related rail | ❌ | ❌ | ❌ | — | — | — |

**Domain support:** `POST /api/cart`, `PATCH`, `DELETE`; `useCartQuantitiesStore` optimistic updates — **fully supports stepper everywhere**.

### Target behavior (all buyer card surfaces)

| Action | Behavior |
|--------|----------|
| **ADD** | `addProductToCart(id, 1)`; toast «Добавлено в корзину»; stepper replaces button |
| **INCREMENT** | `incrementProductCart(id)` |
| **DECREMENT** | `decrementProductCart(id)`; at qty 1 → decrement removes (existing hook behavior) |
| **REMOVE_AT_ZERO** | Return to «В корзину» button |
| **LOADING** | Disable stepper buttons while `busyRef` has key (per product) |
| **ERROR** | Toast with friendly message; revert optimistic qty |

### Home rail recommendation

Add compact cart CTA to `ProductCardV2` rail variant — highest conversion impact for Wave B.

---

## 8 — Search current state

| Capability | Status |
|------------|--------|
| Search input (Home) | ✅ `HomeSearchRow` — submit → catalog with `q` |
| Search input (Catalog) | ✅ `CatalogSearchRow` — live `q` updates |
| Query state | ✅ Local `useState` |
| Submission | ✅ `onSubmitEditing` + history push |
| API call | ✅ `fetchCatalog({ q })` |
| Filters | ✅ sort, inStock, deals (client), categoryId, sellerId |
| Sort | ✅ popular/newest/price |
| Pagination | ✅ cursor + `onEndReached` |
| Empty state | ✅ `EmptyState` presets |
| Loading | ✅ `CatalogSkeletonGrid` |
| Error | ✅ `ErrorState` with retry |
| History persistence | ✅ `pushSearchHistory` on submit |
| History display | ❌ not wired |
| Suggest endpoint | ❌ not called |
| Debounce | ❌ catalog refetches every keystroke |

---

## 9 — Search suggest (`fetchProductSuggest`)

### API response

```typescript
// GET /api/products/suggest?q=&limit=8
{
  items: Array<{
    type: "product" | "category";
    id: string;
    title: string;
    slug: string;
    href: string;  // present server-side; omitted in mobile client type
  }>;
  q: string;
}
```

**Returns:** mixed **products + categories** (not query strings). Backend: `suggestCatalog()` in `features/products/queries.ts`.

### Minimum viable UI

When `q.length >= 2`:

1. Debounced `fetchProductSuggest(q)` (300ms).
2. Show dropdown/list below search field:
   - **Category row** → `router.push catalog { categoryId: id }` or resolve slug
   - **Product row** → `router.push /product/{id}` or submit catalog search with title
3. On select: `pushSearchHistory(title)` if product chosen via text match.

**Do not:** AI search, semantic ranking UI, voice search.

### Readiness: **SEARCH_SUGGEST_READY=YES** (API + client exist; UI wiring only)

---

## 10 — Search history

### Current

| Function | Status |
|----------|--------|
| `pushSearchHistory` | Called on Home + Catalog submit |
| `loadSearchHistory` | Implemented; **not displayed** |
| `clearSearchHistory` | Implemented; **not displayed** |
| `POPULAR_SEARCHES` | Static constant; unused on buyer |

### Minimal UI design

Use existing `CommerceSearchBar` props:

- On focus with empty input: show **«Недавние»** chips from `loadSearchHistory()`
- Show **«Популярное»** from `POPULAR_SEARCHES` (static acceptable for beta)
- Tap chip → set query + submit catalog search
- **«Очистить»** → `clearSearchHistory()` when history non-empty

### Readiness: **SEARCH_HISTORY_READY=YES** (persistence exists; UI component exists)

---

## 11 — Catalog audit

### Structure (header stack)

```
HomeHeader           (~60px + safe area)
CatalogSearchRow     (54px)
CatalogCategoryRow   (~80px)
CatalogTitleRow      (~40px)
CatalogFilterBar     (~42px)
─────────────────────
≈ 236px+ before first product row on 1080×2400
```

### Major issues

1. **Duplicate `HomeHeader` on catalog** — appropriate for commerce parity but tall.
2. **`CatalogTitleRow` count** — shows loaded items, not total results.
3. **Live search** — refetch on every character (network churn).
4. **`dealsOnly`** — client-side filter breaks pagination accuracy.
5. **No suggest panel** on catalog search focus.
6. **Category row + filter chips** — two horizontal scroll areas before grid.

### Recommendations

- Collapse `CatalogTitleRow` into search row subtitle when `q` or category active.
- Debounce catalog `q` API calls (300ms); immediate update for submit.
- Move `dealsOnly` to server query when backend supports `compareAt` filter (else document limitation).
- On `focusSearch=1`, open suggest/history panel immediately.

---

## 12 — Filters audit

| Filter | Status | Notes |
|--------|--------|-------|
| Sort (popular/newest/price) | **WORKING** | API `sort` param |
| Category | **WORKING** | `categoryId` |
| Seller | **WORKING** | `sellerId` deeplink |
| In stock | **WORKING** | `inStock=1` |
| Deals/discounts | **UI_ONLY** | Client filters current page |
| Price range | **BACKEND_SUPPORTED_NOT_WIRED** | `priceMin`/`priceMax` in schema |
| City | **BACKEND_SUPPORTED_NOT_WIRED** | `city` param exists |
| Condition | **BACKEND_SUPPORTED_NOT_WIRED** | `condition` param |
| Brand | **BACKEND_SUPPORTED_NOT_WIRED** | `brand`/`brandId` |
| Facets | **BACKEND_SUPPORTED_NOT_WIRED** | `/api/catalog/facets` web only |
| Personalized | **NOT_SUPPORTED** | — |

### Wave B filter recommendation

Ship only **WORKING** filters. Optionally add **price range** (two inputs in filter sheet) if staging inventory benefits — requires extending `CatalogParams` in `endpoints.ts`.

**Do not ship** facet system on mobile in Wave B.

---

## 13 — Product Detail component tree

```
ProductScreen
├── ProductDetailHeader          (back, share, favorite)
├── ScrollView
│   ├── ProductGallery           (swipe, badges, optional «Похожие» scroll jump)
│   ├── title + ProductSocialProof
│   ├── ProductPriceCard
│   ├── ProductSellerCard        (if seller)
│   ├── ProductDeliveryCard      (if pickupPoints)
│   ├── ProductCharacteristicsCard
│   ├── ProductDescriptionCard
│   ├── ProductReviewsCard
│   └── ProductRelatedRail       (HomeProductCard × N)
└── ProductStickyPurchaseBar     (cart stepper + Купить сейчас)
```

### Information order issues

1. Title appears **before** price card (acceptable) but price card is in separate section below social proof — adds vertical gap.
2. Seller/delivery/reviews push **related products** far down.
3. Related rail uses **weaker card** (no cart).
4. «Похожие» gallery button scrolls to related — **keep** (not an unwanted overlay; RC26 gated behind `hasSimilar`).

---

## 14 — PDP first viewport target order

**Goal:** User sees product, price, purchase path without scrolling on typical 6.5" phone.

### Proposed order (above fold)

```
1. ProductGallery          (keep height; PRODUCT_GALLERY_HEIGHT from constants)
2. Title (1–2 lines)
3. ProductPriceCard        (MOVE up — merge adjacent to title block)
4. ProductSocialProof      (compact inline with price or below title)
5. [sticky bar always visible at bottom]
```

### Below fold (unchanged relative order)

Seller → Delivery → Characteristics → Description → Reviews → Related

### Do not change (Wave A boundary)

- Seller trust chips (`respondsInChat` only when true)
- Checkout handoff (out of scope)

---

## 15 — Product gallery

| Aspect | Current | Recommendation |
|--------|---------|----------------|
| Swipe | Horizontal `FlatList` paging | **KEEP** |
| Pagination | Dots + `N/M` counter | **KEEP** |
| Image sizing | `contain` in fixed surface | **KEEP** |
| Fallback | `ProductImageFallback` | **KEEP** |
| Zoom | None | **Do not add** in Wave B |
| Discount badge | When `compareAt > price` | **KEEP** |
| Hit badge | `views >= 40` or `favoritesCount >= 8` | **KEEP** — data-backed |
| «Похожие» button | Scroll-to-related when `hasSimilar` | **KEEP** — not a fake overlay |

---

## 16 — PDP purchase bar target spec

### Current (correct direction)

| Control | Role |
|---------|------|
| Secondary | «В корзину» → stepper when qty > 0 |
| Primary | «Купить сейчас» + price |
| OOS | «Нет в наличии» full width |

### Target spec (preserve + minor polish)

```
Position: absolute bottom; safe-area padding via useSafeAreaInsets
Height: STICKY_BAR_HEIGHT (from product/ui/constants)
Left slot (44%): cart stepper or «В корзину» outlined
Right slot (56%): «Купить сейчас» filled + price subtitle
Buy Now: add to cart if qty=0, then router.push("/checkout")
Loading: «Оформление…» on buyNowLoading only
Scroll padding: stickyBarContentInset(bottomInset)
```

**No duplication:** Remove any inline add-to-cart buttons from scroll content (none today).

---

## 17 — Related products

| Aspect | Current |
|--------|---------|
| Endpoint | **No dedicated related API** |
| Data | `fetchCatalog({ sort: "popular", categoryId })` minus current id, slice(6) |
| Fallback | Empty → hide rail |
| Genuinely related? | **No** — same-category popular |
| Label | «Похожие товары» — **overstates** relevance |

### Classification: **IMPROVE**

| Action | Detail |
|--------|--------|
| Rename | «Ещё в категории» or «Популярное в категории» unless real related API added |
| Card | Migrate to `ProductCardV2` with cart CTA |
| Hide rule | Hide when `< 2` items after filter |
| Do not fake | No static/demo products |

---

## 18 — Favorites consistency

| Surface | Visual | Optimistic | Error rollback | Auth |
|---------|--------|------------|----------------|------|
| Home rail | heart toggle | ✅ `useFavoritesStore` | ✅ on API fail | toast |
| Catalog | heart toggle | ✅ | ✅ | toast |
| PDP header | heart toggle | ✅ | ✅ | toast |
| Favorites tab | heart toggle | ✅ + list reload | ✅ | toast |
| Related rail | heart toggle | ✅ | ✅ | toast |

**Wave B:** Ensure `ProductCardV2` uses identical heart size/position/colors across variants.

---

## 19 — Loading / empty / error matrix

| Surface | Skeleton | Empty | Network error | Retry |
|---------|----------|-------|---------------|-------|
| Home | `SkeletonGrid` + `HomeSectionSkeleton` | Hide empty rails | Inline `ErrorState` below content | ✅ `load()` |
| Catalog | `CatalogSkeletonGrid` (6) | `EmptyState` presets | Full `ErrorState` when no items | ✅ |
| Search suggest | Inline shimmer chips | «Начните вводить» | Silent fail → hide panel | — |
| PDP | `ProductDetailSkeleton` | — | Custom error screen | ✅ `load()` |

**Rule:** Never show raw API error strings — use `ErrorState` / friendly Russian copy.

---

## 20 — Mobile density notes

| Issue | Location | Impact |
|-------|----------|--------|
| Hero ~200px + dots | Home | Pushes first product rail below fold |
| `HomeHeader` brand 30px font | Home + Catalog | Tall header |
| Catalog 5-row header stack | Catalog | ~236px before grid |
| Grid card 318px height | Catalog | ~2.0 cards visible on 2400px height |
| Rail card 244px | Home | Acceptable for horizontal scroll |
| Filter button 54×54 | Home search row | Large touch target (OK) |
| Sticky PDP bar | Product | Correct safe-area handling |

### Density targets

- Home: first **product thumb visible** without scroll on 1080×2400.
- Catalog: **≥ 2 full product rows** visible below collapsed header.
- Maintain **44px min** touch targets; do not shrink favorites/cart below 36px width.

---

## 21 — Top 10 conversion leaks

| # | PROBLEM | EVIDENCE | IMPACT | COMPLEXITY | PROPOSED FIX |
|---|---------|----------|--------|------------|--------------|
| 1 | Home hero consumes first viewport | `HomeHeroBanner` minHeight 176 + dots before/after rail order | **VERY_HIGH** | **S** | Move product rail above hero; compact hero |
| 2 | No add-to-cart on Home | `HomeProductCard` lacks cart | **VERY_HIGH** | **M** | `ProductCardV2` rail with cart stepper |
| 3 | Three incompatible product cards | 3 implementations | **HIGH** | **M** | Unify to `ProductCardV2` |
| 4 | Search suggest not wired | `fetchProductSuggest` unused | **HIGH** | **S** | `CommerceSearchBar` + debounced suggest |
| 5 | Search history not shown | `loadSearchHistory` unused | **HIGH** | **XS** | Wire `CommerceSearchBar` history panel |
| 6 | Recent views not shown | `trackRecentView` write-only | **HIGH** | **S** | Home «Недавно смотрели» rail |
| 7 | Catalog header too tall | 5 stacked rows | **MEDIUM** | **S** | Collapse title row; reduce gaps |
| 8 | Related products mislabeled | Category popular labeled «Похожие» | **MEDIUM** | **XS** | Honest section title |
| 9 | Fake «Доставка» badge on `ProductCard` | `ProductCard.tsx` line 84 | **MEDIUM** | **XS** | Remove in V2 migration |
| 10 | Catalog live search churn | `useEffect` on every `q` char | **MEDIUM** | **XS** | Debounce 300ms |

---

## 22 — Scope control (explicit exclusions)

Wave B will **NOT** include:

- Recommendation ML / collaborative filtering
- AI search or natural language queries
- Personalization platform / user taste profiles
- Seller dashboard redesign
- Checkout or payment UX (Wave A complete)
- Chat rewrite
- Push notifications
- Loyalty / wallet programs
- Analytics platform
- Faceted catalog parity with web
- City/location picker
- RC27 build or MRP changes

---

## 23 — Recommended Wave B sub-waves

### B1 — Home + ProductCard foundation

| | |
|---|---|
| **FILES** | `src/commerce/ProductCardV2.tsx`, `CommerceCartCta.tsx`, `home/*`, `index.tsx`, `favorites.tsx`, `seller/[id].tsx` |
| **DEPENDENCIES** | None (first) |
| **EXPECTED IMPACT** | VERY_HIGH — unified card, Home cart, viewport reorder |
| **RISK** | MEDIUM — card migration regression on favorites/seller |

### B2 — Search + Suggest + History

| | |
|---|---|
| **FILES** | `HomeSearchRow.tsx`, `CatalogSearchRow.tsx`, `CommerceSearchBar.tsx`, `endpoints.ts` (suggest types), `index.tsx`, `catalog.tsx` |
| **DEPENDENCIES** | B1 optional (suggest navigates to catalog/PDP) |
| **EXPECTED IMPACT** | HIGH — faster discovery, fewer empty searches |
| **RISK** | LOW — mostly wiring existing APIs |

### B3 — PDP conversion polish

| | |
|---|---|
| **FILES** | `product/[id].tsx`, `product/ui/*`, `ProductRelatedRail.tsx` |
| **DEPENDENCIES** | B1 (`ProductCardV2` on related rail) |
| **EXPECTED IMPACT** | MEDIUM — clearer PDP hierarchy + related cart |
| **RISK** | LOW |

**Sequence:** B1 → B2 → B3 (B2 can overlap B1 tail if separate developers).

---

## 24 — RC27 candidate scope

### RC27_AFTER_WAVE_B=**YES**

**Reasoning:**

- Wave A closes trust/edit/checkout/profile blockers for real beta.
- Wave B delivers visible buyer conversion improvements across the primary funnel.
- Together they satisfy POST-RC26 audit recommendation: *«P0 trust fixes + Home de-demo + unified product card»* without updater-only or infrastructure-only RC.
- No RC27 artifact should be created until Wave A native acceptance passes and Wave B is implemented + tested.

---

## 25 — Implementation backlog

Tasks ordered by dependency. IDs use `WB-` prefix.

### B1 — Foundation

| ID | TITLE | FILES | CURRENT | TARGET | API | ACCEPTANCE | TESTS | IMPACT | COMPLEXITY | RISK |
|----|-------|-------|---------|--------|-----|------------|-------|--------|------------|------|
| WB-01 | Create ProductCardV2 + CommerceCartCta | `src/commerce/ProductCardV2.tsx`, `CommerceCartCta.tsx` | 3 card implementations | Single component `variant: grid\|rail` | — | Grid+rail render; stable heights; discount/favorite/cart rules | `tests/mobile-product-card-v2.test.ts` | VERY_HIGH | M | M |
| WB-02 | Migrate Catalog to ProductCardV2 | `catalog.tsx`, remove `CatalogProductCard` | CatalogProductCard | ProductCardV2 grid | — | Catalog grid visually unchanged; cart works | extend commerce integration tests | HIGH | S | L |
| WB-03 | Reorder Home viewport | `index.tsx`, `HomeHeroBanner` | Hero before rail | Rail before hero; compact hero optional | `fetchCatalog` | First product visible without scroll 1080×2400 | visual snapshot / manual | VERY_HIGH | S | L |
| WB-04 | Add cart to Home rail | `HomeProductRail.tsx`, `index.tsx` | No cart on home | Stepper on rail cards | `/api/cart` | Add/increment/decrement from Home | commerce integration | VERY_HIGH | M | M |
| WB-05 | Recent views rail | `index.tsx`, new `HomeRecentRail` | write-only storage | «Недавно смотрели» when ≥1 | `loadRecentViews` | Section hidden when empty | storage unit test | HIGH | S | L |
| WB-06 | Favorites teaser | `index.tsx` | buyer-home count unused | Section when `favourites.count > 0` | `fetchFavorites`, `fetchBuyerHome` | Link to favorites tab | wave-6 contract test | MEDIUM | S | L |
| WB-07 | Fix promo tile deeplinks | `HomePromoTiles.tsx` | hardcoded `q` strings | `categoryId` from API map | `fetchCategories` | Tiles open correct category | commerce integration | MEDIUM | S | L |
| WB-08 | Remove hero fake dots | `HomeHeroBanner.tsx` | 3 fake carousel dots | Static hero OR real slides | — | No non-functional carousel | unit test | MEDIUM | XS | L |
| WB-09 | Migrate Favorites ProductCard | `favorites.tsx` | Legacy ProductCard + fake delivery | ProductCardV2 compact | — | No «Доставка» badge | favorites flow test | MEDIUM | S | M |
| WB-10 | Migrate seller storefront cards | `seller/[id].tsx` | Legacy ProductCard | ProductCardV2 grid | — | Cart/favorite unchanged | — | LOW | S | M |

### B2 — Search

| ID | TITLE | FILES | CURRENT | TARGET | API | ACCEPTANCE | TESTS | IMPACT | COMPLEXITY | RISK |
|----|-------|-------|---------|--------|-----|------------|-------|--------|------------|------|
| WB-11 | Wire CommerceSearchBar on Home | `HomeSearchRow.tsx`, `index.tsx` | Plain TextInput | History + popular on focus | `loadSearchHistory` | Recent chips visible | search entry test | HIGH | S | L |
| WB-12 | Wire CommerceSearchBar on Catalog | `CatalogSearchRow.tsx`, `catalog.tsx` | Plain TextInput | Same panel | history | focusSearch opens panel | search entry test | HIGH | S | L |
| WB-13 | Product suggest dropdown | `CommerceSearchBar.tsx` or wrapper | suggest unused | Debounced suggest list | `fetchProductSuggest` | Category→catalog; product→PDP | new suggest test | HIGH | M | M |
| WB-14 | Debounce catalog search | `catalog.tsx` | live refetch | 300ms debounce | `fetchCatalog` | Fewer API calls while typing | — | MEDIUM | XS | L |
| WB-15 | Remove dead import | `index.tsx` | `loadSearchHistory` imported unused | Used via CommerceSearchBar | — | No lint dead imports | — | LOW | XS | L |

### B3 — PDP

| ID | TITLE | FILES | CURRENT | TARGET | API | ACCEPTANCE | TESTS | IMPACT | COMPLEXITY | RISK |
|----|-------|-------|---------|--------|-----|------------|-------|--------|------------|------|
| WB-16 | PDP first viewport hierarchy | `product/[id].tsx` | Price in separate section | Title+price+social compact block | — | Price visible above fold | — | MEDIUM | S | L |
| WB-17 | Related rail ProductCardV2 | `ProductRelatedRail.tsx` | HomeProductCard | V2 rail with cart | `/api/cart` | Add-to-cart from related | — | MEDIUM | S | M |
| WB-18 | Honest related title | `ProductRelatedRail.tsx` | «Похожие товары» | «Популярное в категории» | — | Title matches data source | — | LOW | XS | L |
| WB-19 | Catalog header density | `catalog.tsx`, `CatalogTitleRow.tsx` | 5-row stack | Collapsed title/subtitle | — | +1 product row visible | — | MEDIUM | S | L |
| WB-20 | Optional price filter | `CatalogFilterBar.tsx`, `endpoints.ts` | not wired | min/max price chips | `priceMin/Max` | Filter persists in URL state | catalog filter test | LOW | M | M |

### Cross-cutting

| ID | TITLE | FILES | CURRENT | TARGET | API | ACCEPTANCE | TESTS | IMPACT | COMPLEXITY | RISK |
|----|-------|-------|---------|--------|-----|------------|-------|--------|------------|------|
| WB-21 | Loading/error copy audit | Home, Catalog, PDP | some raw errors | friendly copy only | — | No technical messages shown | — | MEDIUM | S | L |
| WB-22 | Physical acceptance checklist | `docs/product/PRODUCT_WAVE_B_BUYER_CONVERSION.md` | — | Mac/AVD buyer walkthrough | — | Home→search→PDP→cart path | manual | HIGH | S | — |

---

## 26 — Dependencies on Wave A (do not modify)

| Wave A item | Wave B constraint |
|-------------|-------------------|
| Trust strip copy | Keep `HOME_TRUST_ITEMS` truthful text |
| `respondsInChat` | PDP seller chips remain data-backed only |
| Checkout handoff | Out of scope |
| Profile identity | Out of scope |

---

## Appendix A — Test plan (Wave B)

```bash
npm test -- tests/mobile-commerce-integration.test.ts
npm test -- tests/mobile-search-entry.test.ts
npm test -- tests/mobile-rail-categories.test.ts
npm test -- tests/mobile-product-card-v2.test.ts   # new
cd apps/mobile && npm run typecheck
```

Manual Mac acceptance: Home viewport → search suggest → catalog filter → PDP buy now → cart badge update.

---

## Appendix B — Source references

| Area | Primary paths |
|------|---------------|
| Home screen | `apps/mobile/app/(tabs)/index.tsx` |
| Catalog screen | `apps/mobile/app/(tabs)/catalog.tsx` |
| PDP | `apps/mobile/app/product/[id].tsx` |
| Buyer home API | `lib/mobile/buyer-home-data.ts`, `app/api/mobile/buyer/home/route.ts` |
| Suggest API | `app/api/products/suggest/route.ts`, `features/products/queries.ts` |
| Search history | `apps/mobile/src/storage/search-history.ts` |
| Commerce actions | `apps/mobile/src/hooks/useCommerceActions.ts` |
| POST-RC26 audit | `docs/product/POST_RC26_FULL_PRODUCT_AUDIT.md` |

---

*Document version: 1.2 — B0/B1 merged; B2 implemented on branch `cursor/product-wave-b2-search`.*

---

## Implementation status (B0 + B1)

See `docs/product/PRODUCT_WAVE_B_B0_B1_IMPLEMENTATION.md` for architecture, contracts, test matrix, and native checklist.

| Slice | Status |
|-------|--------|
| B0 catalog race/pagination | Implemented |
| B0 cart/favorite busy scope | Implemented |
| B0 deals-only truthfulness | Implemented (`CLIENT_SIDE_ONLY`) |
| B0 promo category routing | Implemented |
| B0 recent views | Deferred (`DEFERRED_FROM_B1`) |
| B1.1 canonical ProductCard | Implemented (`grid` + `rail`) |
| B1.2 Home conversion | Implemented |
| B2 Search UI | Implemented; native acceptance pending |
| B3 PDP redesign | Deferred |

### B2 implementation note

Catalog now separates typed, debounced, and committed search values. Typing only requests real API suggestions after 300 ms; Catalog results change only on an explicit commit. Suggest requests have an independent generation guard, while committed searches continue through the B0 query-key, stale-response, pagination-reset, in-flight, and dedupe protections. Local history is normalized, case-insensitively deduplicated, newest-first, and capped at eight entries. No hardcoded popular-search content is shown. See `PRODUCT_WAVE_B_B2_SEARCH_IMPLEMENTATION.md`.
