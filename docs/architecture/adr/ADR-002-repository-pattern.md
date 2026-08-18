# ADR-002: Repository Pattern

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

Data access is scattered: hooks call `fetchCatalog`, SecureStore caches live beside hooks, and offline policy differs per screen. Sprint 91 proposed 16 repositories without frozen interfaces.

## Decision

Every bounded context exposes a **Repository interface** in `domain/contracts/repositories/`. Implementations reside in `infrastructure/repositories/` and are the **only** code that:

- Imports `api/endpoints` or transport DTOs
- Maps DTO → domain entity
- Applies cache TTL, offline policy, and retry

Repository methods return `Result<T, DomainError>` (see ADR-004).

Naming: `{Domain}Repository` interface, `{Domain}RepositoryImpl` or `Rest{Domain}Repository` implementation.

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Hooks call API directly with mappers | Already failed — 40 import sites, no cache unity |
| Single DataRepository | Violates bounded context; cyclic dependencies |
| Redux Toolkit Query only | React-coupled; not use-case friendly |
| Pass-through repositories (no mapping) | DTO leakage to UI continues |

## Consequences

**Positive**

- REST → GraphQL requires adapter swap only
- Cache and offline centralized per entity
- Mock repositories enable use case unit tests

**Negative**

- Boilerplate interfaces + implementations
- Must maintain DTO mappers on API changes

## Future evolution

- Repository `observe()` streams for badge projection (EventBus complement)
- Write-behind queue repository for offline mutations
- Shared `CacheRepository` injected into all implementations
