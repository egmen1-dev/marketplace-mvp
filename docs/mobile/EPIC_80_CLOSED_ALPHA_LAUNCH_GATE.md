# EPIC 80 — Closed Alpha Launch Gate

> Physical Android Acceptance → Tester Cohort → First Real Release

## Merge status (Part 1)

| PR | Status |
|----|--------|
| #88 EPIC 78 MRP | **MERGED** → `main` |
| #89 EPIC 79 POP | **MERGED** → `main` (via epic-78 stack) |
| `origin/main` | `750377f`+ |

**Staging deploy:** operator must deploy `origin/main` to Railway. Until then `staging != main`.

## Migrations (Part 2)

Apply on staging DB after deploy:

```bash
npx prisma migrate deploy
```

Expected migrations:

- `20260816160000_epic78_mobile_release_platform`
- `20260816173000_epic79_product_operations_platform`

## APK (Part 4–5)

| Field | Value |
|-------|-------|
| File | `lot-android-alpha-0.1.0.apk` |
| SHA256 | `91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585` |
| HTTPS URL | [GitHub Release download](https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.0/lot-android-alpha-0.1.0.apk) |

## Publish release (Part 6–7)

On staging DB after migrate:

```bash
CLOSED_ALPHA_TESTER_EMAIL=tester@example.com npm run mobile:closed-alpha:publish
```

Verify:

```bash
curl "$STAGING/api/mobile/update?versionCode=0&deviceId=test&channel=CLOSED_ALPHA"
```

Expect: `versionName=0.1.0-alpha`, real `downloadUrl`, matching `sha256`.

## Automated gate

```bash
npm run mobile:closed-alpha:gate
```

Report: `artifacts/epic-80-closed-alpha-launch-gate/report.json`

## Physical acceptance (Part 8–12)

Operator with USB Android:

```bash
./scripts/mobile-physical-acceptance-adb.sh
export PHYSICAL_ANDROID_PASS=true
npm run mobile:closed-alpha:gate
```

## Tester script (Part 20)

See `docs/mobile/ALPHA_TESTER_PACKAGE.md` — 10–15 min scenario.

## Product deliverables

1. **First real Closed Alpha release** — MRP `0.1.0-alpha` PUBLISHED + HTTPS APK
2. **Real feedback loop** — Profile → POP → classification → next release

## Release deliverables

1. **APK HTTPS distribution** — GitHub Release + `/api/mobile/releases/artifact`
2. **First update cycle** — publish `0.1.1-alpha` test metadata to verify update detection

## Final verdicts (automated baseline)

| Gate | Verdict | Notes |
|------|---------|-------|
| MOBILE STAGING | NOT READY until deploy | staging @ `1e9e15e`, main @ `750377f` |
| PHYSICAL ANDROID | NOT RUN | Cloud agent — no USB device |
| P0 | 1 | Physical pending |
| P1 | 0 | — |
| MRP | NOT ACCEPTED on staging | Publish after staging migrate |
| POP | ACCEPTED when staging deployed | Endpoints exist on main |
| CLOSED ALPHA RELEASE | NOT PUBLISHED on staging | Run publish script on staging DB |
| CLOSED ALPHA | WATCH | Automated infra ready; physical gate open |
| APP-SHELL-1 | BLOCKED | Until GO |

## APP-SHELL-1 hard gate

UNBLOCKED only when:

- Physical Android = PASS
- P0 = 0
- Staging = READY
- Closed Alpha release published
- Feedback pipeline verified on device

## Permanent rule

Each EPIC ≥ **2 PRODUCT deliverables** + **2 RELEASE deliverables**.
