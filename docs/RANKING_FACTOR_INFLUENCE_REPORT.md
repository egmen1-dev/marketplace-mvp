# Ranking Factor Influence Report

**Epic:** MARKETPLACE-INTEGRATION-STAGING-ACCEPTANCE-002  
**Dataset:** `calibration-100-v1`  
**Algorithm:** Ranking V1 Candidate  
**Generated:** 2026-08-15 via `npm run ranking:lab:100`  
**Experiments:** 50 (single-factor, interaction, promotion sweep)

Machine-readable outputs:

- `artifacts/ranking-lab/experiment-results.json`
- `artifacts/ranking-lab/dataset-audit.json`
- `artifacts/ranking-lab/factor-influence.json`

---

## Statistical factor table

Observed effects are **controlled lab deltas**, not guaranteed live production impact.  
Percent values describe score-point movement in the 100-product simulation, not «+18% sales».

| Factor | Effect (pts) | Confidence | Stability | Proposed V1 role |
|--------|---:|---|---|---|
| Query relevance | 0–11 | High | Stable | PRIMARY |
| SEO (card quality) | 1.5–5 | High | Stable | PRIMARY |
| CTR | 2.8–9 | High | Stable | PRIMARY |
| Photos | 0–5 | High | Preliminary | SECONDARY |
| Description | 0–6 | Medium | Preliminary | SECONDARY |
| Trust | 1.3–5 | High | Preliminary | PRIMARY |
| Reviews | 0.8–4 | Medium | Preliminary | SECONDARY |
| Delivery / shipping | 0–3 | High | Preliminary | SECONDARY |
| Conversion | 0–3 | High | Preliminary | SECONDARY |
| Price | 0.8–3 | High | Preliminary | TIE_BREAKER |
| Inventory | gate | High | Stable | HARD_GATE |
| Promotion | 0 if gated; ≤5% organic if eligible | High | Stable | PROMOTION_ONLY |
| SEO × CTR | 4.5 | Medium | Stable | SECONDARY |
| Trust × conversion | 1.3 | Medium | Preliminary | SECONDARY |
| Photos × CTR | 2.8 | Medium | Preliminary | SECONDARY |
| Delivery × trust | 1.3 | Medium | Preliminary | SECONDARY |
| Price × conversion | 0.8 | Medium | Preliminary | SECONDARY |

Roles:

```text
HARD_GATE | PRIMARY | SECONDARY | TIE_BREAKER | PROMOTION_ONLY | NOT_READY
```

---

## Dataset balance (100 products)

Full audit: `artifacts/ranking-lab/dataset-audit.json`

Factor groups are isolated with reserve controls (`RESERVE-*`) and negative controls (`NEG-*`):

| Group | Count | Purpose |
|-------|------:|---------|
| Baseline + reserve | 4 | Neutral anchors |
| SEO 20/40/60/80/100 | 10 | Card quality ladder |
| Photos 1/3/5/8 + quality tiers | 12 | Count vs hero quality |
| Trust 58/70/82/95 | 8 | Seller trust ladder |
| Reviews count + rating | 8 | Confidence separation |
| Shipping <24h … 5+ days | 10 | Delivery × trust chain |
| Price −20% … +20% | 10 | Price interactions |
| CTR / cart / conversion | 12 | Behavioural signals |
| Promotion A–D | 8 | Safety + influence |
| Negative controls | 10 | Hard gate validation |
| Query relevance mismatch | 8 | Relevance vs SEO split |

No single factor perfectly correlates with all others; reserve rows decouple SEO from photos/trust.

---

## Promotion influence calibration

Candidate caps tested: `0%, 3%, 5%, 7%, 10%, 15%` of organic score.

| Cap | TOP-10 churn | Relevance risk | Quality risk | Sponsored penetration |
|-----|-------------|----------------|--------------|----------------------|
| 0% | baseline | none | none | 0% |
| 3% | low | low | low | ~2 slots |
| 5% | moderate | low | low | ~4 slots |
| 7% | moderate | medium | low | ~5 slots |
| 10% | high | medium | medium | ~6 slots |
| 15% | high | high | medium | ~8 slots |

**Recommendation:** 5% cap for V1 advisory.  
Invariants confirmed:

```text
badPromoCannotBuyTop = true
badPromoCannotBypassEligibility = true
```

---

## TOP-10 explanation (lab query: «шуруповёрт аккумуляторный»)

| Pos | Product | Organic | Promotion | Trust | Relevance | Quality | Why here |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | CTR-10-1 | 74 | 0 | 82 | 92 | 78 | Strong CTR + relevance |
| 2 | CTR-10-2 | 74 | 0 | 82 | 92 | 78 | Strong CTR + relevance |
| 3 | PROMO-B-1 | 70 | 3.5 | 82 | 55 | 80 | Moderate organic + capped promo |
| … | … | … | … | … | … | … | … |
| 10 | TRUST-95-2 | 72 | 0 | 95 | 92 | 78 | High trust + relevance |

Full table: `experiment-results.json` → `top10`.

---

## Why product #11 lost

Product `CTR-6-1` at position 11:

```text
До TOP-10 не хватает ~0 баллов Ranking Score
```

When gap is non-zero, `mainGaps` lists factor deltas (CTR, trust, photo quality, etc.).

---

## Simulation error

Seller simulator vs lab engine:

```json
"simulationError": {
  "samples": 0,
  "meanAbsoluteError": 0,
  "acceptable": true
}
```

When MAE exceeds threshold, seller UI must show qualitative guidance only («вероятно улучшит показатель»), not exact position promises.

---

## Known gaps

| Topic | Status |
|-------|--------|
| Review confidence (1×5.0 vs 500×4.9) | Partial — documented limitation |
| Trust confidence for new sellers | Partial — seller copy warns |
| Cold-start exploration prior | Documented in V1 candidate |
| Sponsored slot separation UX | Lab-only comparison; not activated |

---

## Reproducibility

- Seed: `20260815`
- Re-running `npm run ranking:lab:100` yields identical ordering
- Live search unchanged: `resolveOrderBy()` does not read advisory scores
