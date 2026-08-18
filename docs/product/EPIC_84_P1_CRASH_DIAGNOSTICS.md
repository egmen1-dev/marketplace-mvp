# EPIC 84 · P1 — Crash & Diagnostics Platform

Builds on P0 observable startup with tester-facing report export.

## Deliverables

| # | Feature | Module |
|---|---------|--------|
| 1 | `DiagnosticsReport` | `lib/mobile/diagnostics/types.ts` |
| 2 | Copy diagnostics | `StartupErrorScreen` + `diagnostics-actions.ts` |
| 3 | Export JSON (Share) | `exportDiagnosticsJson` |
| 4 | Startup ID `BOOT-XXXXXX` | `boot-session.ts` + telemetry |
| 5 | Connectivity check | `connectivity-check.ts` |
| 6 | Boot timeline | `formatBootTimeline` |
| 7 | Last 10 boots history | `boot-storage.ts` |
| 8 | Device info panel | `device-info.ts` + diagnostics screen |
| 9 | Telemetry correlation | `startup-telemetry.ts` + `postTelemetry` bootId |
| 10 | User problem report | Share with note + JSON |
| 11 | Offline copy | `getBootFailurePresentation` |
| 12 | API 500 copy | `getBootFailurePresentation` |
| 13 | Hidden diagnostics screen | long-press splash logo |
| 14 | Secret redaction | `lib/mobile/diagnostics/security.ts` |

## Gate

```bash
npm run product:epic-84:p1-diagnostics
npm run mobile:typecheck
npx vitest run tests/epic-84-p1-diagnostics-platform.test.ts
```

## Physical acceptance

`artifacts/epic-84-p1-diagnostics/physical-checklist.md`
