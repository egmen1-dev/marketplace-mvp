# P0 Final Validation Report — 0.1.5-alpha

**Generated:** 2026-08-17T13:19:00Z  
**Branch:** `cursor/mobile-p0-physical-crash-forensics-d03e`  
**Commit:** `2db4297`  
**Task:** Validation only — no code changes applied in this run.

---

## Candidate APK

| Field | Value |
|-------|-------|
| Path | `artifacts/epic-84-p0-startup/lot-android-alpha-0.1.5.apk` |
| SHA256 | `a468413a232171708655b8543ae000baf9b2158615bd3066be68c3e430c0a5ed` |
| Build | Clean prebuild + `./gradlew clean assembleRelease --no-build-cache` |
| Build log | `artifacts/epic-84-p0-startup/p0-final-validation-gradle.log` |

---

## Step 1 — Clean release build

| Check | Result |
|-------|--------|
| `versionName` | `0.1.5-alpha` ✓ |
| `versionCode` | `6` ✓ |
| SHA256 recorded | ✓ |

**Note:** Initial gate run failed because `expo prebuild --clean` removed `android/local.properties` and Gradle could not resolve SDK. Validation resumed after restoring `sdk.dir=/workspace/.android-sdk` (environment only; app code unchanged).

---

## Step 2 — AAPT + apkanalyzer

```
package: name='ru.lot.marketplace.alpha' versionCode='6' versionName='0.1.5-alpha'
```

| Gate | Result |
|------|--------|
| Package | `ru.lot.marketplace.alpha` — **PASS** |
| versionName | `0.1.5-alpha` — **PASS** |
| versionCode | `6` — **PASS** |
| apkanalyzer manifest | **PASS** |

Report: `artifacts/epic-84-p0-startup/apk-metadata-gate-report.json`

---

## Step 3 — Bytecode guard

| Check | Result |
|-------|--------|
| `AnyTypeProvider` | **0** occurrences — **PASS** |
| `AnyTypeCache` | **155** occurrences — **PASS** |
| `expo-clipboard` 57.0.1 | prebuilt AAR + gradle — **PASS** |
| `expo-clipboard` 8.0.8 | **0** refs — **PASS** |

Report: `artifacts/epic-84-p0-startup/bytecode-guard-report.json`

---

## Step 4 — Firebase Test Lab

**Required matrix:** Pixel 5 (`redfin`) / API 30 / en_US / portrait / Robo

| Check | Result |
|-------|--------|
| gcloud authenticated | **NO** |
| `FIREBASE_PROJECT_ID` | **NOT SET** |
| Test executed | **NOT RUN** |

Attempt:

```
gcloud firebase test android run --type robo ...
→ ERROR: You do not currently have an active account selected.
```

Report: `artifacts/epic-84-p0-startup/firebase-test-lab-report.json`

---

## Step 5 — FTL artifacts

| Artifact | Status |
|----------|--------|
| Video | **NOT COLLECTED** (FTL not run) |
| Screenshots | **NOT COLLECTED** |
| logcat | **NOT COLLECTED** |
| crash buffer | **NOT COLLECTED** |
| test summary | **NOT COLLECTED** |

Operator instructions: `artifacts/epic-84-p0-startup/firebase-test-lab-015/operator-instructions.md`

---

## Step 6 — Decision

Firebase Test Lab did **not** complete. Per golden rule: **no new fixes** — infrastructure blocker only.

This is **not** an app-runtime FAIL requiring a new crash forensic report (no stack trace, no boot trail from device).

---

## Final scorecard

```
APK                    PASS
AAPT                   PASS
Clipboard issue        RESOLVED (bytecode + dependency gates)
ErrorUtils issue       RESOLVED IN CODE (global.ErrorUtils fix in 2db4297; device boot not verified)
Firebase Test Lab      FAIL (NOT RUN — no gcloud credentials / project)
Boot reached:
  JS Bundle            NOT VERIFIED ON DEVICE
  Router               NOT VERIFIED ON DEVICE
  Root Layout          NOT VERIFIED ON DEVICE
  Home                 NOT VERIFIED ON DEVICE
Crash                  NOT OBSERVED (no device run)
P0                     OPEN
Closed Alpha           NO-GO
```

---

## Operator unblock (required for P0 CLOSED)

1. Upload `lot-android-alpha-0.1.5.apk` (SHA256 above) to Firebase Test Lab.
2. Device: Pixel 5 / API 30 / en_US / portrait / Robo.
3. Save video, screenshots, logcat, crash buffer to `firebase-test-lab-015/`.
4. If PASS:

```bash
FIREBASE_PROJECT_ID=<project> FIREBASE_TEST_LAB_RESULT=PASS npx tsx scripts/mobile-p0-firebase-test-lab.ts
```

5. Confirm boot trail in logcat:

`NATIVE_START → JS_BUNDLE_START → startup crash handlers installed → ROUTER_ENTRY → ROOT_LAYOUT_INIT → Home`

6. Confirm absence of:

- `NoClassDefFoundError: AnyTypeProvider`
- `Cannot read property 'getGlobalHandler' of undefined`
