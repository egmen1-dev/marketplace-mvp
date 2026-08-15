# Ranking 100-Product Experiment

**Epic:** MARKETPLACE-INTEGRATION-VALIDATION-001  
**Dataset:** `calibration-100-v1`  
**Seed:** `20260815`  
**Generator:** `npm run ranking:lab:100`

---

## Goal

Controlled calibration of Ranking V1 Candidate **without** changing live catalog sort. Advisory layer only until activation gate passes.

---

## Dataset design

| Group | Count (approx) | Controlled factor |
|-------|----------------|-------------------|
| BASELINE-001 | 1 | Fixed reference product |
| SEO | 10 | Title/description/characteristics depth |
| Photos | 12 | 1/3/5/8 photos + quality score |
| Trust | 8 | Seller trust 58/70/82/95 |
| Delivery | 10 | Shipping proxy via completed orders |
| Price | 10 | −20% … +20% vs baseline |
| Reviews | 8 | 0/3/10/50 reviews × rating |
| CTR | 10 | Synthetic favorites/views ratios |
| Conversion | 10 | orders/views ratios |
| Negative controls | 10 | prohibited, no photo, rejected, spam, zero price, low trust |
| Promotion A/B/C/D | 8 | good/no promo, good+promo, average+promo, bad+high promo |
| Reserve | fill to 100 | cart/inventory variants |

Primary category anchor: **Аккумуляторные шуруповёрты**.

---

## Experiment runner

Module: `lib/marketplace-ranking-intelligence/calibration-100.ts`

- `buildCalibration100Products()` — deterministic matrix
- `runCalibrationExperiments()` — ≥20 factor bump scenarios
- `runFullCalibrationLab()` — full pipeline + quality checks

---

## Quality checks (automated)

| Check | Expected |
|-------|----------|
| `negativeControlsBlockedFromTop` | No `NEG-*` in computed TOP-10 |
| `badPromoCannotBuyTop` | High promotion on failing quality gate → 0 boost |
| `reproducibilitySeed` | Same seed → same ranked order |

---

## Artifacts

```text
artifacts/ranking-lab/100-products.json
artifacts/ranking-lab/experiment-results.json
artifacts/ranking-lab/factor-influence.json
artifacts/ranking-lab/product-reports/*.json
```

---

## Promotion vs organic (groups A–D)

| Group | Product quality | Promotion | Expected |
|-------|-----------------|-----------|----------|
| A | Good | No | Organic baseline |
| B | Good | Yes | Limited boost after eligibility |
| C | Average | Yes | Boost capped by quality |
| D | Bad / NOT_ELIGIBLE | High budget | **Zero** promotion contribution |

---

## Live search

**Not connected.** `resolveOrderBy()` in `features/products/queries.ts` unchanged.
