# Marketplace Financial E2E Acceptance

**Epic:** MARKETPLACE-FINANCIAL-E2E-001  
**Date:** 2026-08-15  
**Staging URL:** https://web-production-e56fb.up.railway.app

---

## Environment baseline

| Field | Value |
|-------|-------|
| `origin/main` SHA | `928ac9f` (PR #64 merged) |
| Staging SHA (at test time) | `ba767f7` ⏳ deploy pending |
| PR #64 tip | `4ef5505` → merged as `928ac9f` |
| Stripe mode | **not configured** |
| Webhook status | **not configured** |
| DB migrations | up to date (local + staging prior run) |

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/health
# stripe.configured: false, detail: "not_configured"
```

---

## Executive verdict

| Area | Status |
|------|--------|
| **Code + unit/integration tests** | ✅ PR #65 merged (`7ec975f`) |
| **Wallet idempotency fixes** | ✅ |
| **Staging UI + bucket display (fixture seed)** | ✅ verified 2026-08-15 |
| **Wallet checkout / promotion / payout UI** | ✅ visible on staging |
| **Stripe runtime on staging** | ❌ **BLOCKED** (user skipped secrets) |
| **Real Stripe top-up E2E** | ❌ **NOT ACCEPTED** |
| **FINANCIAL E2E overall** | ⚠️ **PARTIAL** — non-Stripe flows only |

**FINANCIAL E2E: ACCEPTED** cannot be declared until real Stripe test payment + webhook on staging.

### Staging fixture seed (without Stripe)

For acceptance without Stripe keys, run against staging `DATABASE_URL`:

```bash
npx tsx scripts/seed-financial-acceptance-fixture.ts
```

Seeds `seller@demo.lot`: 5 000 ₽ top-up (spendable only) + 20 000 ₽ seller available (withdrawable).

Verified on staging UI:
- Wallet shows 25 000 ₽ spendable / 20 000 ₽ withdrawable
- History shows +5 000 ₽ пополнение
- Checkout shows «Кошелёк ЛОТ»
- Promotion center shows wallet balance
- Admin `/admin/wallet` accessible

Screenshots: `/opt/cursor/artifacts/financial-e2e-*.png`

---

## Stripe

| Gate | Status |
|------|--------|
| Stripe test keys configured | ❌ |
| Webhook configured | ❌ |
| Signature verified (`constructEvent`) | ✅ code |
| Duplicate webhook safe (`StripeWebhookEvent`) | ✅ code + tests |
| Wallet top-up webhook branch | ✅ code + tests |

### Required Railway variables (web-v2)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

Webhook endpoint: `https://web-production-e56fb.up.railway.app/api/webhooks/stripe`  
Events: `checkout.session.completed`, `payment_intent.succeeded`

---

## Wallet Top-up

| Check | Status |
|-------|--------|
| Code path complete | ✅ |
| Top-up 500 fix (server analytics) | ✅ merged #64 |
| Idempotency (no double credit) | ✅ fixed |
| Real Stripe E2E | **BLOCKED** |

---

## Wallet Checkout

| Check | Status |
|-------|--------|
| `payOrderWithLotWallet` | ✅ code |
| Ledger-before-debit idempotency | ✅ fixed |
| Duplicate submit protection | ✅ unit tests |
| Concurrency protection | ✅ unit tests |
| Staging E2E with real debit | **BLOCKED** (needs balance + deploy) |

---

## Promotion Wallet Payment

| Check | Status |
|-------|--------|
| `purchasePromotionAction` wallet path | ✅ code |
| Card path blocked (honest message) | ✅ |
| Insufficient funds UX | ✅ unit |
| Staging E2E debit | **BLOCKED** |

**MIXED PAYMENT (wallet + card): NOT SUPPORTED** — UI must not imply otherwise.

---

## Seller Proceeds

| Check | Status |
|-------|--------|
| Bucket rules (held / released) | ✅ unit tests |
| Seller revenue spendable + withdrawable | ✅ unit tests |
| Top-up not withdrawable | ✅ unit tests |
| Bonus not withdrawable | ✅ unit tests |
| Seller revenue → buyer purchase | ⚠️ staging E2E pending |

---

## Payout

| Check | Status |
|-------|--------|
| Withdrawable-only validation | ✅ unit tests |
| Reserve / reject / complete lifecycle | ✅ `tests/seller-payout.test.ts` |
| Top-up cannot be paid out | ✅ bucket tests |
| Staging full admin lifecycle E2E | ⚠️ pending (`SELLER_PAYOUT_ENABLED` + fixture) |

---

## Security Invariants

| Check | Status |
|-------|--------|
| No negative balances (script) | ✅ `npm run finance:invariants` |
| Ownership checks | ✅ existing auth |
| Idempotency keys unique | ✅ DB constraint + ledger-first writes |
| Reconciliation report | ✅ `lib/financial/reconciliation.ts` |

---

## Reconciliation

```bash
npm run finance:invariants
# checks negative buckets, duplicate keys, payout vs withdrawable
```

Integration test: `tests/financial-reconciliation.test.ts` (requires `DATABASE_URL`).

---

## Tests added (branch)

```text
tests/wallet-stripe-topup.test.ts
tests/wallet-webhook-idempotency.test.ts
tests/wallet-product-payment.test.ts
tests/wallet-concurrency.test.ts
tests/wallet-fund-origin.test.ts
tests/promotion-wallet-payment.test.ts
tests/payout-wallet-security.test.ts
tests/financial-reconciliation.test.ts
tests/e2e/wallet-topup-staging.spec.ts
tests/e2e/wallet-checkout-staging.spec.ts
tests/e2e/promotion-wallet-staging.spec.ts
tests/e2e/payout-staging.spec.ts
tests/e2e/ranking-advisory-staging.spec.ts
```

Fixture API: `POST /api/e2e/wallet-fixture` (requires `E2E_FIXTURE_SECRET`).

---

## Ranking advisory (post-financial)

| Check | Status |
|-------|--------|
| `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true` | ⏳ after Stripe E2E |
| Live search unchanged | ✅ `resolveOrderBy()` verified |
| Activation gate manual sign-off | ❌ still required |

---

## Blockers to reach ACCEPTED

1. **Configure Stripe test keys on Railway staging** (user action)
2. **Wait for staging deploy of `928ac9f`** (includes top-up fix)
3. Run staging E2E: top-up → webhook → history → checkout → promotion → payout
4. Capture staging screenshots (`financial-e2e-*.png`)
5. Enable ranking advisory flag for visual review

---

## Honest status matrix

```text
Code ready:              ✅
Runtime provider ready:    ❌
E2E payment passed:        ❌
FINANCIAL E2E: ACCEPTED:  ❌ (blocked on Stripe + staging transactions)
```
