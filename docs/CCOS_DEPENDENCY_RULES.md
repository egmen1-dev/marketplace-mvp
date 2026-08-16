# CCOS Dependency Rules

## Core rule

`lib/ccos/**` must **not** import from:

- `lib/marketplace-*`
- Prisma product/seller models
- Wallet, trust enforcement, ranking live sort

Allowed: Node builtins, generic utils, CCOS internal modules.

## Marketplace binding

`lib/marketplace-cognitive-platform/**` may import:

- `lib/ccos/**`
- Existing marketplace intelligence modules (content-quality, trust-score, ranking-intelligence, …)

Publishers adapt domain data → `UniversalObservation[]`.

## UI

- Seller edit page imports MCP queries + preview component (flagged)
- Admin cognitive page imports MCP brain report (flagged)
- **Must not** import CCOS into `features/products/queries.ts` / `resolveOrderBy()`

## Tests

`tests/ccos-advisory-boundary.test.ts` guards search ordering isolation.

## Cross-app future

```text
DAOS → DAOS publisher → UniversalObservation → CCOS
QuickSale → QuickSale publisher → UniversalObservation → CCOS
```

Never import DAOS/QuickSale business logic into `lib/ccos/`.

## Feature flags

When `CCOS_ENABLED=false`:

- Zero new runtime behaviour
- Cognitive UI hidden
- Observation bus not invoked from production UI paths
