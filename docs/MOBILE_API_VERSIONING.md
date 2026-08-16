# Mobile API Versioning

Foundation for Android APK direct distribution (no store required).

## Version fields

Every mobile-safe response from these routes includes:

```json
{
  "apiVersion": "mobile-api-v1",
  "schemaVersion": "mobile-schema-v1",
  "syncVersion": "<graph-or-knowledge-sync-token>",
  "advisoryOnly": true
}
```

Wrapper: `withMobileApiContract()` in `lib/mobile/api-contract.ts`.

## Endpoints

| Route | Purpose |
|-------|---------|
| `GET /api/mobile/dashboard?productId=` | Unified Brain + Genome + Graph + Twin |
| `GET /api/ccos/graph/insights?productId=&compact=1` | Compact graph insight |
| `GET /api/ccos/graph/cache?productId=` | Offline snapshot |
| `GET /api/mobile/readiness` | Release checklist + contract metadata |

## Compact graph payload

```json
{
  "mainReason": "…",
  "topFactors": [{ "label": "…", "influence": 0.42 }],
  "nextAction": "…",
  "confidence": 0.41
}
```

No internal graph dump in compact mode.

## Environment config

```typescript
MOBILE_ENV_CONFIG = {
  dev: { baseUrl: "http://localhost:3000" },
  staging: { baseUrl: "https://web-production-e56fb.up.railway.app" },
  prod: { baseUrl: "…" },
}
```

## Deep link scheme (reserved)

`marketplace-mvp://` — see `MOBILE_DEEP_LINK_SCHEME`.

## APK update metadata

```typescript
APK_UPDATE_METADATA = {
  minSupportedApiVersion,
  minSupportedSchemaVersion,
  recommendedApiVersion,
}
```

Returned from `GET /api/mobile/readiness`.

## Breaking change policy

1. Bump `MOBILE_API_VERSION` for route/shape changes
2. Bump `MOBILE_SCHEMA_VERSION` for field renames/removals
3. Keep `minSupported*` at previous version until APK rollout completes

## Roadmap rule

From Wave 4 onward, each Wave ships ≥2 concrete app-release deliverables (this doc + endpoints count as Wave 4 foundation).
