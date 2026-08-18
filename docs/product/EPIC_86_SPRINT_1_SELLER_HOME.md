# EPIC 86 — Sprint 1 — Seller Home

**Baseline:** Closed Alpha 0.1.5-alpha · Sprint 94 COMPLETE · Seller Foundation READY  
**Branch:** `cursor/epic-86-sprint-1-seller-home-d03e`

## Goal

First production Seller screen — a commercial operating center. The seller understands today's business in under 5 seconds using **real backend data only**.

## Architecture

```
seller-home.tsx (shell)
  → useSellerHomeData (hook)
    → LoadSellerHome (use case)
      → RestSellerRepository
        → GET /api/mobile/seller/home
```

No Screen→API imports. No DTO leaks. Design System is presentation-only.

## Screen sections

| Section | Data source | Hidden when |
|---------|-------------|-------------|
| Header | Seller profile + sync state | Never (fallback store name offline) |
| Today summary | Revenue today, orders today, pending, attention | Cards with zero/unavailable metrics |
| Revenue | Today / week / month / avg order | No revenue data |
| Orders | Status buckets from `getSellerOrderCounters` | Never (shows zeros) |
| Products | Active / OOS / drafts / hidden / low stock | Never |
| Tasks | Derived from real actionable counts | Empty list |
| Notifications | Recent orders, low stock, overdue | Empty state |
| Insights | Best category, most viewed product | No evidence |
| Quick actions | Navigation grid | Always |
| History | Recent orders activity | Empty |
| Wallet | Wallet overview when enabled | No wallet data |

## Backend extension

`lib/mobile/seller-home-data.ts` aggregates real Prisma data:

- `getSellerDashboardStats`, `getSellerOrderCounters`, `getSellerSettings`
- Revenue periods from completed order items
- Product status buckets
- Recent orders for notifications + history
- No fabricated AI or promotion metrics

## UX requirements delivered

- Skeleton loading (no full-screen spinner)
- `SectionErrorCard` per section with retry
- Offline cached snapshot + banner + retry (no blocking Alert)
- Telemetry: `seller_home_*` events
- Accessibility: 44pt targets, TalkBack labels, header role
- Performance: memoized KPI cards, virtualized history (`FlatList`)

## Gate

```bash
npm run mobile:sprint-95:seller-home
```

Also runs: `mobile:typecheck`, `mobile:test`, `mobile:sprint-94:gate`

## Artifacts

- `artifacts/seller-home/seller-home-report.json`
- `artifacts/seller-home/seller-home-performance.json`
- `artifacts/seller-home/seller-home-a11y.json`

## Next

Sprint 2 — Seller Products management experience (EPIC 86)
