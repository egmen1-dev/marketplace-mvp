# RELEASE 0.1.3-alpha — Closed Alpha (EPIC-84)

## Includes

- Startup Diagnostics P0 + Crash & Diagnostics P1
- Login Sprint 1, Buyer Home Sprint 2, Catalog Sprint 3, PDP Sprint 4
- Build metadata on Startup Error Screen (`Version` + `Build SHA`)
- Hidden diagnostics (`long-press splash logo` → Build Info → Startup Diagnostics)

## Version

| Field | Value |
|-------|-------|
| versionName | `0.1.3-alpha` |
| versionCode | `4` |
| package | `ru.lot.marketplace.alpha` |
| GitHub tag | `closed-alpha-0.1.3` |
| Asset | `lot-android-alpha-0.1.3.apk` |

## Build

```bash
npm run mobile:write-build-info
npm run mobile:verify-build
cd apps/mobile/android && ./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../../artifacts/epic-84-release-013/lot-android-alpha-0.1.3.apk
sha256sum ../../artifacts/epic-84-release-013/lot-android-alpha-0.1.3.apk
/workspace/.android-sdk/build-tools/36.0.0/aapt dump badging ../../artifacts/epic-84-release-013/lot-android-alpha-0.1.3.apk
```

Update `lib/mobile-release-platform/constants.ts` with SHA256 + size, then:

```bash
npm run release:013:gate
gh release create closed-alpha-0.1.3 artifacts/epic-84-release-013/lot-android-alpha-0.1.3.apk ...
npm run mobile:closed-alpha:publish-013
```

## Update API

| Client versionCode | Result |
|------------------|--------|
| 3 (0.1.2-alpha) | `OPTIONAL_UPDATE` → 0.1.3-alpha |
| 4 (0.1.3-alpha) | `NO_UPDATE` |

Minimum supported remains **0.1.2-alpha** (code 3).

## Physical acceptance (FAIL if missing)

Startup Error Screen must show:

- [ ] Startup ID
- [ ] Stage (Этап)
- [ ] Code (Код)
- [ ] Copy Diagnostics
- [ ] Export Diagnostics
- [ ] Connectivity panel
- [ ] Version: 0.1.3-alpha
- [ ] Build: `<short SHA>`
