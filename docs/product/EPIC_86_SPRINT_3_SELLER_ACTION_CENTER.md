# EPIC 86 — Sprint 3: Seller Action Center

## Goal

Reduce seller work to the minimum number of taps. Every workspace task becomes actionable in-place.

## Flow

```
Task tap → Universal Bottom Sheet → Backend action → Result banner (+ Undo) → Workspace refresh
```

No unnecessary navigation for supported actions.

## Components

| Layer | Artifact |
|-------|----------|
| Design system | `UniversalActionCard`, `UniversalBottomSheet` |
| Feature | `action-router`, `useSellerActionCenter`, `SellerActionSheet`, `ActionResultBanner` |
| Domain | `ExecuteSellerAction` use case |
| Backend | `POST /api/mobile/seller/actions`, `executeMobileSellerAction` |

## Supported actions

- `update_stock` — in-app form, undo restores previous quantity
- `publish_product` — confirm, undo reverts to draft
- `fix_moderation` — opens web product editor (honest deep link)
- `ship_order` / `confirm_order` — confirm, undo reverts status
- `reply_buyer` — opens conversation (honest deep link)
- `withdraw_funds` — creates payout request
- `complete_profile` — form for store name / phone
- `resume_draft` — opens web draft editor

## Rules

- Backend only — no fake actions or AI advice
- Optimistic task hide while executing; rollback on failure
- Workspace refresh via `retryDashboard()` after completion
- Undo where backend returns undo payload

## Gate

```bash
npm run mobile:sprint-97:seller-action-center
```

Report: `artifacts/seller-action-center/seller-action-center-report.json`
