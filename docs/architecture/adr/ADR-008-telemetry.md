# ADR-008: Telemetry

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

`postTelemetry` is called from 17 files with ad hoc event shapes. Boot telemetry is separate (`startup-telemetry.ts`). No correlation between domain actions and analytics.

## Decision

All telemetry flows through **`TelemetryRepository.track(event: DomainTelemetryEvent)`**.

Event naming: `{domain}.{action}` (e.g. `cart.add`, `orders.detail`).

Emitters:

- Use cases (primary) — after success/failure with `DomainError.code`
- Boot pipeline — via `BootstrapRepository` wrapper
- **Never** screens or design-system directly

Events are fire-and-forget; failures must not block user flows. Offline: drop or queue based on `remoteConfig.telemetryQueue` flag (future).

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Direct postTelemetry everywhere | Current scatter; untyped payloads |
| Analytics SDK (Firebase) now | Vendor lock-in; not Closed Alpha scope |
| No client telemetry | Cannot debug Closed Alpha cohort |
| Log-only in dev | No production signal |

## Consequences

**Positive**

- Typed event catalog in contracts
- Consistent session/device enrichment in one place
- Easy to mock in tests

**Negative**

- Migration of 17 call sites
- Event schema versioning discipline

## Future evolution

- Offline queue flush on reconnect
- Marketplace quality score correlation (server-side)
- PII scrubbing layer in TelemetryRepository
