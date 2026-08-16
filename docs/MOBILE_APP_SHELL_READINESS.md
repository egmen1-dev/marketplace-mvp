# Mobile App Shell Readiness

EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001

## Definition

`APP_SHELL_READY` does **not** mean a native app exists.

It means backend contracts are stable enough to start App Shell EPIC (Expo/RN/Capacitor/Kotlin — separate epic).

## Status values

| Status | Meaning |
|---|---|
| YES | All core contracts stable, no blockers |
| PARTIAL | Contracts exist; known blockers (refresh, deploy) |
| NO | Missing critical contracts |

## Required contracts

- `GET /api/mobile/bootstrap` — startup flags + endpoints
- `GET /api/mobile/config` — module versions
- `GET /api/mobile/navigation` — server-driven nav
- `GET /api/mobile/deep-link/resolve` — URI → webPath
- `GET /api/mobile/readiness` — release checklist
- `GET /api/mobile/android/update` — APK metadata (no binary yet)
- `POST /api/mobile/auth/session` — auth decision + session status

## Current verdict

```text
APP_SHELL_READY: PARTIAL
```

Blockers:

- `mobile_refresh_not_implemented`
- `native_token_bridge_not_built`
- Full stack not deployed to staging (until merge + Railway deploy)

## API surface

`GET /api/mobile/readiness` includes:

- `appShellReadiness: "PARTIAL" | "YES" | "NO"`
- `appShellBlockers: string[]`
- `authDecision: "A"`
- `authNativeReady: "PARTIAL"`

## Payload size baseline

Target: mobile endpoints < 50KB each (no full graph dump in bootstrap).

Record sizes in `artifacts/ccos-full-stack-staging/acceptance-report.json` → `mobileLatency.*.bytes`.

## Latency baseline

Record `mobileLatency.*.ms` from full-stack acceptance script.

Startup-critical paths: bootstrap, config, navigation (< 500ms target on staging).
