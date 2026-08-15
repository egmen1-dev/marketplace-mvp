# Marketplace Financial Acceptance

**Epic:** MARKETPLACE-FINANCIAL-E2E-001  
**Date:** 2026-08-15  
**Staging:** https://web-production-e56fb.up.railway.app  
**Deployed SHA (staging):** `7ec975f`  
**Acceptance branch:** `cursor/marketplace-financial-e2e-001-d03e` (fixes + tests, **not yet on staging**)

---

## Executive verdict

**NOT READY FOR FINANCIAL PRODUCTION**

Stripe runtime на staging настроен и **Этап 1 (top-up) проходит реально**.  
Критический дефект обнаружен на **Этапе 2 (оплата заказа кошельком)**: списание и финализация заказа не атомарны на текущем `main` — исправление в ветке acceptance, требуется деплой.

---

## Environment

| Check | Result |
|-------|--------|
| `/api/health` → `stripe.configured` | ✅ `true` |
| `LOT_WALLET_ENABLED` | ✅ |
| `SELLER_PAYOUT_ENABLED` | ✅ |
| `E2E_FIXTURE_SECRET` | ✅ |
| Demo users | `buyer@demo.lot`, `seller@demo.lot`, `admin@demo.lot` / `demo1234` |

---

## Results by stage

| Блок | Статус | PASS/FAIL | Evidence |
|------|--------|-----------|----------|
| **1. Stripe top-up** | Реальный Checkout + webhook + баланс + история | **PASS** | Playwright `1.1–1.3` green; `topupSpendableAmount` +10 000 ₽ после `4242` карты |
| **2. Buyer wallet checkout** | Оплата заказа кошельком | **FAIL** | Списание 4 840 ₽ без смены статуса заказа (остаётся «Новый»). Fix: atomic debit+finalize в PR |
| **2a.** Достаточно средств | UI + server | **FAIL** | Зависит от 2 (orphan debit на staging) |
| **2b.** Недостаточно средств | Кнопка disabled | **PASS** | Playwright pattern (unit + UI guard) |
| **2c.** Двойная оплата | Повтор по тому же orderId | **NOT RUN** | Blocked on 2 |
| **3. Seller ledger HELD→AVAILABLE** | pending → available после COMPLETED | **NOT RUN** | Blocked on 2 |
| **4. Promotion wallet** | Реальная покупка STARTER | **NOT RUN** | UI smoke PASS; purchase E2E blocked on deploy |
| **4a.** Недостаток средств | toast error | **NOT RUN** | — |
| **5. Payout lifecycle** | REQUESTED→APPROVED→COMPLETED | **FAIL** | `seller-payout.spec.ts`: React #310 на `/account/balance` |
| **6. Security** | Webhook hardening | **PARTIAL** | Invalid sig ✅; wrong metadata ✅; duplicate replay → HTTP 500 (needs fix/retest) |
| **7. Reconciliation** | Σ ledger = balances | **NOT RUN** | DB script needs deploy + `railway run` from service network |
| **8. Admin** | `/admin/wallet`, payouts, payments | **PASS** | Playwright `8.1` green |
| **9. Demo data** | Investor seed users | **NOT RUN** | `seed-financial-demo-data.ts` added; `railway run` DB unreachable from agent VM |
| **10. Report** | This document | **PASS** | — |

---

## Stage 1 — Stripe top-up (PASS)

Real E2E on staging (`tests/e2e/financial-acceptance-staging.spec.ts`):

| Check | Result |
|-------|--------|
| Checkout session created | ✅ Redirect to `checkout.stripe.com` |
| Test card 4242… | ✅ |
| Return URL `topup=success` | ✅ |
| Webhook credits balance | ✅ `topupSpendableAmount` +10 000 ₽ (poll 60s) |
| History UI | ✅ «Пополнение» in `/account/wallet?tab=history` |
| Idempotency (code) | ✅ `topup:session:{id}` + unit tests |
| Duplicate webhook (live) | ⚠️ HTTP 500 on synthetic replay — retest after deploy |

---

## Stage 2 — Buyer wallet (FAIL → fix in branch)

### Symptom (staging `7ec975f`)

1. Buyer with 10 000 ₽ wallet pays checkout ~4 840 ₽.
2. `topupSpendableAmount` becomes 5 160 ₽ (−4 840).
3. Order stays **`NEW`** («Новый») in `/account/orders`.
4. Checkout UI: cart empty, no redirect to order detail.

### Root cause

`payOrderWithLotWallet` debits wallet in **separate** transaction from `finalizePaidOrderInTx`. If finalize fails, wallet is debited but order unpaid.

### Fix (branch `cursor/marketplace-financial-e2e-001-d03e`)

- `payInternalProductWithFinalize()` — single DB transaction: ledger debit + order finalize.
- Files: `lib/lot-wallet/payment.ts`, `lib/lot-wallet/pay-order.ts`

### Re-test after deploy

```bash
export BASE_URL=https://web-production-e56fb.up.railway.app
export PLAYWRIGHT_BASE_URL=$BASE_URL
export E2E_FIXTURE_SECRET=...
export SELLER_PAYOUT_ENABLED=true
npx playwright test tests/e2e/financial-acceptance-staging.spec.ts -c playwright.railway.config.ts
```

Expected: **PASS** on tests 2.1–2.3, then stages 3–5 unblocked.

---

## Stage 5 — Payout (FAIL)

`seller-payout.spec.ts` fails on `/account/balance` with **React error #310** (hooks mismatch). Payout flow not completed on staging in this run.

---

## Stage 6 — Security (partial)

Script: `node scripts/financial-security-staging.mjs`

| Test | Result |
|------|--------|
| Invalid Stripe signature | ✅ HTTP 400 |
| Wrong metadata | ✅ HTTP 200, no wallet credit |
| Negative amount | ✅ HTTP 500, rejected |
| Duplicate event replay | ❌ HTTP 500/500 — retest with real session + deploy |

---

## Stage 8 — Admin (PASS)

`/admin/wallet`, `/admin/payouts`, `/admin/payments` — headings load, aggregates visible.

---

## Demo data (prepared, not seeded on staging)

Script: `scripts/seed-financial-demo-data.ts`

| Email | Role | Wallet top-up | Seller available |
|-------|------|---------------|------------------|
| `investor-buyer-a@demo.lot` | Buyer | 12 000 ₽ | — |
| `investor-buyer-b@demo.lot` | Buyer | 8 500 ₽ | — |
| `investor-seller-a@demo.lot` | Seller | 3 000 ₽ | 18 000 ₽ |
| `investor-seller-b@demo.lot` | Seller | 1 500 ₽ | 9 500 ₽ |

Password: `demo1234`. Run on Railway service:  
`railway run --service web-v2 -- npx tsx scripts/seed-financial-demo-data.ts`

---

## Tooling added

| Artifact | Purpose |
|----------|---------|
| `tests/e2e/financial-acceptance-staging.spec.ts` | Full staging acceptance (serial) |
| `tests/e2e/helpers/financial-stripe.ts` | Stripe Checkout test card helper |
| `tests/e2e/helpers/financial-fixture.ts` | Wallet fixture read/seed |
| `scripts/financial-security-staging.mjs` | Webhook security probes |
| `scripts/run-financial-reconciliation-staging.mjs` | Reconciliation runner |
| `scripts/seed-financial-demo-data.ts` | Investor demo seed |
| `GET /api/e2e/wallet-fixture` | Read-only wallet snapshot (deploy with branch) |

---

## Summary table (requested format)

| Блок | Статус | PASS/FAIL |
|------|--------|-----------|
| 1 Stripe top-up | Real money path works | **PASS** |
| 2 Buyer wallet | Orphan debit on staging | **FAIL** (fix ready) |
| 3 Seller ledger | Not run | **NOT RUN** |
| 4 Promotion | Not run (UI smoke only) | **NOT RUN** |
| 5 Withdraw | React error on balance | **FAIL** |
| 6 Security | Partial | **PARTIAL** |
| 7 Reconciliation | Not run | **NOT RUN** |
| 8 Admin | Dashboards load | **PASS** |
| 9 Demo data | Script only | **NOT RUN** |
| 10 Report | Complete | **PASS** |

### Overall

## **NOT READY FOR FINANCIAL PRODUCTION**

**Unblock checklist:**

1. Merge & deploy `cursor/marketplace-financial-e2e-001-d03e` (atomic wallet checkout fix).
2. Re-run full `financial-acceptance-staging.spec.ts` on staging.
3. Fix React #310 on `/account/balance` (payout E2E).
4. Retest webhook duplicate handling (target HTTP 200 + `duplicate: true`).
5. Run `npm run finance:invariants` + reconciliation on staging DB.
6. Seed investor demo data via `railway run`.

---

## Commands reference

```bash
# Health
curl -sS https://web-production-e56fb.up.railway.app/api/health | jq '.checks.stripe'

# Full acceptance (after deploy)
npx playwright test tests/e2e/financial-acceptance-staging.spec.ts -c playwright.railway.config.ts

# Security
BASE_URL=https://web-production-e56fb.up.railway.app STRIPE_WEBHOOK_SECRET=whsec_... node scripts/financial-security-staging.mjs

# Reconciliation (on Railway)
railway run --service web-v2 -- node scripts/run-financial-reconciliation-staging.mjs
```
