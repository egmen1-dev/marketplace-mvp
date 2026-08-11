# Pickup points & reservations

Seller-managed self-pickup with optional prepayment booking.

## Flow

```
PDP «Забронировать»
        │
        ▼
Cart + /checkout?fulfillment=SELLER_PICKUP
        │
        ▼
createSellerPickupOrder
        │
        ├── Order (fulfillmentType = SELLER_PICKUP)
        ├── PickupReservation (PENDING)
        └── Chat: «Создана бронь товара»
        │
        ▼
Stripe charge = sum(prepayments)   (skipped when total is 0)
        │
        ▼
Seller: CONFIRMED → READY → COMPLETED
   or   CANCELLED (reject / cancel)
Buyer: cancel only while PENDING
```

## Models

- **PickupPoint** — seller addresses (`name`, `city`, `address`, `phone`, `workingHours`, `isActive`)
- **ProductPickupPoint** — which points apply to a product
- **Product** flags: `pickupEnabled`, `reservationEnabled`, `prepaymentPercent` (`0|10|20|30|50|100`)
- **PickupReservation** — links order line, buyer, seller, point; stores prepayment/remaining amounts and status

## Statuses

| Status | Meaning |
|--------|---------|
| `PENDING` | Awaiting seller |
| `CONFIRMED` | Seller accepted |
| `READY` | Prepared for pickup |
| `COMPLETED` | Handed to buyer |
| `CANCELLED` | Rejected / cancelled |

Seller transitions: `PENDING → CONFIRMED|CANCELLED`, `CONFIRMED → READY|CANCELLED`, `READY → COMPLETED|CANCELLED`.

## Prepayment

`calcPrepaymentAmount(lineTotal, percent)` → `{ prepayment, remaining }` (2 decimal rubles).

- Checkout charge (`Order.total`) = sum of line prepayments for seller-pickup carts.
- Remaining is paid to the seller offline at pickup.
- Allowed percents: `0, 10, 20, 30, 50, 100`.

## Checkout constraints

Seller pickup is offered only when:

- every cart item is from the **same** seller;
- every item has `pickupEnabled` and at least one **shared active** pickup point.

Otherwise only delivery is available.

## Permissions

| Actor | Can |
|-------|-----|
| Buyer | Create reservation via checkout; list own; cancel while `PENDING` |
| Seller | CRUD own pickup points; list own reservations; status transitions |
| Admin | Read-only `/admin/reservations` |

## Chat events

Typed as `MessageType.RESERVATION` (system-style bubbles in the thread):

| Event | Text |
|-------|------|
| Created | Создана бронь товара |
| Confirmed | Продавец подтвердил бронь |
| Ready | Товар подготовлен к выдаче |
| Completed | Товар получен |
| Cancelled | Бронь отменена |

See also [CHAT.md](./CHAT.md).

## Notifications

There is no separate email/push product. Reservation lifecycle notifications are the chat messages above.

## PDP reserve CTA

`getReservationAvailability()` (`features/pickup/lib/reservation-availability.ts`) is the single source of truth.

CTA `pdp-reserve` is shown when **all** of:

- viewer is **not** the product owner (`isOwnProduct === false`);
- `status === ACTIVE`;
- `stock > 0`;
- `pickupEnabled`;
- `reservationEnabled`;
- at least one linked active pickup point.

Guests may see the CTA (click → sign-in with `?reserve=1`). Sellers never see it on their own listings (`data-reservation-reason="own_product"`).

E2E fixtures: `POST /api/e2e/pickup-fixture` (header `x-e2e-secret`) creates marker-scoped product+point under `seller@demo.lot`. Cleanup via `DELETE` with the same marker. Markers must start with `E2E-PICKUP-`.

## Key routes

- `/account/pickup-points` — seller points
- `/account/reservations` — buyer «Мои брони» + seller «Заявки»
- `/admin/reservations` — admin list
- PDP `pdp-fulfillment` / `pdp-reserve`

## Key files

- `features/pickup/` — queries, actions, UI, `lib/prepayment.ts`
- `features/orders/queries.ts` — `createSellerPickupOrder`
- `features/orders/components/checkout-form.tsx`
- `features/chat/queries.ts` — `notifyReservation*`
- `tests/e2e/pickup-reservations.spec.ts`
