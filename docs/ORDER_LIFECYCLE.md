# Order Lifecycle (OMS)

Deterministic marketplace order state machine. **All status changes go through** `transitionOrder` / `transitionOrderWithEffects` in `features/order-lifecycle/`.

## State machine

### Delivery (`fulfillmentType = DELIVERY`)

```
NEW → AWAITING_SELLER_CONFIRMATION → CONFIRMED → PROCESSING
  → READY_FOR_SHIPMENT → SHIPPED → IN_TRANSIT → ARRIVED → DELIVERED → COMPLETED
```

### Pickup (`fulfillmentType = SELLER_PICKUP`)

```
NEW → AWAITING_SELLER_CONFIRMATION → CONFIRMED → PROCESSING
  → READY_FOR_PICKUP → PICKED_UP → COMPLETED
```

(Unpaid NEW pickup may jump `NEW → CONFIRMED` when the seller confirms a reservation.)

### Side branches

- `CANCELLED` / `REJECTED` from early stages
- `RETURN_REQUESTED → RETURN_APPROVED → RETURNED → REFUNDED`
- Soft flag `isOverdue` when SLA breached (does not replace status)
- Legacy `PAID` is normalized to `AWAITING_SELLER_CONFIRMATION`

## Transition engine

```ts
import { transitionOrderWithEffects } from "@/features/order-lifecycle";

await transitionOrderWithEffects({
  orderId,
  toStatus: OrderStatus.CONFIRMED,
  actorRole: OrderActorRole.SELLER,
  actorUserId,
  reason: "…",
});
```

Checks:

1. Allowed edge for fulfillment type
2. Actor role permissions (buyer cannot set seller statuses)
3. Append-only `OrderStatusHistory`
4. `OrderEvent` row + in-process event bus
5. Optional chat `ORDER` system message + notification adapters

## Permissions

| Role | Can |
|------|-----|
| BUYER | Cancel early; confirm receipt (`COMPLETED`); request return |
| SELLER | Confirm / reject / process / ship / ready for pickup |
| ADMIN | Any allowed graph edge |
| PAYMENT | `NEW → AWAITING_SELLER_CONFIRMATION` |
| SYSTEM | Internal / SLA |

## History

`OrderStatusHistory` is immutable (no update/delete APIs). Fields: `fromStatus`, `toStatus`, `performedByRole`, `reason`, `changedByUserId`, `createdAt`.

## Events & integrations

`OrderEvent` + `subscribeOrderLifecycle()`:

- **Ranking** — `COMPLETED` / `DELIVERED` / `PICKED_UP` via `COMPLETED_ORDER_STATUSES`
- **Reviews** — `reviewEligibleAt` set on `COMPLETED`; `isOrderReviewEligible()`
- **Analytics** — `getOrderLifecycleAnalytics()` (confirmation / processing / delivery averages)

## SLA / ETA

Set after payment recording:

- `confirmationDeadline` (+1 day)
- `shipmentDeadline` (+ handlingDays)
- `pickupExpiresAt` (+3 days after ready window for pickup)
- `estimatedDeliveryAt` — carrier max days when known; otherwise handling deadline only (no fake dates)

## Notifications

`features/notifications/order-notifications.ts` — channel adapters (`in_app` live; email/push/telegram/sms stubs).

## UI

- Buyer: `/account/orders/[id]` — timeline, next action, cancel / confirm / return
- Seller: `/account/sales` — buckets + counters
- Admin: `/admin/orders` — list / detail / search

## Key files

- `features/order-lifecycle/lib/state-machine.ts`
- `features/order-lifecycle/lib/transition.ts`
- `features/order-lifecycle/lib/event-bus.ts`
- `features/order-lifecycle/lib/sla.ts`
- `features/order-lifecycle/lib/pickup-sync.ts`
- `features/order-lifecycle/lib/integrations.ts`
