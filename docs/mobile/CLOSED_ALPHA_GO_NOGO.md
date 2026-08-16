# Closed Alpha GO / NO-GO (EPIC 80)

**Updated:** 2026-08-16 · gate `npm run mobile:closed-alpha:gate`

## Verdict: WATCH — staging deploy + physical PASS remain

| Gate | Status |
|------|--------|
| MOBILE STAGING | **NOT READY** — staging @ `750377f`, main @ `16e3d47` |
| DB migrations | **PASS** — epic78 + epic79 on Railway Postgres |
| MRP release | **PUBLISHED** — `0.1.0-alpha` + HTTPS URL |
| First tester | **PASS** — `alpha-tester@demo.lot` |
| POP feedback/telemetry | **PASS** (API verified on staging) |
| PHYSICAL ANDROID | **NOT RUN** |
| P0 | **1** |
| CLOSED ALPHA | **WATCH** |
| APP-SHELL-1 | **BLOCKED** |

Runbook: `docs/mobile/MOBILE_CLOSED_ALPHA_GO_001.md`

## Operator checklist

1. Deploy `origin/main` to Railway staging
2. `npx prisma migrate deploy` on staging DB
3. `npm run mobile:closed-alpha:publish` (with `CLOSED_ALPHA_TESTER_EMAIL`)
4. `./scripts/mobile-physical-acceptance-adb.sh` on USB Android
5. `PHYSICAL_ANDROID_PASS=true npm run mobile:closed-alpha:gate`
6. If GO → invite 5–10 testers (`docs/mobile/ALPHA_TESTER_PACKAGE.md`)

## Product deliverables

- ✅ APK HTTPS + SHA256 immutable artifact
- ⬜ First Closed Alpha release live on staging MRP
- ⬜ Real feedback loop verified on device

See `docs/mobile/EPIC_80_CLOSED_ALPHA_LAUNCH_GATE.md`.
