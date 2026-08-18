# ADR-003: Use Case Pattern

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

Business logic lives in `use*Data` hooks, Experience handlers, and screen `useState` callbacks. The same mutations (`toggleFavorite`, `addToCart`) appear in 8+ call sites.

## Decision

Each user intent is a **Use Case** — a pure class or function implementing:

```typescript
interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, DomainError>>;
}
```

Location: `domain/use-cases/{domain}/{UseCaseName}.ts`

React hooks in `features/` **only**:

1. Call `useCase.execute(input)`
2. Map `Result` to view-model state
3. Subscribe to domain events for refresh

Use cases may compose multiple repositories and emit domain events. **No React imports.**

Naming: verb + noun (`LoadCatalog`, `AddToCart`, `ToggleFavorite`).

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Fat hooks with all logic | Untestable without React; duplicated across screens |
| Redux actions as use cases | Global store anti-pattern for entity ownership |
| Screen-local orchestration | Already causes fat screens (wallet, favorites, seller-home) |
| CQRS event sourcing full stack | Over-engineered for Closed Alpha scope |

## Consequences

**Positive**

- One implementation per intent; telemetry and retry in one place
- Hooks become thin adapters
- Clear migration path: extract from hook → use case → delete duplicate

**Negative**

- More files per feature
- Requires dependency injection or factory for repository instances

## Future evolution

- Use case registry for deep-link → use case routing
- Command/Query split folders when write volume grows
- Shared `UseCaseContext` for session + telemetry injection
