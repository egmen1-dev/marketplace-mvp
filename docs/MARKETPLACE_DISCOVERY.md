# MARKETPLACE-DISCOVERY-001

Consumer discovery experience layer — curated «Находки ЛОТ» without changing catalog core, search, ranking, orders, or finance.

## Feature flags

```bash
MARKETPLACE_DISCOVERY_ENABLED=true
DISCOVERY_DAILY_FINDS_ENABLED=true
DISCOVERY_COLLECTIONS_ENABLED=true
DISCOVERY_PRICE_GAME_ENABLED=true
DISCOVERY_AI_CONTEXT_ENABLED=true
```

All surfaces are no-ops when `MARKETPLACE_DISCOVERY_ENABLED=false`. Sub-flags require the master flag.

## Architecture

```
lib/marketplace-discovery/
  flags.ts
  types.ts
  feeds.ts
  collections.ts
  daily-finds.ts
  price-game.ts
  recommendation-context.ts
  gift-engine.ts
  stories.ts
  queries.ts
  analytics.ts
  permissions.ts
  actions.ts
  index.ts

features/marketplace-discovery/
  components/   — home feed, PDP why-block, price game, admin, seller tips
  index.ts
```

Discovery reads existing marketplace signals only:

- `listProducts()` for curated sections (does not alter organic ranking)
- Buyer Intelligence via views / favorites on product cards
- Trust Loop ratings when `MARKETPLACE_TRUST_LOOP_ENABLED=true`
- Reviews for buyer stories
- Seller Growth completeness via `computeProductCompletenessScore`
- Analytics events for admin dashboards

**Not modified:** Catalog Core, Search, Ranking, Orders, Finance, Payments, Seller Growth ranking, Promotion Ranking.

## User flows

| Flow | Surface | Purpose |
|------|---------|---------|
| Discovery Home | `/` — «Находки ЛОТ» | Curated sections: daily find, gifts, unexpected, value deals |
| Why this product | PDP — «Почему стоит посмотреть?» | Explain selection from trust + buyer signals |
| AI Situation | Home — «Что вам нужно?» | Recommendation rails by situation (not search) |
| Price Game | Home — «Угадайте цену» | Viral engagement mechanic |
| Collections | `/discover/collections/[slug]` | SEO + discovery landing pages |
| Daily find | Home banner for signed-in users | Return mechanic without push spam |
| Buyer stories | Home | Social proof from approved reviews |
| Seller tips | `/account/discovery` | How to qualify for discovery placements |
| Admin | `/admin/discovery` | Popular discoveries, CTR, opportunities |

## Analytics

Events (see `lib/analytics/events.ts`):

- `discovery_view`, `discovery_section_view`, `discovery_product_click`
- `discovery_product_view`, `discovery_add_to_cart`, `discovery_purchase`
- `collection_opened`, `daily_find_view`, `daily_find_click`
- `price_game_started`, `price_game_completed`, `situation_selected`

## Seller safety

Discovery does not create a separate ranking game:

- Products still surface via Search → Category → SEO → Discovery paths
- Seller tips link to completeness, photos, reviews, Trust Score
- No changes to promotion or organic sort algorithms

## Future ML integration

`recommendation-context.ts` and `daily-finds.ts` are designed for later replacement of heuristics with:

- Collaborative filtering from `ProductView` / purchases
- Embedding-based situation matching
- Personal daily find models

Keep feature flags per module to roll out ML gradually.

## Security

- Admin dashboard requires `UserRole.ADMIN` (`assertDiscoveryAdminAccess`)
- Buyer stories never expose buyer identity — city + reason only
- Situation loader uses server actions; no raw SQL from client
- Analytics payloads exclude PII (product ids only)

## Tests

```bash
npm test -- tests/marketplace-discovery.test.ts
npx playwright test tests/e2e/marketplace-discovery.spec.ts
```

Set discovery flags in the Playwright environment for e2e.

## Acceptance checklist

| Criterion | Status |
|-----------|--------|
| New way to find products without search | ✅ Home + situations |
| Does not break seller SEO | ✅ Separate collection pages |
| Does not change organic ranking | ✅ Advisory `listProducts` only |
| Viral mechanics for social | ✅ Price game |
| SEO collections | ✅ `/discover/collections/*` |
| Why product chosen | ✅ PDP + cards |
| Seller benefits | ✅ `/account/discovery` |
| Analytics | ✅ Events + admin dashboard |
| Admin management | ✅ `/admin/discovery` |
| Core systems unchanged | ✅ Isolated layer |
