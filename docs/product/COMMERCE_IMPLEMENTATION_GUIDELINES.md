# Commerce Implementation Guidelines

**Version:** 1.0.0 · **EPIC:** 92 · **Supersedes:** EPIC 91 guidelines for implementation phase

Read **after** ADRs and **before** writing Sprint 93 code.

---

## 1. Start here

1. Read `docs/architecture/adr/ADR-001-domain-layer.md`
2. Import types from `apps/mobile/src/domain/contracts` — never from `api/endpoints`
3. Run `npm run mobile:epic-92:validate` before every PR

---

## 2. Implementing a repository

```typescript
// infrastructure/repositories/RestCartRepository.ts
import type { CartRepository } from "../../domain/contracts";
import { ok, err } from "../../domain/contracts";
import type { RestCommerceTransport } from "../transport/RestCommerceTransport";

export class RestCartRepository implements CartRepository {
  constructor(
    private readonly transport: RestCommerceTransport,
    private readonly cache: CacheRepository,
    private readonly events: DomainEventBus,
  ) {}

  async loadCart() {
    // 1. Check offline policy
    // 2. Try cache (L1)
    // 3. Call transport.fetchCart() — maps DTO → Cart entity HERE
    // 4. Return Result<Cart, DomainError>
  }
}
```

**Checklist per method:**

- [ ] Returns `Result<T, DomainError>`
- [ ] Maps DTO inside implementation only
- [ ] Declares cache tier + TTL (see state-contracts.json)
- [ ] Declares offline policy (ADR-006)
- [ ] Emits telemetry via TelemetryRepository
- [ ] Publishes domain events on mutations

---

## 3. Implementing a use case

```typescript
// domain/use-cases/cart/AddToCart.ts
import type { UseCase } from "../../contracts";
import type { CartRepository, DomainEventBus, TelemetryRepository } from "../../contracts";

export class AddToCart implements UseCase<AddToCartInput, Cart> {
  constructor(
    private readonly cart: CartRepository,
    private readonly events: DomainEventBus,
    private readonly telemetry: TelemetryRepository,
  ) {}

  async execute(input: AddToCartInput) {
    const result = await this.cart.addItem(input.productId, input.quantity);
    if (result.ok) {
      this.events.publish({ type: "CartUpdated", cart: result.value, changedProductId: input.productId });
      await this.telemetry.track({ name: "cart.add" });
    }
    return result;
  }
}
```

**Rules:**

- No `import React`
- No direct `fetch` or `apiRequest`
- Single responsibility — one user intent
- Name matches frozen `UseCaseName` in contracts

---

## 4. Hook adapter pattern

```typescript
// features/cart-checkout/useCartData.ts
export function useCartData() {
  const addToCart = useMemo(() => createAddToCartUseCase(), []);
  const [state, setState] = useState<CartViewModel>(initial);

  const handleAdd = useCallback(async (productId: ProductId) => {
    setState((s) => ({ ...s, busy: true }));
    const result = await addToCart.execute({ productId, quantity: 1 });
    if (result.ok) setState(mapCartToViewModel(result.value));
    else setState((s) => ({ ...s, error: result.error }));
  }, [addToCart]);

  return { state, handleAdd };
}
```

Experiences receive view-models and callbacks — **never repositories**.

---

## 5. Error handling in UI

| `DomainError.code` | UI pattern |
|--------------------|------------|
| `network`, `server`, `timeout` | SectionErrorCard + retry if `retryable` |
| `authentication` | Redirect to login |
| `validation` | Inline field error via `field` |
| `business` | Inline message |
| `offline` | Offline banner + cache fallback |
| `cancellation` | Silent |

Never branch on HTTP status in Experience components.

---

## 6. Design system integration

```tsx
// ✅ Correct
<PdpRelatedRail
  products={vm.related}
  onToggleFavorite={(id) => toggleFavorite.execute({ productId: id })}
/>

// ❌ Forbidden
import { toggleFavorite } from "../../api/endpoints";
```

---

## 7. Testing

| Layer | Test type |
|-------|-----------|
| Use case | Unit test with mock repositories |
| Repository | Integration test with mock transport |
| Hook | React test with stub use cases |
| Experience | Snapshot / accessibility only |

---

## 8. Contract changes

1. Write ADR amendment
2. Bump `DOMAIN_CONTRACTS_VERSION`
3. Update `artifacts/epic-92-contracts/*`
4. Get architecture review

**Never** change contracts silently in implementation PRs.

---

## 9. Prohibited patterns

- `fetchX()` in `app/` screens
- `MobileProductListItem` in Experience props
- `postTelemetry()` outside TelemetryRepository
- `setBadges()` from feature hooks — use BadgeProjection subscriber
- New files under `domain/` other than `contracts/` and `use-cases/` without ADR

---

## 10. Reference artifacts

| Artifact | Purpose |
|----------|---------|
| `artifacts/epic-92-contracts/event-contracts.json` | Event payloads |
| `artifacts/epic-92-contracts/state-contracts.json` | Ownership + TTL |
| `artifacts/epic-92-contracts/naming-rules.json` | Naming |
| `artifacts/epic-92-contracts/folder-contract.json` | Import rules |
| `artifacts/epic-91-domain/usecase-map.json` | Use case catalog |
