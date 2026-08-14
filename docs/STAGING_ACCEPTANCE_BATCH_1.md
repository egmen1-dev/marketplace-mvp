# Staging Acceptance — Batch 1

**Epic:** MARKETPLACE-STAGING-ACCEPTANCE-001 / MARKETPLACE-STAGING-ROLLOUT-FIX-001  
**Date:** 2026-08-14  
**Environment:** Railway staging — `https://web-production-e56fb.up.railway.app`  
**Service:** `web-v2` (marketplace-mvp-backup)

---

## Deploy

```json
{
  "environment": "staging",
  "commit": "2576521",
  "buildTime": "2026-08-14T11:01:07.454Z",
  "version": "0.1.0"
}
```

| Field | Value |
|-------|-------|
| **SHA** | `2576521` (includes Batch 1 merge + rollout docs) |
| **buildTime** | `2026-08-14T11:01:07.454Z` |
| **environment** | `staging` |

Post-rollout redeploy triggered after Railway variable update (flags live without new commit SHA).

---

## Flags

Set on Railway `web-v2` (2026-08-14):

```env
MARKETPLACE_TRUST_LOOP_ENABLED=true
MARKETPLACE_TRUST_SCORE_MODEL_ENABLED=true
MARKETPLACE_TRUST_EXPERIENCE_ENABLED=true
MARKETPLACE_NEW_SELLER_TRUST_ENABLED=true
MARKETPLACE_UX_COMPLETION_ENABLED=true
MARKETPLACE_CONVERSION_ENABLED=true
```

Verified on `/admin/system-flags`:

| Module | Status |
|--------|--------|
| Trust Loop | **ACTIVE (ON)** |
| Trust Score | **ACTIVE (ON)** |
| Trust Experience | **ACTIVE (ON)** |
| New Seller Trust | **ACTIVE (ON)** |
| UX Completion | **ACTIVE (ON)** |
| Conversion Audit | **ACTIVE (ON)** |

---

## Database

| Check | Result |
|-------|--------|
| `npx prisma migrate status` (staging) | ✅ `Database schema is up to date` (46 migrations) |
| Reconciliation doc | `docs/STAGING_MIGRATION_RECONCILIATION.md` |
| Demo seed | ✅ `npx tsx prisma/seed-demo-visibility.ts` |

Demo accounts (password `demo1234`):

- `demo-new-seller@demo.lot` — Trust **70/100**, 1 product, new seller path
- `demo-growing@demo.lot` — Trust **82/100**, reviews/orders history
- `demo-problems@demo.lot` — Trust **58/100**, weak listing recommendations

---

## Проверенные сценарии

### Buyer — ✅

| Route | Result |
|-------|--------|
| `/product/cmssvqoas000ajsf24b4e59hj` | Trust block, seller 70/100, new seller badge, reviews, delivery |

### Seller — ✅

| Account | Route | Result |
|---------|-------|--------|
| demo-new-seller | `/account/seller-start` | Journey 4/5, next step coach |
| demo-new-seller | `/account/reputation` | **70/100**, progress path, factor breakdown |
| demo-growing | `/account/reputation` | **82/100**, 6 factors, history |
| demo-problems | `/account/reputation` | **58/100**, decline reasons, fix recommendations |

### Admin — ✅

| Route | Result |
|-------|--------|
| `/admin/system-flags` | All trust modules ON, SHA visible |
| `/admin/trust-center` | Avg trust 70, 3 new sellers, decline reasons |
| `/admin/launch` | Launch readiness dashboard (flags ON) |
| `/admin/health` | Health dashboard operational |

---

## Найденные проблемы

### Resolved during rollout fix

1. Migration history divergence (agent + promotion vs marketplace) — reconciled via stubs + `20260814113000_staging_trust_baseline_reconcile`.
2. Feature flags OFF on Railway — set via `railway variable set` + redeploy.
3. Demo personas missing — seed applied to staging Postgres.

### Remaining (non-blocking)

1. `MARKETPLACE_TRUST_CONVERSION_ENABLED` still OFF (not in Batch 1 required list).
2. Registry `onMainBranch: false` labels in system-flags UI are stale cosmetic audit items.

---

## Acceptance

| Проверка | Статус |
|----------|--------|
| Prisma synced | ✅ |
| Flags enabled | ✅ |
| Demo users created | ✅ |
| Trust UI visible | ✅ |
| Buyer flow passed | ✅ |
| Seller flow passed | ✅ |
| Admin flow passed | ✅ |

## Verdict

# Batch 1 ACCEPTED

Batch 1 is released on staging. Safe to proceed with Batch 2–4 rollout planning.

---

## Evidence

- `test1-admin-system-flags.webp` — flags ON
- `test2-product-page-trust-block.webp` — PDP trust 70/100
- `test3a-seller-start-journey.webp` — new seller journey
- `test3b-new-seller-reputation.webp` — 70/100 reputation
- `test4-growing-seller-reputation.webp` — 82/100 growing seller
- `test5-problems-seller-reputation.webp` — 58/100 problem seller
- `test6-admin-trust-center.webp` — admin trust analytics

See also: `docs/STAGING_MIGRATION_RECONCILIATION.md`, `MARKETPLACE-STAGING-ACCEPTANCE-001-REPORT.md`
