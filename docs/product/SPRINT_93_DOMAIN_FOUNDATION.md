# Sprint 93 — Commerce Domain Foundation

**Baseline:** Closed Alpha 0.1.5-alpha · Sprint 90 COMPLETE · EPIC 91 COMPLETE · EPIC 92 COMPLETE  
**Branch:** `cursor/sprint-93-domain-foundation-d03e`

## Goal

Implement the first production Domain Layer so buyer commerce flows follow:

```
Screens → Hooks → Use Cases → Repositories → Transport → REST API
```

No screen should depend directly on API implementations for migrated surfaces.

## Delivered

### Part 1 — Domain structure

`apps/mobile/src/domain/` with pure TypeScript modules:

- `entities/`, `repositories/`, `use-cases/`, `events/`, `errors/`, `value-objects/`, `services/`
- Frozen contracts remain in `domain/contracts/` (EPIC 92, version 1.0.0)

### Part 2 — Infrastructure layer

`apps/mobile/src/infrastructure/`:

- `transport/` — `RestCommerceTransport`
- `repositories/` — REST repository implementations
- `mappers/` — DTO → domain entity
- `cache/`, `storage/`, `network/`, `retry/`

### Part 3 — RestCommerceTransport

Wraps authenticated HTTP via existing token refresh (`api/client`), with retry policy, error mapping to `DomainError`, and telemetry hooks.

### Part 4 — Repository implementations

| Repository | Implementation |
|------------|----------------|
| AuthRepository | `RestAuthRepository` |
| CatalogRepository | `RestCatalogRepository` |
| CartRepository | `RestCartRepository` |
| ProductRepository | `RestProductRepository` |
| ProfileRepository | `RestProfileRepository` |
| FavoritesRepository | `RestFavoritesRepository` |
| SearchRepository | `RestSearchRepository` |

Repositories return domain models only — never REST DTOs.

### Part 5 — DTO mapping

`infrastructure/mappers/commerce-mapper.ts` maps REST payloads to frozen contract entities.  
UI mapping lives in `features/commerce/product-view.ts` and `features/commerce/cart-view.ts`.

### Part 6 — Use cases

| Use case | Module |
|----------|--------|
| LoadCatalog | `domain/use-cases/catalog/load-catalog.ts` |
| LoadCategories | same |
| SearchProducts | `domain/use-cases/catalog/search-products.ts` |
| LoadProduct | `domain/use-cases/product/load-product.ts` |
| LoadProfile | `domain/use-cases/profile/load-profile.ts` |
| SubmitProductFeedback | `domain/use-cases/profile/submit-feedback.ts` |
| LoadCart / AddToCart / RemoveFromCart / UpdateCartQuantity | `domain/use-cases/cart/cart-use-cases.ts` |
| LoadFavorites / ToggleFavorite | `domain/use-cases/favorites/favorites-use-cases.ts` |

All return `Result<T, DomainError>`.

### Part 7 — Hook migration

| Hook | Status |
|------|--------|
| `useCatalogDiscovery` | Migrated → use cases |
| `useCartData` | Migrated → use cases |
| `useFavoritesData` | New hook + thin screen |
| `useProfileData` | New hook; screen uses hook for profile/session actions |

Composition root: `getCommerceUseCases()` in `domain/services/commerce-container.ts`.

### Part 8 — Event bus

`InProcessDomainEventBus` publishes:

- `CartUpdated`
- `FavoriteChanged`
- `ProfileUpdated`
- `SessionExpired`

Hooks subscribe for badge sync.

### Part 9 — Error layer

`domain/errors/error-factory.ts` creates typed domain errors.  
`infrastructure/network/map-api-error.ts` maps `ApiClientError` → `DomainError` (no HTTP codes in UI).

### Part 10 — Regression

Gate: `npm run mobile:sprint-93:gate`

Also validates: P0 token cycle, typecheck, tests.

## Artifacts

- `artifacts/sprint-93-domain/repository-report.json`
- `artifacts/sprint-93-domain/usecase-report.json`
- `artifacts/sprint-93-domain/migration-report.json`
- `artifacts/sprint-93-domain/architecture-report.json`
- `artifacts/sprint-93-domain/gate-report.json`

## Remaining work (post-Sprint 93)

- Seller screens (`seller-home`, `seller-products`) still import API directly
- Checkout/orders/product-detail hooks not yet migrated
- Design-system rails (`OrdersRecommendationsRail`, `PdpRelatedRail`) still call API
- `login.tsx`, `wallet.tsx`, boot pipeline

## Final report

See gate output for live counts. Seller platform readiness: partial — buyer domain foundation in place; seller repositories/use cases deferred to Sprint 94+.
