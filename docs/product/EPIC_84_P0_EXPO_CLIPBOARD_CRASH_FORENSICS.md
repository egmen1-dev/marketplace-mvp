# EPIC 84 — P0 Expo Modules Crash Forensics (Clipboard / AnyTypeProvider)

## Verified physical crash (Firebase Test Lab)

```
FATAL EXCEPTION
Process: ru.lot.marketplace.alpha

java.lang.NoClassDefFoundError
Failed resolution of: expo.modules.kotlin.types.AnyTypeProvider
at expo.modules.clipboard.ClipboardModule.definition(...)
```

This is the **first confirmed runtime failure**. The app terminates during Expo native module registration — before JS boot pipeline completes.

---

## All prior hypotheses — REVOKED

| Hypothesis | Status |
|------------|--------|
| SecureStore eager init | **REVOKED** — crash is native Kotlin, not SecureStore |
| Expo Router sync imports | **REVOKED** |
| New Architecture disable | **REVOKED** |
| SplashScreen | **REVOKED** |
| Expo Router sync + New Arch (0.1.4) | **REVOKED** |

Investigation must use **only** the verified stack trace above unless independently re-proven.

---

## Root cause (confirmed)

**Stranded `expo-clipboard@8.0.8` on Expo SDK 57.**

| Layer | Detail |
|-------|--------|
| Installed npm | `expo-clipboard@8.0.8` (declared `~8.0.2`) |
| SDK 57 expected | `expo-clipboard@~57.0.1` (`expo/bundledNativeModules.json`) |
| Runtime core | `expo-modules-core@57.0.11` |
| Missing class | `expo.modules.kotlin.types.AnyTypeProvider` **removed in SDK 56+** |
| Offending artifact | Prebuilt AAR `expo.modules.clipboard-8.0.8.aar` in `local-maven-repo` |

### Why it crashes

1. `expo-clipboard@8.0.8` ships a **prebuilt Android AAR** (`expo-module.config.json` → `"repository": "local-maven-repo"`).
2. Bytecode in that AAR references `AnyTypeProvider.INSTANCE` (verified via `javap -verbose` on `classes.jar`).
3. `expo-modules-core@57.0.11` no longer contains `AnyTypeProvider` — replaced by `AnyTypeCache` (SDK 56 type-system refactor).
4. At cold start, `ModuleRegistry.register()` loads `ClipboardModule.definition()` → **NoClassDefFoundError** → process exit.

This is the same failure class as [expo#47076](https://github.com/expo/expo/issues/47076) (`@expo/dom-webview` stranded on pre-SDK-56 build).

**Not caused by:** R8/ProGuard (minify disabled), duplicate expo-modules-core, ABI mismatch, or storage corruption.

---

## Phase 1 — Dependency audit

| Package | Installed | Expected (SDK 57) | Gradle resolved | Status |
|---------|-----------|-------------------|-----------------|--------|
| expo | 57.0.13 | ~57.0.13 | project :expo | ✓ |
| expo-modules-core | 57.0.11 | (via expo) | 57.0.11 | ✓ |
| **expo-clipboard** | **8.0.8 → 57.0.1** | **~57.0.1** | **8.0.8 → 57.0.1** | **✗ → ✓ fixed** |
| expo-constants | 57.0.11 | ~57.0.11 | 57.0.11 | ✓ |
| expo-file-system | 57.0.4 | ~57.0.3 | 57.0.4 | ✓ |
| expo-linking | 57.0.6 | ~57.0.6 | 57.0.6 | ✓ |
| expo-secure-store | 57.0.1 | ~57.0.1 | 57.0.1 | ✓ |
| expo-splash-screen | (transitive) | ~57.0.x | via expo-router | ✓ |
| expo-font | 57.0.1 | ~57.0.1 | 57.0.1 | ✓ |
| expo-system-ui | (transitive) | ~57.0.x | n/a | ✓ |
| expo-router | 57.0.13 | ~57.0.13 | 57.0.13 | ✓ |
| expo-updates | not installed | n/a | n/a | n/a |
| react-native | 0.86.2 | 0.86.2 | react-android | ✓ |
| react-native-gradle-plugin | (via RN) | 0.86.2 | includeBuild | ✓ |
| react-native-reanimated | 4.5.3 | (router) | 4.5.3 | ✓ |
| react-native-screens | 4.26.2 | ~4.26.0 | 4.26.2 | ✓ |
| react-native-safe-area-context | 5.7.0 | ~5.7.0 | 5.7.0 | ✓ |
| react-native-gesture-handler | 3.2.1 | (router) | 3.2.1 | ✓ |

---

## Phase 3 — Class verification

| Question | Answer |
|----------|--------|
| Which artifact should contain `AnyTypeProvider`? | **None on SDK 57** — class was removed |
| Is class packaged in expo-modules-core 57.0.11? | **No** — only `AnyType`, `AnyTypeCache`, `AnyTypeConverter` |
| Was it removed / relocated? | **Removed** in SDK 56; replaced by `AnyTypeCache` |
| R8 / ProGuard removing it? | **No** — `minifyEnabled` false in release |
| Old AAR reused? | **Yes** — `expo-clipboard-8.0.8.aar` prebuilt in npm package |

### Bytecode evidence

```text
# expo-clipboard 8.0.8 AAR (BROKEN)
Fieldref AnyTypeProvider.INSTANCE

# expo-clipboard 57.0.1 AAR (FIXED)
Fieldref AnyTypeCache.INSTANCE
```

---

## Fix (0.1.5-alpha)

```diff
- "expo-clipboard": "~8.0.2"
+ "expo-clipboard": "~57.0.1"
```

Gate: `npx tsx scripts/mobile-p0-expo-deps-gate.ts`

## P0 release gate (0.1.5-alpha)

Mandatory pipeline before Test Lab upload / publish:

```bash
npm run mobile:p0:release-gate-015
```

Steps: expo deps → clean build → APK metadata (aapt) → bytecode guard → Firebase Test Lab.

Publish blocked until **Pixel 5 / API 30 / Robo PASS**.

Incident: `docs/incidents/MOBILE-P0-EXPO-CLIPBOARD-ANYTYPEPROVIDER.md`

---

## Mandatory release rule

```text
candidate APK → Firebase Test Lab / physical PASS → GitHub Release + MRP publish
```

Never publish Closed Alpha before verified launch on real Android.

---

## Final report

```text
PHYSICAL DEVICE: Firebase Test Lab (verified crash)

CRASH TYPE: A — Java/Kotlin NoClassDefFoundError

EXACT STACK:
  NoClassDefFoundError: expo.modules.kotlin.types.AnyTypeProvider
  at expo.modules.clipboard.ClipboardModule.definition(...)

ROOT CAUSE:
  expo-clipboard@8.0.8 prebuilt AAR incompatible with expo-modules-core@57.0.11

WHY 0.1.4 FIX FAILED:
  Addressed wrong hypotheses (router/newArch/SecureStore); never fixed stranded clipboard version

FIX:
  expo-clipboard ~57.0.1 + clean assembleRelease

0.1.5 FIREBASE / PHYSICAL COLD LAUNCH: pending rerun

P0: OPEN until Test Lab PASS

CLOSED ALPHA: NO-GO until verified
```
