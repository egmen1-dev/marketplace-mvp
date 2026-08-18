# ADR-001: Domain Layer

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

The mobile app (Closed Alpha 0.1.5-alpha) calls `api/endpoints.ts` from 40 import sites. Screens, hooks, design-system components, and boot code share DTO types and duplicate fetch logic. Sprint 91 defined 22 domains and 42 use cases but left implementation open.

Engineers need a frozen boundary before writing repositories or migrating screens.

## Decision

Introduce a **Domain Layer** at `apps/mobile/src/domain/` containing:

1. **Contracts** (EPIC 92) — entities, repository interfaces, use case interfaces, events, errors
2. **Use Cases** (Sprint 93+) — pure TypeScript orchestration, no React
3. **Repository interfaces** live in contracts; implementations live in `infrastructure/`

Dependency direction is strict:

```
app/ → features/ → domain/use-cases → domain/contracts ← infrastructure/
```

The domain layer must **never** import from `app/`, `features/`, `design-system/`, or `api/`.

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Continue hook → API pattern | Does not scale to Seller EPIC; DTO leakage persists |
| React Query as “domain layer” | Ties data to React lifecycle; not provider-independent |
| Feature folders own API modules | Per-feature duplication; no shared error/cache policy |
| Monolithic service layer | Becomes god-object; violates domain boundaries |

## Consequences

**Positive**

- Single place for business rules and entity shapes
- Transport (REST/GraphQL) swappable without UI changes
- Testable use cases without renderer

**Negative**

- Upfront migration cost for 7 fat screens and 5 DS API sites
- Two-layer indirection (use case → repository → transport)
- Contract changes require ADR amendment

## Future evolution

- Split domain into `@lot/commerce-domain` package if web seller desk shares models
- Add domain-level validation schemas (Zod) co-located with entities
- GraphQL codegen feeds transport adapter only — entities unchanged
