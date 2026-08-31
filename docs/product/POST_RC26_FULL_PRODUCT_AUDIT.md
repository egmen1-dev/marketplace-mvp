# POST-RC26 Full Product Audit

**Baseline:** RC26 (`0.1.15-beta.11`, versionCode 26)  
**Scope:** Mobile app (`apps/mobile`) — buyer, seller, marketplace UX, conversion, trust  
**Method:** Read-only inspection of current implementation (routes, screens, API wiring, copy)  
**Date:** 2026-08-30  
**Release engineering:** Out of scope (no MRP/build/updater audit)

---

## 1. Executive Summary

LOT on RC26 is a **technically functional closed-beta marketplace MVP** with real API-backed buyer catalog, cart, web-checkout handoff, orders, favorites, chat, and a multi-step seller LOT creation flow. The visual direction (clean white commerce UI, LOT orange accent) is largely aligned with the approved product direction.

However, for **real buyers and sellers**, several product gaps would cause confusion, mistrust, or abandonment before the marketplace loop feels complete:

| Area | Verdict |
|------|---------|
| Buyer discovery → product → cart | **WORKING** — catalog/search/filters functional; Home partially demo-like |
| Checkout → order | **WORKING_WITH_FRICTION** — leaves app for web payment; in-app checkout UI implies choices that are not real |
| Seller create → publish | **MOSTLY_WORKING** — wizard strong; **edit flow broken** (`lotId` param ignored) |
| Trust & reviews | **WEAK** — Home trust strip over-promises; `respondsInChat` hardcoded; reviews API exists but trust loop flag off on staging |
| Retention | **WEAK** — favorites/orders/messages exist; no price alerts, no push narrative, limited return hooks |
| Navigation | **FUNCTIONAL_BUT_FRAGMENTED** — orders/cart/messages reachable but not all obvious from tabs |

**Final verdict:** `REAL_BETA_WITH_FIXES` (see §38)

**Top 5 product problems:**
1. Misleading trust/marketing copy on Home and checkout (returns, 24/7 support, “verified sellers”, payment UX that looks in-app but is not).
2. Seller LOT **edit is broken** — `sell/lot/[id]` routes to `/sell/create?lotId=` but `useLotCreateForm` never reads `lotId`.
3. Checkout **context switch** to browser without clear upfront expectation; delivery/payment sections look selectable but are static placeholders.
4. **Profile identity** shows truncated internal user ID, not human-readable account info — undermines trust.
5. **Three product card systems** (Home rail, Catalog grid, Favorites `ProductCard`) — inconsistent density, cart controls, image fit.

**Recommended first product wave:** Wave A — Real Beta Blockers (trust truthfulness, seller edit fix, checkout handoff clarity, profile identity).

**Recommended RC27 scope:** Controlled product release — P0 trust/checkout/seller-edit fixes + Home de-demo + unified product card baseline (no updater-only RC).

---

## 2. Current Product Map

Audited **27 meaningful user-facing screens** across `apps/mobile/app/`.

### BUYER

| Route | Purpose | Primary CTA | Secondary CTA | Entry | Next step | Status |
|-------|---------|-------------|---------------|-------|-----------|--------|
| `/(tabs)/index` | Marketplace home | Search submit → catalog | Category chip → catalog | Tab, deep link | Browse catalog / product | **FUNCTIONAL_BUT_WEAK** — static promos, `fetchBuyerHome` unused |
| `/(tabs)/catalog` | Search + browse + filters | Product card tap | Filter/sort, load more | Tab, Home search, category params | Product detail | **COMPLETE** |
| `/product/[id]` | Product detail (PDP) | Buy Now / Add to cart | Favorite, message seller | Catalog, Home, favorites, related | Cart or checkout | **COMPLETE** |
| `/(tabs)/favorites` | Saved products | Open product | Add to cart | Tab, profile menu | Product / cart | **COMPLETE** |
| `/cart` | Shopping cart | Checkout | Continue shopping | Header icon, profile | Checkout | **COMPLETE** |
| `/checkout` | Pre-handoff summary | «Перейти к оформлению» → browser | Back to cart | Cart, Buy Now | Web checkout → orders | **FUNCTIONAL_BUT_WEAK** — placeholder delivery/payment UI |
| `/(tabs)/orders` | Purchase history | Open order | Go to catalog | Profile menu (hidden tab) | Order detail | **COMPLETE** |
| `/order/[id]` | Order status & timeline | Message seller | — | Orders list, checkout return | Chat / re-shop | **FUNCTIONAL_BUT_WEAK** — minimal detail |
| `/seller/[id]` | Seller storefront | View products | — | PDP seller card | Catalog filtered by seller | **COMPLETE** |

### SELLER

| Route | Purpose | Primary CTA | Secondary CTA | Entry | Next step | Status |
|-------|---------|-------------|---------------|-------|-----------|--------|
| `/(tabs)/sell` | Seller hub / onboarding | Create LOT / Create store (web) | My LOTs, orders, messages | Center FAB tab | Create or manage | **COMPLETE** |
| `/sell/create` | LOT wizard (photos→details→preview) | Continue / Publish | Save draft | Sell tab, profile | Success / My LOTs | **COMPLETE** (create); **BROKEN** (edit via `lotId`) |
| `/sell/lot/[id]` | Seller LOT detail + moderation | Fix LOT / My LOTs | View as buyer | My LOTs | Edit (broken) or buyer PDP | **FUNCTIONAL_BUT_WEAK** |
| `/(tabs)/seller-products` | My LOTs inventory | Open LOT | Create LOT, tab filter | Sell, profile | Detail / edit | **COMPLETE** |
| `/(tabs)/seller-sales` | Incoming orders | Confirm / ship actions | Refresh | Sell tab, profile | Fulfill order | **COMPLETE** — no order detail screen |
| `/(tabs)/seller-home` | Seller dashboard | Create LOT / sales | Wallet | Profile (hidden) | Seller actions | **FUNCTIONAL_BUT_WEAK** — dashboard feel |

### SHARED / ACCOUNT

| Route | Purpose | Primary CTA | Secondary CTA | Entry | Next step | Status |
|-------|---------|-------------|---------------|-------|-----------|--------|
| `/login` | Auth | Sign in | Register (web) | Bootstrap gate | Post-auth destination | **COMPLETE** |
| `/(tabs)/profile` | Account hub | Menu destinations | Logout | Tab | Orders, sell, legal | **FUNCTIONAL_BUT_WEAK** — ID not email |
| `/(tabs)/wallet` | Seller wallet | Top-up (disabled) | Withdraw (disabled) | Profile | — | **PARTIAL** — balance real, actions stub |
| `/about` | App info | — | — | Profile | — | **COMPLETE** |
| `/update` | In-app update | Download/install | — | Profile, bootstrap | Updated app | **COMPLETE** (infra) |
| `/feedback` | Product feedback | Submit | — | Deep link | — | **COMPLETE** |

### TRUST

| Surface | Implementation | Status |
|---------|----------------|--------|
| Home trust strip | `HOME_TRUST_ITEMS` static copy | **TRUST_MISLEADING** |
| PDP seller card | API storefront + badges | **TRUST_PRESENT** (partial) |
| `respondsInChat` chip | Hardcoded `true` in `buildMobileSellerStorefront` | **TRUST_MISLEADING** |
| Reviews on PDP | `ProductReviewsCard` + API | **TRUST_PRESENT** (often empty — flag off) |
| Legal links | Profile → privacy/terms | **TRUST_PRESENT** |

### COMMUNICATION

| Route | Purpose | Status |
|-------|---------|--------|
| `/messages` | Conversation inbox | **COMPLETE** |
| `/messages/[conversationId]` | Buyer↔seller thread | **COMPLETE** — no pagination UI |

### POST-PURCHASE

| Surface | Status |
|---------|--------|
| Checkout success card on orders | **COMPLETE** (via `checkoutSuccess` store + deep link) |
| Order detail timeline | **FUNCTIONAL_BUT_WEAK** |
| Message seller from order | **COMPLETE** |

---

## 3. Buyer Journey

```
Home → Catalog/Search → Product → Cart → Checkout → [Web] → Orders → Order Detail → (Chat) → Re-shop
```

| Stage | Clarity | Hierarchy | Commercial | Friction | Trust | Conversion | Empty | Loading | Error | Next action |
|-------|---------|-----------|------------|----------|-------|------------|-------|---------|-------|-------------|
| Home | Medium | Good | Medium | Low | **Low** (fake promises) | Medium | N/A | Skeleton | Retry banner | Search/catalog |
| Search/Catalog | High | Good | High | Low–Med | Medium | High | Presets | Skeleton grid | Error state | PDP |
| Product | High | Strong | High | Low | Medium | High | N/A | Skeleton | Retry | Cart/checkout |
| Favorites | High | OK | Medium | Low | Medium | Medium | Preset | Skeleton | — | PDP |
| Cart | High | Good | High | Low | Medium | High | Empty state | Skeleton | Retry | Checkout |
| Checkout | **Medium** | Good | Medium | **High** (browser) | **Low** (fake radios) | Medium | Empty redirect | Skeleton | Network | Web pay |
| Order success | Good | OK | Low | Low | Medium | — | — | — | — | Open order |
| Orders | Good | OK | Low | Med (hidden tab) | Medium | Low | Preset | Skeleton | — | Order detail |
| Order detail | Medium | OK | Low | Low | Medium | Low | — | Skeleton | Error | Chat only |

**Missing dedicated screens:** Search route (inline only), category landing page (catalog with `categoryId`), order success standalone route (inline card only).

---

## 4. Seller Journey

```
Sell tab → [Web onboarding if new] → Create LOT → Photos → Details → Preview → Submit
  → Moderation → Published → Buyer order → Seller Sales → Status actions → Chat
```

| Stage | Status | Notes |
|-------|--------|-------|
| Seller entry | **FUNCTIONAL_BUT_WEAK** | FAB obvious; non-sellers sent to web «Создать магазин» |
| Create LOT | **COMPLETE** | Autosave, draft restore, characteristics, preview |
| Edit LOT | **BROKEN** | `lotId` query ignored in `useLotCreateForm` |
| Moderation states | **COMPLETE** | Human labels in `sell/lot/[id]` banners |
| My LOTs | **COMPLETE** | Tabs: active/pending/drafts/sold |
| Seller orders | **COMPLETE** | Inline cards; no detail drill-down |
| Fulfillment | **WORKING** | Status patch API wired |

---

## 5. Navigation

### Can a first-time user understand…?

| Question | Answer |
|----------|--------|
| What LOT is? | **Partially** — brand on Home; no onboarding story |
| What can be bought? | **Yes** — catalog + home rail |
| How to search? | **Yes** — search on Home and Catalog |
| Browse categories? | **Yes** — chips on Home/Catalog (Home shortcuts partly hardcoded) |
| Where is cart? | **Yes** — header icon (not tab) |
| Favorites? | **Yes** — tab |
| Orders? | **Hidden** — profile menu only (`href: null` tab) |
| Messages? | **Partial** — bell icon → messages; not labeled «Сообщения» |
| How to sell? | **Yes** — center FAB «Продать» |
| Seller LOTs? | **Yes** — Sell hub + profile |
| Account? | **Yes** — Профиль tab |

### Competing systems

- **Two headers:** `HomeHeader` on Home + Catalog (cart/messages) vs `AppHeader` on some seller screens.
- **Hidden tabs:** orders, wallet, seller-home, seller-products, seller-sales — reachable only via profile/sell hub.
- **Bell icon = messages**, not notifications — semantic mismatch.

```
NAVIGATION_CRITICAL_ISSUES=
1. Orders only in Profile — high-intent post-purchase destination buried.
2. Messages discoverable as «Уведомления» bell — wrong mental model.
3. Cart not in tab bar — acceptable for commerce apps but inconsistent with profile duplicate entry.
4. Seller dashboard (seller-home) feels like separate product from buyer tabs.
5. Edit LOT dead-end: banner CTA routes to create with lotId that is ignored.

NAVIGATION_SIMPLIFICATION_OPPORTUNITIES=
1. Add «Заказы» to Profile purchases section prominence OR badge on Profile when active orders.
2. Rename bell accessibility label to «Сообщения».
3. Consolidate seller entry: Sell FAB → direct «Создать ЛОТ» for capable sellers (skip hub screen).
4. Surface recent searches on Home/Catalog (history already persisted via pushSearchHistory).
5. Unify header component across buyer surfaces.
```

---

## 6. Home

**Files:** `app/(tabs)/index.tsx`, `src/home/*`, `src/home/content.ts`

### First viewport
- LOT brand, fake city selector («Екатеринбург»), search, category circles, hero banner, popular rail.
- **Does it feel alive?** Partially — popular products are API-backed; hero/promos are static.
- **`fetchBuyerHome()`** is called and cached but **summary never rendered** — wasted personalization opportunity.

### Issues
| Issue | Evidence | Severity |
|-------|----------|----------|
| Static trust promises | `HOME_TRUST_ITEMS`: 14-day returns, 24/7 support, verified sellers | **HIGH** |
| Fake city | `HOME_LOCATION_LABEL` hardcoded; tap opens catalog, not city picker | **MEDIUM** |
| Static hero/discounts | `HOME_HERO`, `HOME_PROMO_TILES` — not tied to inventory | **MEDIUM** |
| Category shortcuts hardcoded | `HOME_CATEGORY_SHORTCUTS` vs API categories — mapping fragile | **LOW** |
| Single product rail | Only «Популярные товары» — thin discovery | **MEDIUM** |
| No search history UI | `pushSearchHistory` used; `loadSearchHistory` imported on Home but unused | **MEDIUM** |

### Top 5 Home improvements
1. Replace or qualify trust strip with truthful marketplace policies.
2. Render `fetchBuyerHome` blocks (categories, deals) or remove dead fetch.
3. Wire recent searches below search bar.
4. Add second rail (new arrivals / deals with `deals=1` param).
5. Make city selector honest (hide or implement).

---

## 7. Search & Discovery

**Classification:** `BASIC_MARKETPLACE_SEARCH`

**Why not DEMO:** Real keyword search (`q`), category filter, seller filter, sort (popular/newest/price), in-stock, deals filter, pagination/cursor — all wired to `fetchCatalog`.

**Why not USABLE/STRONG:**
- No autocomplete — `fetchProductSuggest` exists in `endpoints.ts` but **not called from UI**.
- No recent searches displayed (storage exists).
- No typo tolerance beyond backend.
- Deals filter client-side on current page only (can show empty incorrectly).
- Result count shows loaded page count, not total.

| Capability | Status |
|------------|--------|
| Search entry | Home + Catalog |
| Query submission | Enter / submit |
| Suggestions | **MISSING** |
| Recent searches | **Stored, not shown** |
| Filters | Sort, in-stock, deals, category chips |
| Price range filter | **MISSING** |
| Condition filter | **MISSING** |
| Seller/location filter | Seller via `sellerId` param only |

---

## 8. Product Cards

**Canonical system exists?** **NO** — three implementations:

| Surface | Component | Width | Image | Cart CTA | Rating |
|---------|-----------|-------|-------|----------|--------|
| Home rail | `HomeProductCard` | Fixed rail width | cover, 120px | **None** | `HomeProductRating` |
| Catalog | `CatalogProductCard` | Grid 2-col | contain, 148px | `CatalogCartCta` | `CatalogProductRating` |
| Favorites | `ProductCard` (ui) | 48% | varies | Full stepper | Optional |

**Inconsistencies:** image `cover` vs `contain`, card heights (244 vs 318), cart only on catalog/favorites, title line clamp differences, discount badge placement aligned but dimensions differ.

**Recommendation:** One `CommerceProductCard` with `variant: rail | grid` props.

---

## 9. Product Detail

**File:** `app/product/[id].tsx`, `src/product/ui/*`

### Above the fold (strong)
- Gallery with discount/hit badges, title, social proof, price, sticky purchase bar.

### Section audit
| Section | Assessment |
|---------|------------|
| Gallery | Good — similar scroll button if related exist |
| Price | Dominant via `ProductPriceCard` + sticky bar |
| Seller | `ProductSellerCard` — trust chips include **hardcoded** «Быстро отвечает» |
| Delivery | Shown if `pickupPoints` exist — otherwise absent |
| Reviews | `ProductReviewsCard` — read-only; no submit in app |
| Related | Category-based «Похожие» — helpful |
| Cart vs Buy Now | Buy Now primary in sticky bar — correct hierarchy |

### Buyer hesitation triggers
1. No payment/delivery summary on PDP when pickup empty.
2. «Быстро отвечает» may be false (`respondsInChat: true` always).
3. Reviews often empty (trust loop disabled server-side).
4. No explicit return/policy link on PDP.

---

## 10. Cart

**File:** `app/cart.tsx`, `src/cart/ui/*`

| Check | Status |
|-------|--------|
| Product representation | Image, title, price, line total |
| Quantity stepper | Yes, with busy state |
| Delete | Via decrement to zero |
| Seller grouping | **No** |
| Subtotal / savings | Yes in checkout bar |
| Delivery | `CartDeliveryCard` — placeholder copy only |
| Empty state | Yes → catalog |
| Checkout CTA | Sticky bar |

**Friction:** User may not understand checkout opens browser. `CartDeliveryCard` chevron implies navigation but is static.

---

## 11. Checkout

**File:** `app/checkout.tsx`, `src/checkout/ui/*`

**Actual flow:** Load cart + `fetchCheckoutWebUrl()` → `Linking.openURL(handoffUrl)` → user completes on web → deep link return → orders with success state.

**Classification:** `FUNCTIONAL` — not `TRUSTWORTHY` due to UI/copy mismatch.

| Element | Truthful? |
|---------|-----------|
| Delivery section | **MISLEADING** — radio UI, «Выберите на странице оформления» |
| Payment section | **PARTIALLY MISLEADING** — «Онлайн-оплата» / «Без комиссии» may be true on web but looks in-app |
| Product summary | Yes |
| Totals | Yes |
| Final CTA | «Перейти к оформлению» — accurate |
| Unavailable items alert | Yes |

```
UNSUPPORTED_PROMISES=
- Implied in-app delivery/payment selection (CheckoutRadio components are non-interactive decor).

MISLEADING_COPY=
- CheckoutPaymentInfo presents fixed «Онлайн-оплата» as selected option without explaining browser handoff upfront.

MISSING_INFORMATION=
- No explicit «Вы перейдёте в браузер для оплаты» banner before first checkout.
- No return URL / what happens if user closes browser.
```

---

## 12. Post-Purchase

| Screen | Buyer knows… | Gaps |
|--------|--------------|------|
| Order success (orders list card) | Order number, status label | No delivery ETA, no payment receipt |
| Orders list | Number, amount, status badge | No product thumbnail on card |
| Order detail | Product, total, timeline, chat CTA | Single item focus; multi-item unclear; no cancel/dispute |

**Dead ends:** After success, only «Открыть заказ» and chat — no «Продолжить покупки» prominent CTA on detail screen.

---

## 13. Create LOT

**Files:** `app/sell/create.tsx`, `src/seller/use-lot-create-form.ts`

### Flow
Photos → Details (category, title, description, characteristics, price, stock, pickup) → Preview → Publish/Save → Success.

### Strengths
- Autosave + draft restore (`LotRestorePrompt`)
- Photo upload queue, characteristic schema from API
- Preview validation before publish
- Success states per outcome (PUBLISHED / PENDING_REVIEW / SAVED)

### Friction
| Item | Recommendation |
|------|----------------|
| Product type taxonomy depth | **SIMPLIFY** — consider defaulting type from category |
| Characteristics | **DEFER** optional fields post-publish where backend allows |
| Pickup points | **AUTO-FILL** single default for new sellers |
| Preview step | **KEEP** — builds confidence |

### Broken
- **Edit:** `router.push('/sell/create?lotId=...')` — `useLotCreateForm` has **no `lotId` handling** (grep confirms zero matches in `src/seller`).

---

## 14. Seller LOT Lifecycle

| State | Seller understanding | UI |
|-------|---------------------|-----|
| DRAFT | «Сохранённые» tab | OK |
| PENDING_REVIEW | Banner + copy | OK |
| NEEDS_FIX | Banner + remediation | OK — edit CTA **broken** |
| PUBLISHED | Active tab + public link | OK |
| REJECTED | Danger banner | OK |
| SOLD | Sold tab | OK |

Technical enums mostly hidden — `moderationStatusLabel` / `productStatusLabel` used.

---

## 15. My LOTs

**File:** `app/(tabs)/seller-products.tsx`

- Tabs, search, `SellerProductCard` — functional.
- **50 LOTs:** manageable.
- **500 LOTs:** no virtualized concerns beyond FlatList; search helps; no bulk actions (acceptable).

---

## 16. Seller Orders

**File:** `app/(tabs)/seller-sales.tsx`

- Tabbed NEW / IN_PROGRESS / COMPLETED.
- Inline `SellerOrderCard` with action buttons (`patchSellerOrderStatus`).
- **No order detail screen** — seller cannot see full buyer info/history in one place.
- Discoverability: Sell tab → Заказы (OK); badge via seller home `needAction`.

**Can seller answer «what do I do now?»** Partially — action labels exist; context thin.

---

## 17. Chat

| Check | Status |
|-------|--------|
| Entry points | PDP, order detail, sell hub, profile, header bell |
| Product context | Thumbnail + title in inbox |
| Order context | **Not explicit in thread UI** |
| Unread badges | Yes (tab badge hook) |
| Empty state | Yes |
| Pagination | **Missing** |
| Push notifications | **Missing** |

**Privacy:** Counterpart name shown — acceptable for marketplace.

---

## 18. Favorites / Retention

| Check | Status |
|-------|--------|
| Persist | API + `favorites-store` |
| Obvious | Heart on cards; tab |
| Discoverable | Tab + profile |
| Favorite → cart | Yes on favorites grid |
| Unavailable product | Not explicitly handled in favorites list |

**Return reasons today:** favorites, messages badge, orders, seller sales, optional update badge.

**Retention classification:** `WEAK` — no notifications for price drops, new listings, or order updates beyond manual check.

---

## 19. Trust

### TRUST_PRESENT
- Seller verification badge on PDP (`isVerified`)
- Seller badges from reputation API
- Moderation pipeline for LOTs
- Legal pages in profile
- Checkout security copy (card data not stored)
- In-app update integrity (RC26 — infra, not product)

### TRUST_MISSING
- Buyer protection / dispute flow in app
- Verified purchase reviews (flag off)
- Real return policy surfacing
- Support chat/ticket in app (web handoff only)
- Payment protection explanation end-to-end

### TRUST_MISLEADING
- `HOME_TRUST_ITEMS` (14-day return, 24/7 support, verified sellers blanket claim)
- `respondsInChat: true` hardcoded in `lib/mobile/seller-storefront-data.ts`
- Checkout radio rows implying choice
- Home hero «Скидки до 50%» without inventory backing

**Why trust a seller today?** Store name, optional verified badge, API badges, chat availability — **weak without reviews**.

**Why should seller trust buyer/order?** Order appears in sales tab with status — no buyer rating visible.

---

## 20. Reviews

| Check | Status |
|-------|--------|
| PDP display | `ProductReviewsCard` — aggregation + list |
| Create in app | **No** |
| Server flag | `MARKETPLACE_TRUST_LOOP_ENABLED` — **false on RC staging** |
| Empty state | «Отзывов пока нет» |
| Verified purchase | Backend concept; not exposed in mobile |

**Not demo/static in app** — real API, often empty due to flag/policy.

---

## 21. Auth / Profile

| Check | Assessment |
|-------|------------|
| Login gate | Bootstrap requires auth for commerce |
| Interrupt timing | Browse may work; cart/checkout need session |
| Registration | Web link from login |
| Profile | Menu well structured |
| Identity | **Shows `userId` slice** — not email/name |
| Buyer/seller mix | `sellerCapable` flag splits menus — OK |
| Logout | Yes |

**Ideal auth points (current capabilities):** Login before cart mutation acceptable; checkout definitely requires auth — matches implementation.

---

## 22. Empty / Loading / Error States

### Good patterns
- `EmptyState` presets (catalog, favorites, orders, wallet)
- Skeleton grids on major lists
- `ErrorState` with retry on network failures
- Human copy on most commerce screens

### Problems
| Location | Issue |
|----------|-------|
| Wallet transfers | Raw `order.status` enum (`NEW`, `PROCESSING`) |
| Login errors | May surface API exception message |
| Catalog deals filter | Silent empty when client filter removes all items |
| Generic | `err.message` passed through in some screens |

---

## 23. Demo Leakage

| Item | Class |
|------|-------|
| `HOME_LOCATION_LABEL` «Екатеринбург» | **MUST_REMOVE_BEFORE_REAL_BETA** or implement |
| `HOME_TRUST_ITEMS` / `HOME_HERO` / `HOME_PROMO_TILES` | **MUST_REMOVE_BEFORE_REAL_BETA** or tie to CMS |
| `respondsInChat: true` hardcoded | **MUST_REMOVE_BEFORE_REAL_BETA** |
| Staging API default in `env.ts` | **STAGING_ACCEPTABLE** |
| `fetchBuyerHome` unused payload | **STAGING_ACCEPTABLE** dev debt |
| Firebase QA hooks in create form | **DEV-ONLY** (gated) |

No lorem ipsum product data observed in mobile UI — catalog is API-backed.

---

## 24. Mobile UX

| Check | Assessment |
|-------|------------|
| Tap targets | Generally ≥40px on CTAs |
| Bottom reach | Sticky bars on PDP, cart, checkout — good |
| Sell FAB | Elevated — good prominence |
| Keyboard | Login/create forms — standard inputs |
| Safe areas | `useSafeAreaInsets` on tabs, headers, sticky bars |
| Back behavior | Stack headers on sub-screens |
| Image zoom | **Not implemented** on PDP gallery |
| Long titles | `numberOfLines` on cards — OK |

**Priority interaction issue:** Checkout browser handoff drops user out of app context (Android back stack).

---

## 25. Performance Perception

| Check | Assessment |
|-------|------------|
| First content | Home/catalog skeletons — good |
| Images | expo-image with transition on catalog |
| Layout jumps | Fixed card heights on catalog — good |
| Blocking spinners | PDP full-screen skeleton — acceptable |
| Refetch on focus | Cart/checkout refresh silently — may flicker |

No user-visible infrastructure profiling issues identified.

---

## 26. Marketplace Loop

| Arrow | Status |
|-------|--------|
| Seller creates supply | **WORKING** |
| LOT discoverable | **WORKING** (after moderation) |
| Buyer discovers | **WORKING** |
| Buyer trusts | **WEAK** |
| Buyer purchases | **WORKING** (web handoff friction) |
| Seller receives order | **WORKING** |
| Communicate | **WORKING** |
| Order progresses | **WORKING** (basic statuses) |
| Buyer returns | **WEAK** |
| Seller creates more | **WORKING** |

---

## 27. Buyer Conversion Leak Map

| Transition | Friction | Drop-off reason | Severity | Complexity | Impact |
|------------|----------|-----------------|----------|------------|--------|
| Home → Discovery | Static/demo home | «Is this real?» | MEDIUM | S | HIGH |
| Discovery → PDP | Card inconsistency | Mild confusion | LOW | M | MEDIUM |
| PDP → Cart | — | Low | LOW | XS | — |
| Cart → Checkout | Unclear browser step | Abandon at handoff | **HIGH** | S | **VERY_HIGH** |
| Checkout → Web | Context switch | Payment distrust | **HIGH** | M | **VERY_HIGH** |
| Web → Order | Return path failure | «Did it work?» | MEDIUM | S | HIGH |

---

## 28. Seller Funnel Leak Map

| Transition | Friction | Drop-off risk | Severity | Complexity | Impact |
|------------|----------|---------------|----------|------------|--------|
| Entry → Create | Web onboarding for new sellers | Extra step | MEDIUM | M | HIGH |
| Create → Complete | Taxonomy + characteristics | Form fatigue | **HIGH** | M | **HIGH** |
| Submit → Moderation | Wait uncertainty | Anxiety | MEDIUM | S | MEDIUM |
| Moderation → Published | — | Low | LOW | — | — |
| Published → Order | Discovery lag | No sales | MEDIUM | L | HIGH |
| Order → Fulfillment | Thin order UI | Mistakes | MEDIUM | M | HIGH |
| NEEDS_FIX → Edit | **Broken lotId** | **Abandon** | **VERY_HIGH** | S | **VERY_HIGH** |

---

## 29. Feature Value Audit

| Feature | Classification |
|---------|----------------|
| Catalog + filters | **CORE** |
| PDP + sticky buy | **CORE** |
| Cart + checkout handoff | **CORE** |
| Orders + timeline | **CORE** |
| Favorites | **CORE** |
| Chat | **CORE** |
| Create LOT wizard | **CORE** |
| My LOTs tabs | **CORE** |
| Seller sales | **CORE** |
| Seller home dashboard | **USEFUL** — borderline **LOW_VALUE** vs hub |
| Wallet top-up/withdraw stubs | **PREMATURE** — show disabled confuses |
| Home promo tiles (static) | **LOW_VALUE** |
| `fetchBuyerHome` (unused) | **TECHNICAL_ONLY** |
| Firebase QA in create | **TECHNICAL_ONLY** |
| Update screen | **USEFUL** (beta ops) |
| Feedback screen | **USEFUL** |
| Duplicate payouts → wallet menu | **DUPLICATE** |

---

## 30. Missing Capabilities

### MUST HAVE BEFORE REAL USERS
- Truthful trust/marketing copy
- Working seller LOT edit
- Clear checkout browser handoff UX
- Human profile identity (email/name)
- Honest seller chat response indicator

### IMPORTANT AFTER INITIAL BETA
- In-app or seamless checkout (reduce browser drop-off)
- Review submission + trust loop enabled
- Push notifications (orders, messages)
- Search suggestions + recent searches UI
- Order detail richness (multi-item, delivery, payment status)
- Seller order detail screen

### GROWTH FEATURE
- Price drop alerts
- Personalized home feeds
- Category landing pages

### LATER / DO NOT BUILD NOW
- ML recommendations
- Seller ERP / bulk tools
- Loyalty program
- In-app wallet top-up before payment story is clear

---

## 31. P0 Backlog — Blocks Real Beta

### P0-001 — Remove misleading Home trust promises
| Field | Value |
|-------|-------|
| USER | Buyer |
| CURRENT PROBLEM | `HOME_TRUST_ITEMS` claims 14-day returns, 24/7 support, verified sellers without product backing |
| EVIDENCE | `apps/mobile/src/home/content.ts` lines 20–38 |
| PROPOSED CHANGE | Replace with factual copy or link to real policies; hide until policies exist |
| IMPACT | VERY_HIGH |
| COMPLEXITY | XS |
| DEPENDENCIES | Legal/policy confirmation |
| ACCEPTANCE CRITERIA | No trust claim on Home that lacks operational backing |

### P0-002 — Fix seller LOT edit (`lotId` param)
| Field | Value |
|-------|-------|
| USER | Seller |
| CURRENT PROBLEM | «Исправить ЛОТ» opens create form empty |
| EVIDENCE | `sell/lot/[id].tsx` pushes `?lotId=`; `use-lot-create-form.ts` has no lotId |
| PROPOSED CHANGE | Load existing LOT into draft when `lotId` present; call `updateSellerLot` |
| IMPACT | VERY_HIGH |
| COMPLEXITY | M |
| DEPENDENCIES | `fetchSellerLot` API |
| ACCEPTANCE CRITERIA | Edit flow pre-fills photos, fields; publish updates existing LOT |

### P0-003 — Checkout handoff clarity
| Field | Value |
|-------|-------|
| USER | Buyer |
| CURRENT PROBLEM | Delivery/payment look selectable; browser redirect surprises users |
| EVIDENCE | `CheckoutDeliveryInfo`, `CheckoutPaymentInfo`, `CheckoutRadio` |
| PROPOSED CHANGE | Banner «Оплата в браузере»; simplify static sections; remove fake radio affordance |
| IMPACT | VERY_HIGH |
| COMPLEXITY | S |
| DEPENDENCIES | None |
| ACCEPTANCE CRITERIA | First-time user understands they leave app before tapping CTA |

### P0-004 — Remove hardcoded `respondsInChat: true`
| Field | Value |
|-------|-------|
| USER | Buyer |
| CURRENT PROBLEM | Every seller shows «Быстро отвечает» |
| EVIDENCE | `lib/mobile/seller-storefront-data.ts` line 41 |
| PROPOSED CHANGE | Compute from chat metrics or omit chip |
| IMPACT | HIGH |
| COMPLEXITY | S |
| DEPENDENCIES | Backend metric or remove chip |
| ACCEPTANCE CRITERIA | Chip only when data supports it |

### P0-005 — Profile shows human identity
| Field | Value |
|-------|-------|
| USER | All |
| CURRENT PROBLEM | Profile shows truncated internal ID |
| EVIDENCE | `profile.tsx` — `meta.userId.slice(0,8)` |
| PROPOSED CHANGE | Show email/name from session API |
| IMPACT | HIGH |
| COMPLEXITY | S |
| DEPENDENCIES | Session metadata endpoint |
| ACCEPTANCE CRITERIA | Profile displays user email or display name |

### P0-006 — Wallet raw status enums
| Field | Value |
|-------|-------|
| USER | Seller |
| CURRENT PROBLEM | `NEW` / `PROCESSING` shown to users |
| EVIDENCE | `wallet.tsx` line 82 |
| PROPOSED CHANGE | Map via `formatBuyerOrderStatus` or hide row |
| IMPACT | MEDIUM |
| COMPLEXITY | XS |
| DEPENDENCIES | None |
| ACCEPTANCE CRITERIA | No raw enum strings in wallet UI |

---

## 32. P1 Backlog — Real Marketplace Feel

### P1-001 — Unified CommerceProductCard
- **Problem:** Three card implementations — **Evidence:** HomeProductCard, CatalogProductCard, ProductCard — **Change:** Shared component — **Impact:** HIGH — **Complexity:** M

### P1-002 — Recent searches + suggest
- **Problem:** `fetchProductSuggest` unused; history not shown — **Impact:** HIGH — **Complexity:** S

### P1-003 — Orders discoverability
- **Problem:** Hidden tab — **Change:** Badge on Profile or post-checkout tab hint — **Impact:** HIGH — **Complexity:** S

### P1-004 — Rename messages bell
- **Problem:** Bell labeled «Уведомления» — **Change:** «Сообщения» — **Impact:** MEDIUM — **Complexity:** XS

### P1-005 — Render buyer home API summary
- **Problem:** Dead `fetchBuyerHome` — **Impact:** MEDIUM — **Complexity:** S

### P1-006 — PDP policy links
- **Problem:** No returns/delivery policy near CTA — **Impact:** MEDIUM — **Complexity:** S

### P1-007 — Order detail enrichment
- **Problem:** Single-item, thin timeline — **Impact:** HIGH — **Complexity:** M

### P1-008 — Seller order detail screen
- **Problem:** Only inline cards — **Impact:** HIGH — **Complexity:** M

### P1-009 — Enable trust loop on staging for beta
- **Problem:** Reviews empty — **Impact:** HIGH — **Complexity:** S (ops flag)

### P1-010 — Hide/disable wallet stubs
- **Problem:** Disabled buttons imply broken product — **Impact:** MEDIUM — **Complexity:** XS

### P1-011 — Home city selector honesty
- **Problem:** Fake city — **Impact:** MEDIUM — **Complexity:** XS

### P1-012 — Cart delivery card static chevron
- **Problem:** Looks tappable — **Impact:** LOW — **Complexity:** XS

---

## 33. P2 Backlog — Growth / Polish

| ID | Title | Impact | Complexity |
|----|-------|--------|------------|
| P2-001 | PDP image zoom | MEDIUM | M |
| P2-002 | Chat pagination | MEDIUM | M |
| P2-003 | Push notifications | HIGH | L |
| P2-004 | Price filter in catalog | MEDIUM | M |
| P2-005 | Second home product rail (new/deals) | MEDIUM | S |
| P2-006 | Seller onboarding in-app (reduce web) | MEDIUM | L |
| P2-007 | Favorites unavailable state | LOW | S |
| P2-008 | Order list thumbnails | MEDIUM | S |
| P2-009 | Consolidate seller-home into Sell hub | LOW | M |
| P2-010 | Post-order «Continue shopping» CTA | LOW | XS |

---

## 34. Quick Wins (max 10)

| # | Item | Impact | Complexity |
|---|------|--------|------------|
| 1 | Replace Home trust strip with factual copy | VERY_HIGH | XS |
| 2 | Checkout «Оплата в браузере» banner | VERY_HIGH | XS |
| 3 | Remove fake CheckoutRadio affordance | HIGH | XS |
| 4 | Map wallet order status labels | MEDIUM | XS |
| 5 | Rename bell → Сообщения | MEDIUM | XS |
| 6 | Hide wallet disabled top-up/withdraw | MEDIUM | XS |
| 7 | Remove/hide fake city selector | MEDIUM | XS |
| 8 | CartDeliveryCard remove chevron | LOW | XS |
| 9 | Show recent searches (loadSearchHistory) | HIGH | S |
| 10 | Post-order success «В каталог» link on order detail | MEDIUM | XS |

---

## 35. What Not To Build (yet)

- ML recommendation engine
- Full in-app payment SDK before web handoff is stable
- Seller ERP (bulk edit, analytics suite)
- Loyalty/gamification
- Social feed / following sellers
- Complex city/geo marketplace before single-region beta
- AI search / visual search
- Microservices for mobile-only features
- RC27 as updater-only release
- Expanded wallet/fintech before core loop trust is fixed

---

## 36. Product Waves

### WAVE A — Real Beta Blockers
- **GOAL:** Truthful, completable buyer/seller loops without trust damage
- **ISSUES:** P0-001 through P0-006
- **WHY NOW:** Blocks real user trust and seller remediation
- **EXPECTED RESULT:** Users can buy, sell, fix rejected LOTs, understand checkout
- **DEPENDENCIES:** Legal copy for trust strip; session email field

### WAVE B — Buyer Conversion
- **GOAL:** Reduce discovery → purchase drop-off
- **ISSUES:** P1-001, P1-002, P1-003, P0-003 polish, P2-005, P2-010
- **WHY NOW:** After truthfulness fixed, optimize funnel
- **EXPECTED RESULT:** Higher browse-to-checkout intent
- **DEPENDENCIES:** Wave A complete

### WAVE C — Seller Simplicity
- **GOAL:** Lower create/edit friction; better order handling
- **ISSUES:** P0-002 hardening, P1-008, characteristic deferral, P2-006
- **WHY NOW:** Supply side retention
- **EXPECTED RESULT:** More published LOTs, faster fixes
- **DEPENDENCIES:** P0-002

### WAVE D — Trust + Communication
- **GOAL:** Reviews, honest seller signals, richer post-purchase
- **ISSUES:** P0-004, P1-009, P1-006, P1-007, P2-003
- **WHY NOW:** Repeat purchases require trust
- **EXPECTED RESULT:** Review volume; clearer order state
- **DEPENDENCIES:** `MARKETPLACE_TRUST_LOOP_ENABLED` on staging

### WAVE E — Retention + Liquidity
- **GOAL:** Reasons to return
- **ISSUES:** P2-003, P2-004, favorites alerts, personalized home
- **WHY NOW:** After core loop stable
- **EXPECTED RESULT:** Session frequency uplift
- **DEPENDENCIES:** Waves A–D

---

## 37. Recommended RC27 Scope

RC27 should be a **product release**, not an updater test harness.

**Include:**
- Wave A complete (all P0 items)
- Subset of Quick Wins not in P0 (recent searches, bell rename)
- One conversion item: checkout banner + card unification start (P1-001 phase 1 — catalog + favorites align)

**Exclude:**
- Updater-only release
- Wallet fintech
- ML / AI search
- Large seller ERP

**Post-RC27 verification (separate from this audit):** RC26 → RC27 in-app update E2E on physical Android.

---

## 38. Final Product Verdict

```
VERDICT=REAL_BETA_WITH_FIXES
```

**Rationale:** Core marketplace mechanics exist and are API-backed — buyers can discover products, cart, complete purchase via web handoff, and track orders; sellers can create LOTs, pass moderation, and fulfill orders. The app does **not** qualify as `TECHNICAL_MVP_ONLY` because commerce UX is substantially built.

It does **not** qualify as `READY_FOR_LIMITED_REAL_BETA` because misleading trust copy, broken seller edit, and checkout UX gaps would erode confidence with real users on day one.

`REAL_BETA_BLOCKED` is too strong — purchase and publish paths work for happy paths; fixes are bounded (Wave A).

---

## Appendix — Console Summary

```
PRODUCT_SCREENS_AUDITED=27
BUYER_FLOW_STATUS=WORKING_WITH_FRICTION
SELLER_FLOW_STATUS=MOSTLY_WORKING_EDIT_BROKEN
MARKETPLACE_LOOP_STATUS=WORKING_WEAK_TRUST_AND_RETENTION

P0_COUNT=6
P1_COUNT=12
P2_COUNT=10

QUICK_WINS_COUNT=10

TOP_5_PRODUCT_PROBLEMS=
1. Misleading trust/marketing copy (Home trust strip, checkout UI, respondsInChat)
2. Seller LOT edit broken (lotId param ignored)
3. Checkout browser handoff unclear; fake delivery/payment selection UI
4. Profile shows internal ID instead of human account identity
5. Fragmented product card system and demo-like Home content

RECOMMENDED_FIRST_PRODUCT_WAVE=WAVE_A_REAL_BETA_BLOCKERS

RECOMMENDED_RC27_SCOPE=P0 trust/checkout/seller-edit fixes + checkout clarity + begin card unification (product release, not updater-only)

RELEASE_INFRA_CHANGES=NONE
SOURCE_CHANGES=NONE
MRP_CHANGES=NONE
RC27_CREATED=NO

AUDIT_DOC=docs/product/POST_RC26_FULL_PRODUCT_AUDIT.md

VERDICT=REAL_BETA_WITH_FIXES
```
