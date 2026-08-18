# ADR-007: Caching Strategy

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

Caches exist ad hoc: `order-cache.ts`, `product-detail-cache.ts`, `offline-cache.ts`, `boot-storage.ts`. No TTL standard, no unified invalidation.

## Decision

Three-tier cache via **`CacheRepository`**:

| Tier | Backend | Default TTL |
|------|---------|-------------|
| L1 | Memory LRU | 1–5 minutes |
| L2 | SecureStore | 24 hours – 7 days |
| L3 | Snapshot (seller) | Session + persist |

**Refresh:** stale-while-revalidate when online.

**Invalidation:** domain events (`CartUpdated`, `OrderCreated`, etc.) trigger scoped `CacheRepository.invalidate(scope)`.

**Conflict:** server response wins on fetch; optimistic mutations rollback on failure.

Repositories declare `cachePolicy` on each method in contract metadata (JSON + TSDoc).

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| No cache (always network) | Poor offline UX; tab badge storms |
| React Query cache only | Not shared with use cases / SecureStore |
| Infinite cache | Stale data bugs on order status |
| File-system cache | Unnecessary complexity on mobile |

## Consequences

**Positive**

- Single invalidation bus
- Tunable TTL per entity
- Reduced duplicate `fetchCatalog` calls

**Negative**

- Cache key design upfront work
- Storage size limits on SecureStore

## Future evolution

- ETag / If-None-Match in transport adapter
- Cache size telemetry and eviction metrics
- Shared catalog cache key = hash(CatalogQuery)
