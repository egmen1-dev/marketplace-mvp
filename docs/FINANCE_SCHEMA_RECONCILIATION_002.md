# Finance Schema Reconciliation 002

**Epic:** MARKETPLACE-FINANCIAL-PRODUCTION-GATE-002  
**Date:** 2026-08-15  
**Database:** Railway staging PostgreSQL (`zephyr.proxy.rlwy.net`)

Method: live `information_schema` + `pg_*` queries compared to `prisma/schema.prisma` after migration `20260815150000_finance_schema_reconcile_002`.

---

## Decision Summary

| Issue | Resolution |
|-------|------------|
| `SellerProfile.balance` | **No DB column exists.** Blocker was invalid Prisma query `seller.balance` in invariants script → fixed to `sellerBalance`. |
| `finance_transactions.type NOT NULL` | **Variant A:** restored in Prisma as `FinanceTransactionType` enum; runtime sets `SALE` on create. |
| `finance_transactions.currency`, `commissionBps` | Restored in Prisma (legacy columns already in DB). |
| `orderId @unique` in Prisma vs DB | DB uses `@@unique([orderId, sellerId, type])`. Prisma aligned; Order relation changed to `financeTransactions[]`. |
| `buyerId NOT NULL` in Prisma vs nullable in DB | Migration ensures nullable; Prisma field optional. |

---

## Canonical Architecture (Source of Truth)

```text
Order / Stripe / Wallet action
        ↓
Financial Transaction Engine (validate → lock → execute → verify → commit → audit)
        ↓
Append-only ledgers (WalletLedgerEntry, FinanceTransaction, PayoutRequest lifecycle)
        ↓
Projections (UserWallet buckets, SellerBalance pending/available/reserved/paid)
```

**SOURCE OF TRUTH**

- `wallet_ledger_entries` — every wallet credit/debit with idempotency key  
- `finance_transactions` — seller proceeds per order (`type=SALE`)  
- `payout_requests` + `seller_balances.reservedForPayoutAmount` — payout obligations  
- `financial_audit_logs` — engine phase audit trail  

**PROJECTIONS (must equal ledger sums)**

- `user_wallets.topupSpendableAmount + bonusSpendableAmount` = Σ ledger `spendableDelta`  
- `seller_balances.availableAmount - reservedForPayoutAmount` = withdrawable seller proceeds  
- Order `payment.status=SUCCEEDED` ↔ wallet/Stripe settlement row  

---

## Table Reconciliation

| Table/column | Prisma | Staging DB | Expected | Action |
|---|---|---|---|---|
| `seller_profiles.balance` | absent | absent | absent | Fixed invariants script (was querying non-existent relation `balance`) |
| `seller_balances.*` | `SellerBalance` model | present | canonical seller projection | **Keep** — source of withdrawable proceeds |
| `finance_transactions.type` | `FinanceTransactionType @default(SALE)` | `NOT NULL` enum | required on insert | **Variant A** — Prisma restored; `createTransaction` sets `SALE` |
| `finance_transactions.currency` | `@default("RUB")` | `NOT NULL default RUB` | required | Restored in Prisma |
| `finance_transactions.commissionBps` | `@default(1000)` | `NOT NULL default 1000` | required | Restored in Prisma |
| `finance_transactions.buyerId` | `String?` | nullable | optional legacy | Migration `DROP NOT NULL` (no-op if already nullable) |
| `finance_transactions.orderId` unique | `@@unique([orderId,sellerId,type])` | composite unique index | one SALE row per order/seller | Aligned Prisma + queries use `findFirst` |
| `orders.financeTransaction` | `financeTransactions[]` | 1:N capable | multiple types possible | Changed from 1:1 optional |
| `user_wallets.*` | present | present | wallet projection | Verified via reconciliation |
| `wallet_ledger_entries.idempotencyKey` | unique | unique index | idempotency | Verified — 0 duplicates at audit |
| `financial_audit_logs` | present | present | audit trail | Migration `20260815140000` applied |
| `financial_incidents` | present | present | incident center | Migration applied |

---

## Data Audit (2026-08-15)

```sql
SELECT DISTINCT type, COUNT(*) FROM finance_transactions GROUP BY type;
-- 0 rows (empty table)

SELECT column_name FROM information_schema.columns
WHERE table_name='seller_profiles' AND column_name='balance';
-- 0 rows (column does not exist)
```

---

## Future Russian Payment Provider Integration (document only)

| Layer | Provider-specific today | Generic / replaceable |
|-------|----------------------|------------------------|
| Top-up checkout | Stripe Checkout session + webhook | Wallet ledger credit via `executeFinancialTransaction(WALLET_TOP_UP)` |
| Order card pay | Stripe session/intent metadata | `finalizePaidOrderInTx` + finance sync |
| Webhook security | Stripe signature verification | Idempotency store (`stripe_webhook_events`) + audit log |
| Payout | Manual admin queue (no Stripe Connect) | `PayoutRequest` lifecycle + `SellerBalance` reserve |

**To add YooKassa / T-Bank / CloudPayments / SBP:** implement new checkout + webhook adapters that call the same engine operations; replace Stripe-specific env vars and `features/payments/webhook.ts` routing — do not duplicate ledger logic.

---

## PAYMENT PROVIDER READINESS

| Check | Status |
|-------|--------|
| Stripe technical integration | PASS (configured on staging `/api/health`) |
| Russian payment acceptance | **NOT COVERED** by this gate |
