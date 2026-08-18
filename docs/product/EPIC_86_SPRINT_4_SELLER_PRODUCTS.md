# EPIC 86 — Sprint 4: Seller Product Operations

## Goal

Production seller products experience: find → understand status → act → continue working.

## Architecture

```
SellerProductsExperience → useSellerProductsData → LoadSellerProducts / LoadSellerProductsSummary
  → RestSellerRepository → GET /api/mobile/seller/products(+summary,+detail)
Actions → useSellerActionCenter → ExecuteSellerAction → POST /api/mobile/seller/actions
```

## Features

- Operational summary (real counts, clickable filters)
- Seller search (name, SKU, slug/model) with debounce + recent searches
- Backend-backed filters and 7 sort modes
- Virtualized FlatList with cursor pagination
- `SellerOperationalProductCard` with status, moderation, stock, sales
- Action Center integration (bottom sheet, no Alert)
- Seller product detail at `/seller/product/[id]`
- Offline snapshot cache with timestamp banner
- `SellerProductChanged` domain event for cross-screen refresh

## Bulk actions

NOT SUPPORTED — no safe bulk mutation API. Documented for future sprint.

## Gate

```bash
npm run mobile:sprint-98:seller-products
```

Artifacts: `artifacts/seller-products/`

## Firebase

Physical device evidence requires Firebase Test Lab run — not executed in CI gate (marked NOT RUN).
