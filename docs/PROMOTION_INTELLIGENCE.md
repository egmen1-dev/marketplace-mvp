# Promotion Intelligence (ADS-MARKETPLACE-005)

Advisory layer that helps sellers decide **which products to promote and why**. It does not change catalog, search ranking, orders, or finance flows.

## Architecture

```
Seller products + analytics signals + readiness
              ↓
   lib/promotion/intelligence/score.ts
   (PromotionOpportunityScore 0–100)
              ↓
   lib/promotion/intelligence/recommendations.ts
   generatePromotionRecommendations(sellerId)
              ↓
   /account/promotions — «Что стоит продвигать?»
   /admin/promotions   — AI Opportunities
```

Modules:

| Path | Role |
|------|------|
| `flags.ts` | `PROMOTION_INTELLIGENCE_ENABLED` (default off) |
| `score.ts` | Weighted factor model |
| `recommendations.ts` | Seller + admin aggregation |
| `types.ts` | DTOs |

**Important:** recommendations never auto-start campaigns or modify ranking.

## Score model

`PromotionOpportunityScore` (0–100) combines:

| Factor | Weight |
|--------|--------|
| Quality score | 20 |
| Conversion rate | 25 |
| Stock availability | 15 |
| Price competitiveness | 15 |
| Seller trust | 10 |
| Historical sales | 15 |

Signals:

- **Quality** — reuses `evaluatePromotionReadiness` / ADS-001
- **Conversion** — promotion metrics (ADS-003) or views/orders proxy
- **Stock** — product inventory
- **Price** — ratio vs category median active price
- **Trust** — verified seller, rating, not blocked
- **Sales** — paid order item quantities

### Recommended plan (manual only)

| Score | Plan |
|-------|------|
| ≥ 80 | BOOST (30 days) |
| 50–79 | GROWTH (14 days) |
| < 50 or not ready | Not recommended |

No automatic checkout — seller must click **Оплатить** / **Продвигать**.

## Seller UX

Block **«Что стоит продвигать?»** on `/account/promotions`:

- Table: product, score, recommended budget, reasons
- **Почему этот товар?** — improvements (blockers) or positive signals
- Accept button tracks `promotion_recommendation_accept`

## Admin UX

**AI Opportunities** on `/admin/promotions`:

- High-potential products (score ≥ 80, ready, not promoted)
- Ready without campaign count
- Estimated missed revenue (heuristic)
- Top opportunities table

## Analytics events

- `promotion_recommendation_view`
- `promotion_recommendation_click`
- `promotion_recommendation_accept`

## Feature flag

```env
PROMOTION_INTELLIGENCE_ENABLED=true
```

Works alongside:

- `PROMOTION_SURFACES_ENABLED`
- `PROMOTION_ANALYTICS_ENABLED`
- `PROMOTION_BILLING_ENABLED`

## Tests

- Unit: `tests/promotion-intelligence.test.ts`
- E2E: `tests/e2e/promotion-intelligence.spec.ts`

## Future ML extension

Current engine is **rule-based + weighted heuristics**. Planned extensions:

1. Train conversion model on `PromotionMetric` + order outcomes
2. Personalize weights per category / seller cohort
3. Seasonal demand signals (views velocity)
4. A/B test plan recommendations vs fixed thresholds
5. Optional LLM narrative for «Почему этот товар?» using structured signals only (no catalog mutation)

Keep inference offline/batch; seller UI continues to show explicit accept actions.
