# Closed Alpha GO / NO-GO (EPIC 80)

**Updated:** 2026-08-16 · gate `npm run mobile:closed-alpha:gate`

## Verdict: WATCH → NO-GO until staging deploy + physical PASS

| Gate | Status |
|------|--------|
| MOBILE STAGING | **NOT READY** — staging @ `1e9e15e`, main @ `750377f` |
| PHYSICAL ANDROID (MOB-PA-001) | **NOT RUN** |
| MRP publish on staging | **NOT PUBLISHED** (run publish after migrate) |
| APK HTTPS | **READY** — [GitHub Release](https://github.com/egmen1-dev/marketplace-mvp/releases/tag/closed-alpha-0.1.0) |
| POP telemetry | **READY on main** — pending staging deploy |
| P0 | **1** (physical pending) |
| APP-SHELL-1 | **BLOCKED** |

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
