# Marketplace Integration Validation — Staging Acceptance

**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001  
**Date:** 2026-08-15  
**Staging URL:** https://web-production-e56fb.up.railway.app

---

## Deploy status at acceptance time

| Step | Status | Notes |
|------|--------|-------|
| Merge to main | ⏳ | PR #61 / #62 / integration branch pending |
| Railway deploy | ⏳ | Staging on `b556424` |
| `/api/version` | ✅ reachable | matches main |
| Migrations | ✅ | wallet + ranking migrations applied on staging DB |
| Flags | ⏳ | `LOT_WALLET_ENABLED`, ranking flag not verified live |
| Seed / demo | ⚠️ | partial demo sellers |
| Visual acceptance | ⏳ | blocked until deploy |
| E2E | ⏳ | blocked until deploy |

---

## Final acceptance criteria

### Account

| Requirement | Status |
|-------------|--------|
| Profile/Settings duplication removed | ✅ code |
| `/account` is overview only | ✅ code |
| Settings fields inline | ✅ code |
| Password hidden by default | ✅ code |
| Eye toggle works | ✅ code |
| Notification settings inline | ✅ code |

### Wallet

| Requirement | Status |
|-------------|--------|
| One LOT Wallet | ✅ code |
| Balance/Payout duplication removed | ✅ redirect |
| Top-up works | ⚠️ Stripe E2E pending |
| Buyer wallet checkout works | ✅ code |
| Seller proceeds spendable | ✅ buckets |
| Seller proceeds withdrawable | ✅ buckets |
| Promotion wallet payment works | ✅ code |
| Top-up funds not withdrawable | ✅ tested |
| Bonuses not withdrawable | ✅ tested |
| Held funds unavailable | ✅ tested |
| History complete | ✅ ledger |
| Ledger idempotent | ✅ keys |

### Promotion

| Requirement | Status |
|-------------|--------|
| Seller sees «Продвижение» | ✅ unified nav |
| Promotion Center one click away | ✅ |
| Real campaign data visible | ⚠️ ledger-only campaigns |
| Wallet payment visible | ✅ code |

### Ranking Lab

| Requirement | Status |
|-------------|--------|
| 100 controlled products | ✅ |
| Factor matrices tested | ✅ |
| Negative controls | ✅ |
| Bad products cannot buy TOP | ✅ |
| Product reports generated | ✅ artifacts |
| Influence table generated | ✅ |
| Algorithm versioned | ✅ |
| Weights configurable | ✅ admin |
| Ranking remains advisory | ✅ |

---

## Post-deploy smoke (to run after merge)

```text
1. LOT_WALLET_ENABLED=true
2. Login seller@demo.lot / buyer demo
3. /account/wallet — tabs render
4. /account/settings — inline save
5. /account/promotion-center — visible
6. MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true
7. /account/ranking + /admin/ranking — advisory only
8. Catalog sort unchanged (manual spot check)
9. Wallet top-up → Stripe → webhook → history entry
10. Checkout → pay with wallet
```

---

## Automated test evidence (local)

```text
npm test tests/wallet.test.ts
npm test tests/wallet-topup.test.ts
npm test tests/ranking-100-products.test.ts
npm test tests/marketplace-ranking-intelligence.test.ts
npm run ranking:lab:100
```

All passing on integration branch at commit time.

---

## Blockers before ACCEPTED

1. Merge + deploy integration branch (or #61 → #62 sequence)
2. Enable flags on Railway
3. Stripe wallet top-up E2E on staging
4. Visual screenshots post-deploy
5. Activation gate manual sign-off (ranking live still blocked)
