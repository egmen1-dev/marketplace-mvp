# Payment Lifecycle — Finance Foundation (MVP)

**PAYMENT-READY-001** — Stripe payment + finance ledger.

## Flow

```text
Buyer completes Stripe Checkout
        │
        ▼
POST /api/webhooks/stripe
  • signature validation (Stripe-Signature)
  • StripeWebhookEvent upsert (idempotent by evt_id)
        │
        ▼
markOrderPaidFromCheckoutSession / markOrderPaidFromPaymentIntent
        │
        ▼
finalizePaidOrder (transactional)
  • verify amount + currency
  • commitInventory
  • Order → AWAITING_SELLER_CONFIRMATION (OMS)
  • Payment.status → SUCCEEDED
        │
        ├── trackServerEvent(PURCHASE_COMPLETE)
        │
        └── onOrderPaidForFinance(orderId)
              → FinanceTransaction SALE (PENDING)
              → SellerBalance.pending += sellerAmount
        │
        ▼ (later, OMS COMPLETED — side effect only)
releaseSellerFundsOnOrderCompleted
  → FinanceTransaction RELEASE
  → pending → available
```

## Commission

Default **10%** (`MARKETPLACE_COMMISSION_BPS = 1000`).

Example: gross 10 000 RUB → commission 1 000 RUB → seller 9 000 RUB pending.

## Order payment states (unchanged OMS)

```text
NEW (awaiting payment)
  → AWAITING_SELLER_CONFIRMATION (after paid)
  → … → COMPLETED
```

Unpaid = `NEW`. There is no `AWAITING_PAYMENT` enum value.

## Idempotency

| Layer | Mechanism |
|-------|-----------|
| Stripe event | `StripeWebhookEvent.stripeEventId` unique; PROCESSED → skip |
| Payment settle | `finalizePaidOrder` alreadyPaid short-circuit |
| Finance SALE | unique `(orderId, sellerId, SALE)` |
| Finance RELEASE | unique `(orderId, sellerId, RELEASE)` |

## Related

- [STRIPE_SETUP.md](./STRIPE_SETUP.md)
- [STRIPE_PAYMENT_READINESS.md](./STRIPE_PAYMENT_READINESS.md)
- [PRE_PAYMENT_BACKUP_CHECKLIST.md](./PRE_PAYMENT_BACKUP_CHECKLIST.md)
- [ORDER_LIFECYCLE.md](./ORDER_LIFECYCLE.md)
