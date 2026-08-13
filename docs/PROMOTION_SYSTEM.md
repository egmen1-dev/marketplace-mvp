# Promotion System (ADS-MARKETPLACE-001 + ADS-MARKETPLACE-002)

MVP internal marketplace promotion — **not** a paid ad exchange.

Sellers opt in eligible products → status `STARTED` → badge on PDP + optional distribution surfaces. Surfaces sit behind `PROMOTION_SURFACES_ENABLED=false` by default and **do not change search ranking**.

---

## Architecture

```
lib/promotion/
  readiness.ts / lifecycle.ts / queries.ts
  surfaces.ts      — PromotionSurfaceType + boost contract
  placements.ts    — PromotionPlacement lifecycle
features/promotion/ — UI + server actions
prisma:
  PromotionCampaign  — one row per product
  PromotionPlacement — campaign × surface slots
```

| Layer | Responsibility |
|-------|----------------|
| **ADS readiness** | Unchanged — eligibility + quality score |
| **PromotionCampaign** | STARTED / PAUSED / ENDED |
| **PromotionPlacement** | HOME_FEATURED, CATALOG_TOP, CATEGORY_TOP, SEARCH_BOOST |
| **Distribution** | `getHomepagePromotedProducts()`, `getCatalogPromotedProducts()` |
| **Search prep** | `getPromotionBoostSignals()` — contract only, ranking unchanged |
| **Analytics** | impression / click / lifecycle events |

### Promotion surfaces

| Surface | Purpose |
|---------|---------|
| `HOME_FEATURED` | Homepage «Рекомендуем» block |
| `CATALOG_TOP` | Catalog top strip |
| `CATEGORY_TOP` | Category page strip |
| `SEARCH_BOOST` | Boost signal only (not applied to search) |

### Data model

`PromotionPlacement`: campaignId, productId, surface, position, priority, active.

Created automatically when campaign → STARTED; deactivated on PAUSE/END.

---

## MVP now (shipped)

### Seller — `/account/promotions`

- Readiness blockers + start/pause/end
- **«Где показывается товар»** — placements list
- Notice when `PROMOTION_SURFACES_ENABLED=false`

### Surfaces (flag OFF by default)

`PROMOTION_SURFACES_ENABLED=true`:

- Homepage additive block (organic sections unchanged)
- Catalog/category promoted strip
- Badge «Продвигается» on surface cards

### Admin — `/admin/promotions`

- Filters: ALL / STARTED / PAUSED / ENDED
- Columns: placements count, surfaces, priority

### Analytics

| Event | When |
|-------|------|
| `promotion_impression` | Promoted surface block viewed |
| `promotion_click` | Product click from surface |
| `promotion_view/start/pause` | Seller cabinet lifecycle |

---

## Future (not in MVP)

| Phase | Capability |
|-------|------------|
| Billing | CPC / CPM, budget enforcement |
| Auction | Slot bidding |
| Search | Consume `PromotionBoostSignal` in ranking (explicit contract) |
| ROI | Promotion-attributed GMV |

---

## Operations

```bash
npx prisma migrate deploy
npm run test -- tests/promotion-placement.test.ts
npx playwright test tests/e2e/promotion.spec.ts
```

Set `PROMOTION_SURFACES_ENABLED=true` on staging to validate surfaces.
