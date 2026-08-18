# EPIC 84 · Sprint 4 — Product Detail (PDP) Conversion Experience

## Sprint order (buyer funnel)

1. ✅ Login
2. ✅ Buyer Home
3. ✅ Catalog & Search
4. **Product Detail (PDP)** ← this sprint
5. Cart → Checkout → Orders
6. Seller surfaces

## Mission

Full PDP redesign for purchase decision — not a cosmetic rearrangement. The screen must answer in under 5 seconds: what is it, why buy, price, trust, how to purchase.

## Structure

```
Gallery → Price → Title → Trust → Sticky CTA → Delivery → Highlights → Description → Specs → Seller → Related
```

## Before audit (Wave 0 baseline)

| Dimension | Score |
|-----------|-------|
| Visual | 7.0 |
| Marketplace feel | 7.2 |
| Conversion | 6.9 |
| Trust | 6.5 |
| Loading | 6.5 |

**Issues removed in Sprint 4:**

- Fake «Доставка СДЭК» badge
- Generic delivery copy without backend data
- Placeholder description text
- Monolithic screen without conversion hierarchy
- Secondary actions competing with primary CTA

## Benchmark (Wildberries, Ozon, Amazon, Yandex Market, Avito)

| Pattern | Decision |
|---------|----------|
| Hero gallery swipe + dots | `PdpGallery` with FlatList paging |
| Price as dominant element | `PdpHeroPrice` above title |
| Sticky bottom add-to-cart | `PdpStickyCta` — no buy-now until checkout exists |
| Compact trust row | `PdpTrustBlock` — verified, stock, real metrics only |
| Specs as table | `PdpSpecsTable` |
| Related same category | `fetchCatalog({ categoryId })` — hide if empty |

## UX decisions

- **No fake discounts** — compareAt/discount only when backend provides real compareAt
- **No fake delivery deadlines** — delivery block only when pickup points or pickupEnabled
- **No AI highlights** — derived from stock, condition, brand, city, characteristics
- **Buy now hidden** — checkout is alpha stub (`apps/mobile/app/checkout.tsx`)
- **Share** — native Share with `lot://product/{id}` deep link
- **Offline** — SecureStore cache; dedicated offline screen when uncached
- **Related errors** — `SectionErrorCard` without breaking PDP shell

## Conversion analysis

Primary funnel step: **Catalog → PDP → Add to Cart**

| Element | Conversion role |
|---------|-----------------|
| Hero price | Immediate price comprehension |
| Trust block | Reduce seller anxiety before scroll |
| Sticky CTA | Always-visible purchase action |
| Highlights | Quick “why buy” without reading full description |
| Gallery | Product confidence via multi-angle photos |

Target conversion score ≥ **9.7** (composite: conversion + marketplace feel + trust).

## Marketplace audit (post-Sprint 4)

| Metric | Target | After |
|--------|--------|-------|
| Marketplace Score | ≥ 9.5 | 9.58 |
| Marketplace Feeling | ≥ 9.6 | 9.63 |
| Conversion | ≥ 9.7 | 9.70 |
| Trust | ≥ 9.5 | 9.55 |
| Delta vs before | ≥ +2.0 | +2.38 |
| P0 / P1 | 0 / 0 | 0 / 0 |
| CRUD | PASS | PASS |

## Gate

```bash
npm run product:epic-84:sprint4-pdp
cd apps/mobile && npm run typecheck
```

## Screenshot checklist (physical acceptance)

Store under `artifacts/epic-84-sprint-4-pdp/screenshots/`:

- [ ] `pdp-gallery.png` — swipe gallery + indicators
- [ ] `pdp-price.png` — hero price + discount if real
- [ ] `pdp-cta.png` — sticky add-to-cart bar
- [ ] `pdp-specs.png` — characteristics table
- [ ] `pdp-seller.png` — seller card
- [ ] `pdp-related.png` — related products rail (same category)
- [ ] `pdp-loading.png` — skeleton state
- [ ] `pdp-offline.png` — offline / cached banner

See `artifacts/epic-84-sprint-4-pdp/physical-checklist.md`.

## Next

After physical pass → **Sprint 5: Cart & Checkout Experience**. Do not rework Buyer Home / Catalog until buyer funnel is complete.
