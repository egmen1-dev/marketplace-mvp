# Ranking V1 Activation Gate

**Purpose:** Live ranking must not connect to search until every gate passes manual review.

**Current state (2026-08-15):** Advisory lab **ACCEPTED** on staging acceptance branch. Live ranking **NOT ENABLED**.

---

## Checklist

| # | Gate | Status |
|---|------|--------|
| 1 | 100-product dataset complete + audited | ✅ `dataset-audit.json` |
| 2 | 50+ controlled experiments | ✅ 50 in `experiment-results.json` |
| 3 | All negative quality tests pass | ✅ `qualityChecks` |
| 4 | Bad products cannot buy TOP | ✅ `badPromoCannotBuyTop` |
| 5 | Promotion cannot bypass eligibility | ✅ `badPromoCannotBypassEligibility` |
| 6 | Query relevance separated from SEO quality | ✅ lab matrix |
| 7 | Promotion influence calibrated (0–15% sweep) | ✅ 5% recommended |
| 8 | TOP-10 + #11 explanations generated | ✅ in experiment output |
| 9 | Per-product reports (100) | ✅ `product-reports/` |
| 10 | Simulation error measured | ✅ acceptable in lab |
| 11 | Ranking results reproducible | ✅ seed `20260815` |
| 12 | Seller explanations (Russian, no false precision) | ⚠️ staging UX with flag OFF; re-verify when flag ON |
| 13 | Admin rollback / versioning | ✅ `/admin/ranking` |
| 14 | `resolveOrderBy()` unchanged | ✅ verified on `ba767f7` |
| 15 | No severe unfairness detected | ⏳ manual review |
| 16 | Manual sign-off | ❌ |

---

## Blocked actions until gate complete

```text
❌ resolveOrderBy() changes
❌ Automatic live search reorder
❌ Silent weight edits in production
❌ MARKETPLACE_RANKING_LIVE_ENABLED (not implemented)
```

---

## Allowed now

```text
✅ /account/ranking advisory dashboards (when flag ON)
✅ /admin/ranking lab + experiments
✅ Product-level simulation reports
✅ MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true (advisory only)
```

Staging note: flag was OFF during visual acceptance; enabling it is required for final advisory UX sign-off but does **not** activate live search.

---

## Activation procedure (future)

1. Product + Trust leadership sign checklist row 16.
2. Create `Ranking V1.0-live` version with approved weights.
3. Shadow mode: log live vs advisory diff for 7 days.
4. Implement + enable `MARKETPLACE_RANKING_LIVE_ENABLED` (future flag).
5. Rollback: deactivate version, revert flag, restore previous `resolveOrderBy()`.

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|:--------:|
| Product | | | |
| Engineering | | | |
| Trust & Safety | | | |
