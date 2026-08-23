# Closed Beta RC4 — Android Build Record

**Candidate:** `0.1.9-beta.1` (versionCode `8`)  
**Status:** `READY_FOR_PHYSICAL_VALIDATION`  
**Recorded:** 2026-08-23

## Purpose

Canonical Closed Beta APK packaging **PR #139 — Full Mobile Interaction Audit** fixes for physical Android validation. No new features or UX redesign.

## Canonical source

| Field | Value |
|-------|-------|
| Branch at build | `cursor/closed-beta-rc4-build-12fd` |
| PR #139 head SHA | `99d585e` |
| PR #139 merge SHA | `be07163` |
| Release commit (version bump) | `6209cf1` |
| Railway staging `/api/version` commit | `be07163` |
| Environment | `staging` |
| Release channel | `CLOSED_BETA` |

Railway matches the PR #139 merge SHA. The release commit only bumps mobile version metadata; strict Railway SHA parity with the APK embed is not required.

## Version

| Field | Value |
|-------|-------|
| Package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.9-beta.1` |
| versionCode | `8` |
| Previous RC | RC3 `0.1.8-beta.1` (code 7) |

## Environment

| Field | Value |
|-------|-------|
| API base URL | `https://web-production-e56fb.up.railway.app` |
| `EXPO_PUBLIC_RELEASE_CHANNEL` | `staging` |
| `EXPO_PUBLIC_BETA_CHANNEL` | `CLOSED_BETA` |
| `EXPO_PUBLIC_STARTUP_VERBOSE` | `true` |

## Artifact

| Field | Value |
|-------|-------|
| Path | `artifacts/closed-beta-rc4/lot_android_closed_beta_0.1.9_beta.1.apk` |
| SHA256 | `57e249ae132d2d278edecf1c023e28e06696a203bdd812effddb34aad83eec96` |
| Size | 43,479,214 bytes |
| ABI | `arm64-v8a` |
| minSdk / targetSdk | 24 / 36 |
| Signing | debug keystore (internal install only) |

## Interaction fixes included (PR #139)

| Area | Verification |
|------|--------------|
| Cart | `useCommerceActions` — awaited API, toasts, badge refresh |
| Favorites | optimistic toggle + rollback |
| Catalog | `sort`, `sellerId`, `deals` params + category resolve |
| Seller | `/seller/[id]` + PDP/card tap + deep link |
| Profile | grouped `ProfileMenu` |
| Localization | `Кошелёк` and Russian tab titles |
| ProductCard | reserved favorite/rating/seller/CTA slots |
| Update | `isUpdateEligibleForInstall` downgrade protection |

Embedded bundle verification: **PASS** (see `build-manifest.json`).

## Trust Loop (staging)

| Field | Value |
|-------|-------|
| `MARKETPLACE_TRUST_LOOP_ENABLED` | `false` |
| Catalog API | `averageRating` / `reviewsCount` fields present, values null |
| Reviews API | contract PASS; empty items on staging |
| RC4 build blocked? | **No** — does not block APK; physical review UI will show empty states |

## Automated gates

```bash
npm run build                                          # PASS
cd apps/mobile && npm run typecheck                    # PASS
npm run mobile:test                                    # PASS
npm test -- tests/mobile-interaction-audit.test.ts     # PASS
npm test -- tests/mobile-navigation.test.ts            # PASS
npm test -- tests/mobile-deep-links.test.ts            # PASS
npm test -- tests/mobile-post-auth-navigation.test.ts  # PASS
npm test -- tests/mobile-session-resilience.test.ts  # PASS
npm test -- tests/mobile-bootstrap-diagnostics.test.ts # PASS
npm test -- tests/mobile-reviews.test.ts               # PASS
npm test -- tests/mobile-refresh.test.ts               # PASS
npm test -- tests/mobile-refresh-replay.test.ts        # PASS
npm run mobile:release-gate                            # PASS
npm run release:pipeline:verify                        # PASS
node scripts/verify-android-apk.mjs artifacts/closed-beta-rc4/lot_android_closed_beta_0.1.9_beta.1.apk  # PASS
```

Full matrix: `artifacts/closed-beta-rc4/release-gates.json`

## Build command (reproduce)

```bash
export EXPO_PUBLIC_STARTUP_VERBOSE=true
export EXPO_PUBLIC_API_BASE_URL=https://web-production-e56fb.up.railway.app
export EXPO_PUBLIC_RELEASE_CHANNEL=staging
export EXPO_PUBLIC_BETA_CHANNEL=CLOSED_BETA
export EXPO_PUBLIC_COMMIT_SHA=$(git rev-parse HEAD)
export EXPO_PUBLIC_BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
export ANDROID_HOME=/workspace/.android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

cd apps/mobile
npm ci --legacy-peer-deps
npx expo prebuild --platform android --clean
cd android
# Match RC3: arm64-only, legacy arch flag in app.json
sed -i 's/newArchEnabled=true/newArchEnabled=false/' gradle.properties
sed -i 's/reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64/reactNativeArchitectures=arm64-v8a/' gradle.properties
# Native link order: worklets before expo-modules-core
rm -rf ../node_modules/expo-modules-core/android/.cxx ../node_modules/react-native-worklets/android/.cxx
./gradlew :react-native-worklets:assembleRelease
./gradlew assembleRelease
```

Native deps pinned in `apps/mobile/package.json`:

- `react-native-reanimated@4.5.0`
- `react-native-worklets@0.10.1`

## Physical validation checklist

**Status: `NOT_RUN`** — operator must execute on device.

1. Add product to cart from Home.
2. Verify cart badge updates.
3. Open Cart and verify product exists.
4. Add another product from PDP.
5. Remove/change quantity in Cart.
6. Add/remove favorite from Home ProductCard.
7. Add/remove favorite from PDP.
8. Open Favorites and verify state matches.
9. Test every Catalog filter (sort, category, deals, seller).
10. Clear filters and verify reset.
11. Tap seller from PDP.
12. Open seller storefront (`/seller/[id]`).
13. Open every main tab.
14. Open every ProfileMenu destination.
15. Verify **Кошелёк**, not `Wallet`.
16. Compare ProductCard heights in grid.
17. Verify favorite icon slot consistency.
18. Test update flow: installed newer beta must not be offered older APK.
19. Restart app and verify session persists.
20. Test offline recovery (airplane mode → restore).
21. Smoke seller tools (if seller account available).
22. Verify no unexpected browser escape from native flows.

## Verdict

`READY_FOR_PHYSICAL_VALIDATION` — not `READY_FOR_CLOSED_BETA` until device evidence exists.
