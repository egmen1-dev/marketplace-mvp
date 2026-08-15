# LOT Wallet Security Rules

**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001

---

## Anti–money-laundering rules

1. **Top-up funds are not withdrawable.** `BUYER_TOP_UP` increments `topupSpendableAmount` only; payout assertions exclude top-up/bonus buckets.
2. **Bonuses are not withdrawable.** Same bucket isolation as top-ups.
3. **Held seller funds are not spendable** until released to seller `availableAmount`.
4. **No instant top-up → withdraw path.** User cannot deposit via card and immediately cash out.

---

## Idempotency

| Operation | Key pattern |
|-----------|-------------|
| Wallet top-up | `topup:session:{stripeSessionId}` |
| Order wallet pay | `order:wallet:{orderId}` |
| Promotion purchase | product-specific keys in `payInternalProduct` |

Stripe webhook events deduplicated via `StripeWebhookEvent.stripeEventId`.

---

## Payment integrity

- Top-up amount validated server-side (100–500 000 ₽) before Stripe session creation.
- Webhook credits `session.amount_total` from Stripe — not client-submitted amount alone.
- Order wallet pay re-reads order total from DB before debit.
- `finalizePaidOrderInTx` with `source: lot_wallet` skips Stripe amount validation but still enforces stock/status.

---

## Logging

- Password values **never** logged.
- Wallet operations log userId, amount, reference ids — not full payment instrument data.

---

## Payout

- Withdrawable amount = seller released earnings minus reserved payouts.
- Manual payout review when `SELLER_PAYOUT_ENABLED` — no instant bank transfer promise in UI.

---

## Promotion safety

- Debit must succeed before campaign activation.
- Insufficient spendable balance → hard fail, no partial activation.

---

## Password change

- Requires verified current password (bcrypt compare).
- Minimum 8 characters; confirmation match enforced server-side.
