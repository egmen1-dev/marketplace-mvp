# Payment Lifecycle — Finance Foundation (MVP)

**RELEASE-HARDENING-001** — integration points only; no seller payouts in MVP.

## Flow

```text
Buyer completes Stripe Checkout
        │
        ▼
POST /api/webhooks/stripe
        │
        ▼
markOrderPaidFromCheckoutSession / markOrderPaidFromPaymentIntent
        │
        ▼
finalizePaidOrder (transactional)
  • verify amount + currency
  • commitInventory
  • Order.status → PAID (or awaiting seller confirm for pickup)
  • Payment.status → SUCCEEDED
        │
        ├── trackServerEvent(PURCHASE_COMPLETE)
        │
        └── onOrderPaidForFinance(orderId)  ← future ledger hook
```

## Hook: `onOrderPaidForFinance`

**File:** `features/payments/on-order-paid.ts`

Called from `finalizePaidOrder` after first successful payment (not on idempotent replays).

Current behaviour: structured log only.

### Future implementation (not in MVP)

| Step | Planned |
|------|---------|
| Create `Transaction` row (gross, fee, net) | RC2+ |
| Seller balance credit | RC2+ |
| Payout batch / Stripe Connect transfer | RC2+ |
| Refund / chargeback reversal | RC2+ |

## Events

| Event | When |
|-------|------|
| `checkout_start` | Client checkout page |
| `purchase_complete` | Server after `finalizePaidOrder` |
| Stripe webhooks | Source of truth for payment state |

## Invariants

- Never trust client payment status — webhooks + Stripe objects only.
- Stock decrement only in `finalizePaidOrder` (not on order create).
- Idempotent: duplicate webhooks do not double-decrement stock or re-fire finance hook.

## Related docs

- [STRIPE_PAYMENT_READINESS.md](./STRIPE_PAYMENT_READINESS.md)
- [ORDER_LIFECYCLE.md](./ORDER_LIFECYCLE.md)
