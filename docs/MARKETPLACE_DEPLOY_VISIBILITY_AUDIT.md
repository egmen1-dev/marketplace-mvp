# MARKETPLACE-DEPLOY-VISIBILITY-AUDIT-001

**Date:** 2026-08-14  
**Auditor:** Cloud Agent  
**Staging URL:** https://web-production-e56fb.up.railway.app

## Executive summary

**Root cause of “UI almost unchanged”:** almost all marketplace epics (Trust, Discovery, Seller Journey, Payout, etc.) exist only on **draft PR branches** and are **not merged into `main`**. Railway staging deploys **`main` only** (service `web-v2`, branch `main`). Therefore:

1. **Code is not on staging** — regardless of feature flags.
2. **Feature flags default to OFF** — even after merge, modules stay hidden until env vars are set.
3. **29 open draft PRs** (#29–#58) stack features without a merge/release train.

**What users DO see on staging today (`main` @ `f7cab39`):**

- DESIGN-001 homepage redesign (merged PR #17, #18)
- DEVOPS build marker `/api/version` (PR #11)
- ADS admin panel (PR #13, #14)
- Base marketplace: catalog, cart, checkout, Stripe, basic seller cabinet

---

## 1. Deployment SHA snapshot

| Target | SHA (short) | Build time | Notes |
|--------|-------------|------------|-------|
| **Production SHA** (Vercel) | — | — | Unchanged per DEVOPS policy; not queried in this audit |
| **Staging SHA** (Railway) | `f7cab39` | 2026-08-13T16:29:59Z | Live at `/api/version` |
| **Current main SHA** | `f7cab39` | — | Matches staging ✓ |
| **Current feature branch HEAD** | `1b84d4c` | — | `cursor/marketplace-trust-conversion-001-d03e` |
| **Commits ahead of main** | **21** | — | All marketplace epics |

### Git — merged into `main` (recent)

| PR | Title | Merged |
|----|-------|--------|
| #18 | DESIGN-001.1 homepage visual fixes | 2026-08-13 |
| #17 | DESIGN-001 homepage redesign | 2026-08-13 |
| #14 | ADS-READY-001.1 UTM fix | 2026-08-12 |
| #13 | ADS-READY-001 admin ads | 2026-08-12 |
| #11 | DEVOPS-001 build version marker | 2026-08-12 |
| #7 | HOTFIX-UX-001 | 2026-08-12 |

### Git — NOT merged (open draft PRs, sample)

PRs #29–#58 include: Trust Loop, Trust Score, Trust Experience, New Seller Trust, Trust Conversion, Discovery, Social Growth, UX Completion, Conversion Audit, Seller Journey, Payout, Promotion Center, Business Intelligence, etc.

**Conclusion:** staging cannot show these modules until PRs merge to `main` and Railway redeploys.

---

## 2. Railway deployment

| Check | Result |
|-------|--------|
| Deploy source | GitHub → `main` → Dockerfile (`railway.toml`) |
| Active service | `web-v2` |
| Staging domain | `web-production-e56fb.up.railway.app` |
| Last known deploy | commit `f7cab39` (matches main) |
| Build | Successful (version API responds) |
| Migrations | Manual: `railway run --service web-v2 -- npx prisma migrate deploy` |

### Required feature flags — runtime on staging

All checked via code defaults (`process.env.* === "true"`). **Unless explicitly set in Railway, all are OFF.**

| Env var | Expected on staging |
|---------|---------------------|
| `MARKETPLACE_UX_COMPLETION_ENABLED` | **OFF** |
| `MARKETPLACE_TRUST_LOOP_ENABLED` | **OFF** |
| `MARKETPLACE_TRUST_SCORE_MODEL_ENABLED` | **OFF** |
| `MARKETPLACE_TRUST_EXPERIENCE_ENABLED` | **OFF** |
| `MARKETPLACE_NEW_SELLER_TRUST_ENABLED` | **OFF** |
| `MARKETPLACE_TRUST_CONVERSION_ENABLED` | **OFF** |
| `SELLER_FIRST_ENTRY_ENABLED` | **OFF** |
| `SELLER_JOURNEY_ENABLED` | **OFF** |
| `SELLER_OPERATING_DESK_ENABLED` | **OFF** |
| `SELLER_OPERATIONS_ENABLED` | **OFF** |
| `SELLER_BUSINESS_INTELLIGENCE_ENABLED` | **OFF** |
| `SELLER_PROMOTION_CENTER_ENABLED` | **OFF** (code not on main) |
| `SELLER_PAYOUT_ENABLED` | **OFF** |
| `MARKETPLACE_DISCOVERY_ENABLED` | **OFF** |
| `MARKETPLACE_SOCIAL_GROWTH_ENABLED` | **OFF** |
| `MARKETPLACE_CONVERSION_ENABLED` | **OFF** |

**Live check:** open `/admin/system-flags` (after this PR merges) for runtime ON/OFF on the running instance.

---

## 3. Module visibility matrix

| Module | Code exists | Connected to UI | Flag enabled (default) | On main | Visible staging |
|--------|-------------|-----------------|------------------------|---------|-----------------|
| UX Completion | ✓ (branch) | ✓ `/`, `/product`, `/admin/dashboard` | OFF | ✗ | ✗ |
| Trust Loop | ✓ (branch) | ✓ PDP reviews, `/admin/trust` | OFF | ✗ | ✗ |
| Trust Score | ✓ (branch) | ✓ `/account/reputation` | OFF | ✗ | ✗ |
| Trust Experience | ✓ (branch) | ✓ PDP + Trust Center | OFF | ✗ | ✗ |
| New Seller Trust | ✓ (branch) | ✓ PDP + reputation | OFF | ✗ | ✗ |
| Trust Conversion | ✓ (branch) | ✓ PDP + admin trust-center | OFF | ✗ | ✗ |
| Seller Business | ✓ (branch) | ✓ `/account/business` | OFF | ✗ | ✗ |
| Seller Journey | ✓ (branch) | ✓ `/account`, seller-start | OFF | ✗ | ✗ |
| Seller First Entry | ✓ (branch) | ✓ `/account/seller-start` | OFF | ✗ | ✗ |
| Seller Operating Desk | ✓ (branch) | ✓ `/account/business` | OFF | ✗ | ✗ |
| Seller Operations | ✓ (branch) | ✓ `/account/business` | OFF | ✗ | ✗ |
| Promotion Center | ✓ (PR #38 branch) | placeholder `/account/promotion-center` | OFF | ✗ | ✗ |
| Seller Payout | ✓ (branch) | ✓ `/account/payouts` | OFF | ✗ | ✗ |
| Discovery | ✓ (branch) | ✓ homepage, PDP | OFF | ✗ | ✗ |
| Social Growth | ✓ (branch) | ✓ `/social`, seller tools | OFF | ✗ | ✗ |
| Conversion Audit | ✓ (branch) | ✓ `/admin/conversion` | OFF | ✗ | ✗ |

---

## 4. User route audit

### Buyer routes

| Route | Expected module UI | Visible on staging? | Why not |
|-------|-------------------|---------------------|---------|
| `/` | Discovery sections, UX completion | Partial | DESIGN-001 yes; Discovery/UX flags off + code not on main |
| `/catalog` | Trust strip, catalog UX | Base only | Trust strip needs code + flags |
| `/product/[id]` | Trust blocks, reviews, delivery hint | Base PDP only | Trust Loop/Experience not deployed |
| `/favorites` | Standard | Yes | Core feature |
| `/orders` | Standard | Yes | Core feature |
| `/account` | UX completion nav | Base nav | Seller journey nav hidden |

**Theme:** `ThemeProvider defaultTheme="light"` — white theme is active ✓  
**Header:** DESIGN-001 header on main ✓

### Seller routes

| Route | Module | Visible on staging? |
|-------|--------|---------------------|
| `/account/business` | Seller BI / Operations | Base page; AI panels not deployed |
| `/account/reputation` | Trust Center | Legacy reputation only on main |
| `/account/balance` | Finance core | Partial |
| `/account/payouts` | Seller Payout | Placeholder / off |
| `/account/promotion-center` | Promotion Center | Placeholder text only |
| `/account/seller-start` | First Entry / Journey | Basic page; coach not deployed |

---

## 5. Per-module “why not visible” examples

### Trust Experience

```
Код:        YES (branch cursor/marketplace-trust-experience-001-d03e)
Flag:       OFF by default
UI wired:   YES (/account/reputation, PDP)
Staging:    NO — not on main

Не видно потому что:
1. PR #56 не смержен
2. MARKETPLACE_TRUST_EXPERIENCE_ENABLED не установлен на Railway
3. Требует MARKETPLACE_TRUST_SCORE_MODEL_ENABLED + TRUST_LOOP
```

### New Seller Trust

```
Код:        YES (PR #57)
Flag:       OFF
UI:         YES (PDP blocks, reputation)
Staging:    NO

Не видно потому что:
1. Не на main
2. Flag OFF
3. Даже после merge — блок показывается только для seller с <10 заказов
```

### Seller Business Intelligence

```
Код:        YES (PR #45)
Flag:       OFF
UI:         /account/business
Staging:    NO

Не видно потому что:
1. Не на main
2. SELLER_BUSINESS_INTELLIGENCE_ENABLED=false
3. AI summary нуждается в данных (заказы, метрики)
```

---

## 6. Demo seed data

Run after main seed:

```bash
npx prisma db seed
npx tsx prisma/seed-demo-visibility.ts
```

| Persona | Login | Validates |
|---------|-------|-----------|
| Новый продавец | `demo-new-seller@demo.lot` / `demo1234` | New Seller Trust, Trust Experience |
| Развивающийся | `demo-growing@demo.lot` / `demo1234` | Trust tiers, Seller Journey |
| С проблемами | `demo-problems@demo.lot` / `demo1234` | Seller BI, Conversion diagnostics |

Password for all: `demo1234`

---

## 7. Debug mode

On staging/development, append to any URL:

```
?debug=marketplace
```

Shows banner with enabled modules (only flags ON on that instance).

---

## 8. Admin tools added by this epic

| Tool | Route | Purpose |
|------|-------|---------|
| System Flags Dashboard | `/admin/system-flags` | Live flag ON/OFF, SHA matrix, demo scenarios |
| Debug banner | `?debug=marketplace` | Quick module checklist on any page |

---

## 9. Recommended release path

```
Code (merge PR chain to main)
  ↓
Feature flags ON in Railway (staging first)
  ↓
Deploy (automatic on main push)
  ↓
Demo seed (seed-demo-visibility.ts)
  ↓
UI check (/admin/system-flags + manual routes)
  ↓
Production release
```

---

## 10. Acceptance criteria

| Check | Status |
|-------|--------|
| Понятно какой commit на сайте | ✅ `/api/version` + `/admin/system-flags` |
| Понятно какие flags включены | ✅ System Flags dashboard |
| Все модули проверены | ✅ Matrix in this doc + admin UI |
| Таблица код → UI → staging | ✅ Section 3 |
| Demo данные | ✅ `prisma/seed-demo-visibility.ts` |
| Быстрая проверка новых функций | ✅ debug mode + admin dashboard |
