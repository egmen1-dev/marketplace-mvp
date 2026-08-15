# Financial Production Gate

**Epic:** MARKETPLACE-FINANCIAL-PRODUCTION-GATE-002  
**Initial reliability PR:** #69 (merged → `4489a5a`)  
**Gate branch:** `cursor/marketplace-financial-production-gate-002-d03e`

---

## Initial result (RELIABILITY-001)

**NOT READY FOR FINANCIAL PRODUCTION**

Blockers: schema drift, invariants script, staging not redeployed, STRESS_OPS=1000 not run.

---

## Final retest (GATE-002)

# NOT READY FOR FINANCIAL PRODUCTION

---

## Gate Table

| Проверка | PASS | FAIL |
|----------|------|------|
| Wallet | ✓ | |
| Stripe | ✓ | |
| Webhook | ✓ | |
| Ledger | ✓ | |
| Checkout | ✓ | |
| Promotion | ✓ | |
| Seller Balance | ✓ | |
| Withdraw | ✓ | |
| Refund | ✓ | |
| Incident Engine | ✓ | |
| Stress Test | ✓ | |
| Chaos Test | ✓ | |
| Reconciliation | ✓ | |
| Security | ✓ | |
| **Staging deploy current** | | ✓ |
| **Staging E2E full matrix** | | ✓ |

---

## Resolved in GATE-002

| Blocker | Resolution |
|---------|------------|
| `SellerProfile.balance` | Column never existed; invariants used invalid `seller.balance` relation → fixed to `sellerBalance` / reconciliation engine |
| `finance_transactions.type` | **Variant A:** restored `FinanceTransactionType` in Prisma; `createTransaction` sets `SALE` |
| Invariants script | Rewritten as `scripts/check-financial-invariants.ts` using `runFinancialReconciliation()` |
| STRESS_OPS=1000 | `npm run finance:stress-gate` — **1000 ops, 10 parallel workers, 190 duplicates, 0 failures, ~118s** |
| React #310 payout | Middleware edge redirect `/account/balance` → wallet; payout panel uses withdrawable amount |
| Open CRITICAL incidents | Test incidents resolved; post-gate count = 0 |

---

## Evidence (local / staging DB)

```bash
npm test                          # 480 passed, 1 skipped
npm run finance:invariants        # ok: true
npm run finance:reconcile         # issues: []
npm run finance:stress-gate       # 1000 ops PASS
```

---

## Remaining blockers

### 1. Staging deploy SHA mismatch

| | SHA |
|--|-----|
| `origin/main` | `4489a5a` |
| Staging `/api/version` | `7ec975f` (pre-reliability) |

Until Railway `web-v2` deploys `4489a5a` + GATE-002, staging acceptance cannot pass.

### 2. Staging E2E (2026-08-15 run)

| Test | Result |
|------|--------|
| payout-staging (withdraw tab) | PASS |
| wallet-topup-staging | FAIL — wallet UI not on old deploy |
| wallet-checkout-staging | FAIL — wallet fixture UI not on old deploy |

---

## PAYMENT PROVIDER READINESS

| Check | Status |
|-------|--------|
| Stripe technical integration | **PASS** (staging `/api/health` → configured) |
| Russian payment acceptance (YooKassa, T-Bank, SBP, etc.) | **NOT COVERED** |

See `docs/FINANCE_SCHEMA_RECONCILIATION_002.md` → Future Russian Payment Provider Integration.

---

## Commands

```bash
npx prisma migrate deploy
npm run finance:invariants
npm run finance:reconcile
npm run finance:stress-gate
PLAYWRIGHT_BASE_URL=https://web-production-e56fb.up.railway.app npx playwright test tests/e2e/*staging*
```

---

## READY checklist (all required)

- [x] schema drift resolved (Prisma ↔ PostgreSQL)
- [x] invariants PASS
- [x] reconciliation engine PASS
- [x] STRESS_OPS=1000 PASS
- [x] chaos PASS
- [x] open CRITICAL incidents = 0
- [ ] staging SHA = main
- [ ] full staging E2E matrix PASS after deploy

**Verdict changes to READY FOR FINANCIAL PRODUCTION only when staging deploy + E2E complete.**
