# EPIC 84 · Sprint 3 — Catalog & Product Discovery Experience

## Sprint order (buyer funnel)

1. ✅ Login
2. ✅ Buyer Home
3. **Catalog & Search** ← this sprint
4. Product Detail (PDP)
5. Cart → Checkout → Orders
6. Seller surfaces

## Mission

Full catalog UX redesign — search-first discovery, not a CRUD product list.

## Structure

1. Search (`CatalogSearchField`)
2. Quick filters (`QuickFilterRail`)
3. Categories (`CatalogCategoryRail`)
4. Sort (`CatalogSortSheet`)
5. Product grid (`CatalogProductCard` + infinite scroll)

## Gate

```bash
npm run product:epic-84:sprint3-catalog
cd apps/mobile && npm run typecheck
```

| Check | Target |
|-------|--------|
| Marketplace Score | ≥ 9.2 |
| Marketplace Feeling | ≥ 9.5 |
| Discovery Score | ≥ 9.3 |
| Search UX | ≥ 9.3 |
| Delta vs Wave 0 | ≥ +2.0 |
| P0 / P1 | 0 / 0 |
| CRUD | PASS |

## Physical acceptance

See `artifacts/epic-84-sprint-3-catalog/physical-checklist.md`

## Next

After physical pass → **Sprint 4: Product Detail Experience (PDP Conversion)**
