# EPIC 84 — P0 Physical Android Crash Forensics

## STOP RULE

Do **not** start EPIC 87, Seller Sprint 1, or new product sprints until exact physical crash is resolved with evidence.

---

## All prior hypotheses — REVOKED

| Hypothesis | Status |
|------------|--------|
| Expo Router sync imports + New Architecture | **REVOKED** |
| SecureStore eager init | **REVOKED** |
| SplashScreen | **REVOKED** |

**Confirmed root cause (Firebase Test Lab):** `expo-clipboard@8.0.8` prebuilt AAR references removed `AnyTypeProvider` — see `EPIC_84_P0_EXPO_CLIPBOARD_CRASH_FORENSICS.md`.

---

## Previous hypothesis — REVOKED (0.1.4 hotfix)

---

## Confirmed from shipped 0.1.4 APK audit (build artifact evidence)

| Check | Expected (0.1.4 hotfix intent) | Actual in release build |
|-------|----------------------------------|-------------------------|
| `app.config.js` `newArchEnabled` | `false` | `false` ✓ |
| `android/gradle.properties` `newArchEnabled` | `false` | **`true`** ✗ (stale prebuild) |
| `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED` | `false` | **`true`** ✗ |
| Embedded expo config in APK assets | `newArchEnabled: false` | `false` ✓ |

## Confirmed from React Native 0.86 source (RN Gradle plugin)

**`newArchEnabled: false` is not supported since React Native 0.82.** The Gradle plugin:

- Logs a warning that disabling New Architecture is unsupported
- Hardcodes `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED = true` in `AgpConfiguratorUtils.kt`
- Forces `newArchEnabled=true` on all subprojects in `ReactRootProjectPlugin.kt`

**Therefore:** the 0.1.4 hotfix strategy of disabling New Architecture **cannot work** on RN 0.86 / Expo 57. The app always runs with New Architecture enabled.

## Working hypothesis for 0.1.5 (code evidence, pending physical logcat)

**Eager `expo-secure-store` TurboModule initialization during cold start** before splash handoff:

| Import chain (0.1.4) | SecureStore at module load |
|----------------------|----------------------------|
| `early-boot.ts` → `previous-crash.ts` | **YES** |
| `_layout.tsx` → `previous-crash.ts` | **YES** |
| `_layout.tsx` → `useDeepLinkHandler` → `secure-session.ts` | **YES** |
| `index.tsx` → `run-startup-pipeline` → `boot-storage.ts` | **YES** |

**0.1.5 fix:** `lazy-secure-store.ts` dynamic import — SecureStore loads only when first read/write is needed (after boot pipeline starts), not at `JS_BUNDLE_START`.

**Previous hypothesis status:** NOT CONFIRMED / INCOMPLETE — lazy router helps but does not address mandatory New Arch + eager SecureStore.

---

## Operator workflow (physical device required)

```bash
chmod +x scripts/mobile-p0-physical-crash-forensics.sh
RELEASE=0.1.4-alpha ./scripts/mobile-p0-physical-crash-forensics.sh
```

Collects:

- `adb devices`
- device matrix (manufacturer, model, Android, ABI)
- installed `versionName` / `versionCode`
- `dumpsys activity exit-info`
- full + filtered logcat
- **crash buffer** (`adb logcat -b crash -d`)
- boot markers (`NATIVE_START`, `JS_BUNDLE_START`, `ROUTER_ENTRY`, …)

Artifacts: `artifacts/epic-84-p0-physical-crash/<release>/`

---

## Clean vs update matrix

| Test | Procedure |
|------|-----------|
| **Update install** | `adb install -r lot-android-alpha-0.1.X.apk` |
| **Clean install** | `adb uninstall ru.lot.marketplace.alpha` then install |
| **Data reset** | `adb shell pm clear ru.lot.marketplace.alpha` |

Compare A (update) vs B (clean). If clean PASS + update CRASH → migration/local state. If both CRASH → binary/runtime/native.

---

## Boot marker table (fill from logcat)

| Marker | Seen |
|--------|------|
| NATIVE_START | |
| JS_BUNDLE_START | |
| ROUTER_ENTRY | |
| ROOT_LAYOUT_INIT | |
| BOOT_PIPELINE_INIT | |

Last seen marker = highest evidence before death.

---

## 0.1.5-alpha fix (candidate)

| Change | Purpose |
|--------|---------|
| `plugins/withNativeArchSync.js` | Force `gradle.properties` `newArchEnabled` = app.config |
| `gradle.properties` `newArchEnabled=false` | Immediate sync |
| Clean prebuild + `assembleRelease` | No stale android cache |
| `versionName=0.1.5-alpha`, `versionCode=6` | New version (do not overwrite 0.1.4) |
| ErrorUtils delegates after record | PART 15 — no blind fatal suppression |

**Gate:**

```bash
tsx scripts/mobile-p0-native-arch-gate.ts   # after assembleRelease
```

---

## Mandatory release rule (PART 17)

```text
candidate APK → physical launch PASS → GitHub Release + MRP publish
```

Never publish Closed Alpha before physical smoke on real Android.

---

## Final report template

```text
PHYSICAL DEVICE: <manufacturer/model/android>

INSTALLED:
versionName=
versionCode=

0.1.4 CLEAN INSTALL: PASS / CRASH
0.1.4 UPDATE INSTALL: PASS / CRASH

LAST BOOT MARK: ...

CRASH TYPE: A–J

EXACT STACK: ...

ROOT CAUSE: ...

WHY 0.1.4 FIX FAILED: native newArch still enabled in BuildConfig

FIX: withNativeArchSync + clean prebuild 0.1.5-alpha

0.1.5 PHYSICAL COLD LAUNCH: X/10

P0: OPEN / CLOSED

CLOSED ALPHA: NO-GO / WATCH / GO
```
