# Ads Readiness Audit (ADS-READY-001)

**Staging:** https://web-production-e56fb.up.railway.app  
**Date:** 2026-08-12  
**Scope:** Pre-launch catalog & conversion readiness for paid traffic. **No ad campaigns launched.** Vercel production untouched.

---

## 1. Advertising entry funnel

```
VK / external ads / organic UTM
              ↓
         Landing (/)
              ↓
    Catalog / category (/catalog, /category/*)
              ↓
         Product PDP (/product/:id)
              ↓
            Cart (/cart)
              ↓
    Checkout (/checkout) — auth required
```

| Step | Availability | Load (390px VK) | Primary CTA | Trust | Drop-off risks |
|------|--------------|-------------------|-------------|-------|----------------|
| **External → Landing** | ✅ 200 | ~1–2s first paint (webview-compat) | «Открыть каталог», search | ⚠️ Trust below fold on mobile | UTM lost if JS blocked; auth not required |
| **Landing** | ✅ | Hero + catalog CTA visible ≤5s | Открыть каталог | Stats/trust on scroll | Generic hero for category-specific ads |
| **Catalog / category** | ✅ | Grid + filters | Product card tap | Stock badge on card | Empty category if taxonomy mismatch |
| **Product PDP** | ✅ | Gallery + price above fold | Купить / В корзину | Seller badges, trust block | No star reviews; delivery price at checkout only |
| **Cart** | ✅ | Line items + total | Оформить заказ | — | Guest cart OK; checkout needs login |
| **Checkout** | ✅ (authed) | Multi-step form | Оплатить | Stripe / reservation copy | Auth wall drop-off |

**Analytics coverage (UX-005 + ADS-READY-001):**

| Event | When |
|-------|------|
| `page_view` | Every route change |
| `landing_view` | Homepage |
| `ad_landing_view` | Homepage with UTM attribution (no PII) |
| `category_view` | Catalog |
| `product_view` | PDP |
| `add_to_cart` | Cart add success |
| `checkout_start` | Checkout page (authed) |

---

## 2. Product ad eligibility

Minimum conditions (all required):

| Rule | Code |
|------|------|
| Status ACTIVE | `NOT_ACTIVE` |
| stock > 0 | `NO_STOCK` |
| productTypeId set | `NO_PRODUCT_TYPE` |
| ≥1 photo | `NO_IMAGE` |
| price > 0 | `NO_PRICE` |
| seller linked | `NO_SELLER` |
| seller not blocked | `SELLER_BLOCKED` |

Implementation: `lib/product-advertising/eligibility.ts` → `evaluateProductAdvertisingEligibility()`.

Example:

```json
{
  "eligible": false,
  "reasons": ["NO_IMAGE", "NO_STOCK"]
}
```

Admin panel: `/admin/ads` — READY / BLOCKED filters.

---

## 3. Card quality score (advisory)

Score 0–100 — **does not affect search ranking**.

| Factor | Weight |
|--------|--------|
| Photo | 25 |
| Title | 20 |
| Category + type | 15 |
| Characteristics | 15 |
| Description | 10 |
| Stock | 10 |
| Seller trust | 5 |

Implementation: `lib/product-advertising/quality-score.ts`.

Seller edit form shows banner **«Карточка не готова к продвижению»** with fix checklist when blocked or score &lt; 75.

---

## 4. Conversion loss summary

| Priority | Issue | Mitigation |
|----------|-------|------------|
| P0 | Staging deploy drift — analytics/eligibility APIs 404 until redeploy | `node scripts/deploy-verify.mjs` before ads |
| P0 | Ineligible products in catalog | `/admin/ads` + seller warnings |
| P1 | Checkout auth wall | Expected MVP; track `checkout_start` vs `add_to_cart` |
| P1 | No delivery price on PDP | Post-launch CDEK quote on PDP |
| P2 | No product ratings | RC2 reviews |

---

## 5. Pre-launch checklist

1. Railway staging on latest `main` — `/api/version` commit matches Git
2. `node scripts/deploy-verify.mjs <sha>` → 7/7 PASS
3. `/admin/ads` — majority of ad-target SKUs **READY**
4. Playwright `ads-measurement.spec.ts` → 2/2 PASS on staging
5. Category report reviewed — [ADS_CATEGORY_REPORT.md](./ADS_CATEGORY_REPORT.md)

---

## 6. Test coverage

```bash
npm test -- tests/product-advertising.test.ts tests/analytics-events.test.ts
npx playwright test tests/e2e/admin-ads.spec.ts
npx playwright test tests/e2e/ads-measurement.spec.ts -c playwright.railway.config.ts
```

---

## 7. Verdict

| Gate | Tool |
|------|------|
| Funnel telemetry | `/admin/analytics` |
| Product eligibility | `/admin/ads` |
| Seller fixes | Product edit banner |
| Deploy truth | `/api/version` |

**Do not launch paid ads until deploy verify + eligibility panel green on Railway staging.**

---

## 8. Final acceptance (ADS-READY-001.1)

Run after merge to `main` and Railway redeploy.

### Deploy verification

```bash
git rev-parse --short HEAD   # ADS-READY SHA
curl -sS https://web-production-e56fb.up.railway.app/api/version | jq '.commit, .environment'
node scripts/deploy-verify.mjs <sha>
```

Expected deploy-verify includes:

```
PASS — POST ad_landing_view + UTM → 200
Deploy verification passed.
```

### ad_landing_view API

```bash
curl -sS -X POST https://web-production-e56fb.up.railway.app/api/analytics/events \
  -H 'Content-Type: application/json' \
  -d '{"event":"ad_landing_view","route":"/","visitorId":"acceptance","utmSource":"vk","utmMedium":"cpc","utmCampaign":"acceptance"}'
# → {"ok":true}
```

### Admin ads panel

Open `/admin/ads` — verify totals, READY/BLOCKED filters, category matrix.

### Product eligibility (unit)

| Product | Input | Result |
|---------|-------|--------|
| A | ACTIVE, stock>0, photo, type, seller | `eligible: true` |
| B | ACTIVE, no photo | `eligible: false`, `reasons: ["NO_IMAGE"]` |

### Ads funnel E2E

```bash
npx playwright test tests/e2e/ads-funnel.spec.ts -c playwright.railway.config.ts
```

Events captured: `page_view` → `ad_landing_view` (with UTM) → `product_view` → `add_to_cart`.

### Screenshots

| File | Content |
|------|---------|
| `admin-ads-dashboard.png` | `/admin/ads` summary + table |
| `ready-product.png` | READY filter |
| `blocked-product.png` | BLOCKED filter |
| `vk-ad-funnel.png` | VK UTM landing → PDP |

Generate: `node scripts/ads-acceptance-screenshots.mjs`

### Sign-off

| Check | Pass criteria |
|-------|---------------|
| Deploy SHA | `/api/version` matches `main` |
| ad_landing_view | POST 200 with UTM fields |
| Admin ads | Panel loads, filters work |
| Funnel E2E | 4 events with UTM on `ad_landing_view` |
| **READY FOR ADS LAUNCH** | All above green on Railway staging |
