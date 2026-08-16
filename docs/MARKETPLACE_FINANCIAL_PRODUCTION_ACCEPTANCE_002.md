# Marketplace Financial Production Acceptance 002

**Epic:** MARKETPLACE-FINANCIAL-STAGING-RELEASE-003  
**Date:** 2026-08-15  
**Environment:** Railway `web-v2` staging — `https://web-production-e56fb.up.railway.app`

---

## Verdict

# NOT READY FOR FINANCIAL PRODUCTION

**Primary reason:** Staging deploy is current (`6e9115e`), and automated financial gates pass, but **real Stripe test payment did not complete** — Checkout session creates, payment blocked by Stripe Dashboard payment-method activation for Card/Link on the test account.

---

## STAGING FINAL RETEST (RELEASE-003)

### Deploy / SHA

| Item | Value |
|------|-------|
| PR #70 SHA | `5a72a0e` |
| Build-fix + deploy SHA | `6e9115e` |
| Staging SHA before deploy | `7ec975f` |
| Staging SHA after deploy | `6e9115e` ✓ |

### Health / migrations

- `/api/health` — database, auth, storage, cron, **stripe configured** ✓
- `npx prisma migrate status` — **Database schema is up to date** (50 migrations) ✓
- Finance schema columns verified live (`type`, `currency`, `commissionBps`, audit/incident tables) ✓

### Automated gates (staging DB)

| Command | Result |
|---------|--------|
| `npm run finance:invariants` | **PASS** — `ok: true`, 0 issues |
| `npm run finance:reconcile` | **PASS** — `issues: []` |
| `npm run finance:stress-gate` | **PASS** — 1000 ops, 0 unexpected failures, ~116s |
| Post-stress invariants | **PASS** |
| `npm test` | **480 passed**, 1 skipped |

### Staging Playwright

8 passed, 1 skipped (`tests/e2e/*staging*` on Railway URL).

### Stripe top-up E2E (manual, 2026-08-15)

| Step | Result |
|------|--------|
| `/account/wallet?tab=topup` loads | **PASS** |
| Checkout session created | **PASS** — redirected to `checkout.stripe.com` |
| Test card payment | **FAIL** — Pay button stuck; Stripe.js warns Card/Link not activated in Dashboard |
| Webhook → BUYER_TOP_UP → ledger | **NOT RUN** (payment incomplete) |

### Investor demo

`tsx scripts/seed-financial-investor-demo.ts` — **PASS** (3 buyers, 3 sellers, tagged demo data).

### Reconciliation fix applied

Invariants previously failed on `seller@demo.lot` because seller proceeds in `SellerBalance` were compared against wallet-ledger totals. Fixed in `lib/financial/reconciliation.ts` to reconcile **topup+bonus ↔ ledger spendable** per `FINANCE_SCHEMA_RECONCILIATION_002.md`.

---

## Results Matrix (historical + staging)

| Area | Result | Evidence |
|------|--------|----------|
| Schema reconciliation | **PASS** | `docs/FINANCE_SCHEMA_RECONCILIATION_002.md`, migration `20260815150000` |
| Financial invariants | **PASS** | `npm run finance:invariants` → `ok: true`, 0 issues |
| Reconciliation engine | **PASS** | `npm run finance:reconcile` → `issues: []` |
| Stripe top-up (staging E2E) | **FAIL** | Checkout created; payment blocked by Stripe Dashboard config |
| Wallet checkout (staging E2E) | **PASS** | `tests/e2e/wallet-checkout-staging.spec.ts` |
| Seller hold/release (unit) | **PASS** | `tests/finance.test.ts` lifecycle |
| Promotion wallet (unit) | **PASS** | `tests/promotion-wallet-payment.test.ts` |
| Payout withdraw tab (staging E2E) | **PASS** | `tests/e2e/payout-staging.spec.ts` |
| Payout reserve/reject/complete (unit) | **PASS** | `tests/seller-payout.test.ts` |
| Webhook replay (unit) | **PASS** | `tests/stripe-webhook-idempotency.test.ts` (10× duplicate) |
| Concurrent spend (unit) | **PASS** | `tests/wallet-concurrency.test.ts` |
| Chaos tests | **PASS** | `tests/financial-chaos.test.ts` |
| **1000-op stress** | **PASS** | `npm run finance:stress-gate` — 1000 ops, 190 duplicates, 0 failures |
| Post-stress reconciliation | **PASS** | invariants after stress → `ok: true` |
| Financial incidents | **PASS** | open CRITICAL = 0 after cleanup |
| Admin cross-check | **NOT RUN** | requires staging deploy + demo seed on current build |
| Forced failure atomicity | **PASS** | chaos test — verify fail rolls back wallet + ledger |
| React #310 payout | **FIXED** | middleware wallet redirect + withdrawable validation (needs staging verify) |

---

## Stress Gate Metrics

```json
{
  "totalOperations": 1000,
  "parallelUsers": 10,
  "opsPerUser": 100,
  "successes": 1000,
  "duplicates": 190,
  "unexpectedFailures": 0,
  "runtimeMs": 118216
}
```

---

## Deploy Status (updated 2026-08-15)

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version
# {"commit":"6e9115e", ...}

git rev-parse origin/main
# 6e9115eaf16197fe27b02adcf38086126fa73454
```

Staging matches `main`. Remaining gate item: complete Stripe test payment on staging.

---

## Historical note (GATE-002 pre-deploy)

Previously staging ran `7ec975f` while main was ahead; wallet Playwright tests failed because wallet UI was absent on old deploy. Resolved by deploy `6e9115e`.

---

## PAYMENT PROVIDER READINESS

- Stripe technical integration: **PASS**
- Russian commercial payment acceptance: **NOT COVERED**

---

## Next steps to READY

1. Activate Card (and optionally Link) in Stripe Dashboard → https://dashboard.stripe.com/settings/payment_methods  
2. Re-run Stripe top-up E2E on staging (500 ₽ test payment → webhook → ledger → history)  
3. Confirm admin finance cross-check for one traced order  
4. Update gate docs to **READY FOR FINANCIAL PRODUCTION** only after step 2 PASS
