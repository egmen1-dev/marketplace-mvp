# Closed Beta RC5 — Android Build Record

**Candidate:** `0.1.10-beta.1` (versionCode `9`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-23

## Purpose

P0 release-truth investigation build. Proves source → bundle → APK → staging API alignment for commerce interactions. Includes PR #141 visual polish + RC5 wiring fixes.

## RC4 discrepancy (root cause)

**Classification:** `MULTIPLE_CAUSES`

| Cause | Evidence |
|-------|----------|
| `OLD_APK_STILL_INSTALLED` | Physical beta banner showed `v0.1.8-beta.1 (7)` = RC3, not RC4 |
| `FIX_NOT_IN_APK` | RC3 predates PR #139 interaction fixes |
| `STAGING_CONFIGURATION` | MRP only published RC2 (code 6); update API returns NO_UPDATE for code 7/8 |
| `TEST_FALSE_POSITIVE` | `mobile-interaction-audit.test.ts` tests 2/148 interactions |

See `artifacts/closed-beta-rc5/preflight-installed-version-analysis.json`.

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.10-beta.1` |
| versionCode | `9` |
| Previous RC | RC4 `0.1.9-beta.1` (code 8) |

## Artifact

| Field | Value |
|-------|-------|
| Path | `artifacts/closed-beta-rc5/lot_android_closed_beta_0.1.10_beta.1.apk` |
| SHA256 | `2d4041c5e29e31c25ac7cab65ce7d98d1c402ded5ba0307d71922cb220e3e4d1` |
| Size | 43,492,086 bytes |
| ABI | `arm64-v8a` |
| minSdk / targetSdk | 24 / 36 |

## RC5 fixes (beyond RC4)

| Area | Fix |
|------|-----|
| Session | `warmSessionFromStorage()` on app mount |
| Cart/Favorites | `MOBILE_COMMERCE_ACTION` telemetry; 401 → login redirect |
| Catalog | Clear `q` when category selected (fix double-filter) |
| Profile | Native `/about` build identity; Cart in menu; update check UI |
| Update | Remove false `downloaded` telemetry; honest browser handoff labels |
| Anti-stale | Profile → О приложении shows version, code, SHA, RC5 label |

## Build command

```bash
export EXPO_PUBLIC_STARTUP_VERBOSE=true
export EXPO_PUBLIC_API_BASE_URL=https://web-production-e56fb.up.railway.app
export EXPO_PUBLIC_RELEASE_CHANNEL=staging
export EXPO_PUBLIC_BETA_CHANNEL=CLOSED_BETA
export EXPO_PUBLIC_RC_LABEL=RC5
export EXPO_PUBLIC_COMMIT_SHA=$(git rev-parse HEAD)
export EXPO_PUBLIC_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export ANDROID_HOME=/workspace/.android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

cd apps/mobile
npx expo export --platform android
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../../artifacts/closed-beta-rc5/lot_android_closed_beta_0.1.10_beta.1.apk
```

## Gates

```bash
npm run build
npm run mobile:typecheck
npm test -- tests/mobile-commerce-integration.test.ts
npm run mobile:rc5:staging-smoke
npm run release:pipeline:verify
EXPECTED_VERSION=0.1.10-beta.1 EXPECTED_VERSION_CODE=9 EXPECTED_COMMIT=$(git rev-parse --short HEAD) \
  npm run mobile:rc5:identity-gate -- artifacts/closed-beta-rc5/lot_android_closed_beta_0.1.10_beta.1.apk
```

## MRP publish (post-merge)

```bash
DATABASE_URL=... npm run mobile:closed-beta:publish-rc5
```

## Physical validation

**Status: `NOT_RUN`** — all scenarios in `artifacts/closed-beta-rc5/physical-checklist.json`.

Verify installed version: **Profile → О приложении** must show `0.1.10-beta.1 (9)` and SHA `baf8cd1`.

## Verdict

`READY_FOR_PHYSICAL_VALIDATION` — not `READY_FOR_CLOSED_BETA` until device evidence exists.
