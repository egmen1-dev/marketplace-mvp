# Marketplace Integration Validation — Reality Audit

**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001  
**Date:** 2026-08-15  
**Auditor branch:** `cursor/marketplace-integration-validation-001-d03e`

---

## Git references

| Ref | SHA | Notes |
|-----|-----|-------|
| `origin/main` | `b5564248540ef220738fd54e0b8c85a830998f5f` | Wallet/ranking **not merged** |
| Staging `/api/version` | `b556424` (same as main at audit time) | `/account/wallet` → 404 |
| PR #61 head | `75e464853d359bcec4c66c6c78c9a155313977b3` | Account + Wallet + Promotion — OPEN, MERGEABLE |
| PR #62 head | `c94af124ffc85bfc4ea8919beca0952fea50dc18` | Ranking Intelligence — OPEN, MERGEABLE |
| Integration branch | `c94af12` + uncommitted wallet/checkout/calibration | Superset of #61/#62 |

---

## Surface matrix

| Surface | Code | Main | Staging | Flag | Visible | Works |
|---------|:----:|:----:|:-------:|------|:-------:|:-----:|
| `/account` | ✅ | ✅ | ✅ | — | ✅ | ✅ overview |
| `/account/profile` | ✅ redirect | ✅ legacy | ✅ | — | ⚠️ duplicate nav removed on branch | ✅ → settings |
| `/account/settings` | ✅ inline | ⚠️ link-out UX | ⚠️ | `LOT_WALLET_ENABLED` / UX flags | ✅ | ✅ on branch |
| `/account/wallet` | ✅ | ❌ | ❌ | `LOT_WALLET_ENABLED` | ❌ staging | ✅ branch |
| `/account/balance` | ✅ redirect | ✅ | ✅ | — | ✅ legacy | ✅ → wallet tab |
| `/account/payouts` | ✅ redirect | ✅ | ✅ | `SELLER_PAYOUT_ENABLED` | ✅ | ✅ → wallet withdraw |
| `/account/business` | ✅ | ✅ | ✅ | seller stack | ✅ | ✅ |
| `/account/promotion-center` | ✅ | ✅ | ✅ | `SELLER_PROMOTION_CENTER_ENABLED` | ✅ | ⚠️ real summary on branch |
| `/account/promotions` | ✅ redirect | ❌ | ❌ | — | ❌ | ✅ branch |
| `/account/ranking` | ✅ | ❌ | ❌ | `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED` | ❌ | ✅ branch advisory |
| `/admin/wallet` | ❌ | ❌ | ❌ | — | ❌ | ❌ use `/admin/payouts` |
| `/admin/ranking` | ✅ | ❌ | ❌ | ranking flag | ❌ | ✅ branch |
| `/admin/system-flags` | ✅ | ✅ | ✅ | admin | ✅ | ✅ |
| Checkout wallet pay | ✅ branch | ❌ | ❌ | `LOT_WALLET_ENABLED` | ❌ | ✅ branch |
| Wallet top-up Stripe | ✅ branch | ❌ | ❌ | `LOT_WALLET_ENABLED` + Stripe | ❌ | ⚠️ needs webhook E2E |

---

## Findings

### Profile / Settings duplication

- **Main:** buyer nav still had «Мой профиль» separate from «Настройки».
- **Branch fix:** removed profile nav item; `/account/profile` redirects to `/account/settings?section=profile#profile`.

### Settings «Открыть» buttons

- **Main:** `MARKETPLACE_UX_COMPLETION` link-out panels.
- **Branch (`LOT_WALLET_ENABLED`):** unified inline panel — profile form, password, notification toggles.

### Password UX

- **Branch:** current + new + confirm fields; independent eye toggles; server verifies current password via bcrypt.

### Wallet visibility

- **Main:** no `/account/wallet`; seller sees «Баланс» / «Вывод» separately.
- **Branch:** single «Кошелёк» nav; ledger buckets; top-up form wired to `WALLET_TOP_UP` Stripe metadata.

### Promotion visibility

- Modern seller nav includes «Продвижение» when operating-desk/journey flags ON.
- **Branch:** promotion center shows wallet-pay path; unified nav always includes promotion when wallet flag ON.

### Ranking Intelligence

- **Not on main/staging.** PR #62 adds advisory layer only — live `resolveOrderBy()` unchanged.
- 100-product calibration lab added on integration branch (`npm run ranking:lab:100`).

### PR #61 on staging

- Migrations were applied on staging DB ahead of merge, but **routes 404** until code deploys from merged PR.

---

## Required flags (post-merge)

```text
LOT_WALLET_ENABLED=true
SELLER_PROMOTION_CENTER_ENABLED=true
MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true   # advisory only
```

---

## Acceptance path status

```text
CODE        ✅ integration branch
MAIN        ⏳ pending merge #61 → #62
RAILWAY     ⏳ pending deploy
FLAGS       ⏳ pending
DB          ✅ migrations exist on staging
DEMO DATA   ⚠️ partial
VISUAL      ⏳ pending post-deploy
E2E         ⏳ pending post-deploy
ACCEPTED    ❌
```
