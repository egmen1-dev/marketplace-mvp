# EPIC 86 — Sprint 2 — Seller Workspace

**Baseline:** Sprint 1 Seller Home COMPLETE  
**Branch:** `cursor/epic-86-sprint-2-seller-workspace-d03e`

## Goal

Transform Seller Home from dashboard into an operating system with priority-driven workspace tasks sourced from real backend state.

## Priority lanes

| Lane | Meaning |
|------|---------|
| Urgent | Overdue orders, unread buyer replies |
| Important | Today's orders, moderation, low stock, awaiting shipment |
| Routine | Drafts, wallet actions, promotion readiness |
| Completed | Orders completed today |

## Workspace sections

All sections are populated only from backend evidence:

- **Urgent** — overdue orders
- **Today's Work** — new/paid orders needing action
- **Quick Resume** — in-progress order or latest draft
- **Recent Drafts** — DRAFT products
- **Pending Publications** — moderation PENDING_REVIEW / NEEDS_FIX (+ promotion-not-ready when enabled)
- **Low Stock** — inventory below threshold
- **Awaiting Shipment** — READY_FOR_SHIPMENT orders
- **Customer Replies** — unread buyer conversations
- **Financial Actions** — wallet pending / withdrawable balances
- **Completed Today** — orders completed today

## Architecture

```
seller-home.tsx → useSellerHomeData → LoadSellerHome → RestSellerRepository
```

Backend builder: `lib/mobile/seller-workspace-data.ts` (`buildSellerWorkspace`)

## Rules enforced

- No fake AI recommendations
- No generated advice
- Every task maps to an existing flow (orders, products, wallet, profile)
- Offline snapshot via `seller-workspace` cache key
- Section retry via `SectionErrorCard`

## Telemetry

- `seller_workspace_opened`
- `seller_task_completed`
- `seller_resume_clicked`
- `seller_priority_changed`

## Gate

```bash
npm run mobile:sprint-96:seller-workspace
```

## Artifacts

- `artifacts/seller-workspace/seller-workspace-report.json`
