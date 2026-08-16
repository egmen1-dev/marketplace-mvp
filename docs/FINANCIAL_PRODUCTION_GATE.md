# Financial Production Gate

**Epic:** MARKETPLACE-FINANCIAL-STAGING-RELEASE-003  
**Initial reliability PR:** #69 (merged → `4489a5a`)  
**Gate PR:** #70 (merged → `5a72a0e`)  
**Staging deploy fix:** `6e9115e` on `origin/main`

---

## Initial result (RELIABILITY-001)

**NOT READY FOR FINANCIAL PRODUCTION**

Blockers: schema drift, invariants script, staging not redeployed, STRESS_OPS=1000 not run.

---

## Final retest (GATE-002, pre-deploy)

**NOT READY FOR FINANCIAL PRODUCTION**

Blockers: staging SHA mismatch (`7ec975f` vs `4489a5a`).

---

## STAGING FINAL RETEST (RELEASE-003)

# NOT READY FOR FINANCIAL PRODUCTION

**Primary remaining blocker:** real Stripe top-up E2E did not complete payment on staging — Stripe Checkout session creates successfully, but test payment cannot finish because card/Link payment methods are not activated in the Stripe Dashboard for this test account.

---

## Gate Table

| Gate | Result |
|------|--------|
| Current staging SHA | **PASS** — `6e9115e` = `origin/main` |
| Prisma synchronized | **PASS** — `Database schema is up to date` (50 migrations) |
| Finance schema reconciled | **PASS** — see `docs/FINANCE_SCHEMA_RECONCILIATION_002.md` |
| Invariants | **PASS** — `ok: true`, 0 issues |
| Reconciliation | **PASS** — `issues: []` |
| Stripe top-up | **FAIL** — checkout created; payment blocked by Stripe Dashboard payment-method config |
| Duplicate webhook | **PASS** — unit + staging rejects invalid sig; 10× replay unit PASS |
| Wallet checkout | **PASS** — staging Playwright + unit tests |
| Atomic failure rollback | **PASS** — `tests/financial-chaos.test.ts` |
| Seller hold | **PASS** — unit + finance-fixture API |
| Seller release | **PASS** — unit lifecycle |
| Promotion wallet payment | **PASS** — staging Playwright + unit |
| Promotion failure rollback | **PASS** — chaos / unit |
| Payout reserve | **PASS** — `tests/seller-payout.test.ts` |
| Payout reject | **PASS** — unit integration |
| Payout complete | **PASS** — unit integration |
| Top-up withdrawal protection | **PASS** — `tests/wallet-fund-origin.test.ts` |
| Bonus withdrawal protection | **PASS** — bucket rules + unit |
| Concurrent wallet debit | **PASS** — `tests/wallet-concurrency.test.ts` |
| Concurrent payout | **PASS** — unit reserve limits |
| 1000-op staging stress | **PASS** — 1000 ops, 190 duplicates, 0 failures, ~116s |
| Post-stress invariants | **PASS** — `ok: true` |
| Open CRITICAL incidents | **PASS** — 0 |

---

## Deploy evidence

| | SHA / time |
|--|-----|
| PR #70 merge | `5a72a0e` |
| Build-fix deploy | `6e9115e` |
| Staging before deploy | `7ec975f` |
| Staging after deploy | `6e9115e` (`2026-08-15T14:25:09Z`) |

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version
# {"environment":"staging","commit":"6e9115e",...}
```

`/api/health`: database, auth, storage, cron, stripe — all `ok: true`, `stripe.configured: true`.

---

## Staging Playwright (2026-08-15, post-deploy)

| Test | Result |
|------|--------|
| staging-version | PASS |
| payout-staging | PASS |
| promotion-wallet-staging | PASS |
| wallet-checkout-staging | PASS |
| wallet-topup-staging | PASS |
| ranking-advisory-staging | PASS (admin test skipped — no admin session) |

---

## Stress gate metrics (staging DB)

```json
{
  "totalOperations": 1000,
  "parallelUsers": 10,
  "opsPerUser": 100,
  "successes": 1000,
  "duplicates": 190,
  "unexpectedFailures": 0,
  "runtimeMs": 115975
}
```

---

## PAYMENT PROVIDER READINESS

| Provider capability | Status |
|---|---|
| Stripe technical integration | **PASS** (session creation, webhook security, health) |
| Stripe test payment completion | **FAIL** (Dashboard payment methods not activated) |
| LOT Wallet architecture | **PASS** |
| Russian cards | **NOT COVERED** |
| MIR | **NOT COVERED** |
| SBP | **NOT COVERED** |
| Russian production acquiring | **NOT COVERED** |

---

## Commercial verdict (separate)

| | |
|---|---|
| **FINANCIAL CORE** | **NOT READY** (Stripe real-money E2E incomplete on staging) |
| **RUSSIAN COMMERCIAL PAYMENT PROVIDER** | **NOT READY** |

Next payment epic: **RUSSIAN-PAYMENT-PROVIDER-001** (YooKassa / T-Bank / CloudPayments / SBP — decision pending).

---

## Commands

```bash
npx prisma migrate status
npm run finance:invariants
npm run finance:reconcile
npm run finance:stress-gate
PLAYWRIGHT_BASE_URL=https://web-production-e56fb.up.railway.app npx playwright test tests/e2e/*staging*
tsx scripts/seed-financial-investor-demo.ts
```

---

## READY checklist

- [x] main == staging SHA
- [x] migrations current
- [x] schema drift = 0
- [x] invariants PASS
- [x] reconciliation PASS
- [ ] Stripe top-up real E2E PASS (payment completion)
- [x] duplicate webhook PASS
- [x] wallet checkout PASS
- [x] orphan debit impossible (chaos + engine)
- [x] forced failure rollback PASS
- [x] seller hold/release PASS
- [x] promotion wallet PASS
- [x] payout full lifecycle PASS (unit; staging UI withdraw tab PASS)
- [x] top-up cannot withdraw
- [x] bonus cannot withdraw
- [x] concurrent spend safe
- [x] concurrent payout safe
- [x] staging STRESS_OPS=1000 PASS
- [x] post-stress reconciliation clean
- [x] open CRITICAL incidents = 0

**Verdict changes to READY FOR FINANCIAL PRODUCTION only when Stripe test payment completes end-to-end on staging.**
