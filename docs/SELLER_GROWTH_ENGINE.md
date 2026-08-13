# Seller Growth Engine (SELLER-GROWTH-001)

Advisory AI layer that helps sellers understand **why products underperform** and **what to fix next** — without changing catalog, search, promotion ranking, orders, or finance.

## Architecture

```
SellerProfile + Products + Orders + Promotion metrics
                    ↓
         seller-health.ts (snapshot)
                    ↓
         growth-score.ts (SellerGrowthScore 0–100)
                    ↓
    insights.ts + recommendations.ts (diagnostics + actions)
                    ↓
         /account/growth  ·  /admin/sellers
```

| Module | Role |
|--------|------|
| `seller-health.ts` | Load seller catalog, conversion, trust signals |
| `growth-score.ts` | Weighted `SellerGrowthScore` + levels |
| `insights.ts` | `generateSellerInsights()` — diagnostics |
| `recommendations.ts` | `SellerAction` list + opportunities |
| `queries.ts` | Dashboard + admin overview (compute on demand) |

**No database tables** — all scores computed at request time. Optional future cache: `SellerGrowthSnapshot`.

## Growth score model

| Factor | Weight |
|--------|--------|
| Product quality | 20 |
| Catalog completeness | 15 |
| Conversion rate | 20 |
| Promotion usage | 10 |
| Sales velocity | 15 |
| Customer trust | 10 |
| Inventory health | 10 |

### Levels

| Score | Level | Label |
|-------|-------|-------|
| 80–100 | `STRONG` | Сильный продавец |
| 50–79 | `GROWING` | Вы растущий продавец |
| 0–49 | `NEEDS_ATTENTION` | Нужно внимание к росту |

## Seller UX — `/account/growth`

Sections:

1. **Мой уровень** — score, level, strengths/weaknesses
2. **Что улучшить** — insights by category (card, price, inventory, promotion, assortment)
3. **Возможности** — ready for promotion / needs improvement counts
4. **Следующий шаг** — top priority `SellerAction`
5. **AI Actions** — actionable list with links (edit product, promotions, new product)

## AI insights

`generateSellerInsights()` returns typed diagnostics:

```typescript
{
  type: "CONVERSION" | "CARD" | ...,
  severity: "HIGH" | "MEDIUM" | "LOW",
  title, reason, action,
  productId?, productTitle?
}
```

Categories: карточка, цена, остатки, доверие, продвижение, ассортимент.

## Admin intelligence — `/admin/sellers`

**Seller Growth Overview**:

- Top sellers by growth score
- At-risk sellers (low score / no recent orders)
- Inactive sellers (no orders in 30 days)
- Headlines: unpromoted ready products, single-product sellers, high potential SKUs

## Analytics

- `seller_growth_view`
- `seller_insight_view`
- `seller_action_click`
- `seller_action_complete`

## Feature flag

```env
SELLER_GROWTH_ENABLED=true
```

Integrates with `PROMOTION_INTELLIGENCE_ENABLED` for promotion-ready product counts.

## Tests

- Unit: `tests/seller-growth.test.ts`
- E2E: `tests/e2e/seller-growth.spec.ts`

## Future ML evolution

1. **Predictive churn** — model seller inactivity before 45-day threshold
2. **Price elasticity** — category-level demand curves for `ADJUST_PRICE` actions
3. **Personalized weights** — per-category factor tuning from historical outcomes
4. **LLM coach** — natural-language explanations from structured insight JSON (no auto-apply)
5. **SellerGrowthSnapshot** — nightly batch cache for faster admin scans

All future models remain **recommendation-only** — seller confirms every change.
