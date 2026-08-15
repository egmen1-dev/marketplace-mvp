# MARKETPLACE-RANKING-INTELLIGENCE-001

Transparent, explainable ranking intelligence layer for LOT marketplace.

## Critical rule

This module **does not replace or reorder** catalog/search ranking. It only:

- evaluates eligibility and quality
- computes advisory scores (0–100)
- explains position and blockers
- simulates improvements
- runs controlled Ranking Lab experiments
- stores versioned history

Live sort in `features/products/queries.ts` → `resolveOrderBy()` remains unchanged.

## Feature flag

```env
MARKETPLACE_RANKING_INTELLIGENCE_ENABLED=true
```

Default: **OFF** (`=== "true"` required).

## Module layout

```
lib/marketplace-ranking-intelligence/
  flags.ts
  types.ts
  eligibility.ts
  ranking-engine.ts
  ranking-weights.ts
  ranking-score.ts
  ranking-version.ts
  ranking-history.ts
  ranking-events.ts
  ranking-simulator.ts
  ranking-explainer.ts
  ranking-diagnostics.ts
  ranking-recommendations.ts
  ranking-lab.ts
  experiments.ts
  quality-gates.ts
  analytics.ts
  queries.ts
  actions.ts
  permissions.ts
  index.ts
```

## Surfaces

| Surface | Route | Audience |
|---------|-------|----------|
| Seller dashboard | `/account/ranking` | Seller |
| Admin Ranking Center | `/admin/ranking` | Admin |

## Data model

| Table | Purpose |
|-------|---------|
| `ranking_algorithm_versions` | Versioned algorithms (v1, v2, …) |
| `ranking_weights` | Configurable factor weights per version |
| `product_ranking_snapshots` | Latest advisory score per product |
| `product_ranking_history` | Immutable score change audit |
| `ranking_experiments` | Ranking Lab runs |
| `ranking_influence_snapshots` | Measured factor influence |

Migration: `20260815120000_marketplace_ranking_intelligence`

## Factor groups

- **Product** — photos, description, SEO, category, inventory
- **Seller** — trust, reviews, shipping speed
- **Behaviour** — CTR, conversion
- **Commercial** — price competitiveness

Weights are stored in DB and seeded for v1. No hardcoded weights in business logic paths — defaults live in `ranking-weights.ts` for seed/bootstrap only.

## Quality gates

Products cannot reach TOP when:

- no / low photos
- zero stock
- moderation failed
- prohibited content
- very low overall score

## Ranking Lab

Admin can run synthetic experiments on datasets of 100 / 500 / 1000 / 5000 products.

Each experiment stores:

- purpose
- changed factor
- before / after metrics
- ranking impact
- confidence
- influence snapshot

## Analytics events

- `ranking_view`
- `ranking_simulation`
- `ranking_recommendation_click`
- `ranking_factor_open`
- `ranking_history_view`
- `ranking_lab_run`
- `ranking_experiment_created`
- `ranking_version_changed`
- `ranking_weight_changed`
- `ranking_quality_gate_failed`

## Tests

- `tests/marketplace-ranking-intelligence.test.ts` — unit tests
- `tests/e2e/marketplace-ranking-intelligence.spec.ts` — route smoke

## Activation path

1. Enable flag on staging
2. Validate seller explanations and admin lab
3. Run experiments to calibrate weights
4. **Separate decision** required to wire scores into live search (out of scope for this epic)
