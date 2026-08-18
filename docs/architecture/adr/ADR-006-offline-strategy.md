# ADR-006: Offline Strategy

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

Offline behavior is inconsistent: orders/product detail use SecureStore; seller home/sales use in-memory `Map` (lost on kill); cart/checkout hard-block; catalog skips fetch. `useAppStore.offline` is set by NetworkBanner polling every 5s.

## Decision

Adopt a **declarative offline policy** per repository method:

| Policy | Behavior |
|--------|----------|
| `cache-first` | Read cache; background refresh if online |
| `network-only` | Fail with `offline` error when disconnected |
| `queue-mutation` | Accept write locally; flush when online |
| `local-only` | No network (search history) |

Global connectivity from `ConnectivityStore` — repositories consult `OfflinePolicyService.isOffline()` before network calls.

Seller snapshots **must** move to SecureStore (persistent tier) in Sprint 93 — in-memory Map is deprecated.

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Per-screen offline if/else | Current fragmentation |
| Always offline-first | Checkout/payment cannot complete offline |
| Background sync service now | Scope creep for Closed Alpha |
| Ignore offline | Closed Alpha requirement for read-mostly flows |

## Consequences

**Positive**

- Predictable UX matrix per screen
- Testable policy without UI
- Queue path ready for favorites toggle

**Negative**

- Migration of seller snapshot storage
- Must document policy on every repository method

## Future evolution

- Mutation outbox table in SecureStore
- Conflict resolution on flush (server wins default)
- Reachability API replacing 5s poll
