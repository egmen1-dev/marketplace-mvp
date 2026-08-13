# Promotion System (ADS-MARKETPLACE-001)

MVP internal marketplace promotion — **not** a paid ad exchange.

Sellers opt in eligible products → status `STARTED` → subtle **«Продвигаемый продавцом»** badge on PDP. Optional homepage/catalog blocks sit behind `PROMOTION_SURFACES_ENABLED=false` by default and **do not change search ranking**.

---

## Architecture

```
lib/promotion/          — domain layer (readiness, lifecycle, queries, flags)
features/promotion/     — UI + server actions
prisma PromotionCampaign — one row per product
```

| Layer | Responsibility |
|-------|----------------|
| **ADS readiness** (`lib/product-advertising`) | Unchanged — eligibility + quality score |
| **Promotion readiness** | Wraps ad snapshot + required characteristics |
| **PromotionCampaign** | Seller-controlled STARTED / PAUSED / ENDED |
| **Surfaces** | `getPromotedProducts()` — feature-flagged blocks only |
| **Analytics** | `promotion_view`, `promotion_start`, `promotion_pause` |

### Data model

`PromotionCampaign`:

| Field | Type | Notes |
|-------|------|-------|
| `id` | cuid | |
| `productId` | unique | One campaign row per product |
| `sellerId` | FK | Owner |
| `status` | STARTED \| PAUSED \| ENDED | |
| `budget` | Decimal? | Optional MVP — not enforced |
| `startedAt` / `endedAt` | DateTime? | Lifecycle timestamps |

### Security

- Seller actions call `assertSellerOwnsProduct(sellerProfileId, productId)`.
- Admin `/admin/promotions` uses existing `requireAdminSession()` layout guard.
- No cross-seller mutation paths.

---

## MVP now (shipped)

### Seller — `/account/promotions`

- Lists seller products with quality score and readiness blockers.
- **«Продвигать товар»** when ready (reuses ADS eligibility + min quality 50).
- Blockers shown when not ready: no photo, no stock, no price, missing characteristics, etc.
- **Пауза** / **Завершить** for active campaigns.

### Buyer — PDP

- Badge **«Продвигаемый продавцом»** when campaign status is `STARTED`.

### Admin — `/admin/promotions`

- Table of campaigns: product, seller, status, quality score, start date.
- Summary counts: active / paused / ended.

### Surfaces (off by default)

Set `PROMOTION_SURFACES_ENABLED=true` to show:

- Homepage block via `PromotedProductsSection`
- Catalog root block (no active filters)

**Search sort and ranking algorithms are not modified.**

### Analytics

| Event | When |
|-------|------|
| `promotion_view` | Seller opens `/account/promotions` |
| `promotion_start` | Campaign started |
| `promotion_pause` | Campaign paused |

No PII in payloads (`entityId` = product id only).

---

## Future (not in MVP)

| Phase | Capability |
|-------|------------|
| Billing | CPC / CPM pricing, daily budget enforcement |
| Auction | Slot bidding among sellers |
| ROI | Promotion-attributed GMV dashboard |
| Placement | Weighted boost in catalog sort (explicit ranking contract) |
| Formats | Banner / category takeover (still not external ad network) |

---

## Operations

```bash
# Apply migration
npx prisma migrate deploy

# Enable promoted blocks (optional)
PROMOTION_SURFACES_ENABLED=true
```

### Tests

```bash
npm run test -- tests/promotion.test.ts tests/analytics-events.test.ts
npx playwright test tests/e2e/promotion.spec.ts
```

---

## Relation to ADS-READY

| ADS-READY | Promotion MVP |
|-----------|---------------|
| Admin eligibility dashboard | Seller self-serve start/pause |
| Quality score recommendations | Same score gates promotion |
| No buyer-visible ad state | PDP badge + optional blocks |
| No campaign entity | `PromotionCampaign` table |

Both coexist; ADS readiness is **not** removed or replaced.
