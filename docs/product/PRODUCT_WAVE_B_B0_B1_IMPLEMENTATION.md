# Product Wave B — B0/B1 Implementation

**Branch:** `cursor/product-wave-b1-buyer-conversion`  
**Base:** `9e5cb8c`  
**Scope:** B0 contract hardening + B1.1 canonical ProductCard + B1.2 Home conversion  
**Deferred:** B2 Search UI, B3 PDP redesign, Recent Views rail

---

## Architecture

### B0 — Commerce contracts

| Module | Responsibility |
|--------|----------------|
| `apps/mobile/src/commerce/catalog-query.ts` | Request generation, merge/dedupe, deals-only pagination truth |
| `apps/mobile/src/commerce/commerce-busy-store.ts` | Per-product cart/favorite busy state (Zustand) |
| `apps/mobile/src/commerce/cart-response.ts` | Authoritative cart quantity extraction + reconciliation |
| `apps/mobile/src/hooks/useCommerceActions.ts` | Scoped busy exposure, server quantity preference, reconcile on failure |
| `apps/mobile/src/home/resolveHomeCategoryRoute.ts` | Shared category ID resolver for chips + promo tiles |

### B1.1 — Canonical ProductCard

```
apps/mobile/src/commerce/product-card/
  ProductCard.tsx          # variant="grid" | "rail"
  ProductCardImage.tsx
  ProductCardPrice.tsx
  CommerceCartCta.tsx
  types.ts
```

Buyer surfaces migrated:

- Home popular rail (`HomeProductRail`)
- Catalog grid (`catalog.tsx`)
- PDP related rail (`ProductRelatedRail`)

Removed duplicate buyer cards:

- `HomeProductCard.tsx`
- `CatalogProductCard.tsx`

Remaining `components/ui/ProductCard.tsx` is used only on favorites/seller storefront (non-buyer-rail surfaces).

### B1.2 — Home composition

Order after change:

1. `HomeHeader` (location label only — no fake selector)
2. `HomeSearchRow`
3. `HomeCategoryRow`
4. **Popular products rail** (canonical `ProductCard` rail + cart)
5. Compressed `HomeHeroBanner` (no fake carousel dots)
6. `HomePromoTiles` (categoryId routing)
7. `HomeTrustStrip`

`fetchBuyerHome` is used only for optional summary snapshot; product feed uses `fetchCatalog({ sort: "popular" })`. Buyer-home API recommendation: **FIX_THEN_USE** for feeds; summary-only is acceptable.

---

## Contracts

| Contract | Status | Notes |
|----------|--------|-------|
| Catalog stale response ignored | PASS | Request generation guard |
| Pagination reset on query change | PASS | `queryKey` effect resets cursor/items |
| Duplicate page blocked | PASS | `lastRequestedCursor` + in-flight guard |
| Product ID dedupe | PASS | `mergeCatalogProducts` |
| Deals-only truthfulness | PASS | `CLIENT_SIDE_ONLY`; count copy uses `client_deals` mode |
| Cart per-product busy | PASS | `commerce-busy-store` |
| Favorite per-product busy | PASS | `commerce-busy-store` |
| Cart failure reconcile | PASS | `fetchCart` on error |
| Promo category routing | PASS | `buildHomeCategoryCatalogRoute` |
| Recent views | DEFERRED_FROM_B1 | No batch refresh API; rail not shown |

---

## Test results

```bash
npm test -- tests/mobile-wave-b-preflight.test.ts
npm test -- tests/mobile-product-wave-b-product-card.test.ts
npm test -- tests/mobile-product-wave-b-home.test.ts
npm test -- tests/mobile-product-wave-a.test.ts
cd apps/mobile && npm run typecheck
```

---

## Native acceptance checklist

- [ ] Home shows products before hero/trust on 1080×2400 device
- [ ] Catalog filter/query rapid typing does not flash stale results
- [ ] Catalog load-more does not duplicate cards
- [ ] Deals-only filter count copy is not misleading
- [ ] Cart +/- busy is per-card, other cards remain tappable
- [ ] Favorite heart busy is per-card
- [ ] Promo «Электроника» opens category, not full catalog
- [ ] Location shows «Екатеринбург» without chevron/selector
- [ ] No buyer-facing «Доставка» / «Быстро отвечает» on cards
- [ ] Wave A seller edit / checkout / PDP trust regressions absent

---

## Deferred scope

- **B2** Search suggestions/history UI
- **B3** PDP redesign
- **Recent Views** rail (needs cheap current-data refresh)
- **RC27** / MRP / release-integrity changes (untouched)
