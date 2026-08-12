# Traffic Conversion Audit (HOTFIX-UX-003)

**Staging:** https://web-production-e56fb.up.railway.app  
**Date:** 2026-08-12  
**Scope:** External traffic readiness — conversion funnel, not technical load (covered by HOTFIX-UX-002).

---

## 1. Current funnel

```
VK / Ads / Organic
        ↓
   Landing (/)
        ↓
   Catalog (/catalog)
        ↓
   Product (/product/:id)
        ↓
   Cart (/cart)
        ↓
   Checkout (/checkout) — auth required
        ↓
   Stripe / free reservation
        ↓
   Order (/account/orders/:id)
```

| Step | What user sees | Primary CTA | Analytics event |
|------|----------------|-------------|-----------------|
| Landing | Hero H1, search, «Открыть каталог», popular products | Открыть каталог / Найти | `landing_view`, `page_view`, `search_used` |
| Catalog | Filters, grid, breadcrumbs | Product card tap | `category_view` |
| PDP | Gallery, price, stock, seller, delivery hints | Купить / В корзину | `product_view`, `add_to_cart` |
| Cart | Line items, total goods | Оформить заказ | — |
| Checkout | Delivery / pickup, contacts | Оплатить | `checkout_start` |
| Paid | Order confirmation | — | `purchase_complete` |

**Guest path:** can browse, search, add to cart (localStorage). Checkout redirects to sign-in (`/auth/sign-in?callbackUrl=/checkout`).

**WebView (VK):** HOTFIX-UX-002 adds `html.webview-compat`, boot splash, animation fallbacks — first paint ≤500ms verified.

---

## 2. Problems

### First visit (first 5 seconds)

| Surface | Visible in 5s | CTA clear? | Products? | Trust? |
|---------|---------------|------------|-----------|--------|
| VK WebView 390px | Hero H1, search, orange «Открыть каталог», product card in hero | ✅ Yes | ✅ Hero + grid below fold | ⚠️ Trust section below fold |
| Android Chrome 390px | Same as VK in Chromium | ✅ Yes | ✅ Yes | ⚠️ Trust below fold |
| Desktop | Full hero + side showcase product | ✅ Yes | ✅ 8 popular items | ✅ Stats + trust visible on scroll |

**P0 — Conversion**

1. **No product/seller star ratings or reviews** — trust relies on badges + order counts only.
2. **Delivery cost hidden until checkout** — CDEK quote only on `/checkout`; PDP shows text, not price.
3. **Auth wall at checkout** — guest can cart but must sign in to pay (expected for MVP, but adds drop-off).
4. **Mobile header crowded** — 6 icons at 390px; favorites only in hamburger menu.

**P1 — Clarity**

5. Homepage categories use **hardcoded slugs** (`tools`, `electronics`, …) — may 404 if taxonomy differs.
6. Hero showcase always shows «Хит» badge without real featured logic.
7. «Продать товар» CTA equal weight to buyer CTA — may distract ad traffic aimed at buyers.
8. No explicit **returns / guarantee** copy beyond generic trust cards.

**P2 — Measurement (addressed in UX-003)**

9. ~~No funnel telemetry~~ → `lib/analytics/*` + `/admin/analytics` added.
10. Page-load telemetry was log-only — conversion events now persisted in `AnalyticsEvent`.

---

## 3. UX improvements

### Homepage conversion

| Question | Answer today | Recommendation |
|----------|--------------|----------------|
| Маркетплейс? | ✅ H1 «Покупайте и продавайте…» | Keep; add one-line sub-benefit for buyers |
| Что продаётся? | ⚠️ Generic; categories + popular grid | Lead ad traffic to **category or PDP** deep links |
| Как купить? | ✅ Search + «Открыть каталог» | Add micro-copy «Выберите товар → корзина → оплата картой» |
| Почему мы? | ⚠️ Trust section below fold on mobile | Move 1 trust bullet into hero on mobile |

**Hero:** strong H1, search, dual CTAs — good.  
**Categories:** 5 tiles with counts when DB matches.  
**Popular products:** 8 cards with price/stock badges (UX-001).  
**Trust:** 3 static cards (payment, CDEK, catalog) — no reviews.  
**Stats bar:** products/sellers/categories counts when >0.

### Mobile UX (390px)

| Area | Status | Issue |
|------|--------|-------|
| Header | Functional | Catalog icon-only until 420px; no favorites in bar |
| Catalog | Good | Filters in drawer; grid readable |
| Search | Icon in header → full page | Hero search only on home |
| PDP | Good | Sticky «Купить»; reserve not in sticky bar |
| Cart | Good | Clear «Оформить заказ» |

**Touch targets:** header actions 44×44 (`header-action.ts`) — OK.

### PDP conversion

| Element | Visible above fold (mobile) | Notes |
|---------|----------------------------|-------|
| Name | ✅ | H1 |
| Photo | ✅ | Gallery |
| Price | ✅ | Large |
| Stock | ✅ | Badge «В наличии» / «Нет в наличии» |
| Seller | ✅ | Card with badges + metrics |
| Rating | ❌ | Not implemented |
| Delivery | ⚠️ | Text block, no price |
| Buy CTA | ✅ | Купить + В корзину + sticky |

**CTAs:** «Купить» → cart + checkout; «В корзину»; «Написать продавцу»; «Забронировать» when pickup enabled.

### Trust audit

| Signal | Present? |
|--------|----------|
| Product rating | ❌ |
| Seller rating | ❌ |
| Reviews | ❌ |
| Seller order count | ✅ badges/metrics |
| Payment security | ✅ trust card + Stripe |
| Returns policy | ⚠️ `/terms` only |
| Delivery | ✅ CDEK + seller shipping text |

**Improvement backlog:** product reviews post-purchase, seller rating aggregate, delivery estimate on PDP, «Безопасная сделка» badge near price.

---

## 4. Analytics events

Implemented in `lib/analytics/` (provider-agnostic adapter):

| Event | Trigger |
|-------|---------|
| `page_view` | Every route change (`AnalyticsRoot`) |
| `landing_view` | `/` only |
| `category_view` | `/catalog` mount |
| `product_view` | PDP mount |
| `search_used` | Hero search submit (query truncated, no PII) |
| `add_to_cart` | Successful add from PDP / button |
| `checkout_start` | `/checkout` mount (authed) |
| `purchase_complete` | Stripe webhook / free order server-side |

**Storage:** `AnalyticsEvent` table via `POST /api/analytics/events`.  
**Admin:** `/admin/analytics` — 7-day funnel counters + WebView split.  
**Adapter:** `createHttpAnalyticsAdapter()` default; swap via `setAnalyticsAdapter()` for gtag/Plausible later.

---

## 5. Recommended changes

### Before ad launch (quick wins)

1. ✅ Analytics foundation (this hotfix).
2. Use **PDP or category deep links** in VK ads — not bare `/` for conversion campaigns.
3. UTM params on ad URLs (manual in ad cabinet) — wire UTM capture in analytics later.
4. Manual smoke: open staging link **inside real VK app** once.

### Post-launch (P1)

5. PDP delivery price estimate (reuse `/api/delivery/quote` read-only).
6. Product reviews MVP (verified purchase only).
7. Mobile hero: single primary CTA «Смотреть каталог» full-width.
8. Homepage categories from live `listRootCategories()` instead of hardcoded slugs.

### Do not change (constraints)

- Catalog Core search/ranking/filters
- AI Product Understanding
- Vercel production

---

## 6. Ad landing readiness

| Entry | Best for | Pros | Cons |
|-------|----------|------|------|
| `/` (homepage) | Brand / awareness VK ads | Explains marketplace, search, trust | Extra click to product |
| `/catalog?category=…` | Category-specific ads | Immediate relevant grid | Needs correct slug |
| `/product/:id` | Product retargeting / SKU ads | Fastest path to cart | No marketplace context |

**Recommendation:**

- **Awareness campaigns** → homepage with UTM + «Открыть каталог» focus.
- **Performance campaigns** → **PDP deep link** or **category catalog link**.
- Avoid `/sell` in buyer ads.

---

## 7. Performance (mobile first screen)

HOTFIX-UX-002 protections retained:

- SSR `#boot-splash` + critical CSS
- LCP H1 without `opacity:0` animation
- `html.webview-compat` disables broken animations in VK
- `content-visibility` skipped in WebView

**Targets (Railway staging, Playwright VK UA):**

- Homepage H1 visible ≤500ms ✅
- Primary CTA visible ≤500ms ✅
- No white screen ✅
- PDP SSR with images via `ProductGallery` ✅

No regression introduced by analytics (async `fetch`, `keepalive`, non-blocking).

---

## 8. Test coverage

| Suite | Command |
|-------|---------|
| Unit | `npm test -- tests/analytics-events.test.ts` |
| E2E funnel | `npx playwright test tests/e2e/traffic-funnel.spec.ts -c playwright.railway.config.ts` |
| E2E WebView | `npx playwright test tests/e2e/external-traffic.spec.ts -c playwright.railway.config.ts` |

---

## 9. Screenshots

Captured under `/opt/cursor/artifacts/screenshots/` with prefix `ux003-`:

- `ux003-vk-homepage-390.png`
- `ux003-vk-catalog-390.png`
- `ux003-vk-pdp-390.png`
- `ux003-vk-cart-390.png`
- `ux003-chrome-homepage-390.png`
- `ux003-desktop-homepage.png`

---

## 10. Verdict

| Criterion | Status |
|-----------|--------|
| Technical load (WebView) | ✅ UX-002 |
| Funnel navigable mobile | ✅ |
| Clear buyer CTA | ✅ |
| Trust for cold traffic | ⚠️ No ratings/reviews |
| Analytics measurable | ✅ UX-003 |
| Checkout works | ✅ (auth required) |

**READY FOR AD LAUNCH:** **YES** — with recommendation to use **PDP/category deep links** for conversion ads and plan trust/reviews as fast follow-up.
