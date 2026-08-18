# ADR-009: Events

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

State changes propagate via direct Zustand writes (`setBadges`) and hook refetches. No decoupled notification when cart or favorites change across tabs.

## Decision

Introduce a **Domain Event Bus** (interface in contracts; implementation in infrastructure):

- Use cases **publish** events after successful mutations
- Subscribers: badge projection, cache invalidation, telemetry — **not UI components directly**
- Events are immutable plain objects with discriminated `type` field

Frozen events (EPIC 92): see `domain/contracts/events.ts`.

UI refreshes via hook subscriptions to store slices updated by subscribers — not by importing EventBus in Experience.

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Zustand-only broadcasts | Couples all domains to global store |
| React Context events | React dependency in domain |
| Refetch everything on focus | Wasteful; caused badge races |
| No events (polling) | Tab badges already poll — replace with projection |

## Consequences

**Positive**

- Decouples cart mutations from tab bar
- Clear audit trail for state changes
- Testable publish/subscribe in use case tests

**Negative**

- Event ordering and idempotency must be documented
- Debugging indirect flows harder without devtools

## Future evolution

- Event log in dev builds
- Cross-tab sync if web embedded views added
- `FavoriteChanged` supersedes separate Added/Removed if needed
