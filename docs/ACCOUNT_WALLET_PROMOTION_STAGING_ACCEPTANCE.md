# Account, Wallet & Promotion — Staging Acceptance

**Epic:** MARKETPLACE-ACCOUNT-WALLET-PROMOTION-UNIFICATION-001  
**Date:** 2026-08-15  
**Environment:** Railway staging — `https://web-production-e56fb.up.railway.app`

---

## Deploy checklist

| Step | Status |
|------|--------|
| Code merged / pushed | Pending PR |
| `npx prisma migrate deploy` (migration `20260815100000_lot_wallet_foundation`) | Required on staging |
| `LOT_WALLET_ENABLED=true` (default ON unless `false`) | Set on Railway |
| `SELLER_PROMOTION_CENTER_ENABLED=true` (default ON) | Set on Railway |
| Visual smoke | Pending post-deploy |

---

## Implemented surfaces

| Surface | Route | Status |
|---------|-------|--------|
| Unified account overview | `/account` | ✅ Wallet + business sections |
| Unified settings (inline) | `/account/settings` | ✅ Profile, password, notifications |
| Profile compatibility | `/profile` | ✅ Redirects to settings |
| LOT Wallet | `/account/wallet?tab=*` | ✅ Overview, topup stub, withdraw, history |
| Balance redirect | `/account/balance` | ✅ → wallet overview |
| Payouts redirect | `/account/payouts` | ✅ → wallet withdraw |
| Promotions redirect | `/account/promotions` | ✅ → promotion center |
| Promotion Center | `/account/promotion-center` | ✅ Metrics + product list + wallet pay |
| Admin wallet | `/admin/wallet` | ✅ Aggregate stats |
| Seller nav | sidebar | ✅ «Кошелёк», «Продвижение» (unified nav) |

---

## Finance rules verified (unit tests)

| Rule | Test |
|------|------|
| Seller available → withdrawable + spendable | `tests/wallet.test.ts` |
| Topup/bonus → spendable only | `tests/wallet.test.ts` |
| Cannot withdraw topup as payout | `tests/wallet.test.ts` |
| Promotion visible in nav | `tests/promotion-visibility.test.ts` |

---

## Known gaps (honest)

| ID | Severity | Gap |
|----|----------|-----|
| GAP-W-001 | MAJOR | Stripe `WALLET_TOP_UP` webhook not wired — topup UI gated |
| GAP-W-002 | MAJOR | Checkout «Оплатить кошельком» not fully wired in order flow |
| GAP-W-003 | INFO | Active sessions UI documented as GAP (JWT, no session registry) |
| GAP-W-004 | INFO | Promotion campaigns stored as ledger events only (no PromotionCampaign table yet) |
| GAP-W-005 | INFO | Card payment for promotion returns honest «скоро» message |

---

## Production gate

```text
READY FOR FULL COMMERCIAL WALLET LAUNCH: NO
READY FOR STAGING UX VALIDATION: YES (after migrate deploy)
```

Requires before commercial wallet:
- Stripe WALLET_TOP_UP idempotent webhook
- Checkout wallet debit path
- Staging E2E: topup → purchase → promotion → payout

---

## Verdict

```text
STAGING ACCEPTANCE: PENDING MIGRATION + VISUAL SMOKE
```

Code build: ✅ `npm run build`  
Unit tests: ✅ wallet + nav + routes
