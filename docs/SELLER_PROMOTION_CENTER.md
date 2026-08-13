# Seller Promotion Center (SELLER-PROMOTION-CENTER-001)

Intelligent seller advertising dashboard — campaign management, budget guidance, analytics, and AI coaching without changing catalog, search, ranking, orders, finance ledger, or Stripe payment flow.

## Feature flag

```bash
SELLER_PROMOTION_CENTER_ENABLED=true   # default: off
```

Recommended companion flags for full data:

```bash
PROMOTION_BILLING_ENABLED=true
PROMOTION_ANALYTICS_ENABLED=true
PROMOTION_INTELLIGENCE_ENABLED=true
MARKETPLACE_LEARNING_ENABLED=true
```

## Architecture

```
Promotion Billing · Analytics · Intelligence
Seller Growth · Buyer Intelligence · Marketplace Learning
        ↓
lib/seller-promotion-center/
        ↓
Seller / Admin UI + notifications + analytics events
```

### Module layout

| File | Role |
|------|------|
| `dashboard.ts` | 30-day summary cards (spend, ROI, funnel totals) |
| `campaigns.ts` | Campaign cards with status, budget, performance |
| `performance.ts` | Analytics funnel, campaign comparison, formatting |
| `recommendations.ts` | Product opportunities from Promotion Intelligence + Learning |
| `budget.ts` | Smart budget assistant (advisory only) |
| `insights.ts` | AI promotion coach, low-performance detection |
| `queries.ts` | Seller dashboard, admin extension, notifications |
| `permissions.ts` | Seller/admin access gates |
| `flags.ts` | `SELLER_PROMOTION_CENTER_ENABLED` |

## Seller journey

1. Open `/account/promotion-center` (legacy `/account/promotions` redirects here).
2. Review summary cards for the last 30 days.
3. Pick a product from **«Какие товары стоит продвигать»** (Promotion Score, reasons).
4. Launch promotion via existing billing actions or free start when billing is off.
5. Manage campaigns: pause, extend, change plan, stop.
6. Read **«Рекомендация бюджета»** — suggestion only, no guaranteed outcome.
7. Inspect analytics funnel and **«Что работает лучше»** comparison.
8. Follow **«AI советует»** actions to improve cards before scaling spend.

## Admin

`/admin/promotions` includes **Admin Promotion Control**:

- Total ad spend / platform revenue
- Active sellers
- Top promoted categories
- Seller table: spend, GMV, ROI, campaign count

## Notifications

When command center is disabled and promotion center is enabled, `/notifications` merges:

| Type | Meaning |
|------|---------|
| `PROMOTION_STARTED` | Campaign active |
| `PROMOTION_RESULT` | Orders and ROI snapshot |
| `PROMOTION_LOW_PERFORMANCE` | Impressions/clicks without orders |
| `PROMOTION_OPPORTUNITY` | High Promotion Score product |

## Analytics events

- `promotion_center_view`
- `promotion_product_recommendation_view`
- `promotion_campaign_open`
- `promotion_budget_recommendation_view`
- `promotion_ai_advice_click`

## Constraints

- Reuses existing promotion actions (`startPromotionAction`, `purchasePromotionAction`, pause/end).
- Does **not** modify Catalog Core, Search, Ranking, Orders, Finance ledger, Stripe checkout logic, or promotion ranking.
- Budget and AI blocks are advisory — copy includes non-guarantee disclaimers.

## Future: CPC / auction

The center is plan-based today (fixed-duration promotion orders). A future CPC/auction layer would:

- Add bid inputs and daily caps in `budget.ts`
- Surface auction diagnostics in `performance.ts`
- Keep billing settlement in existing Promotion Billing without ledger changes

## Future: AI optimization

Potential extensions (not implemented):

- Auto-pause on low ROI thresholds (seller opt-in)
- Cross-product budget reallocation suggestions
- Seasonal timing from Marketplace Learning patterns

## Tests

- Unit: `tests/seller-promotion-center.test.ts` — ROI, budget, recommendations, permissions
- E2E: `tests/e2e/seller-promotion-center.spec.ts` — seller center, redirect, admin panel
