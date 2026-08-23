# LOT Marketplace — Launch Readiness Report (EPIC 153)

**Date:** 2026-08-23  
**Mode:** AUDIT ONLY — no code changes  
**Environment audited:** `main` + staging (`https://web-production-e56fb.up.railway.app`)  
**Mobile baseline referenced:** Closed Beta RC7 (`0.1.12-beta.1`, versionCode 12)  
**Post-audit note:** EPIC 152 (seller transaction loop) merged/open on branch `cursor/epic-152-seller-loop-12fd` — seller order accept + buyer order detail included in this assessment.

---

## Executive answers

| Question | Answer |
|----------|--------|
| **1. Can we launch first users?** | **Yes — closed beta only**, with invited cohort, documented web handoffs, and operator monitoring. Not ready for open/public launch. |
| **2. What will break the first sale?** | Checkout browser handoff friction; missing `seller@test.com` / `buyer@test.com` (use `*@demo.lot`); possible duplicate orders on double-submit; buyer confusion after web checkout return (manual refresh). |
| **3. Top 5 fixes for maximum effect** | See [§10 Priority fixes](#10-top-5-fixes-maximum-impact) |
| **4. What can wait until after launch?** | Native checkout, native product editor, mobile notifications inbox, write-review on mobile, seller analytics, payouts UI on mobile |

---

## 1. First User Experience Audit

### 1.1 New buyer (0 favorites / 0 orders / 0 messages)

| Check | Verdict | Evidence |
|-------|---------|----------|
| Home value proposition | **PARTIAL** | Subtitle «Товары рядом с вами — покупайте и продавайте» (`CommerceHeader`). No hero, no “how it works”, no first-run walkthrough. |
| Clear next action | **PARTIAL** | Search + category rail + product rails work when catalog has stock. No guided “start here” for empty account. |
| Products visible immediately | **PASS** (staging) | Staging catalog returns 60+ active products; home rails populate from `fetchCatalog`. |
| Empty screens avoided | **FAIL** (edge cases) | Home sections («Рекомендуем», «Популярное», etc.) render headers with **no body** when slice is empty. «Продолжить просмотр» uses catalog empty copy for “no history”. |
| Trust on first open | **PARTIAL** | Login gate before any browsing (`runStartupPipeline` → `/login`). No guest mode. Profile shows truncated `userId`, not friendly name. |
| Auth / registration | **WEB ONLY** | Sign-up opens browser `/auth/sign-in` / `/auth/sign-up` (`login.tsx`). No in-app registration. |
| Favorites discoverability | **WEAK** | Favorites tab hidden (`href: null`); only via Profile menu. |
| Orders first visit | **WEAK** | Empty CTA is **«Обновить»** instead of path to catalog (`orders.tsx`). |
| Messages first visit | **PASS** | «Задайте продавцу вопрос о товаре» + CTA «В каталог». |

**Buyer first-run journey (staging):**

```
Install → Boot → Login required → Home (products visible) → Catalog/PDP → Cart → Checkout (browser) → Orders (manual refresh)
```

**Friction points:**
- Mandatory login before discovery (high drop-off risk for cold users).
- Center tab **«Продать»** visible to buyers — shows seller onboarding, not buyer path.
- «Для вас» filter label implies personalization; data is popular sort only.
- `fetchBuyerHome()` API exists but is **not rendered** on home (missed opportunity for “0 orders” guidance).

### 1.2 New seller

| Check | Verdict | Evidence |
|-------|---------|----------|
| Path clarity | **PASS** | Sell tab → «Начните продавать» / «Создать магазин» → web handoff `/account/seller-start` (EPIC 152). |
| Value explanation | **PARTIAL (web)** | Web `/account/seller-start` has 5-milestone journey (`seller-start-panel.tsx`). Mobile card is one line only. |
| Dead ends | **NONE critical** | Handoff lands in authenticated web session. Product create is web `/account/products/new`. |
| Native seller creation | **WEB ONLY** | No `becomeSellerAction` on mobile; always browser handoff. |
| After becoming seller | **PASS** | Sell hub: Добавить товар / Мои товары / Заказы / Сообщения. |

**Seller first-run journey:**

```
Register (web) → Login (app) → Продать → Создать магазин (web) → Create product (web) → Orders appear in app Продажи
```

**Risk:** Seller must complete product creation on web before mobile seller loop is meaningful. Acceptable for closed beta if documented.

---

## 2. Marketplace Supply Audit

**Source:** Live staging `/api/categories` + paginated `/api/mobile/catalog/products` (2026-08-23).

| Metric | Value |
|--------|------:|
| **Categories (total)** | 51 |
| **Categories with products** | 30 |
| **Categories without products** | 21 (41%) |
| **Catalog product count (sum of category counts)** | ~123 |
| **Unique products paged** | 60+ |
| **Unique sellers (sample)** | 12 |
| **Avg products per seller (sample)** | ~5 |

**Top supplied categories:**

| Category | Products |
|----------|----------:|
| Строительство и ремонт | 27 |
| Климатическая техника | 24 |
| Обогреватели | 8 |
| Автотовары | 8 |
| Электроника | 7 |

**Empty category examples:** Автоаксессуары, Женская одежда, Обувь, Уход за кожей, Фитнес, Автохимия…

### Verdict

LOT on staging looks like a **niche demo marketplace** (construction / climate / tools), **not an empty catalog**, but **not a balanced general-purpose market**. Users browsing empty category rails will see «Все» only or filter to zero results.

**Impression:** Credible for closed beta in home-improvement vertical; weak for fashion/beauty/sport categories advertised in taxonomy.

---

## 3. Trust Layer Audit (buyer, pre-purchase)

### Product card (catalog / home)

| Signal | Status |
|--------|--------|
| Фото | ✅ |
| Цена | ✅ (+ compare-at discount) |
| Описание | ❌ (card only; full on PDP) |
| Продавец | ✅ (`storeName`, tappable) |
| Рейтинг | ⚠️ Hidden when zero reviews |
| Отзывы | ⚠️ Count via `ProductRatingRow` only when > 0 |
| Количество продаж | ❌ |
| Дата продавца | ❌ |
| Доставка | ⚠️ «Доставка» badge on **every** card (not conditional) |
| Условия возврата | ❌ |

### Product detail page (`apps/mobile/app/product/[id].tsx`)

| Signal | Status |
|--------|--------|
| Фото | ✅ Gallery |
| Цена | ✅ |
| Описание | ✅ |
| Продавец | ✅ `SellerCard` + «Написать продавцу» |
| Рейтинг | ✅ `ProductRatingRow` + «Отзывов пока нет» |
| Отзывы | ✅ `ProductReviewsSection` |
| Количество продаж | ❌ |
| Дата продавца | ❌ on PDP (web seller page has it) |
| Доставка | ✅ «Доставка СДЭК», stock badge |
| Условия возврата | ❌ No returns/policy link |

### Why should a buyer trust LOT?

**Present today:**
- Verified seller badge (when `isVerified`)
- Reviews on PDP (if any exist)
- Favorites/views social proof (when > 0)
- Chat with seller before/after purchase
- Closed beta honest checkout copy (web payment, no fake native pay)

**Missing:**
- Buyer protection / escrow messaging
- Return policy surface
- Seller tenure on mobile PDP
- Payment security badges
- Order guarantee copy

**Trust score driver:** Strong for **familiar C2C patterns** (photo, price, chat); weak for **marketplace-grade guarantees**.

---

## 4. Seller Quality Audit

### Web public seller page (`/seller/[id]`)

| Field | Status |
|-------|--------|
| Название магазина | ✅ |
| Дата регистрации | ✅ «На площадке с {date}» |
| Количество товаров | ✅ if > 0 |
| Продажи | ✅ if > 0 |
| Рейтинг | ❌ Not on public page (deprecated `rating: 0`) |
| Отзывы | ❌ Not aggregated on storefront (on PDP + `/account/reputation`) |
| Активность | ❌ No public activity feed |

### Mobile seller storefront (`apps/mobile/app/seller/[id].tsx`)

| Field | Status |
|-------|--------|
| Название | ⚠️ From route param, not API |
| Дата регистрации | ❌ |
| Количество товаров | ❌ (only grid length) |
| Продажи | ❌ |
| Рейтинг | ❌ |
| Отзывы | ❌ |
| Активность | ❌ |

**Gap:** Mobile buyer evaluating seller from storefront sees **product grid only** — significant trust asymmetry vs web.

---

## 5. Transaction Reliability Audit

### Test accounts

| Account in EPIC spec | Exists? | Use instead |
|----------------------|---------|-------------|
| `seller@test.com` | ❌ | `seller@demo.lot` / `password: demo1234` |
| `buyer@test.com` | ❌ | `buyer@demo.lot` / `password: demo1234` |

Documented in `prisma/seed.ts`, `docs/POST_DEPLOY_SMOKE.md`, gate scripts (`MOBILE_SELLER_EMAIL`, `MOBILE_TEST_EMAIL`).

### End-to-end scenario map

| Step | Surface | Status |
|------|---------|--------|
| Seller creates product | **WEB ONLY** | `/account/products/new` |
| Buyer finds product | Mobile **PASS** | Catalog / home / PDP |
| Add to cart | Mobile **PASS** | `/api/cart` |
| Checkout | **WEB ONLY** | `checkout.tsx` → handoff → Stripe/web pay |
| Order created | Web **PASS** | `createOrderFromCart` |
| Chat system message | **PASS** | `notifyOrderCreated` (+ product/qty in EPIC 152) |
| Seller receives order | Mobile **PASS** | `Продажи` → tab «Новые» (EPIC 152) |
| Seller accepts | Mobile **PASS** | `PATCH /api/mobile/seller/orders/:id/status` |
| Buyer sees status | Mobile **PASS** | `order/[id]` timeline (EPIC 152) |
| Status sync | **PASS** (pull) | Shared OMS / `updateSellerOrderStatus`; refresh manual |
| Chat thread | **PASS** | Per-product conversation; unread badge |

### Reliability risks

| Risk | Severity | Detail |
|------|----------|--------|
| Duplicate order on double submit | **P1** | No idempotency key on `createOrderFromCart` |
| Orphan unpaid orders | **P2** | Cart cleared at create; stock not reserved until pay |
| Post-checkout return | **P1** | User must manually refresh orders tab |
| Chat notify failure | **P2** | Logged only; order still succeeds |
| Handoff token store | **P2** | In-memory JTI — not multi-instance safe |
| Mobile seller action simplification | **P2** | Linear `pickSellerNextStatus`; pickup/cancel paths thinner than web OMS |

### Physical / staging E2E

| Gate | Status |
|------|--------|
| Automated contract tests | **PASS** (`mobile-seller-transaction-loop.test.ts`, `mobile:epic-152:gate`) |
| Staging runtime smoke | **PARTIAL** (RC7 artifacts; chat physical NOT_RUN) |
| Physical Android full loop | **NOT_RUN** |

---

## 6. Empty State Audit

| Scenario | Screen | Answers “what next?” | Verdict |
|----------|--------|------------------------|---------|
| Нет товаров (catalog) | `catalog.tsx` | «Сбросить фильтры» | ✅ |
| Нет товаров (home rails) | `index.tsx` | Hidden sections / wrong preset | ❌ |
| Нет заказов | `orders.tsx` | «Обновить» only | ❌ |
| Нет сообщений | `messages/index.tsx` | «В каталог» | ✅ |
| Нет избранного | `favorites.tsx` | «В каталог» | ✅ |
| Нет продаж (seller) | `seller-sales.tsx` | «Обновить» | ⚠️ |
| Нет товаров (seller) | `seller-products.tsx` | Points to web cabinet | ✅ |
| Нет уведомлений | — | **No mobile screen** | ❌ |
| Корзина пуста | `cart.tsx` | «В каталог» | ✅ |
| PDP not found | `product/[id].tsx` | Plain text, no CTA | ❌ |

**Preset library** (`feedback.tsx`) is solid; inconsistent application is the main issue.

---

## 7. Mobile / Web Boundary Audit

### Works in app — **PASS**

| Area | Notes |
|------|-------|
| Browse / search / filters | Home, catalog, PDP |
| Cart add/update/remove | Native |
| Favorites | Native |
| Buyer order list + detail | List + timeline (EPIC 152) |
| Chat | Native inbox + threads |
| Seller order inbox + accept/ship | Native (EPIC 152) |
| Seller product list | Read-only native |
| Seller home summary | Today / awaiting / messages |
| Session auth | JWT + refresh |
| App update check | Native |

### Requires web — **WEB ONLY**

| Area | Entry |
|------|-------|
| Registration / password reset | Browser auth pages |
| Checkout + payment | `checkout.tsx` handoff |
| Order creation + Stripe | Web checkout |
| Become seller | Web `/account/seller-start` |
| Product create / edit | Web `/account/products/new`, edit pages |
| Seller settings / pickup points | Web account |
| Payouts / full wallet ops | Web wallet; mobile wallet read-only |
| Write product review | Web post-purchase |
| Notifications inbox | Web `/notifications` |
| Legal (privacy, terms) | Browser via `legal-links.ts` |

Reference matrix: `artifacts/mobile-web-parity/feature-matrix.json` (RC5.1 baseline; EPIC 152 improves orders row).

---

## 8. Beta Readiness Score

| Dimension | Score | Rationale |
|-----------|------:|-----------|
| **BUYER — UX** | **6/10** | Good catalog/PDP; login wall, weak empty states, Sell tab noise |
| **BUYER — Commerce** | **7/10** | Cart solid; checkout intentionally web; order detail added |
| **BUYER — Trust** | **5/10** | PDP ok; thin mobile seller page; no guarantees/returns |
| **SELLER — Onboarding** | **6/10** | Clear handoff; value prop mostly on web |
| **SELLER — Operations** | **7/10** | Can accept orders on phone post-EPIC 152; create/edit still web |

### **OVERALL: WATCH → closed beta with constraints**

| Launch type | Verdict |
|-------------|---------|
| Closed beta (invited users, documented limits) | **READY** |
| Open beta / public launch | **NOT READY** |
| First sale without operator support | **RISKY** |

**Blocking for closed beta (operational, not code):**
- Physical Android E2E pass `NOT_RUN`
- Operator runbook with `*@demo.lot` credentials
- Cohort brief: checkout opens browser; seller creates products on web

---

## 9. Problem map & priorities

### P0 — could break first real transaction

| ID | Problem | Area |
|----|---------|------|
| P0-1 | Checkout is browser handoff — users may not return to app | Commerce |
| P0-2 | Test accounts in spec don't exist (`@test.com`) | Ops |
| P0-3 | Physical E2E not validated | Release |

### P1 — hurts conversion / trust

| ID | Problem | Area |
|----|---------|------|
| P1-1 | Orders empty state CTA «Обновить» | UX |
| P1-2 | No auto-refresh after checkout return | Commerce |
| P1-3 | Mobile seller storefront lacks trust header | Trust |
| P1-4 | Buyer orders list shows raw enum status | UX |
| P1-5 | Duplicate order risk (no idempotency) | Reliability |
| P1-6 | 41% categories empty — broken discovery in those rails | Supply |

### P2 — polish / post-beta

| ID | Problem | Area |
|----|---------|------|
| P2-1 | No mobile notifications | Parity |
| P2-2 | No native product editor | Intentional defer |
| P2-3 | No native checkout | Intentional defer |
| P2-4 | Home «Для вас» not personalized | UX |
| P2-5 | Favorites tab hidden | UX |
| P2-6 | Returns / buyer protection copy | Trust |

---

## 10. Top 5 fixes (maximum impact)

1. **Post-checkout return + orders refresh** — Detect `lot://orders` return / app foreground and reload orders; replace «Обновить» empty CTA with «Перейти в каталог».
2. **Buyer orders list human status** — Map `PAID` / `AWAITING_SELLER_CONFIRMATION` → «Ожидает подтверждения» (reuse timeline labels).
3. **Mobile seller storefront trust block** — Fetch public seller profile API (name, joined, product count, verified) — parity with web header.
4. **Operator E2E script + credential doc** — Standardize on `buyer@demo.lot` / `seller@demo.lot`; add to beta invite email; run physical checklist once.
5. **Category rail honesty** — Already hides zero-count categories; add home-level empty catalog state when global product count is low (avoid ghost section headers).

---

## 11. Safe to defer after closed beta launch

- Native checkout / Stripe in-app
- Native product create/edit + photo upload
- Mobile notifications inbox
- Write review from mobile
- Seller analytics / promotion center on mobile
- Full payout UX on mobile
- Guest browsing mode
- Returns policy pages in-app
- Idempotency hardening (important but can ship in first patch week)

---

## 12. Recommended decision

### Option A — Open closed beta now (recommended)

**Conditions:**
1. Invite-only cohort (≤50 users) with written “web checkout + web seller setup” guide.
2. Run physical Android checklist once (`docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md`).
3. Ship EPIC 152 (seller loop) before or with beta invite.
4. Operator monitors first 10 orders manually.

### Option B — Short sprint first (1 EPIC)

If physical E2E fails or post-checkout confusion is observed in dry run:
- EPIC: **Checkout return + orders polish + seller storefront trust** (items 1–3 above)
- Re-score → target **READY** for wider closed beta

---

## Appendix A — Key file references

| Topic | Path |
|-------|------|
| Buyer home | `apps/mobile/app/(tabs)/index.tsx` |
| Sell entry | `apps/mobile/app/(tabs)/sell.tsx` |
| Seller sales | `apps/mobile/app/(tabs)/seller-sales.tsx` |
| Buyer order detail | `apps/mobile/app/order/[id].tsx` |
| Checkout handoff | `apps/mobile/app/checkout.tsx` |
| Empty presets | `apps/mobile/src/components/ui/feedback.tsx` |
| Web seller header | `features/seller/components/seller-public-header.tsx` |
| Order create + chat | `features/orders/queries.ts`, `features/chat/queries.ts` |
| Mobile/web matrix | `artifacts/mobile-web-parity/feature-matrix.json` |
| Demo seeds | `prisma/seed.ts` |

## Appendix B — Staging readiness API

`GET /api/mobile/readiness` → `ready: false` (34/39 checks) at audit time. Non-blocking for closed beta; flags CCOS graph/twin platform toggles off.

---

*EPIC 153 complete — audit only, no implementation.*
