# Stripe Staging Acceptance

**Epic:** STRIPE-STAGING-SETUP-001  
**Date:** 2026-08-15  
**Staging:** https://web-production-e56fb.up.railway.app

---

## Code audit results (from repository)

| Item | Value |
|------|-------|
| Webhook route | `POST /api/webhooks/stripe` |
| Route file | `app/api/webhooks/stripe/route.ts` |
| Handler | `features/payments/webhook.ts` → `handleStripeWebhook()` |
| Idempotency table | `StripeWebhookEvent` (Prisma) |
| Signature | `constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)` |

### Stripe events handled in code

| Stripe event | Handler exists | Purpose |
|--------------|:--------------:|---------|
| `checkout.session.completed` | **YES** | Wallet top-up OR product order payment |
| `payment_intent.succeeded` | **YES** | Product order payment (fallback) |
| `payment_intent.payment_failed` | **NO** | Not implemented — do not subscribe |

### Payment routing metadata (actual field names)

| Flow | Metadata keys | Router |
|------|---------------|--------|
| Wallet top-up | `purpose: "wallet_top_up"`, `userId`, `amountRub` | `settleCheckout` → `creditWalletTopUpFromCheckoutSession` |
| Product order | `orderId`, `orderNumber`, `userId` | `settleCheckout` → `markOrderPaidFromCheckoutSession` |
| Promotion (Stripe card) | — | **Not implemented** — use LOT Wallet only |

**Note:** Code does **not** use `paymentType`. Wallet uses `purpose`, orders use `orderId`.

---

## Runtime status (last check)

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/health
```

| Check | Status |
|-------|--------|
| Test keys detected (`sk_test_` / `pk_test_`) | ⏳ pending redeploy / verify via health |
| `STRIPE_SECRET_KEY` detected | ⏳ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` detected | ⏳ |
| `STRIPE_WEBHOOK_SECRET` detected | ❌ user action required |
| Correct webhook route documented | ✅ `/api/webhooks/stripe` |
| Required events identified | ✅ 2 events |
| Webhook destination created | ⏳ user action |
| `/api/health` `stripe.configured = true` | ❌ blocked on webhook secret |
| Wallet top-up E2E | ❌ blocked |
| Product payment E2E | ❌ blocked |
| Promotion Stripe E2E | N/A — card not implemented |
| Promotion wallet E2E | ⚠️ separate (no Stripe) |
| Duplicate webhook safe | ✅ code + unit tests |

---

## Acceptance checklist

| # | Gate | Status |
|---|------|--------|
| 1 | `sk_test_` keys only (no live) | ⏳ verify after redeploy |
| 2 | Webhook URL created in Stripe | ⏳ |
| 3 | Events: `checkout.session.completed`, `payment_intent.succeeded` | ⏳ |
| 4 | `STRIPE_WEBHOOK_SECRET` in Railway | ⏳ |
| 5 | Redeploy + health `configured: true` | ⏳ |
| 6 | Real wallet top-up + webhook credit | ⏳ |
| 7 | Real product order payment | ⏳ |
| 8 | Duplicate event idempotent | ⏳ E2E after #6 |

---

## Final verdict

```text
STRIPE STAGING: NOT ACCEPTED
```

Allowed only after real webhook E2E passes.

---

## User action (one step remaining)

See `docs/STRIPE_STAGING_WEBHOOK_SETUP.md` — create webhook destination and add `STRIPE_WEBHOOK_SECRET` to Railway, then redeploy.

After that, re-run health check and financial E2E.
