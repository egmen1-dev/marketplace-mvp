# Firebase Test Lab — Instrumentation QA Harness

Manual upload workflow for LOT Closed Beta Android. **Not** part of production release / MRP.

## Outputs

| File | Role |
|------|------|
| `artifacts/firebase-test-lab/lot-under-test.apk` | App under test (debug + `EXPO_PUBLIC_FIREBASE_QA=1`) |
| `artifacts/firebase-test-lab/lot-instrumentation-tests.apk` | Espresso + UIAutomator suite |
| `artifacts/firebase-test-lab/build-manifest.json` | SHA256, packages, gcloud hint |

## Build

```bash
npm run mobile:firebase-instrumentation:build
npm run mobile:firebase-instrumentation:gate
# optional when emulator available:
npm run mobile:firebase-instrumentation:virtual
```

## Packages

| Field | Value |
|-------|-------|
| APP_PACKAGE | `ru.lot.marketplace.alpha` |
| TEST_PACKAGE | `ru.lot.marketplace.alpha.test` |
| RUNNER | `androidx.test.runner.AndroidJUnitRunner` |

## Staging accounts (demo — not secrets)

| Role | Email | Password |
|------|-------|----------|
| Seller | `seller@demo.lot` | `demo1234` |
| Buyer | `buyer@demo.lot` | `demo1234` |
| Admin | `admin@demo.lot` | `demo1234` |

Override via instrumentation args: `sellerEmail`, `sellerPassword`, `RUN_ID`, `apiBaseUrl`.

## Test classes

| Class | Focus | ~min |
|-------|-------|------|
| `FirebaseCriticalSellerJourneyTest` | Login → create → photo → submit → My LOTs → relaunch | 8 |
| `FirebaseSmartphonePreviewTest` | Электроника → Смартфоны preview path | 3 |
| `FirebasePhotoContinueOneTapTest` | Photo Continue one-tap regression | 2 |
| `FirebaseSubmitOutcomeTest` | Submit black-hole guard | 3 |
| `FirebaseMyLotsTest` | Tabs, search, stale guard | 2 |
| `FirebaseUpdateV2JourneyTest` | Self-Update V2 download/verify/installer boundary | 3 |
| `FirebaseHistoricalRegressionsTest` | RC10.x coverage matrix | 1 |

**Total instrumentation target:** ≤ 20 minutes. **Robo complement:** 5 minutes (same APP APK).

## Firebase Console (manual)

1. [Firebase Console](https://console.firebase.google.com) → your project → **Test Lab** → **Run a test**
2. **Instrumentation**
3. **App APK:** upload `artifacts/firebase-test-lab/lot-under-test.apk`
4. **Test APK:** upload `artifacts/firebase-test-lab/lot-instrumentation-tests.apk`
5. Device: **Pixel 5 (redfin)** · API **30** · locale **ru** · portrait
6. Timeout: **25m**
7. Optional env: `RUN_ID=firebase-qa-manual-phone`
8. Launch

**Run 2 — Robo:** same APP APK, Robo 5 minutes, same device profile.

## gcloud (optional)

```bash
gcloud firebase test android run \
  --type instrumentation \
  --app artifacts/firebase-test-lab/lot-under-test.apk \
  --test artifacts/firebase-test-lab/lot-instrumentation-tests.apk \
  --device model=redfin,version=30,locale=ru,orientation=portrait \
  --timeout 25m \
  --environment-variables RUN_ID=firebase-qa-manual-phone,clearPackageData=true
```

Device model `redfin` = Pixel 5 in Firebase Test Lab catalog.

## QA photo seam

When `EXPO_PUBLIC_FIREBASE_QA=1` (build script only), create LOT screen exposes:

- `lot-photo-inject-smartphone`
- `lot-photo-inject-product`

Fixtures live in `apps/mobile/instrumentation/fixtures/`. Production builds without the flag are unchanged.

## Log markers

Tests emit:

```
FIREBASE_QA_STEP_START=<name>
FIREBASE_QA_STEP_PASS=<name>
FIREBASE_QA_STEP_FAIL=<name>
```

Filter logcat in Test Lab results for `FirebaseQa`.

## Human-only steps (not automated)

- Firebase project billing / quota
- Play Protect / unknown-sources prompts on physical devices
- System Package Installer confirmation (test ends at `INSTALLER_BOUNDARY_REACHED` when needed)
- Moderator approval of PENDING_REVIEW lots
- Buyer checkout / payment flows
