# Commerce Domain Guidelines

**Version:** 1.0.0 · **EPIC:** 91 · **Status:** Architecture Standard

These guidelines govern all mobile commerce development after Sprint 90. They apply to Buyer and Seller surfaces equally.

---

## 1. Layering Rules

```
Screen (app/)           → routing shell only
Experience (features/)  → presentation; no API imports
Hook (features/)        → binds use case to React; no business logic
Use Case (domain/)      → orchestration; no React
Repository (domain/)    → data access + DTO mapping
Transport (infra/)      → REST/GraphQL adapter
```

### Hard rules

| Rule | Enforcement |
|------|-------------|
| Screens must not import `api/endpoints` or `api/client` | Gate: `commerce_no_legacy_api_in_screens` |
| Experiences must not import `api/*` | Code review + lint |
| Design system must not mutate domain state | Pass callbacks from hooks |
| DTO types must not appear in UI props | Map to domain entities in repository |
| Business logic must not live in `useState` handlers in screens | Extract to use case |

---

## 2. Domain Boundaries

Each domain owns:

- **Entities** — typed models (`ProductDetail`, `Cart`, `OrderDetail`)
- **Repository interface** — public data API
- **Use cases** — user intents
- **Events** — state change notifications
- **Error codes** — domain-specific failures

Domains must **not**:

- Import from `app/` or `features/`
- Import from `design-system/`
- Read/write another domain's internal state

Cross-domain coordination happens via **use case composition** or **domain events**.

---

## 3. Repository Contract

Every repository method declares:

```typescript
interface RepositoryMethod<TInput, TOutput> {
  input: TInput;
  output: TOutput;
  errors: DomainError[];
  cachePolicy: CachePolicy;
  offlinePolicy: OfflinePolicy;
  retryPolicy: RetryPolicy;
  telemetry: string[];  // event names
}
```

Transport changes (REST → GraphQL) require changes **only** in the transport adapter implementation.

---

## 4. Use Case Contract

```typescript
interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, DomainError>>;
}
```

- Pure TypeScript — no `import React`
- Testable without renderer
- Emits domain events on success
- Maps repository errors to unified `DomainError`

---

## 5. State Ownership

| State type | Owner | Storage |
|------------|-------|---------|
| UI (sheet open, busy flags) | Experience | `useState` |
| Domain (cart, orders, catalog) | Repository + store slice | Memory + cache |
| Session (mode, boot, deep link) | SessionStore | Zustand |
| Persistent (tokens, caches) | CacheRepository | SecureStore |
| Derived (badges, totals) | Selectors | Never stored directly |

**One entity, one owner.** If two modules write the same field, extract a repository.

---

## 6. Domain Events

Events are plain objects published on an event bus:

```typescript
type DomainEvent =
  | { type: "CartUpdated"; cart: Cart }
  | { type: "FavoriteAdded"; productId: string }
  | { type: "OrderCreated"; orderId: string }
  | { type: "SellerOrderChanged"; orderId: string }
  | { type: "WalletUpdated"; balance: WalletBalance }
  | { type: "ProfileUpdated"; profile: UserProfile }
  | { type: "SessionExpired" }
  | { type: "ConnectivityChanged"; offline: boolean };
```

Subscribers: badge projection, telemetry, cache invalidation. **Never** subscribe from design-system.

---

## 7. Unified Error Model

```typescript
type DomainErrorCode =
  | "network"
  | "authentication"
  | "validation"
  | "business"
  | "server"
  | "offline"
  | "timeout"
  | "cancellation"
  | "unknown";

interface DomainError {
  code: DomainErrorCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
  field?: string;  // validation only
}
```

Map `ApiClientError` → `DomainError` **only** in transport/repository layer.

UI displays errors via `Experience` props — never inspect HTTP status in screens.

---

## 8. Cache Strategy (Architecture)

| Tier | Backend | TTL | Use |
|------|---------|-----|-----|
| L1 Memory | Map/LRU | 1–5 min | Catalog pages, cart snapshot |
| L2 SecureStore | Encrypted | 24h–7d | Orders, PDP, auth tokens |
| L3 Snapshot | Persistent (EPIC 92) | Session+ | Seller home/products/orders |

**Invalidation triggers:** domain events (`CartUpdated`, `OrderCreated`, etc.)

**Refresh strategy:** stale-while-revalidate when online; cache-only when offline.

**Conflict resolution:** server wins on fetch success; optimistic rollback on mutation failure.

---

## 9. Offline Policy Matrix

| Domain | Offline read | Offline write |
|--------|--------------|---------------|
| Catalog | Cached pages | Blocked |
| Product detail | SecureStore cache | Blocked |
| Cart | Last snapshot | Blocked |
| Checkout | Blocked | Blocked |
| Orders | SecureStore cache | Blocked |
| Favorites | Cached list | Queued toggle |
| Seller home | Snapshot (target: persistent) | Blocked |
| Seller sales | Snapshot | Blocked |
| Wallet | Last balance | Blocked |
| Auth | Restore session | Login blocked |

---

## 10. Telemetry

- Use cases emit telemetry via `TelemetryRepository.track()`
- Event names: `{domain}.{action}` (e.g. `cart.add`)
- Never call `postTelemetry` from screens or design-system
- Domain events may fan out to telemetry subscribers

---

## 11. File Layout (Target)

```
apps/mobile/src/
├── domain/
│   ├── entities/
│   ├── errors/
│   ├── events/
│   ├── repositories/       # interfaces
│   ├── use-cases/
│   └── selectors/
├── infrastructure/
│   ├── transport/          # RestCommerceTransport
│   ├── repositories/       # implementations
│   └── cache/
├── features/               # Experience + useCase hooks only
└── app/                    # route shells
```

---

## 12. Migration Priority

1. **P0** — Extract transport adapter; add `AuthRepository`, `CartRepository`, `CatalogRepository`
2. **P1** — Migrate fat screens (favorites, wallet, seller-home, seller-products, profile)
3. **P1** — Remove API calls from design-system recommendation rails
4. **P2** — `FavoritesRepository`, `OrderRepository`, `SellerRepository`
5. **P2** — Domain event bus + badge projection
6. **P3** — Persistent seller offline cache; telemetry queue

---

## 13. Review Checklist

Before merging any commerce PR:

- [ ] No new `api/endpoints` imports in `app/` or `design-system/`
- [ ] New data flow goes through repository interface
- [ ] Domain entity used instead of API DTO in Experience props
- [ ] State has single owner documented
- [ ] Errors use `DomainError` model
- [ ] Offline policy declared for new repository methods
- [ ] Telemetry event named and routed through `TelemetryRepository`
