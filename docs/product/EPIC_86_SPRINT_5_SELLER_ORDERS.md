# EPIC 86 Sprint 5 — Seller Order Operations

## Mission

Seller operations center for order lifecycle: see → prioritize → ship → track → complete with minimum taps.

## Scope

| Area | Implementation |
|------|----------------|
| Order queue | `SellerSalesExperience` with operational summary + filter rail |
| Status filters | Backend buckets via `MobileSellerOrderFilter` |
| Search | Order number, buyer, product names (`q` param) |
| Shipment workflow | `confirm_order` → `ready_for_shipment` → `ship_order` |
| Pickup workflow | `confirm_order` → `ready_for_pickup` → `mark_picked_up` |
| Order detail | `/seller/order/[id]` |
| Action Center | Reused `useSellerActionCenter` — no Alert dialogs |
| Offline snapshot | `seller-sales` cache key |
| Bulk shipment | **NOT SUPPORTED** (no backend bulk API) |

## Architecture

```
Screen → Hook → Use Case → Repository → Transport → API
```

- Zero Screen→API imports
- Zero DTO leaks (mapper layer only)
- Domain events: `SellerOrderChanged` on order actions

## Backend routes

- `GET /api/mobile/seller/orders?cursor&q&filter`
- `GET /api/mobile/seller/orders/summary`
- `GET /api/mobile/seller/orders/[id]`
- Order actions via `POST /api/mobile/seller/actions`

## New action kinds

- `ready_for_shipment` — PROCESSING → READY_FOR_SHIPMENT (delivery)
- `ready_for_pickup` — PROCESSING → READY_FOR_PICKUP (pickup)
- `mark_picked_up` — READY_FOR_PICKUP → PICKED_UP
- `cancel_order` — allowed transitions only (state machine)

## Rules

- No fake shipment steps, tracking numbers, or delivery estimates
- Only backend-supported order statuses and transitions

## Gate

```bash
npm run mobile:sprint-99:seller-orders
```

Artifacts: `artifacts/seller-orders/`

## Regression

Gate runs sprint 94, 96, 97, 98 regression checks.
