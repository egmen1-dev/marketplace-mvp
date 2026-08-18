# EPIC 92 — Commerce Architecture Contracts

**Status:** COMPLETE (Architecture freeze)  
**Baseline:** Sprint 91 COMPLETE · Architecture approved  
**Branch:** `cursor/epic-92-commerce-architecture-contracts-d03e`  
**Scope:** Contracts and CI only — **no repository implementations, no use case implementations, no UI**

---

## Executive Summary

EPIC 92 **freezes** the commerce architecture before Sprint 93 implementation. Every engineer now has unambiguous answers for layering, state ownership, errors, events, caching, offline, telemetry, and design-system boundaries.

| Deliverable | Location |
|-------------|----------|
| Architecture Handbook | This document |
| ADR package (10) | `docs/architecture/adr/ADR-001` … `ADR-010` |
| Frozen TypeScript contracts | `apps/mobile/src/domain/contracts/` |
| Implementation Guidelines | `docs/product/COMMERCE_IMPLEMENTATION_GUIDELINES.md` |
| Migration Checklist | `docs/product/COMMERCE_MIGRATION_CHECKLIST.md` |
| CI validation | `npm run mobile:epic-92:validate` |

**Contracts version:** `DOMAIN_CONTRACTS_VERSION = "1.0.0"`

---

## Part 1 — Architecture Decision Records

| ADR | Title | Decision summary |
|-----|-------|------------------|
| [ADR-001](../architecture/adr/ADR-001-domain-layer.md) | Domain Layer | `domain/` owns business logic; strict import boundaries |
| [ADR-002](../architecture/adr/ADR-002-repository-pattern.md) | Repository Pattern | Interfaces in contracts; impl in infrastructure |
| [ADR-003](../architecture/adr/ADR-003-use-case-pattern.md) | Use Case Pattern | Pure TS `execute()`; hooks are adapters |
| [ADR-004](../architecture/adr/ADR-004-error-model.md) | Error Model | Unified `DomainError` + `Result<T,E>` |
| [ADR-005](../architecture/adr/ADR-005-state-ownership.md) | State Ownership | Single owner per entity; derived badges |
| [ADR-006](../architecture/adr/ADR-006-offline-strategy.md) | Offline Strategy | Declarative per-method offline policy |
| [ADR-007](../architecture/adr/ADR-007-caching-strategy.md) | Caching Strategy | L1/L2/L3 via CacheRepository |
| [ADR-008](../architecture/adr/ADR-008-telemetry.md) | Telemetry | TelemetryRepository only |
| [ADR-009](../architecture/adr/ADR-009-events.md) | Events | Domain event bus; UI via store slices |
| [ADR-010](../architecture/adr/ADR-010-design-system-contracts.md) | Design System | No API; callbacks from hooks |

Each ADR includes: Context, Decision, Alternatives, Consequences, Future evolution.

---

## Part 2 — Domain Contracts

Frozen TypeScript interfaces at `apps/mobile/src/domain/contracts/`:

| Category | Files |
|----------|-------|
| **Entities** | `entities/catalog`, `cart`, `checkout`, `order`, `session`, `seller`, `wallet`, `profile` |
| **Value objects** | `value-objects/ids`, `money`, `policies` |
| **Repositories** | `repositories/index.ts` — 14 interfaces + `RepositoryRegistry` |
| **Use cases** | `use-cases/index.ts` — `UseCase<TIn,TOut>` + 33 frozen names |
| **Events** | `events.ts` — 9 event types |
| **Errors** | `errors.ts` — 9 codes |
| **Result** | `result.ts` — `ok()` / `err()` helpers |

**Rule:** Transport DTOs (`MobileProductListItem`, etc.) are **forbidden** outside `infrastructure/transport/`.

---

## Part 3 — Event Contracts

Full payload spec: `artifacts/epic-92-contracts/event-contracts.json`

| Event | Key payload fields |
|-------|-------------------|
| `CartUpdated` | `cart`, optional `changedProductId` |
| `OrderCreated` | `orderId`, optional `orderNumber` |
| `FavoriteChanged` | `productId`, `isFavorite`, optional `favoritesCount` |
| `SellerOrderChanged` | `order`, `change` |
| `WalletChanged` | `balance` |
| `SessionExpired` | `reason`, optional `previousSession` |
| `ProfileUpdated` | `profile` |
| `ConnectivityChanged` | `offline`, `changedAt` |
| `CatalogInvalidated` | `scope`, optional `queryHash` |

---

## Part 4 — Repository Contracts

14 frozen interfaces in `domain/contracts/repositories/index.ts`:

`AuthRepository`, `CatalogRepository`, `SearchRepository`, `ProductRepository`, `FavoritesRepository`, `CartRepository`, `CheckoutRepository`, `OrderRepository`, `SellerRepository`, `WalletRepository`, `ProfileRepository`, `ConfigRepository`, `TelemetryRepository`, `CacheRepository`, `DeepLinkRepository`

No REST. No GraphQL. No implementations in EPIC 92.

---

## Part 5 — Error Contracts

```typescript
type DomainErrorCode =
  | "network" | "authentication" | "validation" | "business"
  | "server" | "offline" | "timeout" | "cancellation" | "unknown";
```

All repository and use case public APIs return `Result<T, DomainError>`.

---

## Part 6 — State Contracts

Per-domain ownership: `artifacts/epic-92-contracts/state-contracts.json`

Critical fix for Sprint 93: **`TabBadges` → BadgeProjection (derived)** — eliminate dual writers.

---

## Part 7 — Naming Rules

`artifacts/epic-92-contracts/naming-rules.json`

Quick reference:

- Entity: `ProductDetail` (PascalCase, no suffix)
- Repository: `{Domain}Repository` / `Rest{Domain}Repository`
- Use case: `LoadCatalog`, `AddToCart`
- Event: `CartUpdated` (type field)
- DTO: `Mobile*` — infrastructure only
- Hook: `use{Feature}Data`

---

## Part 8 — Folder Contracts

Frozen structure: `artifacts/epic-92-contracts/folder-contract.json`

```
apps/mobile/src/
├── domain/
│   ├── contracts/     ← EPIC 92 (frozen)
│   └── use-cases/     ← Sprint 93+
├── infrastructure/
│   ├── transport/
│   ├── repositories/
│   ├── cache/
│   └── events/
├── features/
├── app/
├── design-system/
└── store/
```

**No future reorganizations** without ADR amendment.

---

## Part 9 — CI Contracts

Workflow: `.github/workflows/mobile-architecture-gates.yml`

```bash
npm run mobile:epic-92:validate
```

| Check | Action |
|-------|--------|
| Deliverables exist | FAIL if missing |
| `domain/contracts` only under `domain/` | FAIL if use-cases added prematurely without gate update |
| Contracts import no api/react | FAIL |
| Contract dependency cycles | FAIL if cycles |
| Screen → api imports | FAIL if count **increases** above baseline (7) |
| Design-system → api | FAIL if count **increases** above baseline (5) |
| Token cycle gate | FAIL |
| Typecheck | FAIL |

Report: `artifacts/epic-92-contracts/gate-report.json`

---

## How Domains Communicate

1. **Use case → repository** for data
2. **Use case → event bus** after mutations
3. **Event subscribers** update cache, badges, telemetry
4. **No domain → domain direct imports** except via composed use cases

---

## Acceptance

- [x] 10 ADRs published
- [x] Domain contracts frozen (TypeScript)
- [x] Event contracts documented
- [x] Repository interfaces frozen
- [x] Error hierarchy frozen
- [x] State ownership documented
- [x] Naming rules published
- [x] Folder structure frozen
- [x] CI gate added
- [x] No runtime implementation code

---

## Next Step

**Sprint 93 — Domain Foundation Implementation**

Implement `infrastructure/transport/RestCommerceTransport` and first repositories (`Auth`, `Catalog`, `Cart`) against frozen contracts. Migrate one fat screen as proof.

Amend contracts only via new ADR + version bump of `DOMAIN_CONTRACTS_VERSION`.
