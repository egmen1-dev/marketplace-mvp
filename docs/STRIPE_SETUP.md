# Stripe Setup — PAYMENT-READY-001

**Staging:** https://web-production-e56fb.up.railway.app  
**Vercel production:** do not configure until GO.

## Required environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Railway web-v2 (server) | Create Checkout Sessions |
| `STRIPE_WEBHOOK_SECRET` | Railway web-v2 (server) | Verify webhook signatures |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Railway web-v2 (optional for Hosted Checkout) | Client SDK if needed later |

Use **test mode** keys (`sk_test_…`, `pk_test_…`, `whsec_…`) on staging.

## Railway staging steps

1. Stripe Dashboard → Developers → API keys → copy **test** secret + publishable.
2. Railway → project → service **web-v2** → Variables:
   ```text
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_WEBHOOK_SECRET=whsec_…
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
   ```
3. Stripe Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://web-production-e56fb.up.railway.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`
4. Redeploy web-v2 (variable change may auto-redeploy).
5. Verify:
   ```bash
   curl -sS https://web-production-e56fb.up.railway.app/api/health | jq '.checks.stripe'
   ```
   Expect: `"configured": true`

## Test card

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0000 0000 0002` | Decline |

Any future expiry, any CVC, any ZIP.

## Health semantics

`checks.stripe.configured === true` only when **both** secret and webhook secret are set.

## Related

- [STRIPE_PAYMENT_READINESS.md](./STRIPE_PAYMENT_READINESS.md)
- [PAYMENT_LIFECYCLE.md](./PAYMENT_LIFECYCLE.md)
- [PRE_PAYMENT_BACKUP_CHECKLIST.md](./PRE_PAYMENT_BACKUP_CHECKLIST.md)
