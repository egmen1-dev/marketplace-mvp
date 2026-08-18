# ADR-005: State Ownership

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

State is fragmented: Zustand holds flags and badges, hooks hold cart/orders, screens hold favorites/wallet/seller data, SecureStore holds caches. `badges.cart` has two writers (`useTabBadges`, `useCartData`).

## Decision

Classify state into five tiers with **single owner** each:

| Tier | Owner | Storage |
|------|-------|---------|
| UI State | Experience component | `useState` / animation refs |
| Domain State | Repository (+ optional store slice) | Memory via repository cache |
| Session State | `SessionStore` | Zustand (mode, boot, deep link, role) |
| Connectivity State | `ConnectivityStore` | Zustand (`offline` from NetworkBanner) |
| Persistent State | `CacheRepository` | SecureStore tiers |

**Derived state** (tab badges, subtotals) is computed by **selectors** — never written directly by UI.

Entity ownership examples:

- `Cart` → `CartRepository`
- `FavoritesSet` → `FavoritesRepository`
- `OrderList` → `OrderRepository`
- `SellerHomeDashboard` → `SellerRepository`

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Single global Redux store | Violates bounded context; high coupling |
| React Query as owner | Provider lock-in; badges still need projection |
| Screen-local state for all entities | Current pain — 7 fat screens |
| Duplicate read models per screen | Cache inconsistency |

## Consequences

**Positive**

- Eliminates badge/favorites duplication
- Clear invalidation on domain events
- Offline reads from one cache per entity

**Negative**

- Refactor of existing hooks and Zustand badge writes
- Learning curve for selector pattern

## Future evolution

- `observe()` on repositories feeding lightweight store slices
- Seller persistent snapshots promoted from in-memory Map (ADR-006)
- Config store split from session store when flags grow
