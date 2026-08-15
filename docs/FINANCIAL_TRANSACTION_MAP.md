# Financial Transaction Map

Atomic money flows for the LOT marketplace financial core. Every path below runs inside a **single DB transaction** via `executeFinancialTransaction()` (`lib/financial-transaction-engine/`).

Pipeline: **Validate → Lock → Execute → Verify → Commit → Audit**

Post-commit invariants checked inside the same transaction (failure = rollback + CRITICAL incident).

---

## 1. Wallet Top-Up (Stripe → Wallet)

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Validate | `creditWalletTopUpFromCheckoutSession` | `purpose=wallet_top_up`, amount > 0 |
| Lock | `userWallet` row | per userId |
| Execute | Ledger CREDIT + `topupSpendableAmount` increment | idempotency `topup:session:{sessionId}` |
| Verify | `verifyWalletLedgerMatchesBalanceInTx` | Σ ledger spendable = topup + bonus |
| Webhook | `handleStripeWebhook` → engine | Stripe event idempotency |

```
Stripe checkout.session.completed
  → creditWalletTopUpFromCheckoutSession()
    → executeFinancialTransaction(WALLET_TOP_UP)
      → appendWalletLedgerEntry(BUYER_TOP_UP)
      → userWallet.topupSpendableAmount += amount
      → verifyWalletLedgerMatchesBalanceInTx
```

---

## 2. Wallet Checkout (Wallet → Order)

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Validate | `payOrderWithLotWallet` | order NEW, spendable ≥ total |
| Lock | `userWallet` + `order` | per userId + orderId |
| Execute | Debit wallet + `finalizePaidOrderInTx` | idempotency `order:wallet:{orderId}` |
| Verify | `verifyWalletOrderPaidInTx` | order ≠ NEW, payment SUCCEEDED, ledger debit |
| Finance sync | `syncFinanceOnPaymentInTx` (same payment tx) | createTransaction → markPaid → holdFundsInTx |

```
payOrderWithLotWallet()
  → payInternalProductWithFinalize(WALLET_CHECKOUT)
    → payInternalProductInTx (PRODUCT_PURCHASE debit)
    → finalizePaidOrderInTx (order paid, stock, payment row)
    → verifyWalletOrderPaidInTx
```

**Critical fix:** debit and order finalization MUST NOT be split across transactions.

---

## 3. Promotion Payment

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Validate | promotion billing action | spendable ≥ campaign cost |
| Lock | `userWallet` | per userId |
| Execute | `payInternalProduct(PROMOTION_PAYMENT)` | PROMOTION_PURCHASE ledger |
| Verify | `verifyWalletLedgerMatchesBalanceInTx` | wallet = ledger |

```
promotion purchase
  → payInternalProduct(productType=PROMOTION)
    → executeFinancialTransaction(PROMOTION_PAYMENT)
```

---

## 4. Seller Ledger (Hold on Payment)

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Trigger | `syncFinanceOnPaymentInTx` | inside payment finalize tx |
| Execute | `createTransaction` → `markPaid` → `holdFundsInTx` | finance transaction row |
| Standalone | `holdFunds()` | engine wrap when not nested |
| Verify | `verifySellerBalanceNonNegativeInTx` | pending/available/reserved ≥ 0 |

```
payment success
  → createTransaction(orderId)
  → markPaid(transactionId)
  → holdFundsInTx → addPendingBalance(seller)
```

---

## 5. Release Funds (Order COMPLETED)

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Trigger | `syncFinanceOnOrderCompleted` | per orderId |
| Execute | `releaseFunds()` → `releaseFundsInTx` | HELD → RELEASED |
| Verify | `verifySellerBalanceNonNegativeInTx` | seller buckets |

```
order COMPLETED
  → releaseFunds(transactionId)
    → releasePendingToAvailable(seller)
```

---

## 6. Payout (Withdraw Request)

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Validate | `createPayoutRequest` | amount ≤ available |
| Lock | `sellerBalance` | per sellerId |
| Execute | `reserveAvailableForPayout` + `payoutRequest.create` | PAYOUT_RESERVE |
| Verify | `verifySellerBalanceNonNegativeInTx` | no negative buckets |
| Complete | admin lifecycle | PAYOUT_COMPLETE (separate op) |

---

## 7. Refund

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Execute | `refundTransaction()` | HELD or RELEASED → REFUNDED |
| Verify | `verifySellerBalanceNonNegativeInTx` | reverse pending/available |

---

## 8. Stripe Order Pay (Card Checkout)

| Step | Component | Transaction boundary |
|------|-----------|-------------------|
| Webhook idempotency | `StripeWebhookEvent` | PROCESSED → duplicate/ignored |
| Security | signature, metadata, amount | audit log per phase |
| Settle | `markOrderPaidFromCheckoutSession` | order + finance in payment tx |

---

## Incident & Reconciliation

| Mechanism | Path |
|-----------|------|
| Verification failure | `FinancialVerificationError` → CRITICAL incident |
| Reconciliation drift | `runReconciliationEngine()` → incident by severity |
| Admin UI | `/admin/financial-incidents` |

---

## Invariant Summary

| Check | Formula |
|-------|---------|
| Wallet | `topup + bonus` = Σ ledger `spendableDelta` |
| Seller | `pending`, `available`, `reserved` ≥ 0 |
| Paid wallet order | order status ≠ NEW, payment SUCCEEDED, PRODUCT_PURCHASE ledger |
| Reconciliation | Σ wallet ledger = balance; Σ seller ledger = seller balance |
