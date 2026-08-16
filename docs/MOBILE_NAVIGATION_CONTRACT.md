# Mobile Navigation Contract

EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001

## API

`GET /api/mobile/navigation`

Returns server-driven bottom navigation for native shell.

## Response shape

```json
{
  "version": "1",
  "role": "buyer",
  "items": [
    { "id": "home", "label": "Главная", "deepLink": "lot://home", "webPath": "/", "roles": ["buyer", "seller"] },
    { "id": "catalog", "label": "Каталог", "deepLink": "lot://catalog", "webPath": "/catalog", "roles": ["buyer", "seller"] }
  ],
  "apiVersion": "mobile-api-v1",
  "schemaVersion": "mobile-schema-v1",
  "advisoryOnly": true
}
```

## Role rules

| Role | Items |
|---|---|
| guest | home, catalog |
| buyer | home, catalog, favourites, orders, profile |
| seller | buyer items + business, products, sales, promotion, wallet |
| admin | buyer items only (no admin console in mobile nav) |

Admin console routes are **never** exposed via mobile navigation manifest.

## Deep link alignment

All `deepLink` values use existing `lot://` contract from `lib/mobile/deep-links.ts`.

Resolver: `GET /api/mobile/deep-link/resolve?uri=...`

## Implementation

- Contract: `lib/mobile/navigation.ts`
- Route: `app/api/mobile/navigation/route.ts`

## Versioning

`version: "1"` — bump when adding/removing nav items in breaking way.
