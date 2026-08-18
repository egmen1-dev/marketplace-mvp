# ADR-010: Design System Contracts

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

Sprint 90 unified UI under `design-system/`. Three recommendation rails still import `addToCart` / `toggleFavorite` from API. Design-system must remain presentation-only.

## Decision

Design system components **must not**:

- Import `api/*`, `domain/use-cases`, or `infrastructure/*`
- Import transport DTO types (`MobileProductListItem` from endpoints)
- Mutate domain state internally

Allowed imports:

- `design-system/tokens/*`
- `design-system/contracts/*` (presentation props types only)
- Domain **entity types** re-exported via `features/view-models` — not raw entities in DS props when avoidable; prefer narrow prop interfaces (`onAddToCart: () => void`)

Parent hooks pass **callbacks** bound to use cases:

```tsx
<CartRecommendationsRail products={vm.items} onAddToCart={(id) => addToCart.execute({ productId: id })} />
```

Design tokens remain the sole source of visual values (Sprint 90 rule unchanged).

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Smart components in DS | Breaks tree-shaking and test isolation |
| Duplicate button components in features | Sprint 90 eliminated dual UI |
| DS imports use cases directly | Creates React-free violation path via hooks only |

## Consequences

**Positive**

- DS stays portable and visual-parity stable
- Clear CI gate: zero `api/` imports under `design-system/`
- Seller EPIC UI reuses DS without commerce coupling

**Negative**

- More callback props on rail components
- View-model mapping in hooks

## Future evolution

- `design-system/contracts/` for shared presentation prop types
- Storybook with mock callbacks only
- DS components accept generic `ProductCardViewModel` type alias from features
