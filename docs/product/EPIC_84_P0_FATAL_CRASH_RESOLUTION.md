# EPIC 84 — P0 Fatal Startup Crash Resolution

> **UPDATE (P0 forensics):** Previous root cause below is **NOT CONFIRMED / INCOMPLETE** — 0.1.4 still crashes on physical device. See `docs/product/EPIC_84_P0_PHYSICAL_CRASH_FORENSICS.md`.

## ROOT CAUSE (0.1.4 hotfix — INCOMPLETE)

**Expo Router default `sync` import mode + New Architecture native module initialization during cold start.**

On release APK cold launch, Expo Router synchronously `require()`s **all registered route modules** (Stack + Tabs — 19 routes) before `runStartupPipeline()` runs (pipeline starts only in `app/index.tsx` `useEffect`).

That eager graph pulls native TurboModules across the whole app at process start:

| Module | Loaded via (startup path) |
|--------|---------------------------|
| `expo-secure-store` | `boot-storage`, `secure-session`, caches |
| `expo-network` | `NetworkBanner` (was static in `_layout`) |
| `expo-clipboard` | `StartupErrorScreen` → diagnostics |
| `expo-device` / `expo-constants` | diagnostics chain |
| `expo-image` | `OrderCard`, PDP, cart components (orders tab route) |
| `@expo/vector-icons` | tabs, NetworkBanner, OrderCard |

With **`newArchEnabled: true`** (0.1.3-alpha), physical release Hermes builds initialize TurboModules differently from Metro dev. The Android process dies **before** JS Error Boundary / Startup Diagnostics mount — matching observed splash → instant home screen.

**Evidence (not speculation):**

- Symptom: crash before startup pipeline / diagnostics (pipeline is `useEffect`-only)
- `expo-router` default `EXPO_ROUTER_IMPORT_MODE` = `sync` (no override in 0.1.3)
- Release bundle: 1447+ modules; export + assembleRelease PASS (not a compile error)
- P0 JS guard (commit `7abcbd9`) cannot intercept native process death
- `docs/product/EPIC_84_P0_VERIFY_INSTALLED_BUILD.md`: 0.1.2 APK lacked EPIC-84 diagnostics entirely

## CRASH LAYER

**NATIVE** (TurboModule init under New Arch), amplified by **ROUTER/CONFIG** (sync eager imports).

## FIX (minimal)

| Change | File |
|--------|------|
| `EXPO_ROUTER_IMPORT_MODE=lazy` | `apps/mobile/app.config.js` |
| `newArchEnabled: false` (0.1.4 hotfix) | `app.config.js` / `app.json` |
| **`withNativeArchSync` plugin (0.1.5)** | **`plugins/withNativeArchSync.js` — syncs gradle.properties** |
| Defer NetworkBanner + UpdateHost until post-bootstrap | `app/_layout.tsx` |
| Lazy-load `StartupErrorScreen` on boot route | `app/index.tsx` |
| Fix `OrderCard` Animated.Value on Pressable | `OrderCard.tsx` |
| Boot stage markers + previous crash detection | `early-boot.ts`, `previous-crash.ts` |
| Native `NATIVE_START` logcat marker | `plugins/withLotBootMarkers.js` |
| Hotfix version **0.1.4-alpha** / **versionCode 5** | `app.json`, `app.config.js` |

## Verification commands

```bash
npm run mobile:write-build-info
npm run mobile:typecheck
npm run product:epic-84:p0-startup
npm run mobile:release-smoke
npx vitest run tests/mobile-p0-startup-crash.test.ts
```

## Architecture honesty (PART 10)

| Failure type | Recovery |
|--------------|----------|
| JS render/runtime after bundle load | `RootErrorBoundary` → Startup Fatal Error |
| Uncaught JS fatal | `ErrorUtils` → `StartupFatalGate` |
| Expo Router entry import throw | `fatal-bootstrap` minimal UI |
| **Native process crash before/during TurboModule init** | **logcat only** — show previous-crash notice on next launch |

## Physical acceptance (operator)

See `artifacts/epic-84-p0-startup/physical-checklist.md` — cold launch ×10 on failing device required to close P0.

## Isolation (internal only)

```bash
EXPO_PUBLIC_BOOT_DISABLE=network,update npx expo start
```
