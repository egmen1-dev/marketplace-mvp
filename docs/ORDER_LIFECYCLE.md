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

Unpaid NEW pickup may jump `NEW → CONFIRMED` via the pickup coordinator.

### Side branches

- `CANCELLED` / `REJECTED` from early stages
- `RETURN_REQUESTED → RETURN_APPROVED → RETURNED → REFUNDED`
- Soft flag `isOverdue` (+ `overdueReason`) — **not** a lifecycle status
- Legacy `PAID` normalizes to `AWAITING_SELLER_CONFIRMATION`

## Transition engine & idempotency

```ts
await transitionOrderWithEffects({
  orderId,
  toStatus: OrderStatus.CONFIRMED,
  actorRole: OrderActorRole.SELLER,
  actorUserId,
  reason: "…",
});
```

- Illegal edges → `OrderLifecycleError`
- Same status retry → `alreadyApplied: true` (no duplicate history / events / chat)
- Chat system messages skip duplicates of the same text within 10 minutes

## Deadlines & overdue

| Field | Meaning |
|-------|---------|
| `confirmationDeadline` | Seller must confirm |
| `processingDeadline` | Assembly window |
| `shipmentDeadline` | Ready-to-ship / ship window |
| `pickupExpiresAt` | Pickup hold expiry |

**Processor:** `processOverdueOrders()` marks `isOverdue` once, writes one `OVERDUE_MARKED` event, notifies seller in-app.

**Cron:** `POST /api/cron/orders-overdue` with `Authorization: Bearer $CRON_SECRET` or `x-cron-secret` (Railway cron / external scheduler). Idempotent on repeat ticks.

## Pickup ↔ Order coordinator

`transitionPickupReservationWithOrder` / `cancelPickupReservationByBuyer` in `pickup-coordinator.ts`:

| Reservation | Order target |
|-------------|--------------|
| CONFIRMED | CONFIRMED (+ walk PROCESSING…) |
| READY | READY_FOR_PICKUP |
| COMPLETED | … → PICKED_UP → COMPLETED |
| CANCELLED (from PENDING) | REJECTED |
| CANCELLED (later) | CANCELLED |

Reservation + order status updates run in **one Prisma transaction**. Chat/notifications run **after commit**.

## Side-effect strategy

1. DB transaction (status + history + OrderEvent)
2. Commit
3. Event bus + chat + notifications

If step 3 fails, core state stays consistent. Critical events are persisted as `OrderEvent` rows (lightweight outbox source for later workers). No Kafka.

## Carrier tracking boundary

`CarrierTrackingProvider` + `mapCarrierStatusToOrderStatus()` — providers **never** write `Order.status`. Seller-driven transitions remain the fallback; CDEK live tracking is stubbed until credentials exist.

## Ranking / reviews

- Ranking / sales: `COMPLETED` \| `DELIVERED` \| `PICKED_UP` only
- Reviews: `reviewEligibleAt` set on `COMPLETED`

## UI

- Buyer: `/account/orders/[id]` timeline + actions
- Seller: `/account/sales` buckets + overdue filter/badge
- Admin: `/admin/orders` search + overdue filter

## Key files

- `features/order-lifecycle/lib/state-machine.ts`
- `features/order-lifecycle/lib/transition.ts`
- `features/order-lifecycle/lib/pickup-coordinator.ts`
- `features/order-lifecycle/lib/overdue-processor.ts`
- `features/order-lifecycle/lib/carrier-tracking.ts`
- `app/api/cron/orders-overdue/route.ts`
