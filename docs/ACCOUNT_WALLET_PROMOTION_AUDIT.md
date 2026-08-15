# Account, Wallet & Promotion — Reality Audit

**Epic:** MARKETPLACE-ACCOUNT-WALLET-PROMOTION-UNIFICATION-001  
**Date:** 2026-08-15  
**Branch baseline:** `main` @ `b556424`  
**Staging:** `https://web-production-e56fb.up.railway.app`

---

## Summary

Before unification, the cabinet fragmented profile/settings/money/promotion across multiple routes and nav variants. Promotion Center existed as a **placeholder page** with nav links but **no domain module**. Finance used `lib/finance` + `SellerBalance` (seller-scoped); no user-level «Кошелёк ЛОТ».

---

## Surface matrix (pre-change)

| Surface | Code exists | Route exists | Nav exists | Flag | Visible staging |
|---------|:-----------:|:------------:|:----------:|------|-----------------|
| `/account` | ✅ | ✅ | ✅ «Главная» / «Мой магазин» | — | ✅ |
| `/profile` | ✅ | ✅ (not `/account/profile`) | ✅ «Мой профиль» (buyer) | — | ✅ duplicates settings |
| `/account/settings` | ✅ | ✅ | ✅ «Настройки» | `MARKETPLACE_UX_COMPLETION_ENABLED` | ✅ link-out UX |
| `/account/business` | ✅ | ✅ | ✅ «Мой бизнес» | seller stack flags | ✅ |
| `/account/balance` | ✅ | ✅ | ✅ «Баланс» / «Деньги» | — | ✅ seller-only |
| `/account/payouts` | ✅ | ✅ | ✅ separate «Вывод» (legacy nav) | `SELLER_PAYOUT_ENABLED` | ✅ |
| `/account/wallet` | ❌ | ❌ | ❌ | `LOT_WALLET_ENABLED` N/A | ❌ |
| `/account/promotion-center` | ⚠️ placeholder | ✅ | ✅ «Продвижение» (modern nav) | `SELLER_PROMOTION_CENTER_ENABLED` registered only | ⚠️ stub copy |
| `/account/promotions` | ❌ | ❌ | match-only | — | ❌ |
| Checkout wallet pay | ❌ | — | — | — | ❌ Stripe only |
| Admin wallet center | ❌ | — | — | — | ❌ `/admin/payouts` only |

---

## Domain layers

| Path | Status | Notes |
|------|--------|-------|
| `lib/finance/` | ✅ | `SellerBalance`, `FinanceTransaction`, order-linked ledger |
| `lib/seller-payout/` | ✅ | Manual payout workflow; `SELLER_PAYOUT_ENABLED` |
| `lib/promotion/` | ❌ | Not present |
| `lib/seller-promotion-center/` | ❌ | Registry expects PR #38 marker; missing |
| `lib/marketplace-ux-completion/` | ✅ | Account overview + settings link-out panels |
| `lib/seller-business-intelligence/` | ✅ | Promotion **insights** only; CTAs → placeholder |

---

## Why seller did not see «Продвижение»

| Cause | Detail |
|-------|--------|
| Legacy nav | When all seller-nav flags OFF → `LEGACY_SELLER_NAV` has **no** promotion link |
| Placeholder page | Route works but shows «скоро будет доступен» — feels broken |
| Flag not wired | `SELLER_PROMOTION_CENTER_ENABLED` in registry only; no runtime `flags.ts` |
| Wrong URL | `/account/promotions` does not exist |

On staging (Batch 2 flags ON): modern nav **includes** «Продвижение», but page content was still placeholder.

---

## Auth & sessions

| Aspect | Reality |
|--------|---------|
| Auth | Email + password (`Credentials` provider, bcrypt hash) |
| Passwordless | ❌ Not supported |
| Session | JWT (14 days), no DB session table |
| Active sessions UI | ❌ No backend — **GAP**, must not fake |

---

## Payment & checkout

| Aspect | Reality |
|--------|---------|
| Buyer checkout | Stripe Checkout Session |
| Wallet top-up | ❌ Not implemented |
| Wallet product pay | ❌ Not implemented |
| Payout methods | Seller withdrawal refs (card/SBP/bank) — manual admin |
| Stripe webhook | `checkout.session.completed`, `payment_intent.succeeded` |

---

## Prisma finance models (existing)

- `FinanceTransaction` — per order, seller settlement
- `SellerBalance` — pending / available / paid / reserved
- `PayoutRequest` — manual payout queue
- `Payment` — Stripe order payments
- `PromotionCampaign` — migration orphan, **not in schema**

---

## Unification plan (this epic)

1. Add `lib/lot-wallet/` + `UserWallet` / `WalletLedgerEntry` (user-scoped, buckets: spendable vs withdrawable)
2. Route `/account/wallet` with tabs; redirect `/account/balance` + `/account/payouts`
3. Unified seller nav: «Кошелёк» replaces «Баланс»+«Вывод»; «Продвижение» always visible for sellers
4. Inline settings at `/account/settings`; `/profile` → settings compatibility
5. Implement `lib/seller-promotion-center/` + real Promotion Center UI
6. Checkout + promotion purchase from wallet (gated by `LOT_WALLET_ENABLED`)
7. Admin `/admin/wallet` overview

---

## Post-implementation update

See `docs/ACCOUNT_WALLET_PROMOTION_STAGING_ACCEPTANCE.md` after deploy.
