# Finance Architecture Audit (EPIC-FINANCE-001)

Audit of current payment/order flow before introducing the marketplace finance layer.

---

## Current flow

```
Buyer checkout
    ↓
createOrderFromCart (Order NEW)
    ↓
createCheckoutSessionForOrder (Payment PENDING)
    ↓
Stripe Checkout / webhook
    ↓
finalizePaidOrderInTx
    ├─ commitInventory
    ├─ transitionOrder → AWAITING_SELLER_CONFIRMATION (silent)
    └─ Payment SUCCEEDED
    ↓
Seller OMS path → DELIVERED / PICKED_UP
    ↓
buyerConfirmReceivedAction / pickup coordinator
    ↓
transitionOrderWithEffects → COMPLETED
```

**Today:** Payment → Order status change → Complete. No commission ledger, no seller balance, no hold/release.

---

## Key integration points (as of audit)

| Moment | File | Function |
|--------|------|----------|
| Order created | `features/order-lifecycle/lib/transition.ts` | `recordOrderCreated` |
| Payment initiated | `features/payments/create-checkout-session.ts` | `createCheckoutSessionForOrder` |
| **Payment succeeded** | `features/orders/lib/finalize-paid-order.ts` | **`finalizePaidOrderInTx`** |
| Webhook ingress | `features/payments/webhook.ts` | `handleStripeWebhook` |
| **Order completed** | `features/order-lifecycle/lib/transition.ts` | **`transitionOrderWithEffects`** |
| Seller attribution | `OrderItem → Product.sellerId` | Single seller per cart enforced |

---

## Gaps before EPIC-FINANCE-001

- No `Transaction` / finance ledger entity
- No commission calculation
- No seller virtual balance
- No hold period between payment and completion
- No dispute foundation
- Payment transition uses `silent: true` — chat/notifications skipped (unchanged)
- No Stripe refund webhook → `REFUNDED` OMS status exists but not wired to payments

---

## Target flow (foundation)

```
Buyer Payment (Stripe — unchanged)
    ↓
FinanceTransaction PENDING → PAID → HELD
    ↓
SellerBalance.pendingAmount += sellerAmount
    ↓
Order COMPLETED (existing OMS)
    ↓
FinanceTransaction HELD → RELEASED
    ↓
SellerBalance: pending → available
    ↓
(future) Seller Payout
```

**Principle:** Money does not flow buyer → seller directly. Marketplace records virtual ledger state only — no real payouts in MVP.

---

## Constraints respected

- Catalog Core, Search, Ranking, AI, Auth — not modified
- OMS state machine — reused; finance hooks added at payment finalize + COMPLETED
- Existing `Payment` model — unchanged schema; finance is additive
- Existing orders — no backfill; finance rows created for new paid orders only

---

## Migration safety

- New tables only: `finance_transactions`, `commission_rules`, `seller_balances`, `disputes`
- Reversible: drop new tables without affecting orders/payments
- Idempotent finance sync on payment and completion
