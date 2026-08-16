# Mobile Error Contract v1

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "...",
    "retryable": true
  }
}
```

Helper: `buildMobileError()` in `lib/mobile/error-contract.ts`.

Pagination contract: `mobile-pagination-v1` — `{ items, nextCursor, hasMore }`.
