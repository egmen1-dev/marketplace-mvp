# Staging Migration Reconciliation

**Epic:** MARKETPLACE-STAGING-ROLLOUT-FIX-001  
**Date:** 2026-08-14  
**Constraint:** no `migrate reset`, no `_prisma_migrations` deletion, no history rewrite

---

## Problem

After `20260812310000_analytics_attribution`, **repo** and **staging DB** diverged:

| Source | Migrations |
|--------|------------|
| **Repository (main)** | Marketplace finance, trust loop, seller UX, delivery, social, trust score |
| **Staging DB (historical)** | Agent task migrations (`task_058`, `task_059`, `agent_019`, …) + `payment_finance_ledger` |
| **Local dev DB (historical)** | Promotion/ads branch migrations + `marketplace_finance` |

Both environments required **baseline stubs** (restore SQL from git) plus selective `migrate resolve`.

---

## Inventory (staging Postgres, 2026-08-14)

### Already in DB before fix

| Migration | Repo | DB | Action taken |
|-----------|------|----|--------------|
| `20260812310000_analytics_attribution` | yes | yes | — baseline |
| `20260813140000_payment_finance_ledger` | yes | yes | — kept |
| `20260811133912_task_058_ranking_and_taxonomy_sync` | restored stub | yes | restore SQL from git |
| `20260811134215_task_058_product_ranking_score` | restored stub | yes | restore SQL from git |
| `20260811145747_task_059_reviews_ratings` | restored stub | yes | restore SQL from git |
| `20260811161428_agent_019_trust_risk` | restored stub | yes | restore SQL from git |
| `20260811172140_agent_020_search_analytics` | restored stub | yes | restore SQL from git |

### Applied via `migrate deploy` (staging)

| Migration | Repo | DB (before) | Action |
|-----------|------|-------------|--------|
| `20260813140000_promotion_campaigns` | yes | no | **apply** |
| `20260813160000_promotion_placements` | yes | no | **apply** |
| `20260813160000_seller_payout` | yes | no | **apply** |
| `20260813170000_seller_first_entry` | yes | no | **apply** |
| `20260813180000_promotion_analytics` | yes | no | **apply** |
| `20260813190000_marketplace_delivery` | yes | no | **apply** |
| `20260813200000_marketplace_social_growth` | yes | no | **apply** |
| `20260813200000_promotion_billing` | yes | no | **apply** |
| `20260813210000_marketplace_trust_score_model` | yes | no | **apply** |
| `20260814113000_staging_trust_baseline_reconcile` | yes | no | **apply** (idempotent bridge) |

### Resolved without SQL (schema already present / superseded)

| Migration | Reason | Action |
|-----------|--------|--------|
| `20260813150000_marketplace_finance` | `finance_transactions` from `payment_finance_ledger` | `migrate resolve --applied` |
| `20260813150000_trust_safety_disputes` | Superseded by marketplace finance + reconcile | `migrate resolve --applied` |
| `20260813180000_marketplace_trust_loop` | `reviews` from agent task_059 | `migrate resolve --applied` |
| `20260813170000_trust_protection` | Failed (missing DisputeStatus); covered by reconcile | `resolve --rolled-back` → `resolve --applied` |

### Local dev DB (localhost) — additional resolves

| Migration | Action |
|-----------|--------|
| `20260813140000_payment_finance_ledger` | `resolve --applied` (superseded by marketplace_finance) |
| `20260813150000_trust_safety_disputes` | `resolve --applied` |

Promotion stubs restored from git: `1805bd9`, `ffcb199`, `ff7bb4a`, `29bbbd8`, `3aa071a`.

---

## Reconcile migration

`20260814113000_staging_trust_baseline_reconcile` adds idempotently:

- `buyerId` on `finance_transactions`
- `seller_reputations`, `trust_score_history`, `product_ratings`, `review_photos`
- `disputes`, payout tables, social collections, return requests
- Review enum extensions (`PENDING`, `APPROVED`, `REJECTED`)

---

## Commands executed (staging)

```bash
# Connect via Railway TCP proxy (DATABASE_URL from Postgres service)

# Resolve superseded
npx prisma migrate resolve --applied 20260813150000_marketplace_finance
npx prisma migrate resolve --applied 20260813150000_trust_safety_disputes
npx prisma migrate resolve --applied 20260813180000_marketplace_trust_loop

# Deploy remainder + reconcile
npx prisma migrate deploy

# Verify
npx prisma migrate status   # → Database schema is up to date

# Seed demo personas
npx tsx prisma/seed-demo-visibility.ts
```

---

## Result

| Environment | Status |
|-------------|--------|
| Staging Postgres | ✅ `Database schema is up to date` (46 migrations) |
| Local Postgres | ✅ `Database schema is up to date` (46 migrations) |
| Demo seed (staging) | ✅ `demo-new-seller@demo.lot`, `demo-growing@demo.lot`, `demo-problems@demo.lot` |

---

## If drift reappears

1. Run `SELECT migration_name FROM _prisma_migrations ORDER BY finished_at` on target DB.
2. Compare with `ls prisma/migrations`.
3. Restore missing stubs from git history (ads/promotion/agent branches).
4. Use `migrate resolve --applied` only when SQL is superseded by reconcile or existing schema.
5. Never `migrate reset` on staging/production.
