# Closed Beta RC6 — Android Build Record

**Candidate:** `0.1.11-beta.1` (versionCode `11`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-23

## Purpose

First Closed Beta build after PR #146 (web parity + CommerceHeader + buyer↔seller chat). No new product features beyond parity closure. No native checkout, order detail, or seller editor.

## Preconditions

| Gate | Result |
|------|--------|
| PR #146 merged | `0be57c5` (merge commit), head `4f5ce74` |
| Chat security (staging HTTP) | PASS — 22/22 tests |
| Chat staging smoke | PASS |
| mobile:typecheck | PASS |
| mobile:test | PASS |
| mobile:web-parity:gate | PASS |
| release:pipeline:verify | PASS |

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.11-beta.1` |
| versionCode | `11` |
| RC label | RC6 |
| Previous RC | RC5.1 `0.1.10-beta.2` (code 10) |

## Artifact

| Field | Value |
|-------|-------|
| Path | `artifacts/closed-beta-rc6/lot_android_closed_beta_0.1.11_beta.1.apk` |
| SHA256 | `128530437e73baf599e9a2db800a5c2f335d10252004437dc6e2effbb6723afe` |
| Size | 43,519,078 bytes |
| ABI | `arm64-v8a` |
| minSdk / targetSdk | 24 / 36 |

## RC6 features (from PR #146)

| Area | Delivery |
|------|----------|
| CommerceHeader | Home + Catalog: LOT, search, messages, cart badges |
| Chat | `/messages` inbox + conversation threads |
| Entry points | PDP, seller storefront, orders, profile, header |
| Unread | `useMessagesBadge` — focus + AppState, no polling |
| Profile | Menu restructure (account, purchases, sales, finance, legal) |

## Build command

```bash
export EXPO_PUBLIC_STARTUP_VERBOSE=true
export EXPO_PUBLIC_API_BASE_URL=https://web-production-e56fb.up.railway.app
export EXPO_PUBLIC_RELEASE_CHANNEL=staging
export EXPO_PUBLIC_BETA_CHANNEL=CLOSED_BETA
export EXPO_PUBLIC_RC_LABEL=RC6
export EXPO_PUBLIC_COMMIT_SHA=$(git rev-parse HEAD)
export EXPO_PUBLIC_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export ANDROID_HOME=/workspace/.android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

cd apps/mobile
npx expo export --platform android
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../../artifacts/closed-beta-rc6/lot_android_closed_beta_0.1.11_beta.1.apk
```

## Gates

```bash
npm run build
npm run mobile:typecheck
npm run mobile:test
npm run mobile:web-parity:gate
node scripts/rc6-chat-staging-security-smoke.mjs
npm run release:pipeline:verify
EXPECTED_VERSION=0.1.11-beta.1 EXPECTED_VERSION_CODE=11 EXPECTED_COMMIT=$(git rev-parse --short HEAD) \
  npm run mobile:rc5:identity-gate -- artifacts/closed-beta-rc6/lot_android_closed_beta_0.1.11_beta.1.apk
```

## MRP publish (post-merge to main)

```bash
node scripts/rc6-mrp-publish-via-admin-api.mjs
```

## Physical validation

**Status: `NOT_RUN`** — all scenarios in `artifacts/closed-beta-rc6/physical-checklist.json`.

Verify installed version: **Profile → О приложении** must show `0.1.11-beta.1 (11)` and SHA `b774ebd`.

## Verdict

`READY_FOR_PHYSICAL_VALIDATION` — not `READY_FOR_CLOSED_BETA` until device evidence exists.
