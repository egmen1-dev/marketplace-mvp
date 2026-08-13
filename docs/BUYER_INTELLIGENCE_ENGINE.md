# Buyer Intelligence Engine (BUYER-INTELLIGENCE-001)

Advisory layer that understands buyer intent and suggests products **without** changing catalog core, search ranking, organic ranking, orders, finance, or promotion ranking.

## Feature flag

```bash
BUYER_INTELLIGENCE_ENABLED=true   # default: off
```

Compute on demand. No database migrations required.

## Architecture

```
User query
    ↓
AI Understanding (search-understanding.ts)
    ↓
Buyer Intent (intent-parser.ts)
    ↓
Product Recommendations (recommendations.ts)
    ↓
Analytics + Admin insights
```

### Module layout

| File | Role |
|------|------|
| `lib/buyer-intelligence/intent-parser.ts` | Rule-based intent parsing |
| `lib/buyer-intelligence/buyer-profile.ts` | Profile from views, cart, orders |
| `lib/buyer-intelligence/search-understanding.ts` | Query + profile fusion |
| `lib/buyer-intelligence/recommendations.ts` | Match score + explanations |
| `lib/buyer-intelligence/queries.ts` | Server orchestration |
| `lib/buyer-intelligence/flags.ts` | Env gate |

## Intent model

### PurchaseIntent

- `RESEARCH` — «посоветуй хороший ноутбук»
- `COMPARISON` — «A или B»
- `READY_TO_BUY` — «купить дрель»
- `URGENT_PURCHASE` — «купить айфон 15 сегодня»

### BuyerIntent fields

- `category`, `intent` (use case), `buyerLevel`, `budget`, `needs[]`

Example for «дрель для дома»:

```json
{
  "category": "Дрели",
  "intent": "HOUSEHOLD_REPAIR",
  "buyerLevel": "BEGINNER",
  "budget": 5000,
  "needs": ["простота", "надежность", "доступная цена"]
}
```

## Buyer profile

Built from (when logged in):

- Search history (via analytics, admin aggregates)
- Viewed products
- Favorite categories
- Cart actions
- Purchase history

Signals: `buyerType`, `priceSensitivity`, `averageViewPrice`.

## Product match score (0–100)

**Advisory only — not used for ranking.**

| Factor | Weight |
|--------|--------|
| Intent match | 30 |
| Budget match | 20 |
| Category match | 20 |
| Seller trust | 15 |
| Availability | 15 |

## UX surfaces

| Surface | Block |
|---------|--------|
| Catalog search (`/catalog?q=`) | «Мы подобрали для вас» |
| PDP | «Почему этот товар вам подходит» |
| Seller product edit | «Почему покупают ваш товар» |
| Admin `/admin/buyers` | Buyer Insights dashboard |

## Analytics events

- `buyer_intent_detected`
- `buyer_recommendation_view`
- `buyer_recommendation_click`
- `buyer_match_score`

## Tests

- Unit: `tests/buyer-intelligence.test.ts`
- E2E: `tests/e2e/buyer-intelligence.spec.ts` (requires `BUYER_INTELLIGENCE_ENABLED=true`)

## Future ML

Current MVP uses keyword heuristics. Planned upgrades:

1. Embedding-based query ↔ product similarity
2. Collaborative filtering from `ProductView` / orders
3. LLM intent parser with guardrails (category + budget extraction)
4. Unmet-demand model linking admin insights to seller alerts
5. A/B evaluation of advisory CTR without touching organic rank

## Boundaries (do not change)

- Catalog Core listing/sort
- Search ranking
- Organic ranking
- Orders / Finance
- Promotion ranking
