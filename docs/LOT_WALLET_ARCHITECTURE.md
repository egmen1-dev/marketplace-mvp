# LOT Wallet Architecture

**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001  
**Status:** Implemented on integration branch (PR #61 + validation)

---

## Principle

One user account → one **Кошелёк ЛОТ** projection over the finance ledger. Buyer top-ups, seller proceeds, bonuses, and internal spends share one UX but **separate buckets** with different spend/withdraw rules.

---

## Source of truth

```text
FinanceTransaction / SellerBalance (seller earnings)
        ↓
UserWallet + WalletLedgerEntry (user projection)
        ↓
/account/wallet UI buckets
```

No second parallel wallet system. All mutations go through `appendWalletLedgerEntry()` with idempotency keys.

---

## Ledger entry types

| Type | Direction | Spendable | Withdrawable |
|------|-----------|:---------:|:------------:|
| `SELLER_SALE` | CREDIT | yes | yes (after release) |
| `BUYER_TOP_UP` | CREDIT | yes | **no** |
| `BONUS_CREDIT` | CREDIT | yes | **no** |
| `PRODUCT_PURCHASE` | DEBIT | — | — |
| `PROMOTION_PURCHASE` | DEBIT | — | — |
| `INTERNAL_SERVICE_PURCHASE` | DEBIT | — | — |
| `REFUND` | CREDIT | policy-based | policy-based |
| `PAYOUT_REQUEST` | DEBIT (reserve) | — | — |
| `PAYOUT_COMPLETED` | — | — | — |
| `PAYOUT_REJECTED` | CREDIT (release) | — | — |

Held/pending seller funds are **not spendable** until released to `availableAmount`.

---

## Routes

| Route | Behavior |
|-------|----------|
| `/account/wallet` | Primary hub (tabs: overview, topup, withdraw, history, methods) |
| `/account/balance` | Redirect → wallet overview |
| `/account/payouts` | Redirect → wallet withdraw tab |

---

## Top-up flow

```text
User → startWalletTopUpAction
     → Stripe Checkout (metadata purpose=wallet_top_up)
     → webhook checkout.session.completed
     → creditWalletTopUpFromCheckoutSession (idempotent)
     → BUYER_TOP_UP ledger + topupSpendableAmount
```

No credit before signed webhook.

---

## Checkout pay with wallet

```text
createOrderFromCart → paymentMethod=wallet
                   → payOrderWithLotWallet
                   → PRODUCT_PURCHASE debit
                   → finalizePaidOrderInTx(source=lot_wallet)
```

Mixed card+wallet: **future** (documented, not MVP).

---

## Promotion pay

Uses `payInternalProduct` with `PROMOTION_PURCHASE` — campaign activates only after successful debit.

---

## Module map

| Path | Role |
|------|------|
| `lib/lot-wallet/buckets.ts` | Spendable / withdrawable computation |
| `lib/lot-wallet/queries.ts` | Ledger append, overview, history |
| `lib/lot-wallet/payment.ts` | Internal debits |
| `lib/lot-wallet/topup.ts` | Stripe checkout session |
| `lib/lot-wallet/credit-topup.ts` | Webhook credit |
| `lib/lot-wallet/pay-order.ts` | Order wallet settlement |
| `features/lot-wallet/components/lot-wallet-panel.tsx` | UI |

---

## Flag

`LOT_WALLET_ENABLED=true` — required for routes, nav unification, checkout wallet option.
