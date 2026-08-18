# Sprint 89 — Product Correctness

> **Baseline:** Closed Alpha `0.1.5-alpha` (`cadbf50`)  
> **Scope:** Deep links, seller sales domain separation, CI gates, automated tests  
> **Out of scope:** Seller Experience, design system migration, performance optimization

---

## Summary

Sprint 89 fixes EPIC 88 P0 correctness issues without new product features or visual redesign.

| Task | Status | Deliverable |
|------|--------|-------------|
| Task 1 — Order deep link | ✅ | `lot://order/{id}` → `/order/[id]` |
| Task 2 — Seller deep link | ✅ | `lot://seller/{id}` → `/seller/[id]` + public profile API |
| Task 3 — Seller Sales | ✅ | `fetchSellerOrders` + `SellerSalesExperience` |
| Task 4 — CI gates | ✅ | `.github/workflows/mobile-p0-gates.yml` |
| Task 5 — Deep link tests | ✅ | `apps/mobile/src/deep-links/deep-links.test.ts` |
| Task 6 — Seller route audit | ✅ | `scripts/sprint-89-seller-route-audit.ts` |
| Task 7 — Regression audit | ✅ | `npm run mobile:sprint-89:gate` |

---

## Task 1 — Order deep link

**Before:** `lot://order/{id}` opened buyer orders list.  
**After:** Routes to stack screen `/order/[id]`.

Files:
- `apps/mobile/src/deep-links/resolve-deep-link-target.ts`
- `apps/mobile/src/deep-links/route-deep-link.ts`
- `apps/mobile/src/features/orders/useOrderDetailData.ts` — share uses `lot://order/{id}`

Back navigation preserved via `router.push` (stack push, not replace).

---

## Task 2 — Seller deep link

**Before:** `lot://seller/{id}` opened generic catalog (ignored sellerId).  
**After:** Opens seller profile + seller-filtered catalog.

Files:
- `app/api/mobile/seller/public/[id]/route.ts`
- `lib/mobile/seller-public-data.ts`
- `apps/mobile/app/seller/[id].tsx`
- `apps/mobile/src/features/seller-catalog/useSellerCatalogProfile.ts`
- `apps/mobile/src/features/catalog-discovery/useCatalogDiscovery.ts` — `sellerId` filter

Edge cases:
- Missing/deleted seller → 404 profile screen
- Offline → blocked with retry
- Unauthorized → existing deep link auth guard → login + pending link

Reserved seller workspace links:
- `lot://seller/sales` → seller-sales tab
- `lot://seller/products` → seller-products tab
- `lot://seller/business` / `promotion` → seller-home tab

---

## Task 3 — Seller Sales

**Before:** `seller-sales.tsx` re-exported buyer `orders.tsx`.  
**After:** Seller-only domain.

| Layer | Implementation |
|-------|----------------|
| API | `GET /api/mobile/seller/orders` |
| Data | `lib/mobile/seller-orders-data.ts` |
| Hook | `useSellerSalesData` |
| UI | `SellerSalesExperience` |
| Telemetry | `screen: "seller_sales"` events |
| Offline | `offline-cache` snapshot key `seller-sales` |

No imports from `features/orders`, `fetchOrders`, or buyer models.

---

## Task 4 — CI gates

Workflow: `.github/workflows/mobile-p0-gates.yml`

Mandatory on PR/push (mobile paths):
- `npm run mobile:typecheck`
- `npm run mobile:test`
- `npm run mobile:p0:token-cycle-gate`
- `npm run mobile:p0:route-graph-gate`

FAIL → block merge. No manual bypass.

---

## Task 5 — Deep link tests

Run: `npm run mobile:test`

Covers:
- `lot://product/{id}`
- `lot://order/{id}`
- `lot://seller/{id}`
- `lot://catalog`
- `lot://favorites`
- `lot://profile`
- Invalid IDs / unknown schemes
- Auth/offline contract documentation

Report: `artifacts/sprint-89-product-correctness/deep-link-report.json`

---

## Task 6 — Seller route audit

Run: `npm run mobile:sprint-89:seller-routes`

Audited routes:
- `seller-home`
- `seller-products`
- `seller-sales`
- `wallet` (shared — WATCH: uses `fetchOrders` for recent transfers)
- `profile` (shared)

Report: `artifacts/sprint-89-product-correctness/seller-route-report.json`

---

## Task 7 — Regression gate

Run: `npm run mobile:sprint-89:gate`

Includes:
- Typecheck + deep link tests
- Token cycle gate
- Route graph gate
- Token architecture guard
- P0 startup gate
- Deep link report
- Seller route audit
- CI workflow presence check

Report: `artifacts/sprint-89-product-correctness/ci-gates-report.json`

---

## Final report template

```
Deep Links:        PASS / FAIL
Seller Sales:      PASS / FAIL
Seller Route Audit: PASS / FAIL
CI Gates:          PASS / FAIL
Regression:        PASS / FAIL
Ready for Sprint 90: YES / NO
```

Generate via `npm run mobile:sprint-89:gate`.

---

## Constraints honored

- ✅ No Seller Experience EPIC work
- ✅ No design system migration
- ✅ No performance optimization (FlashList, tab badge throttle)
- ✅ No startup code changes
- ✅ No P0 diagnostics changes

---

## Known WATCH items (Sprint 90+)

- Wallet tab in seller mode still calls buyer `fetchOrders` for recent transfers
- Seller sale card opens web seller order page (no native seller order detail yet)
- `seller-settings` route not implemented in Closed Alpha
