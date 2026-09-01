# POST WAVE A+B — RC27 Product Readiness Gate

**Audit type:** Read-only product gate (no implementation changes)  
**Authoritative baseline:** `origin/main` @ `ee8023502346e2557d6f1915145296c5b60de78e`  
**Audit date:** 2026-09-01  
**Wave status:** WAVE_A, B0, B1, B2, B3 — merged and closed

---

## Executive Summary

This gate evaluates whether the current LOT mobile application can become the **RC27 release candidate** based on real buyer/seller marketplace loop coherence — not feature parity with mature marketplaces.

**Baseline verification**

| Check | Result |
|-------|--------|
| `origin/main` | `ee8023502346e2557d6f1915145296c5b60de78e` ✓ |
| Wave B3 head `f368a5d` | ancestor of main ✓ |
| Wave B2 head `20a214d` | ancestor of main ✓ |
| Wave B1 head `6dd0e96` | ancestor of main ✓ |

**Verdict:** The closed-beta marketplace loop is **coherent and functional** on current main. Buyer discovery → product → cart → web checkout handoff → orders, and seller create/edit → moderation → inventory management paths are implemented and API-backed. Wave A+B materially improved trust truthfulness, canonical product cards (Home/Catalog/PDP related), search B2 contracts, and PDP polish.

**No P0 product blockers** were found that would prevent RC27 candidacy. Remaining issues are **P1 beta polish** (misleading copy, favorites card parity, seller role refresh after web onboarding, checkout-return heuristic) and **P2 post-beta** improvements.

**RC27 decision:** `READY_FOR_RC27_CANDIDATE`

---

## 1. Buyer Loop

### Home — `HOME_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Useful products early | Popular catalog rail loads before hero (`fetchCatalog({ sort: "popular" })`, first 12 items) |
| Category routing | `HomeCategoryRow` routes to catalog with `categoryId`; promo tiles route to catalog filters |
| Promo routing | `HomePromoTiles` deep-link to catalog category/deals params — not dead CTAs |
| Fake carousel controls | None observed |
| Location | Static label `Екатеринбург` with `accessibilityRole="text"` — not a fake selector |
| Unsupported marketing | `HomeTrustStrip` claims are operational (chat, order status, moderation) — no 24/7/guaranteed delivery |
| Canonical ProductCard | `HomeProductRail` uses `commerce/product-card` rail variant with cart/favorite busy scopes |
| Cart/favorite integration | `useCommerceActions` with per-product busy state |

Minor P1: `fetchBuyerHome` failure is non-blocking (`secondaryError`); home category shortcuts remain partially static vs full API taxonomy.

### Catalog — `CATALOG_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Initial load / pagination | B0 `catalog-query.ts` — race protection, cursor dedupe, `mergeCatalogProducts` |
| Categories / filters / sort | `CatalogCategoryRow`, `CatalogFilterBar`, sort values enforced |
| Search integration | B2 committed vs input query separation; catalog resets on category/seller param |
| Stale response protection | `requestGenerationRef`, `isStaleCatalogRequest` |
| Product dedupe | `mergeCatalogProducts` |
| Deals-only | Client-side `applyDealsOnlyFilter` with `countMode` truth in pagination |
| Canonical ProductCard | `CatalogProductCard` → commerce grid variant |
| Loading/empty/error | Skeleton grid, preset empty states, retry on error |

### Search — `SEARCH_GATE=PASS`

B2 contracts integrated in `catalog.tsx` + `CatalogSearchPanel`:

| Criterion | Finding |
|-----------|---------|
| Input / debounced / committed separation | `inputQuery`, `debouncedQuery`, `committedQuery` |
| Suggestions ≥ min length | `shouldRequestSuggestions` + `SEARCH_DEBOUNCE_MS` |
| Stale suggest protection | `suggestGenerationRef.invalidate()` |
| History / dedupe / clear | `search-state.ts` + `search-history.ts` |
| Manual + suggestion commit | `commitSearchQuery`, panel handlers |
| No fake popular searches | `POPULAR_SEARCHES` constant exists in `search-history.ts` but **not rendered** in B2 UI |
| Catalog query reset | Category/seller focus resets committed query |

P2: Remove dead `POPULAR_SEARCHES` export from `CatalogToolbar` re-export chain.

### Product Detail — `PDP_GATE=PASS`

B3 contracts verified:

| Criterion | Finding |
|-----------|---------|
| First viewport hierarchy | Gallery → title/social proof → price → characteristics → description → seller |
| Truthful price / gallery | `ProductPriceCard`, overlay discount only when `compareAt` valid |
| Characteristics / description | Data-backed sections, omitted when empty |
| Seller block / chat | `ProductSellerCard` with `openProductConversation` |
| Related title | `Популярное в категории` via `pdp-related.ts`; current product excluded |
| Canonical related card | Commerce `ProductCard` rail in `ProductRelatedRail` |
| Sticky purchase bar | `ProductStickyPurchaseBar` with `cartBusy` / favorite busy |
| Loading / error / not-found | Skeleton; distinct 404 vs network error states |

Trust filtering: `filterTruthfulSellerBadges` strips unsupported seller badge patterns.

### Favorites — `FAVORITES_GATE=BLOCKED`

| Criterion | Finding |
|-----------|---------|
| Add/remove | Works via `toggleProductFavorite` + API refresh |
| Cross-surface consistency | **Fails** — still uses legacy `components/ui/ProductCard`, not canonical commerce card |
| Empty state | `EmptyState preset="favorites"` |
| Navigation | Routes to PDP |
| No fake state | **Fails** — legacy card renders unconditional `"Доставка"` badge on every item (`ProductCard.tsx:84`) |

Functional loop works; gate blocked on **card parity + misleading delivery badge**. Classified P1, not P0.

### Cart — `CART_GATE=BLOCKED`

| Criterion | Finding |
|-----------|---------|
| Add / quantity / decrement | API-backed with `withBusy` per-product scope |
| Authoritative reconciliation | `applyCartItems` on load; `cart-response.ts` pattern in commerce layer |
| Cross-surface consistency | Quantities sync via `useCartQuantitiesStore` |
| Empty state | `CartEmptyState` |
| Checkout CTA | Navigates to `/checkout` |
| Mutation busy scope | Per-product `busyIds` |

**Gate blocked on truth:** `CartCheckoutBar` and cart `onCheckout` show `"Создание заказа…"` while only calling `router.push("/checkout")` — no order is created in-app at this step.

P1: `CartDeliveryCard` shows chevron affordance but is non-interactive (looks tappable).

### Checkout — `CHECKOUT_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Native vs browser | In-app summary + `fetchCheckoutWebUrl` → `Linking.openURL(handoffUrl)` |
| Post-CTA behavior | Browser opens web checkout; `useCheckoutReturnRefresh` refreshes on foreground |
| Delivery/payment UI | `CheckoutNextStepInfo` + `CheckoutHandoffBanner` explicitly defer to next step — not fake selectors |
| Wording | Truthful handoff copy; `formatCheckoutHandoffError` sanitizes failures |
| Price coherence | Server subtotal reconciliation; delivery line shows "Рассчитается при оформлении" |
| Deep-link return | Foreground listener on `/checkout` and `/cart` paths |
| URL/error leakage | Handoff errors user-safe; no raw API URLs in UI |

Browser handoff is **intentional and truthfully explained** — not a blocker.

P1: Return refresh assumes `fetchOrders().items[0]` is the checkout result (heuristic).

### Buyer Orders — `BUYER_ORDERS_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Order state visibility | List + detail with `formatBuyerOrderStatus` |
| Readable labels | Mapped via `order-status.ts` — no raw enum in primary UI |
| Navigation | Order → product links coherent |
| Empty state | Present |
| Fake tracking | Timeline is simplified, not fake carrier tracking |

P1: Orders tab hidden from bottom bar (`href: null`) — reachable via profile only.

### Chat — `CHAT_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Start/open conversation | `createConversation(productId)` from PDP |
| Product/seller context | Thread shows counterpart + product context |
| History / send | Inbox + thread screens with Russian copy |
| Empty/error | "Сообщений пока нет", auth gate in `useChatActions` |
| Unsupported presence claims | No "Быстро отвечает" in runtime UI |

Note: `tests/mobile-chat.test.ts` fails because it asserts `"Написать продавцу"` in `product/[id].tsx`; string moved to `ProductSellerCard.tsx` after B3. **Product wiring intact** — test hygiene only.

---

## 2. Seller Loop

### Seller Entry — `SELLER_ENTRY_GATE=BLOCKED`

| Criterion | Finding |
|-----------|---------|
| Reach seller workspace | Sell tab + profile menu when `sellerCapable` |
| LOT terminology | Consistent "ЛОТ" / "Мои ЛОТы" — no "объявление" in seller surfaces |
| Navigation | Hub: create, my LOTs, orders, messages |

**Gate blocked:** `sellerCapable` derives from `userRole` set only at **login** and **boot** (`app-store.ts`, `run-startup-pipeline.ts`). After web seller onboarding (`openWebHandoff("/account/seller-start")`), role is **not refreshed** until re-login or cold boot. New sellers see onboarding card despite completed web flow.

P1 — recoverable via logout/login; does not break existing sellers.

### Create LOT — `CREATE_LOT_GATE=PASS`

Multi-step wizard: photos → details → characteristics → preview → submit. Autosave via `lot-draft-storage`. Preview gate enforced. Publish routes to moderation outcome screens.

### Edit LOT — `EDIT_LOT_GATE=PASS`

Wave A regression fixed:

- `sell/create?lotId=` → `useLotCreateForm({ editLotId })`
- Prefills via `fetchSellerLot(editLotId)` + `mapSellerLotToEditDraft`
- Same LOT ID on save; edit autosave isolated from create draft
- Verified by `tests/mobile-product-wave-a.test.ts`, `tests/mobile-seller-lot-characteristics-persistence.test.ts`

### Moderation Truth — `MODERATION_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Submit → PENDING_REVIEW | `publishOutcome` handling in seller API layer |
| Buyer visibility | Catalog/PDP use public product APIs — pending inventory not listed |
| Seller state | `sell/lot/[id]` shows moderation banners, `moderationStatusLabel`, edit CTA for NEEDS_FIX |
| No fake published | `isPublic` gates "Открыть как покупатель" |

### My LOTs — `MY_LOTS_GATE=PASS`

Tabbed inventory (`active` / `pending` / `drafts` / `sold`), readable status labels, navigation to detail/edit. No internal IDs as primary UX.

P2: Explicit "reopen archived LOT" flow not surfaced; edit limited to DRAFT/NEEDS_FIX states by design.

### Seller Orders — `SELLER_ORDERS_GATE=PASS`

`seller-sales.tsx`: tabbed orders, status labels in Russian, `patchSellerOrderStatus` actions match backend capability. No fake fulfillment controls beyond supported status transitions.

P2: No dedicated seller order detail screen — actions on list cards only.

---

## 3. Auth / Session — `AUTH_GATE=PASS`

| Criterion | Finding |
|-----------|---------|
| Login / logout | `login.tsx`, secure session, token refresh in `client.ts` |
| Session persistence | SecureStore + boot pipeline |
| Protected routes | Chat/commerce require auth; guest catalog browse works |
| Role behavior | Buyer default; seller surfaces gated on `sellerCapable` |
| Raw auth failures | Boot/login use `userMessage`; API client maps token errors |

P1: Stale seller role after web onboarding (see Seller Entry).

---

## 4. Profile — `PROFILE_GATE=PASS`

Email from session meta (not truncated internal user ID). Logout reachable. Buyer/seller menu coherent via `ProfileMenu`. No dead primary CTA.

P2: Wallet screen shows disabled top-up/withdraw for sellers.

---

## 5. Navigation — `NAVIGATION_GATE=PASS`

Major paths verified in source:

`Home → Catalog → Search panel → PDP → Favorites → Cart → Checkout → Orders → Chat → Profile → Sell → Create/Edit LOT`

No severe dead-ends or route loops found. Orders/messages/seller dashboards use hidden tabs (`href: null`) — reachable from profile/sell hub, not orphaned.

P1: Orders/messages discoverability weaker than tab-primary apps.

---

## 6. Truth Audit

`UNSUPPORTED_RUNTIME_CLAIMS=`

| Claim / pattern | Runtime status |
|-----------------|----------------|
| Быстро отвечает | **Not rendered** (filtered by `pdp-trust.ts`) |
| Проверенный продавец | Only when `isVerified` from API on PDP |
| Доставка сегодня | **Not rendered** in UI; dead constant in `POPULAR_SEARCHES` only |
| Поддержка 24/7 | **Not found** |
| Guaranteed delivery | **Not found** |
| Fake discount | Only when `compareAt > price` (data-backed) |
| Fake popularity / scarcity / reviews | Not observed |
| **Unconditional "Доставка" badge** | **ACTIVE** on legacy favorites `ProductCard` — **P1 truth gap** |
| Home "Следите за покупкой" | Aspirational but orders exist — acceptable for closed beta |
| Cart delivery row chevron | Looks interactive, is static — P1 |

No materially misleading commercial claims at P0 severity on primary conversion surfaces (Home, Catalog, PDP, Checkout).

---

## 7. Error / Empty / Loading — `ERROR_STATE_GATE=PASS`

Critical surfaces use skeletons, `ErrorState`, or formatted Russian messages. Checkout handoff errors sanitized. PDP distinguishes 404 vs network failure.

Observed gaps (P1/P2):

- Some catch blocks surface `err.message` from `Error` (catalog/home load) — usually generic Russian fallback
- Unknown seller product status may fall through `productStatusLabel` as raw enum string
- Boot screen exposes `errorDetails` for operator diagnostics (acceptable for beta)

No stack traces, JSON blobs, or HTTP internals in normal buyer/seller failure UI.

---

## 8. API Compatibility — `API_COMPATIBILITY_GATE=PASS`

Source review of `apps/mobile/src/api/endpoints.ts` against expected staging contracts:

| Path | Mobile usage | Status |
|------|--------------|--------|
| `GET /api/mobile/catalog/products` | Home, Catalog, PDP related | Aligned |
| `GET /api/products/{id}` | PDP | Aligned |
| `GET /api/products/suggest` | B2 search suggestions | Aligned |
| `GET /api/categories` | Category rails | Aligned |
| Cart / favorites / checkout web-url | Commerce hooks | Aligned |
| `GET /api/mobile/orders` | Buyer orders | Aligned |
| Conversations API | Chat inbox/thread | Aligned |
| Seller LOT API (`seller-lot.ts`) | Create/edit/moderation | Aligned |

No dead mobile endpoints or stale shape assumptions detected in Wave A–B3 test contracts. Live staging probe without auth was not conclusive (public catalog requires session in deployed environment); gate based on **source + contract tests**, not live authenticated staging run.

---

## 9. Test Health

**Command run on baseline `ee80235`:**

```bash
npm test -- tests/mobile-product-wave-a.test.ts \
  tests/mobile-wave-b-preflight.test.ts \
  tests/mobile-product-wave-b-home.test.ts \
  tests/mobile-product-wave-b-product-card.test.ts \
  tests/mobile-product-wave-b2-search.test.ts \
  tests/mobile-product-wave-b3-pdp.test.ts \
  tests/mobile-seller-lot-characteristics-persistence.test.ts \
  tests/mobile-my-lots-consistency.test.ts \
  tests/mobile-lot-moderation.test.ts \
  tests/mobile-deep-links.test.ts \
  tests/mobile-chat.test.ts \
  tests/mobile-post-auth-navigation.test.ts

cd apps/mobile && npm run typecheck
```

| Suite | Result |
|-------|--------|
| **PRODUCT_TESTS** | **132 passed / 133 total** (1 failed) |
| Failed test | `mobile-chat.test.ts` — stale assertion for PDP CTA string location post-B3 |
| **TYPECHECK** | **PASS** (`tsc --noEmit`) |

Failure is **test drift**, not product regression.

---

## 10. Findings Classification

### P0_RC27_BLOCKERS

**None.**

### P1_BETA_FIXES

| ID | Finding | Surface |
|----|---------|---------|
| P1-1 | Favorites uses legacy `ProductCard` with unconditional `"Доставка"` badge; not canonical commerce card | `app/(tabs)/favorites.tsx`, `components/ui/ProductCard.tsx` |
| P1-2 | Cart CTA loading copy `"Создание заказа…"` during navigation-only handoff to `/checkout` | `CartCheckoutBar.tsx`, `app/cart.tsx` |
| P1-3 | `sellerCapable` not refreshed after web seller onboarding handoff | `app-store.ts`, `sell.tsx`, boot pipeline |
| P1-4 | Checkout return uses `fetchOrders().items[0]` heuristic for success state | `useCheckoutReturnRefresh.ts` |
| P1-5 | `CartDeliveryCard` chevron implies interactivity without action | `cart/ui/CartDeliveryCard.tsx` |
| P1-6 | Orders/messages hidden from tab bar — weaker discoverability | `(tabs)/_layout.tsx` |
| P1-7 | Stale `mobile-chat.test.ts` assertion after B3 component extraction | `tests/mobile-chat.test.ts` |
| P1-8 | Unknown product status enum may display raw in seller surfaces | `theme/status-labels.ts` |

### P2_POST_BETA

| ID | Finding |
|----|---------|
| P2-1 | Migrate favorites to canonical `commerce/product-card` grid variant |
| P2-2 | Remove dead `POPULAR_SEARCHES` constant / exports |
| P2-3 | Seller order detail screen |
| P2-4 | Wallet top-up/withdraw implementation |
| P2-5 | Native in-app checkout (reduce browser context switch) |
| P2-6 | Rich recommendations / personalization |
| P2-7 | Physical Android acceptance pass for RC27 (operator checklist) |
| P2-8 | Home category shortcuts fully API-driven |

---

## 11. RC27 Decision

```
RC27_DECISION=READY_FOR_RC27_CANDIDATE
VERDICT=READY_FOR_RC27_CANDIDATE
```

The minimum closed-beta marketplace loop is **truthful enough and functionally complete** for an RC27 candidate build. Identified issues are polish, parity, and discoverability — not fundamental loop breakage, data loss, or buyer exposure to unpublished inventory.

**Minimum blocker set:** *(empty — no P0)*

---

## 12. Product Completeness Estimate

| Metric | Estimate | What prevents 100% |
|--------|----------|-------------------|
| **CLOSED_BETA_READINESS** | **85%** | Favorites card parity, cart copy truth, seller onboarding role refresh, orders tab discoverability, physical device sign-off pending |
| **PUBLIC_BETA_READINESS** | **58%** | Browser checkout handoff, limited order tracking, no push retention, wallet stubs, seller tooling depth, trust/reviews maturity |
| **MATURE_PRODUCT_COMPLETENESS** | **38%** | Native payments, logistics integration, recommendations, dispute resolution, scale moderation ops, full web/mobile parity |

---

## 13. Deferred Product Opportunities

- Favorites → canonical ProductCard migration (closes B0/B1 parity gap)
- Post-handoff role refresh (bootstrap on foreground from web onboarding)
- Checkout return deep-link with explicit `orderId` instead of latest-order heuristic
- Orders + messages as optional tab destinations or profile prominence
- Seller order detail + archived LOT reopen flows
- Cleanup dead search constants and stale contract tests
- Physical Android RC27 acceptance checklist run

---

## Final Report

```
BASE_COMMIT=ee8023502346e2557d6f1915145296c5b60de78e

HOME_GATE=PASS
CATALOG_GATE=PASS
SEARCH_GATE=PASS
PDP_GATE=PASS
FAVORITES_GATE=BLOCKED
CART_GATE=BLOCKED
CHECKOUT_GATE=PASS
BUYER_ORDERS_GATE=PASS
CHAT_GATE=PASS

SELLER_ENTRY_GATE=BLOCKED
CREATE_LOT_GATE=PASS
EDIT_LOT_GATE=PASS
MODERATION_GATE=PASS
MY_LOTS_GATE=PASS
SELLER_ORDERS_GATE=PASS

AUTH_GATE=PASS
PROFILE_GATE=PASS
NAVIGATION_GATE=PASS
ERROR_STATE_GATE=PASS
API_COMPATIBILITY_GATE=PASS

UNSUPPORTED_RUNTIME_CLAIMS=legacy favorites ProductCard unconditional "Доставка" badge (P1); dead POPULAR_SEARCHES constant contains "доставка сегодня" (not rendered)

PRODUCT_TESTS=132/133 passed (1 stale test: mobile-chat.test.ts)
TYPECHECK=PASS

P0_RC27_BLOCKERS=none
P1_BETA_FIXES=8 (see §10)
P2_POST_BETA=8 (see §10)

CLOSED_BETA_READINESS=85%
PUBLIC_BETA_READINESS=58%
MATURE_PRODUCT_COMPLETENESS=38%

RC27_DECISION=READY_FOR_RC27_CANDIDATE

SOURCE_CHANGED=NO
MRP_CHANGED=NO
RC26_CHANGED=NO
RC27_CREATED=NO

REPORT=docs/product/POST_WAVE_AB_RC27_PRODUCT_GATE.md

VERDICT=READY_FOR_RC27_CANDIDATE
```
