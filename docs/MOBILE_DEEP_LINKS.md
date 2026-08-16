# Mobile Deep Links

EPIC-77-PRE-WAVE-6 — stable URI contract for Android/iOS shell.

## Native scheme (`lot://`)

| Pattern | Example | Web equivalent |
|---|---|---|
| `lot://product/{id}` | `lot://product/abc-123` | `/products/abc-123` |
| `lot://order/{id}` | `lot://order/ord-42` | `/account/orders/ord-42` |
| `lot://seller/{id}` | `lot://seller/s-9` | `/sellers/s-9` |
| `lot://wallet` | `lot://wallet` | `/account/wallet` |
| `lot://brain/product/{id}` | `lot://brain/product/p-1` | `/account/products/p-1` |

## Resolver API

`GET /api/mobile/deep-link/resolve?uri=<encoded-uri>`

Returns:

```json
{
  "uri": "lot://product/abc-123",
  "destination": {
    "type": "product",
    "productId": "abc-123",
    "webPath": "/products/abc-123"
  },
  "apiVersion": "mobile-api-v1",
  "schemaVersion": "mobile-schema-v1"
}
```

## Design rules

- Clients must not hard-code Next.js route internals
- Resolver returns `webPath` for in-app WebView or universal link handoff
- HTTPS product URLs (`/products/{id}`) also supported for universal links

## Implementation

- Contract: `lib/mobile/deep-links.ts`
- Route: `app/api/mobile/deep-link/resolve/route.ts`

## Future

- Add `lot://promotion/{id}`, `lot://chat/{threadId}` when app shell epic defines UX
- Android App Links / iOS Universal Links asset files in separate deploy epic
