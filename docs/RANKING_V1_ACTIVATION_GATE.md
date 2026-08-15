# Ranking V1 Activation Gate

**Purpose:** Live ranking must not connect to search until every gate passes manual review.

---

## Checklist

| # | Gate | Status |
|---|------|--------|
| 1 | 100-product dataset complete | ✅ `calibration-100-v1` |
| 2 | All negative quality tests pass | ✅ lab `qualityChecks` |
| 3 | Bad products cannot buy TOP | ✅ promotion boost = 0 when gated |
| 4 | Promotion influence calibrated | ✅ 5% candidate cap |
| 5 | Organic relevance validated | ⚠️ lab only — needs human review |
| 6 | Ranking results reproducible | ✅ seed 20260815 |
| 7 | Seller explanations accurate | ⚠️ advisory copy — needs staging UX review |
| 8 | Admin rollback exists | ✅ versioned weights in DB |
| 9 | Versioning works | ✅ RankingAlgorithmVersion |
| 10 | No severe unfairness detected | ⏳ manual review |
| 11 | Manual review approved | ❌ |

---

## Blocked actions until gate complete

```text
❌ resolveOrderBy() changes
❌ Automatic live search reorder
❌ Silent weight edits in production
```

---

## Allowed now

```text
✅ /account/ranking advisory dashboards
✅ /admin/ranking lab + experiments
✅ Product-level simulation reports
✅ MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true (advisory)
```

---

## Activation procedure (future)

1. Product + Trust leadership sign checklist row 11.
2. Create `Ranking V1.0-live` version with approved weights.
3. Shadow mode: log live vs advisory diff for 7 days.
4. Feature flag `MARKETPLACE_RANKING_LIVE_ENABLED` (not implemented).
5. Rollback: deactivate version, revert flag.

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|:--------:|
| Product | | | |
| Engineering | | | |
| Trust & Safety | | | |
