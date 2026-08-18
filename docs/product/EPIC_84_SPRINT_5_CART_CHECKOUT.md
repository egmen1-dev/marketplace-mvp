# EPIC 84 · Sprint 5 — Cart & Checkout Commerce Experience

## Sprint order (buyer funnel)

1. ✅ Login
2. ✅ Buyer Home
3. ✅ Catalog & Search
4. ✅ Product Detail (PDP)
5. **Cart & Checkout** ← this sprint
6. Orders & Post-Purchase (Sprint 6)

## Mission

Full redesign of Cart and Checkout — not CRUD lists or form stubs. Commerce-grade mobile checkout comparable to Wildberries, Ozon, Yandex Market patterns, with honest Alpha states where backend/mobile order API is not yet available.

**Constraints:** no backend, CCOS, MRP, POP architecture, or APP-SHELL-1 changes — mobile UX only.

## Cart structure

```
Header → Cart Summary → Products → Recommendations → Price Summary → Sticky Checkout CTA
```

## Checkout structure

```
Contacts → Recipient → Delivery → Payment → Comment → Order Summary → Confirm
```

## Before audit (Wave 0 / pre-Sprint 5)

| Screen | Visual | Marketplace feel | Conversion | Trust |
|--------|--------|------------------|------------|-------|
| Cart | 6.5 | 6.2 | 6.0 | 6.2 |
| Checkout | 5.5 | 5.0 | 5.0 | 5.5 |

**Issues removed in Sprint 5:**

- Monolithic cart list without commerce hierarchy
- Full refetch on every quantity change (no optimistic UX)
- Generic empty state preset
- Checkout stub with no user flow
- Missing POP funnel telemetry for cart → checkout

## Benchmark (Wildberries, Ozon, Amazon, Yandex Market, Avito)

| Pattern | Decision |
|---------|----------|
| Sticky checkout CTA with live total | `CartStickyCheckoutCta` |
| Top summary bar (count, savings, total) | `CartSummaryBar` — savings hidden when zero |
| Large product cards with stepper | `CartLineCard` + `QuantityStepper` (44dp targets) |
| Recommendations rail | `fetchCatalog` — hidden when empty/failed |
| Checkout as stepped sections, not one form | Dedicated section components |
| Field errors inline | `TextField` error prop — no `Alert` |
| Skeleton loading | `CartSkeleton`, `CheckoutSkeleton` |
| Section retry | `SectionErrorCard` for quote/points/recommendations |

## UX decisions

- **No fake payment** — card option labeled «Будет доступно позже»; wallet only when `/api/mobile/wallet` reports enabled
- **No fake order success** — submit validates form, then shows Alpha handoff to web `/checkout` via `Linking.openURL`
- **Real delivery quote** — `POST /api/delivery/quote` + `GET /api/delivery/points` (existing APIs)
- **Seller & compareAt enrichment** — optional `fetchProduct` per line (no backend change)
- **Recommendations** — category from enriched cart lines, else popular catalog; block hidden if empty
- **Optimistic quantity** — instant UI update with rollback on API failure
- **Offline** — dedicated screens with Retry (cart/checkout require network)

## Conversion analysis

Primary funnel: **PDP → Cart → Checkout → Order (web Alpha handoff)**

| Step | Conversion role |
|------|-----------------|
| Cart summary + sticky CTA | Always-visible path to checkout |
| Stepper without friction | Reduce abandonment on qty edits |
| Empty cart illustration + catalog CTA | Recover dropped sessions |
| Checkout section order | Trust-building progression before confirm |
| Honest Alpha confirm | No false success — preserves trust for Sprint 6 orders |

Target scores (Sprint gate):

| Metric | Target |
|--------|--------|
| Marketplace Score | ≥ 9.6 |
| Marketplace Feeling | ≥ 9.7 |
| Checkout Score | ≥ 9.7 |
| Conversion | ≥ 9.8 |
| Trust | ≥ 9.6 |
| Delta | ≥ +2.0 |

## Marketplace audit (post-Sprint 5)

Run: `npm run product:epic-84:sprint5-cart-checkout`

Artifact: `artifacts/epic-84-sprint-5-cart-checkout/sprint-gate.json`

## POP metrics (real telemetry)

Events via `postTelemetry` → `/api/mobile/telemetry`:

| Event | Screen | Funnel |
|-------|--------|--------|
| `cart_viewed` | cart | Cart Open Rate |
| `cart_quantity_changed` | cart | Engagement |
| `cart_item_removed` | cart | Abandonment signal |
| `cart_checkout_started` | cart | Cart → Checkout |
| `cart_error` | cart | Checkout Errors |
| `checkout_started` | checkout | Checkout Started |
| `checkout_submitted` | checkout | Confirm intent |
| `checkout_abandoned` | checkout | Cart Abandonment |
| `checkout_error` | checkout | Retry Rate / Errors |
| `checkout_alpha_redirect` | checkout | Alpha handoff |
| `checkout_web_opened` | checkout | Web continuation |

Journey screens in POP: `cart`, `checkout`, `purchase` (Sprint 6).

## Physical acceptance checklist (Android)

- [ ] Open cart with items
- [ ] Change quantity (stepper, no alert)
- [ ] Remove item
- [ ] Open PDP from cart line
- [ ] Sticky «Оформить заказ» → checkout
- [ ] Fill contacts/recipient/delivery
- [ ] Confirm → Alpha handoff card
- [ ] Back navigation
- [ ] Offline screen + Retry
- [ ] Loading skeletons
- [ ] Section errors + Retry
- [ ] Screenshot pack + walkthrough video

Screenshot pack path: `artifacts/epic-84-sprint-5-cart-checkout/screenshots/` (device capture).

## Definition of Done

Cart and Checkout feel like a modern mobile marketplace commerce flow. User can progress PDP → Cart → Checkout without «test app» friction. Order creation in-app deferred honestly to Sprint 6 / web handoff.

## NEXT

EPIC 84 — Sprint 6: Orders & Post-Purchase Experience
