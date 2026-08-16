# Mobile App Compatibility

EPIC-77-PRE-WAVE-6 — version gating foundation for direct APK distribution.

## Constants (`lib/mobile/api-contract.ts`)

| Field | Default | Purpose |
|---|---|---|
| `MOBILE_APP_VERSION` | `0.0.0-dev` | Current app semver |
| `MOBILE_MIN_SUPPORTED_APP_VERSION` | `0.0.0-dev` | Hard minimum |
| `MOBILE_RECOMMENDED_APP_VERSION` | `0.0.0-dev` | Soft upgrade nudge |
| `MOBILE_API_VERSION` | `mobile-api-v1` | API envelope version |
| `MOBILE_SCHEMA_VERSION` | `mobile-schema-v1` | Payload schema version |

## Bootstrap fields

`GET /api/mobile/bootstrap` includes:

```json
{
  "minimumSupportedAppVersion": "0.0.0-dev",
  "recommendedAppVersion": "0.0.0-dev",
  "forceUpgrade": false,
  "apiVersion": "mobile-api-v1",
  "schemaVersion": "mobile-schema-v1",
  "releaseChannel": "staging"
}
```

## Config fields

`GET /api/mobile/config` includes `apiVersion`, `schemaVersion`, `releaseChannel`.

## Android update contract

`GET /api/mobile/android/update`:

```json
{
  "latestVersion": "0.0.0-dev",
  "minimumVersion": "0.0.0-dev",
  "updateRequired": false,
  "downloadUrl": null,
  "sha256": null,
  "releaseNotes": ["APK distribution foundation — no binary published yet"]
}
```

`downloadUrl` remains `null` until App Shell EPIC publishes an APK.

## Readiness integration

`/api/mobile/readiness` includes checks for:

- bootstrap / config / dashboard
- auth architecture
- deep links
- API versioning
- app compatibility
- android update contract

## Safe defaults

All compatibility values are permissive (`0.0.0-dev`, `forceUpgrade: false`) until first APK release.
