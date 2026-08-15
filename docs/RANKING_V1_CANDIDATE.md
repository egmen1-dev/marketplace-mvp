# Ranking V1 Candidate

**Version label:** Ranking V1 Candidate  
**Status:** Advisory only — **not** applied to live search  
**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001

---

## Architecture (three layers)

```text
1. QUALITY / ELIGIBILITY — can the product participate?
2. ORGANIC RANKING — weighted factor score 0–100
3. PAID PROMOTION — capped boost on eligible products only
```

---

## Default weights (V1)

Persisted via `RankingAlgorithmVersion` + `RankingWeight` tables; defaults in `DEFAULT_RANKING_WEIGHTS_V1`:

| Factor | Weight |
|--------|-------:|
| Photos | 15% |
| Description | 8% |
| SEO | 10% |
| Category | 7% |
| Inventory | 5% |
| Trust | 12% |
| Reviews | 8% |
| Shipping | 5% |
| CTR | 18% |
| Conversion | 7% |
| Price | 5% |

Admin can create **V1.1** via `/admin/ranking` without deploy.

---

## Quality gates (TOP protection)

Hard blocks include:

- No main photo / `<2 photos` for TOP
- Zero stock
- Prohibited content
- Moderation rejected
- Overall score `<45`
- Misleading / spam title patterns

Exact thresholds refined after 100-product lab — see `quality-gates.ts`.

---

## Seller surfaces

| Route | Purpose |
|-------|---------|
| `/account/ranking` | Position estimate, blockers, next action, simulation |
| `/admin/ranking` | Version management, experiments, influence snapshots |

---

## What V1 does **not** do

- Does not change `resolveOrderBy()` / live catalog sort
- Does not auto-activate campaigns from ranking score alone
- Does not guarantee TOP placement from recommendations

---

## Calibration evidence

- 100 controlled products: `artifacts/ranking-lab/100-products.json`
- 20+ experiments: `artifacts/ranking-lab/experiment-results.json`
- Per-product reports: `artifacts/ranking-lab/product-reports/`

---

## Next step

Complete activation gate checklist in `docs/RANKING_V1_ACTIVATION_GATE.md` before any live search connection.
