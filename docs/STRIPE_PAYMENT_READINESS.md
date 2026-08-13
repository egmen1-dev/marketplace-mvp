# Stripe Payment Readiness — RELEASE-HARDENING-001

**Staging:** https://web-production-e56fb.up.railway.app  
**Vercel production:** not modified by this epic.

## Checkout flow (current)

```text
Cart (/cart)
  → Checkout (/checkout) — address, CDEK PVZ, totals
  → createOrderFromCartAction (server)
  → createCheckoutSessionForOrder (Stripe Checkout Session)
  → redirect to Stripe Hosted Checkout
  → webhook: checkout.session.completed / payment_intent.succeeded
  → finalizePaidOrder (stock commit, order PAID)
  → onOrderPaidForFinance hook (future ledger)
```

## Required environment variables

| Variable | Purpose | Required for live charges |
|----------|---------|---------------------------|
| `STRIPE_SECRET_KEY` | Server SDK, Checkout Session create | **Yes** |
| `STRIPE_WEBHOOK_SECRET` | Verify `/api/webhooks/stripe` | **Yes** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client SDK (optional for Hosted Checkout redirect) | Recommended |

Set on Railway **web-v2** service only until production GO.

## Health check

`GET /api/health` → `checks.stripe`:

```json
{
  "ok": true,
  "configured": true,
  "optional": true,
  "detail": "configured"
}
```

- `configured: true` when **both** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set.
- `ok` reflects secret key presence (legacy consumers).
- **Do not** enable live keys without webhook endpoint registered.

## Staging status (audit 2026-08-13)

| Check | Status |
|-------|--------|
| Checkout UI loads | ✅ |
| CDEK quote on checkout | ✅ |
| Stripe keys on Railway | ❌ `not_configured` |
| Webhook route | `/api/webhooks/stripe` — returns 503 when Stripe unset |
| End-to-end paid order | ❌ blocked until keys + webhook |

## Enable payments on staging (operator checklist)

1. Create Stripe **test mode** keys in Dashboard.
2. Railway → web-v2 → Variables:
   - `STRIPE_SECRET_KEY=sk_test_…`
   - `STRIPE_WEBHOOK_SECRET=whsec_…`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` (optional)
3. Stripe Dashboard → Webhooks → endpoint:
   - URL: `https://web-production-e56fb.up.railway.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
4. Redeploy web-v2 (GitHub push or manual redeploy).
5. Verify `GET /api/health` → `checks.stripe.configured: true`.
6. E2E: `cart-favorites-checkout` → complete test payment with card `4242…`.

## Tests

```bash
npm test -- tests/stripe-payment-readiness.test.ts
```

Covers:

- `isStripeConfigured()` behaviour
- `createCheckoutSessionForOrder` returns `PAYMENTS_NOT_CONFIGURED` without keys
- Health response includes `stripe.configured`

## Code references

- `lib/stripe.ts` — SDK singleton
- `features/payments/create-checkout-session.ts` — PaymentIntent metadata via Checkout Session
- `features/payments/webhook.ts` — event handlers
- `features/orders/lib/finalize-paid-order.ts` — idempotent PAID + stock

**No real charges** are initiated without `STRIPE_SECRET_KEY`.
