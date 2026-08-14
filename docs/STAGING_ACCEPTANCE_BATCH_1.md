# Staging Acceptance — Batch 1

**Epic:** MARKETPLACE-STAGING-ACCEPTANCE-001  
**Date:** 2026-08-14  
**Environment:** Railway staging — `https://web-production-e56fb.up.railway.app`  
**Expected SHA:** `4edcb4f`

---

## Deploy

Verified via `/api/version`:

```json
{
  "environment": "staging",
  "commit": "4edcb4f",
  "buildTime": "2026-08-14T10:36:19.627Z",
  "version": "0.1.0"
}
```

| Field | Value | Expected | Result |
|-------|-------|----------|--------|
| **SHA** | `4edcb4f` | `4edcb4f` | ✅ Match |
| **buildTime** | `2026-08-14T10:36:19.627Z` | post-merge | ✅ |
| **environment** | `staging` | `staging` | ✅ |

Debug banner (`?debug=marketplace`) shows build `4edcb4f` on staging.

---

## Flags

Checked via `/admin/system-flags` (admin@demo.lot) and runtime env on staging.

**Required flags (spec):** all must be `true`

| Flag | Staging | Required |
|------|---------|----------|
| `MARKETPLACE_TRUST_LOOP_ENABLED` | **OFF** | ON |
| `MARKETPLACE_TRUST_SCORE_MODEL_ENABLED` | **OFF** | ON |
| `MARKETPLACE_TRUST_EXPERIENCE_ENABLED` | **OFF** | ON |
| `MARKETPLACE_NEW_SELLER_TRUST_ENABLED` | **OFF** | ON |
| `MARKETPLACE_UX_COMPLETION_ENABLED` | **OFF** | ON |
| `MARKETPLACE_CONVERSION_ENABLED` | **OFF** | ON |

All 16 registry modules show **OFF** on `/admin/system-flags`. None of the trust-stack modules are **ACTIVE**.

**Action:** set variables in Railway → staging service → Variables, redeploy, re-check `/admin/system-flags`.

---

## Database / Migrations

### Local `npx prisma migrate status`

```
Database schema is NOT up to date
```

**Last common migration:** `20260812310000_analytics_attribution`

**Pending in repo (not applied locally):**

- `20260813140000_payment_finance_ledger`
- `20260813150000_trust_safety_disputes`
- `20260813170000_seller_first_entry`
- `20260813180000_marketplace_trust_loop`
- `20260813190000_marketplace_delivery`
- `20260813200000_marketplace_social_growth`
- `20260813210000_marketplace_trust_score_model`

**Applied in DB but missing from repo (parallel ads branch):**

- `20260813140000_promotion_campaigns`
- `20260813160000_promotion_placements`
- `20260813170000_trust_protection`
- `20260813180000_promotion_analytics`
- `20260813200000_promotion_billing`

**Also applied locally:** `20260813150000_marketplace_finance`, `20260813160000_seller_payout`

**Trust tables missing locally** (seed blocked): `reviews`, `seller_reputations`, `trust_score_history`, etc.

```bash
npx tsx prisma/seed-demo-visibility.ts
# → fails: seller_reputations table does not exist
```

### Reconciliation plan (no reset, no history deletion)

1. **Inventory staging DB** — on Railway Postgres, run:
   ```sql
   SELECT migration_name FROM _prisma_migrations ORDER BY finished_at;
   SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name LIKE '%review%';
   ```
2. **Baseline record for orphan migrations** — if promotion tables exist and are needed, add *empty* migration folders in repo matching DB names (`promotion_campaigns`, etc.) OR insert rows into `_prisma_migrations` via `prisma migrate resolve --applied <name>` after adding stub SQL files (document only, do not drop promotion tables).
3. **Apply marketplace trust chain** — run pending migrations in order on staging:
   ```bash
   npx prisma migrate deploy
   ```
   If `payment_finance_ledger` conflicts with existing `marketplace_finance` schema, create a **reconciliation migration** that:
   - skips duplicate `finance_transactions` creation;
   - adds only missing columns/tables (reviews, reputations, trust_score_history);
   - marks superseded migrations as resolved.
4. **Verify** — `npx prisma migrate status` → `Database schema is up to date`.
5. **Seed** — `npx tsx prisma/seed-demo-visibility.ts` on staging DB.
6. **Re-run acceptance** — flags ON + demo personas + trust UI.

---

## Demo data

| Account | Staging login | Notes |
|---------|---------------|-------|
| `demo-new-seller@demo.lot` | ❌ Not found | Seed not run |
| `demo-growing@demo.lot` | ❌ Not found | Seed not run |
| `demo-problems@demo.lot` | ❌ Not found | Seed not run |
| `seller@demo.lot` | ✅ Works | Main seed fallback |
| `admin@demo.lot` | ✅ Works | Admin panels |

Password (demo accounts): `demo1234`

---

## Проверенные сценарии

### Buyer

| Route | Result | Notes |
|-------|--------|-------|
| `/` | ✅ | White layout, header, categories, discovery grid, trust strip; no broken debug for normal users |
| `/catalog` | ✅ | Loads |
| `/product/[id]` | ✅ | Trust block «Почему покупают», seller card, delivery, reviews empty state, safe payment copy |

Baseline trust copy visible **without** marketplace trust flags (legacy trust-safety / design blocks).

### Seller

| Route | Account | Result | Notes |
|-------|---------|--------|-------|
| `/account/seller-start` | seller@demo.lot | ⚠️ | Page loads; `SELLER_FIRST_ENTRY_ENABLED=false`, `SELLER_JOURNEY_ENABLED=false` |
| `/account/business` | seller@demo.lot | ⚠️ | Page loads; `SELLER_OPERATING_DESK_ENABLED=false` — no full business workspace |
| `/account/reputation` | seller@demo.lot | ⚠️ | Page loads; trust flags false — **no Trust Score UX** |
| Demo personas | demo-*@demo.lot | ❌ | Accounts missing |

### Admin

| Route | Result | Notes |
|-------|--------|-------|
| `/admin/system-flags` | ✅ | Loads; SHA `4edcb4f`; all modules OFF |
| `/admin/trust-center` | ⚠️ | Loads; `MARKETPLACE_TRUST_EXPERIENCE_ENABLED=false` empty state |
| `/admin/launch` | ⚠️ | Loads; `MARKETPLACE_LAUNCH_READINESS_ENABLED=false` |
| `/admin/health` | ⚠️ | Loads; launch readiness flag off |

---

## Найденные проблемы

1. **Feature flags not enabled on Railway** — trust stack modules inactive; seller/admin pages show disabled placeholders instead of full UX.
2. **Migration history diverged** — parallel promotion vs marketplace migration branches; trust tables not applied; `migrate deploy` cannot run cleanly without reconciliation.
3. **Demo visibility seed not executed on staging** — acceptance personas unavailable; problem-seller scenarios untestable.
4. **Trust Stack (full) not visible** — only baseline PDP trust copy; no score model, reputation history, new-seller trust path with flags OFF.
5. **`/admin/system-flags` registry stale** — several modules still marked `onMainBranch: false` in code though merged to `main` (cosmetic audit issue only).

---

## Acceptance

| Проверка | Статус |
|----------|--------|
| Новый SHA на Railway | ✅ `4edcb4f` |
| Миграции синхронизированы | ❌ Divergence; trust tables missing |
| Flags включены | ❌ All OFF |
| Trust Stack виден (full) | ❌ Baseline only; modules OFF |
| Demo продавцы работают | ❌ Seed not run |
| Buyer flow работает | ✅ Homepage + PDP |
| Seller flow работает | ⚠️ Routes OK; features disabled |
| Admin flow работает | ⚠️ Routes OK; dashboards empty |

### Verdict

**Batch 1 is NOT accepted for production-like release.**

Code deploy succeeded (`4edcb4f`), but operational rollout is incomplete:

1. Reconcile and apply migrations on staging Postgres  
2. Enable required Railway feature flags  
3. Run `prisma/seed-demo-visibility.ts`  
4. Re-run this acceptance checklist  

Only after all rows above are ✅ should Batch 2–4 rollout continue.

---

## Evidence

Screenshots (staging, 2026-08-14):

- Homepage: `test-evidence-homepage.webp`
- Debug banner: `test-evidence-homepage-debug.webp`
- Product PDP trust: `test-evidence-product-page.webp`
- Seller reputation (flags off): `test-evidence-seller-reputation.webp`
- Admin system flags: `test-evidence-admin-system-flags.webp`
- Admin trust-center: `staging_admin_trust_center.png`
- Admin launch: `staging_admin_launch.png`
- Admin health: `staging_admin_health.png`
- Demo login failed: `staging_demo_problems_login_failed.png`
- Seller start disabled: `staging_seller_start_flags_disabled.png`

Detailed agent log: `MARKETPLACE-STAGING-ACCEPTANCE-001-REPORT.md`
