# Mobile App Shell Readiness

EPIC-77-PRE-WAVE-6-FINAL-GATE-002

## Definition

`APP_SHELL_READY` does **not** mean a native app exists.

It means backend contracts are stable enough to start App Shell EPIC (Expo/RN/Capacitor/Kotlin — separate epic).

## Status values

| Status | Meaning |
|---|---|
| YES | All core contracts stable, no blockers |
| PARTIAL | Contracts exist; known blockers (refresh, deploy) |
| NO | Missing critical contracts |

## Required contracts (v1 freeze)

- `GET /api/mobile/bootstrap` — startup flags + endpoints
- `GET /api/mobile/config` — module versions
- `GET /api/mobile/navigation` — server-driven nav
- `GET /api/mobile/dashboard` — unified product view
- `GET /api/mobile/deep-link/resolve` — URI → webPath
- `GET /api/mobile/readiness` — release checklist
- `GET /api/mobile/android/update` — APK metadata (no binary yet)
- `POST /api/mobile/auth/session` — login + session status
- `POST /api/mobile/auth/refresh` — access/refresh rotation
- `POST /api/mobile/auth/logout` — session revoke

## Current verdict (local, post final gate)

```text
APP_SHELL_READY: YES
```

All hard checks pass locally:

- refresh + logout implemented
- session registry (memory + Prisma)
- navigation + deep links validated
- android update contract frozen
- offline cache foundation present

Staging must confirm `GET /api/mobile/readiness` → `appShellReadiness: "YES"` after deploy.

## API surface

`GET /api/mobile/readiness` includes:

- `appShellReadiness: "PARTIAL" | "YES" | "NO"`
- `appShellBlockers: string[]`
- `authDecision: "A"`
- `authNativeReady: "YES"`

## Payload size baseline

Target: mobile endpoints < 50KB each (no full graph dump in bootstrap).

Record sizes in `artifacts/ccos-full-stack-staging/acceptance-report.json` → `mobileLatency.*.bytes`.

## Latency baseline

Record `mobileLatency.*.ms` from full-stack acceptance script.

Startup-critical paths: bootstrap, config, navigation (< 500ms target on staging).

## Roadmap after YES

Parallel tracks:

```text
CCOS: Wave 6 → Wave 7 → Wave 8
Mobile: App Shell 0 → Android Alpha → iOS Alpha → Beta
```
