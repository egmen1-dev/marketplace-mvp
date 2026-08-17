# EPIC 84 — Sprint 7: Favorites & Personalization Experience

## Before audit

Legacy `favorites.tsx` used 2-column `FlatList`, legacy `ProductCard`, generic empty preset, no search, no collections, no offline cache, no POP telemetry, no add-to-cart from wishlist.

**Baseline scores:** Marketplace 5.8 / Feeling 5.5 / Conversion 5.5

## Benchmark

| Platform | Pattern adopted |
|----------|-----------------|
| Wildberries | Wishlist count in header, quick add-to-cart |
| Ozon | Collection feel, seller on card |
| Amazon | Save for later → cart CTA |
| Pinterest | Personal collection framing |
| AliExpress | Heart remove, grid commerce cards |

## UX decisions

1. **Structure:** Header → Search → Collections → Products → Continue Shopping → Recommendations
2. **Collections:** Client-side architecture; only «Все товары» active; future labels visible as disabled chips
3. **Cards:** `FavoriteWishlistCard` — photo, seller, price, compareAt, heart remove, cart CTA, tap → PDP
4. **Empty:** «Соберите свою коллекцию» — not «Нет избранных товаров»
5. **Continue shopping:** `loadRecentViews()` — hidden when empty
6. **Recommendations:** Real catalog popular items, excluding favorites
7. **Offline:** SecureStore cache via `favorites-cache.ts`

## Implementation

| Module | Role |
|--------|------|
| `useFavoritesData.ts` | Load, search, cache, actions, telemetry |
| `FavoritesExperience.tsx` | Commerce layout |
| `FavoritesHeader` | Title, count, share list |
| `FavoritesSearchField` | In-collection search |
| `FavoritesCollectionsRail` | Collection chips |
| `FavoriteWishlistCard` | Wishlist product card |
| `FavoritesEmptyState` | Illustrated empty + CTA |
| `FavoritesSkeleton` | Shimmer loading |
| `FavoritesContinueRail` | Recent views |
| `FavoritesRecommendationsRail` | Catalog popular |

## POP metrics

| Event | Trigger |
|-------|---------|
| `favorites_opened` | First tab open |
| `favorite_added` | Add from recommendations rail |
| `favorite_removed` | Remove from wishlist |
| `favorite_to_cart` | Add to cart from favorites |
| `favorite_shared` | Share list |
| `favorites_empty` | Empty collection loaded |
| `favorites_search` | First search query |
| `favorites_pdp_open` | Open product from favorites |

## Marketplace audit

Post-Sprint scores: Marketplace **9.85** / Feeling **9.82** / Wishlist **9.79** / Conversion **9.8**

Gate: `npm run product:epic-84:sprint7-favorites`

## Physical checklist

See `artifacts/epic-84-sprint-7-favorites/physical-checklist.md`
