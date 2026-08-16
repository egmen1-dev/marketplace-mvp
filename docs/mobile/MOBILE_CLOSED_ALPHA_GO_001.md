# MOBILE-CLOSED-ALPHA-GO-001

> Railway Deploy → Staging Release Publish → Physical Android PASS → Closed Alpha GO

## Final status: **GO** (2026-08-16)

| Step | Result |
|------|--------|
| PR #90 merge | ✅ `main` @ `16e3d47` |
| Staging deploy | ✅ staging @ `16e3d47` |
| DB migrations | ✅ epic78 + epic79 |
| Release publish | ✅ `0.1.0-alpha` + `alpha-tester@demo.lot` |
| Mobile smoke | ✅ ALL GREEN |
| Physical Android | ✅ PASS (operator) |
| Gate matrix | ✅ **23/23 PASS** |

## Run gate

```bash
npm run mobile:closed-alpha:go
# after physical adb acceptance:
PHYSICAL_ANDROID_PASS=true npm run mobile:closed-alpha:go
```

Report: `artifacts/mobile-closed-alpha-go-001/report.json`

## Final verdicts

```text
MOBILE STAGING:     READY
MRP STAGING:        ACCEPTED
POP STAGING:        ACCEPTED
PHYSICAL ANDROID:   PASS
AUTH:               PASS
BUYER CORE:         PASS
SELLER CORE:        PASS
FEEDBACK LOOP:      PASS
SECURITY:           PASS
P0:                 0
P1:                 0
CLOSED ALPHA:       GO
APP-SHELL-1:        UNBLOCKED
```

## APK distribution

- Download: https://github.com/egmen1-dev/marketplace-mvp/releases/download/closed-alpha-0.1.0/lot-android-alpha-0.1.0.apk
- SHA256: `91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585`

## Cohort rollout (Release Deliverable 3)

After GO — invite 5–10 testers (not mass). Each receives:

- HTTPS download link + SHA256
- `docs/mobile/ALPHA_TESTER_PACKAGE.md` (10–15 min script)
- Known limitations list
- Feedback route: Profile → «Сообщить об ошибке»

## APP-SHELL-1

Hard gate cleared. Next EPIC: Android Alpha Productization.

## Permanent rule

Each EPIC ≥ 2 Product Deliverables + 2 Release Deliverables toward public release.
