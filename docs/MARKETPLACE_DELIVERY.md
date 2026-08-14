# MARKETPLACE-DELIVERY-001

Real delivery and order fulfillment layer for the marketplace foundation.

## Feature flag

```bash
MARKETPLACE_DELIVERY_ENABLED=true
```

When disabled, the legacy `lib/delivery` quote/PVZ flow continues unchanged.

## Architecture

```
lib/marketplace-delivery/
  delivery/
    types.ts          — DTOs
    providers.ts      — MarketplaceDeliveryProvider interface
    mock.ts           — MockDeliveryProvider (dev default)
    cdek.ts           — CdekDeliveryProvider (falls back to mock)
    providers-factory.ts
    tracking.ts       — status maps + buyer progress steps
    lifecycle.ts      — order/delivery sync + trust/finance hooks
    queries.ts
    actions.ts        — createShipment, syncTracking, returns
    notifications.ts
    permissions.ts
  flags.ts
  analytics.ts
  index.ts
```

## Provider interface

- `createShipment()` — register shipment, return tracking number
- `calculateCost()` — wraps existing quote API
- `getTracking()` — poll carrier status
- `cancelShipment()` — cancel external shipment

CDEK credentials (`CDEK_CLIENT_ID`, `CDEK_CLIENT_SECRET`) switch the factory to `CdekDeliveryProvider`; without credentials, mock is used.

## Delivery status lifecycle

Prisma `DeliveryStatus` extended with:

`READY_FOR_PICKUP`, `PICKED_UP`, `AT_PICKUP_POINT`, `FAILED`

Synced from order transitions when the delivery flag is on.

## UX surfaces

| Actor | Route | Purpose |
|-------|-------|---------|
| Seller | `/account/orders/ship` | «Нужно отправить» queue + create shipment |
| Seller | `/account/sales` | Link to ship queue |
| Buyer | `/account/orders/[id]` | Delivery progress + tracking refresh |
| Admin | `/admin/delivery` | Health metrics + shipments table |
| Buyer | PDP | Delivery hint («Получите завтра») |

## Integrations

### Trust loop

On `DeliveryStatus.DELIVERED`, sets `reviewEligibleAt` when `MARKETPLACE_TRUST_LOOP_ENABLED=true`.

### Finance

Unchanged — seller funds release on `OrderStatus.COMPLETED` via existing `syncFinanceOnOrderCompleted`.

### Order lifecycle

`transitionOrderWithEffects` calls `syncDeliveryOnOrderTransition` when the delivery flag is on.

## Returns foundation

`ReturnRequest` model with statuses `CREATED → APPROVED → REJECTED → COMPLETED`.

`createReturnRequestAction` — lifecycle only, no refund ledger logic.

## Analytics events

- `delivery_created`
- `shipment_created`
- `delivery_tracking_view`
- `delivery_status_changed`
- `delivery_completed`
- `return_created`

## Tests

```bash
MARKETPLACE_DELIVERY_ENABLED=true npm run test -- tests/marketplace-delivery.test.ts
MARKETPLACE_DELIVERY_ENABLED=true npm run build
npx prisma migrate deploy
```

## Deploy stack

```bash
MARKETPLACE_DELIVERY_ENABLED=true
MARKETPLACE_TRUST_LOOP_ENABLED=true
npx prisma migrate deploy
```
