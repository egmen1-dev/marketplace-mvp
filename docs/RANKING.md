# LOT Ranking v1

`rankingVersion = "lot-ranking-v1"`. This is **not** the Wildberries formula — WB's
hidden weights are unknown. LOT Ranking v1 is our own marketplace-principled,
deterministic, explainable algorithm built from **real** signals with Bayesian
smoothing so new products are not destroyed (cold start).

## Pipeline (section 24)

```
Query → Candidate retrieval → Text relevance → Marketplace signals →
Normalization → Organic score → Promotion boost → Final score → Results
```

## Signals & initial weights (section 37)

Centralized and versioned in `lib/ranking/weights.ts`.

| Signal | Weight | Source |
| --- | --- | --- |
| Text relevance | 30% | matcher / title+type+alias (1.0 neutral for browse) |
| Commercial (sales + buyout) | 20% | paid/delivered order items, time-decayed |
| Trust | 15% | seller verified + rating (smoothed) + cancellation |
| Conversion | 10% | completedOrders / views (Beta-smoothed) |
| Price attractiveness | 8% | vs same-ProductType median |
| Logistics | 8% | stock + pickup + shipping |
| Content quality | 4% | ProductContentQualityScore/100 |
| Stock | 3% | in stock = 1 |
| Freshness | 2% | exp decay, half-life 21d |

Promotion is a **separate** controlled boost over organic (0 until paid promotion
ships). `finalScore = (organic + promo·(1−organic)) · stockPenalty`, where
out-of-stock is strongly demoted (×0.25).

## Cold start (section 36)

- Buyout rate: Beta(2,2) prior → 0.5 when no data.
- Conversion: Beta(1,19) prior → ~5% baseline.
- Rating: global-mean prior (4.0, weight 5).
- Sales & freshness time-decayed. A new, well-filled, in-stock product keeps a
  healthy organic score (≈0.45+) instead of falling to zero.

## No fake data

Ratings/orders/buyouts/conversion are used **only when real**. Missing signals use
neutral priors — never synthetic values. Test-order/cancelled orders are excluded
from sales (`PAID/PROCESSING/SHIPPED/DELIVERED` count; `DELIVERED` = bought out).

## Precomputation & performance (sections 39, 49)

- `ProductRankingStats` stores real aggregates per product.
- `Product.rankingScore` (indexed) is the denormalized organic sort key.
- Recompute: `npm run ranking:recompute` (`lib/ranking/aggregate.ts`, idempotent).
- Catalog `sort=recommended` (default) orders by `rankingScore` (nulls last).

## Explainability

`/admin/ranking` (admin-only) shows the full per-signal breakdown for products,
for tuning/debugging. Buyers never see debug scores.

## Determinism / tests

`tests/ranking-engine.test.ts` covers weights, cold start, out-of-stock demotion,
comparative price, separate promotion, and the section-48 scenario
(A > B by trust+commercial; C new-quality keeps a healthy cold-start score).
