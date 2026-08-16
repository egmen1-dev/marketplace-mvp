# MOBILE-CLOSED-ALPHA-GO-001

> Railway Deploy → Staging Release Publish → Physical Android PASS → Closed Alpha GO

## Execution log (2026-08-16)

| Step | Result |
|------|--------|
| PR #90 merge | **DONE** → `main` @ `16e3d47` |
| Staging deploy | **NOT READY** — staging @ `750377f`, main @ `16e3d47` |
| DB migrations | **PASS** — epic78 + epic79 applied on Railway Postgres |
| Release publish | **PASS** — `0.1.0-alpha` PUBLISHED, tester `alpha-tester@demo.lot` |
| Update metadata | **PASS** — real HTTPS URL + SHA256 on `/api/mobile/update` |
| Mobile smoke | **ALL GREEN** — `mobile:release-gate` + integration smoke |
| Physical Android | **NOT RUN** — cloud agent, no USB device |

## Run gate

```bash
npm run mobile:closed-alpha:go
# after physical adb acceptance:
PHYSICAL_ANDROID_PASS=true npm run mobile:closed-alpha:go
```

Report: `artifacts/mobile-closed-alpha-go-001/report.json`

## Operator: Railway deploy (Part 2)

Project: `marketplace-mvp-backup` · Service: `web-v2` · `APP_ENV=staging`

Push triggers GitHub → Railway Docker build. After deploy:

```bash
curl -sS https://web-production-e56fb.up.railway.app/api/version
# commit must equal origin/main
```

Cloud agent **cannot deploy** — `RAILWAY_TOKEN` unauthorized in this environment.

## Operator: Physical acceptance (Parts 11–28)

```bash
sha256sum lot-android-alpha-0.1.0.apk
adb install -r lot-android-alpha-0.1.0.apk
./scripts/mobile-physical-acceptance-adb.sh
```

APK: https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.0/lot-android-alpha-0.1.0.apk

## Final verdicts (current)

| Gate | Result |
|------|--------|
| MOBILE STAGING | **NOT READY** |
| MRP STAGING | **ACCEPTED** |
| POP STAGING | **ACCEPTED** |
| PHYSICAL ANDROID | **NOT RUN** |
| FEEDBACK LOOP | **PASS** (API verified) |
| P0 | **1** |
| CLOSED ALPHA | **WATCH** |
| APP-SHELL-1 | **BLOCKED** |

## GO rule

GO only when: `staging == main` + migrations + release published + **physical PASS** + P0=0 + feedback on device.

## Product deliverables

1. **Published Closed Alpha** — DB release live; pending deploy parity + physical install proof  
2. **Feedback cycle** — API PASS; device proof pending  

## Release deliverables

1. **First tester** — `alpha-tester@demo.lot` in MRP  
2. **Update cycle** — prepare `0.1.1-alpha` metadata after GO if needed  
3. **Cohort 5–10** — after first device PASS only  

## Tester script

See `docs/mobile/ALPHA_TESTER_PACKAGE.md` (10–15 min).
