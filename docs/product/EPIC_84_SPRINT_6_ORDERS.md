# EPIC 84 · Sprint 6 — Orders & Post-Purchase Experience

## Sprint order (buyer funnel)

1. ✅ Login
2. ✅ Buyer Home
3. ✅ Catalog & Search
4. ✅ Product Detail (PDP)
5. ✅ Cart & Checkout
6. **Orders & Post-Purchase** ← this sprint
7. Favorites & Personalization (Sprint 7)

## Mission

Full redesign of «Мои заказы» — not a CRUD table or record list. Commerce post-purchase experience with timeline, trust, and honest Alpha statuses.

**Constraints:** no CCOS, MRP, POP architecture, or APP-SHELL-1 changes. Mobile UX only. Minimal auth parity fix on existing `GET /api/orders/[id]` (Bearer JWT, same as list endpoint).

## Structure

**Orders list**

```
Header → Active Orders → Completed Orders → Recommendations
```

**Order detail**

```
Hero → Timeline → Items → Cost → Recipient → Comment → Seller → Actions
```

## Before audit

| Dimension | Score |
|-----------|-------|
| Visual | 6.2 |
| Marketplace feel | 6.0 |
| Trust | 6.0 |
| Loading | 6.0 |

Legacy: FlatList rows, generic badge, no detail screen, no offline cache.

## Benchmark (Wildberries, Ozon, Amazon, Yandex Market, AliExpress)

| Pattern | Decision |
|---------|----------|
| Active vs completed grouping | Separate sections with counts in header |
| Large order cards | `OrderCard` with image, status, price, open CTA |
| Vertical status timeline | `OrderTimeline` from real `history[]` only |
| Post-order recommendations | `fetchCatalog` — hidden when empty |
| Reorder | `addToCart` per line + `order_reordered` telemetry |
| Share | Native Share + deep link |

## UX decisions

- **Honest statuses** — labels from backend `OrderStatus`; no fabricated delivery steps
- **Timeline** — only events present in API history; single current node if history empty
- **Offline** — SecureStore cache for list + recently opened order details
- **Seller** — enriched via existing product API when available
- **No fake tracking** — delivery block omitted unless backend provides data on detail

## POP metrics

| Event | When |
|-------|------|
| `order_list_opened` | First successful list load |
| `order_opened` | Order detail opened |
| `order_timeline_opened` | Detail with timeline rendered |
| `order_reordered` | Repeat order → cart |
| `order_shared` | Native share sheet |
| `orders_empty` | Empty list (authenticated) |
| `orders_retry` | Load / detail failure |

Screen: `purchase` in POP journey.

## Sprint gate

Run: `npm run product:epic-84:sprint6-orders`

| Metric | Target |
|--------|--------|
| Marketplace Score | ≥ 9.7 |
| Marketplace Feeling | ≥ 9.7 |
| Post Purchase | ≥ 9.8 |
| Trust | ≥ 9.7 |
| Delta | ≥ +2.0 |

## Physical acceptance (Android)

- [ ] Open orders list (active + completed sections)
- [ ] Open order detail + timeline
- [ ] Reorder / share
- [ ] Offline cached orders
- [ ] Skeleton loading
- [ ] Section retry on error
- [ ] Screenshot pack + walkthrough video

## Definition of Done

User understands «what is happening with my purchase» — marketplace-grade post-purchase UX.

## NEXT

EPIC 84 — Sprint 7: Favorites & Personalization Experience
