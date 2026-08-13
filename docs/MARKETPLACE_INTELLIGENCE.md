# Marketplace Intelligence (MARKETPLACE-INTELLIGENCE-001)

Central **advisory** decision layer unifying Buyer Intelligence, Seller Growth, Promotion Intelligence, Product Quality, Analytics, and Finance signals.

## Feature flag

```bash
MARKETPLACE_INTELLIGENCE_ENABLED=true   # default: off
```

Does **not** modify catalog core, search/organic ranking, orders, finance calculations, or promotion ranking.

## Architecture

```
Buyer signals ──┐
Seller signals ─┤
Product signals ┼──► Marketplace Intelligence Engine ──► Opportunities ──► Actions
Promotion signals┤
Finance signals ─┘
```

### Module layout

| File | Role |
|------|------|
| `signals.ts` | Aggregate signals from sub-engines |
| `opportunities.ts` | `detectMarketplaceOpportunities()` |
| `insights.ts` | Health, problems, revenue forecasts |
| `recommendations.ts` | Admin AI recommendations |
| `queries.ts` | Dashboard + seller/buyer connections |

## Signal model

`MarketplaceSignal` types:

- `BUYER_DEMAND`
- `SELLER_GROWTH`
- `PRODUCT_GAP`
- `PROMOTION_OPPORTUNITY`
- `REVENUE_OPPORTUNITY`
- `CATEGORY_TREND`

Each signal includes `severity`, `message`, optional `category`, and `source`.

## Opportunity engine

`detectMarketplaceOpportunities(signals)` returns prioritized items:

```json
{
  "title": "Рост категории электроинструмент",
  "impact": "HIGH",
  "reason": "1200 поисков, низкое предложение",
  "recommendedAction": "Привлечь продавцов категории"
}
```

## Surfaces

| Route | Audience | Content |
|-------|----------|---------|
| `/admin/intelligence` | Admin | Health, opportunities, problems, AI recs |
| `/account/growth` | Seller | Marketplace Brain + Seller Growth |
| `/catalog?q=` | Buyer | Demand insights strip |

## Analytics

- `intelligence_view`
- `opportunity_view`
- `recommendation_click`

## Tests

- Unit: `tests/marketplace-intelligence.test.ts`
- E2E: `tests/e2e/marketplace-intelligence.spec.ts`

## Future ML evolution

1. Unified signal embedding space across buyer/seller/finance events
2. Causal impact models for opportunity prioritization
3. Automated playbook generation for ops team
4. Seller-level demand matching with inventory optimization (advisory)
5. Revenue forecast calibration from historical conversion lifts

## Boundaries

Intelligence **analyzes and recommends only**. No automatic catalog, pricing, ranking, or payment changes.
