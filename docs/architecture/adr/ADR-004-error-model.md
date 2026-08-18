# ADR-004: Error Model

**Status:** Accepted · **Date:** 2026-08-18 · **EPIC:** 92

## Context

Errors today are `ApiClientError`, raw `Error`, or string messages in screen state. UI components inspect HTTP status inconsistently.

## Decision

Adopt a unified **`DomainError`** hierarchy with frozen codes:

| Code | Meaning |
|------|---------|
| `network` | Transport failure, DNS, connection reset |
| `authentication` | 401, expired session, revoked refresh |
| `validation` | Client-side or server field validation |
| `business` | Rule violation (out of stock, insufficient balance) |
| `server` | 5xx, malformed envelope |
| `offline` | Operation blocked by offline policy |
| `timeout` | AbortSignal / stage timeout |
| `cancellation` | User or navigation abort |
| `unknown` | Unmapped failure |

All repository and use case public methods return `Result<T, DomainError>`.

`ApiClientError` maps to `DomainError` **only** in `infrastructure/transport/`.

UI receives `DomainError` or view-model error props — never HTTP status codes.

## Alternatives

| Alternative | Rejected because |
|-------------|------------------|
| Keep ApiClientError in hooks | Leaks transport to presentation |
| Exception throwing only | Hard to compose in use cases; no typed codes |
| Per-domain error classes without union | Inconsistent handling across screens |
| Result tuple `[T | null, string]` | Loses retryable flag and field binding |

## Consequences

**Positive**

- One error UX mapping table for all screens
- Retry logic driven by `retryable` flag
- Telemetry can aggregate by `code`

**Negative**

- Mapping layer maintenance on new API codes
- Migration must replace string errors in hooks

## Future evolution

- Localized messages via `DomainError.messageKey`
- Error boundary integration for `unknown` + `server`
- Structured `details` bag for validation field arrays
