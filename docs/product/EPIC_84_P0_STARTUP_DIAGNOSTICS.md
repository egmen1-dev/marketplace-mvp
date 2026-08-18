# EPIC 84 — P0 Startup Diagnostics & Recovery

## Problem

After `0.1.2-alpha`, infinite Splash was replaced by a generic error screen without stage, cause, or HTTP status. Developers and users could not tell which boot step failed.

## Goal — Observable Startup

Every boot stage is named, timed, logged, telemetried, and surfaced on failure.

## Boot pipeline

```text
BOOT → BOOTSTRAP → REMOTE CONFIG → UPDATE CHECK → SESSION RESTORE → NAVIGATION → HOME / LOGIN
```

## Implementation

| Module | Role |
|--------|------|
| `apps/mobile/src/boot/boot-types.ts` | `BootStage`, `BootFailure`, `StartupReport` |
| `apps/mobile/src/boot/boot-timeouts.ts` | Stage timeouts (8/8/5/5/3 sec) |
| `apps/mobile/src/boot/boot-errors.ts` | Parse exceptions → `BootFailure` |
| `apps/mobile/src/boot/boot-logger.ts` | Stage log + dev console summary |
| `apps/mobile/src/boot/boot-storage.ts` | Persist last boot report + remote config cache |
| `apps/mobile/src/boot/session-restore.ts` | SecureStore + JWT exp validation |
| `apps/mobile/src/boot/run-startup-pipeline.ts` | State machine + recovery rules |
| `StartupErrorScreen` | Stage / reason / HTTP / code + Retry |
| `StartupDiagnosticsScreen` | Long-press splash logo → hidden debug |

## Recovery rules

| Stage | Failure | Behavior |
|-------|---------|----------|
| Bootstrap | any blocking error | Show detailed error screen |
| Remote config | timeout / HTTP / network | Use cached or default config, continue |
| Update | timeout / HTTP / invalid payload | Continue with safe fallback |
| Session | SecureStore / JWT / expired | Clear session, open Login |
| Navigation | unexpected | Show detailed error screen |

**Only Bootstrap (and unsupported client) blocks launch.**

## Telemetry events

- `BOOT_STARTED`
- `BOOT_STAGE_STARTED` / `BOOT_STAGE_SUCCESS` / `BOOT_STAGE_FAILED`
- `BOOT_COMPLETED` / `BOOT_ABORTED` / `BOOT_RETRY`

## Gate

```bash
npm run product:epic-84:p0-startup
npm run mobile:typecheck
npx vitest run tests/epic-84-p0-startup-diagnostics.test.ts
```

## Definition of Done

- No generic «Не удалось загрузить приложение» on boot without stage + reason
- Retry re-runs pipeline (no app restart)
- Physical Android checklist in `artifacts/epic-84-p0-startup/physical-checklist.md`
