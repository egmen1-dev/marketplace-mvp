# Trust & Risk scoring (AGENT-019)

Operational 0–100 scores from **real signals only**. Unknown/new accounts get a
**neutral prior of 50** (sections 3/4/38/39) — absence of history is not "bad".
Every score is **explainable**: a list of `{label, delta}` contributions.

## Seller trust (`computeSellerTrust`)

Base 50, then real signals:

| Signal | Delta |
| --- | --- |
| Verified seller | +15 |
| Account age ≥90d / ≥30d | +8 / +4 |
| Completed transactions (log-scaled) | up to +20 |
| Review reputation `(avg-3)/2 · 18` (only if reviews) | ±18 |
| Cancellation rate (only if known) | +7 … −7 |
| Fulfillment degradation | −5 |
| Complete profile | +3 |

Composite over existing seller reputation + `SellerReviewStats` (section 5) — no
second reputation system.

## Buyer trust (`computeBuyerTrust`)

Base 50; completed purchases (+up to 20), account age (+6/+3), low
cancellation/no-show (±), high-risk events (−). No sensitive/protected traits.

## Product risk (`computeProductRisk`)

Combines `priceOutlierScore·0.4 + duplicateRiskScore·0.35 + sellerRisk·0.25` plus a
small penalty for missing basic card data. A cheap price alone is **not** fraud.

## Transaction risk (`computeTransactionRisk`)

Combination-based: a new account alone is low; new account **+ high value** raises
risk; rapid actions and high cancellation add; verified seller subtracts. Never
HIGH from a single "new account" signal.

## Review rating (Bayesian, TASK 059)

Seller/product ratings feeding trust are Bayesian-smoothed (`lib/reviews/rating.ts`)
so a single 5★ can't dominate.

## Precompute

`UserTrustStats` / `SellerTrustStats` / `ProductRiskStats` cache these so PDP,
catalog and checkout never recompute reputation per render (sections 15/53). Refresh
via the reputation service / `npm run risk:scan`.
