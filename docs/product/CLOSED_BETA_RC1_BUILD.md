# Closed Beta RC1 — Android Build Record

**Candidate:** `0.1.6-beta.1` (versionCode `4`)  
**Status:** `READY_FOR_INTERNAL_INSTALL` (not `READY_FOR_CLOSED_BETA`)  
**Recorded:** 2026-08-18

## Canonical source

| Field | Value |
|-------|-------|
| Branch at build | `cursor/closed-beta-rc1-build-7513` |
| Mobile commit (APK) | `0887897` |
| `origin/main` | `d9f0eca` |
| Railway staging `/api/version` commit | `d9f0eca` |
| Environment | `staging` |

Mobile packaging commit is one commit ahead of staging (`version bump only`). Staging matches `origin/main`.

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.6-beta.1` |
| versionCode | `4` |
| releaseChannel | `closed-beta` |
| betaChannel | `CLOSED_BETA` |

Published versionCodes in manifest history: `1`, `2`. Current alpha baseline in repo was `3`; RC1 uses next unused `4`.

## Environment

| Field | Value |
|-------|-------|
| API base URL | `https://web-production-e56fb.up.railway.app` |
| `EXPO_PUBLIC_RELEASE_CHANNEL` | `staging` |
| `EXPO_PUBLIC_BETA_CHANNEL` | `CLOSED_BETA` |

Verified from `apps/mobile/src/config/env.ts` and build-time exports (not legacy docs).

## Artifact

| Field | Value |
|-------|-------|
| Path | `artifacts/closed-beta-rc1/lot-android-closed-beta-0.1.6-beta.1.apk` |
| SHA256 | `ee70963102b627d2dd2cd85794c0c8e2355f6f92caa8ebed6a81d68ab93ecca7` |
| Size | 93,635,347 bytes |
| Build type | `release` (debug keystore — internal install) |

## Build metadata in app

Profile footer and beta telemetry expose:

- version / versionCode
- release channel + beta channel
- API host
- git commit SHA
- build timestamp

Secrets are not exposed.

## Release gates (summary)

| Gate | Verdict |
|------|---------|
| `mobile:typecheck` | PASS |
| `mobile:test` | PASS |
| `mobile:release-gate` | PASS |
| `mobile:staging-smoke` | PASS |
| `mobile:epic-102:gate` | PASS |
| `product:epic-88:promotion-center` | PASS |
| `product:epic-89:inventory-management` | PARTIAL (root build step in script) |
| `mobile:epic-83:gate` | ENV_LIMITATION (`DATABASE_URL`) |
| `release:pipeline:verify` | ENV_LIMITATION (branch naming drift) |
| `product:epic-108:release-candidate-final` | NOT_READY_FOR_CLOSED_BETA |
| Token / route-graph named scripts | NOT_FOUND in repo |
| Firebase Test Lab | NOT_RUN |
| Physical Android | NOT_RUN |

Full matrix: `artifacts/closed-beta-rc1/release-gates.json`

## APK verification

- `aapt dump badging` → `artifacts/closed-beta-rc1/aapt-badging.txt`
- `apkanalyzer manifest print` → `artifacts/closed-beta-rc1/apkanalyzer-manifest.xml`
- SHA256 → `artifacts/closed-beta-rc1/sha256.txt`

Confirmed on APK (not source only):

- package `ru.lot.marketplace.alpha`
- versionName `0.1.6-beta.1`
- versionCode `4`
- minSdk `24`
- targetSdk `36`

Bundle contains embedded commit, version string, and staging API host.

## Backend parity

`artifacts/closed-beta-rc1/backend-parity.json`

| Route | Status | Notes |
|-------|--------|-------|
| `/api/health` | 200 | OK |
| `/api/version` | 200 | commit `d9f0eca` |
| `/api/product-ops/beta/readiness` | 200 | OK |
| `/api/product-ops/beta/dashboard` | 200 | OK |
| `/api/mobile/checkout/web-url` | 401 | route registered |
| `/api/mobile/checkout/enter` | 307 | route registered |

## Static surface map

Native routes exist for core buyer flows, seller home/products/sales/wallet, feedback, and checkout web handoff. Workspace, inventory, promotion center (full), product editor, and startup diagnostics UI are web-delegated or embedded summaries — see `final-report.json` `staticSurfaces`.

## Build command (reproduce)

```bash
export EXPO_PUBLIC_RELEASE_CHANNEL=staging
export EXPO_PUBLIC_BETA_CHANNEL=CLOSED_BETA
export EXPO_PUBLIC_API_BASE_URL=https://web-production-e56fb.up.railway.app
export EXPO_PUBLIC_COMMIT_SHA=$(git rev-parse HEAD)
export EXPO_PUBLIC_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export ANDROID_HOME=/workspace/.android-sdk

cd apps/mobile
npx expo prebuild --platform android --clean
cd android && ./gradlew clean assembleRelease
```

## Publish policy

RC1 is **not** published to Closed Beta rollout. No cohort expansion. Internal install for physical walkthrough only.
