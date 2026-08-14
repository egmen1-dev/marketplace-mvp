# MARKETPLACE-SOCIAL-GROWTH-001

Viral commerce layer — turns discovery finds into shareable content without changing catalog core, search, ranking, orders, or finance.

## Feature flags

```bash
MARKETPLACE_SOCIAL_GROWTH_ENABLED=true
SOCIAL_SHARE_CARDS_ENABLED=true
SOCIAL_COLLECTIONS_ENABLED=true
SOCIAL_CREATOR_ENABLED=true
```

Recommended stack with Discovery + Trust Loop for richer share cards and moderation.

## Architecture

```
lib/marketplace-social-growth/
  flags.ts
  types.ts
  share-cards.ts
  content-generator.ts
  viral-formats.ts
  landing-definitions.ts
  collections.ts
  creator.ts
  campaigns.ts
  trust-guard.ts
  analytics.ts
  queries.ts
  permissions.ts
  actions.ts
  index.ts
```

Builds on:

- Marketplace Discovery (`buildWhyReasons`, discovery eligibility)
- Trust Loop (prohibited products, moderation status)
- Buyer Intelligence (views, favorites on cards)
- Analytics events for admin dashboards

**Not modified:** Catalog Core, Search, Ranking, Orders, Finance, Payments, Promotion ranking.

## User flows

| Flow | Route | Purpose |
|------|-------|---------|
| Share card | Discovery cards → «Поделиться находкой» | 9:16 / story / post preview + Telegram/VK |
| Viral formats | Seller `/account/social-tools` | Price surprise, daily find, why-buy content |
| User collections | `/account/finds` | «Мои находки» with share links |
| Public collection | `/social/c/[slug]` | Shared user/creator lists |
| SEO/social landings | `/social/gifts`, `/social/under-1000`, … | External traffic entry |
| Admin | `/admin/social-growth` | Viral content + opportunities |

## Data model

Prisma models (migration `20260813200000_marketplace_social_growth`):

- `SocialCollection` — user «Мои находки» or `CREATOR` collections
- `SocialCollectionItem` — products in a collection

## Seller protection & Trust Loop

`validateSocialContent()` blocks:

- Prohibited products (Trust Loop keyword rules)
- Missing photos
- Rejected / prohibited moderation states

No misleading claims in viral format templates — uses factual signals only (price, ratings, favorites).

## Analytics

Events:

- `share_card_view`, `share_clicked`, `content_generated`, `content_shared`
- `viral_card_opened`, `external_visit`
- `collection_created`, `collection_shared`, `creator_collection_view`
- `social_purchase`

## Future ML

Replace heuristic viral format selection with:

- CTR prediction per format
- Personalized share copy
- Creator ranking

Keep sub-flags for gradual rollout.

## Tests

```bash
npm test -- tests/marketplace-social-growth.test.ts
npx playwright test tests/e2e/marketplace-social-growth.spec.ts
```

## Acceptance checklist

| Criterion | Status |
|-----------|--------|
| Share finds | ✅ Share card modal on Discovery |
| Products → content | ✅ Viral format generator |
| Viral formats | ✅ 4 templates |
| User collections | ✅ `/account/finds` |
| Creator foundation | ✅ `SocialCollection` CREATOR kind |
| Seller tools | ✅ `/account/social-tools` |
| SEO/social pages | ✅ `/social/*` |
| Analytics | ✅ Events + admin dashboard |
| Admin control | ✅ `/admin/social-growth` |
| Trust protection | ✅ `trust-guard.ts` |
| Core unchanged | ✅ Isolated layer |
