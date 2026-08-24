# Closed Beta RC10 — Android Build Record

**Candidate:** `0.1.15-beta.1` (versionCode `16`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-24

## Purpose

Physical beta acceptance build after EPIC 158.1–158.3 and EPIC 159 (Seller Beta Acceptance).

Primary goal: seller can create, autosave, restore, preview, and publish a LOT; buyer and seller order loops work; update flow is reliable.

## Preconditions

| Gate | Result |
|------|--------|
| EPIC 158.1 merged (PR #161) | PASS |
| EPIC 158.2 (PR #164) | included in RC10 branch |
| EPIC 158.3 (PR #165) | included in RC10 branch |
| EPIC 159 (PR #166) | included in RC10 branch |
| mobile:typecheck | PASS |
| EPIC 158 / 158.1 / 158.2 / 158.3 / 159 gates | PASS |
| release:pipeline:verify | PASS |

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.15-beta.1` |
| versionCode | `16` |
| RC label | RC10 |
| Channel | CLOSED_BETA |
| Environment | staging |
| Previous RC | RC9.1 `0.1.14-beta.2` (code 15) |

## RC10 features

| Area | Delivery |
|------|----------|
| EPIC 158.1 | Autosave, restore prompt, pickup in draft, LOT terminology |
| EPIC 158.2 | Simplified copy, orange CTA, human errors, sticky footer |
| EPIC 158.3 | Preview screen, cover photo, CTA order, update flow fixes |
| EPIC 159 | Save→publish no duplicate LOT, success screen, acceptance audit |

## Build command

```bash
export EXPO_PUBLIC_STARTUP_VERBOSE=true
export EXPO_PUBLIC_API_BASE_URL=https://web-production-e56fb.up.railway.app
export EXPO_PUBLIC_RELEASE_CHANNEL=staging
export EXPO_PUBLIC_BETA_CHANNEL=CLOSED_BETA
export EXPO_PUBLIC_RC_LABEL=RC10
export EXPO_PUBLIC_COMMIT_SHA=$(git rev-parse HEAD)
export EXPO_PUBLIC_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export ANDROID_HOME=/workspace/.android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

cd apps/mobile
npx expo export --platform android
cd android
./gradlew assembleRelease
cp app/build/outputs/apk/release/app-release.apk ../../artifacts/closed-beta-rc10/lot_android_closed_beta_0.1.15_beta.1.apk
```

## Gates

```bash
npm run build
npm run mobile:typecheck
npm run mobile:epic-158:gate
npm run mobile:epic-158-1:gate
npm run mobile:epic-158-2:gate
npm run mobile:epic-158-3:gate
npm run mobile:epic-159:gate
npm run mobile:rc10:staging-gate
npm run mobile:rc10:apk-verify
npm run release:pipeline:verify
```

## MRP publish

```bash
npm run mobile:rc10:collect-artifacts
npm run mobile:rc10:mrp-publish
npm run mobile:rc10:update-verify
```

## Update matrix

| Installed code | Expected |
|----------------|----------|
| 13, 14, 15 | OPTIONAL_UPDATE → 16 |
| 16 | NO_UPDATE |

## Physical validation

**Status: `NOT_RUN`** — `artifacts/closed-beta-rc10/physical-checklist.json`

Test accounts:
- Seller: `seller@demo.lot` / `demo1234`
- Buyer: `buyer@demo.lot` / `demo1234`

## Verdict

`READY_FOR_PHYSICAL_VALIDATION`
