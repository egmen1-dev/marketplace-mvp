# MARKETPLACE-TRUST-LOOP-001 — Reviews + Reputation + Moderation

Trust foundation layer: reviews, ratings, seller reputation, product moderation, and buyer trust signals.

## Feature flag

```bash
MARKETPLACE_TRUST_LOOP_ENABLED=true
```

## Architecture

```
lib/marketplace-trust-loop/
├── reviews/          # lifecycle, queries, actions
├── ratings/          # product + seller aggregation
├── moderation/       # rules, queue, decisions
├── content-quality/  # photo + card analysis
├── risk/             # prohibited products
├── ai-moderation/    # advisory copy only
└── queries.ts
```

## Database

- `reviews`, `review_photos`
- `product_ratings`, `seller_reputations`
- `product_moderations`, `moderation_queue_items`

## Routes

| Route | Purpose |
|-------|---------|
| `/account/reputation` | Seller reputation |
| `/admin/moderation` | Moderation queue |
| `/admin/trust` | Trust health dashboard |
| PDP + order detail | Reviews & trust signals |

## Moderation flow

1. Seller saves product (DRAFT)
2. Publish attempt → `submitProductForModeration`
3. Admin approves → `APPROVED`
4. Seller publishes → ACTIVE (existing catalog flow)

Prohibited content is rule-detected; AI provides advisory messages only.

## Analytics

- `review_view`, `review_started`, `review_created`, `review_published`
- `rating_updated`, `moderation_*`, `trust_signal_view`

## Tests

```bash
MARKETPLACE_TRUST_LOOP_ENABLED=true npm run test -- tests/marketplace-trust-loop.test.ts
MARKETPLACE_TRUST_LOOP_ENABLED=true npm run test:e2e -- tests/e2e/marketplace-trust-loop.spec.ts
```

## Migration

```bash
npx prisma migrate deploy
```

## Out of scope

Does not modify catalog core ranking, search ranking, finance ledger, order lifecycle, Stripe, or promotion ranking.
