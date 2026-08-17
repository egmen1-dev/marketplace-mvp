# EPIC 84 — P0 Startup Crash Investigation

## Problem

On physical Android the splash appears, then the app closes immediately and returns to the home screen. Startup Diagnostics never shows — the crash happens **before** the startup pipeline runs.

## Goal

1. **Never close silently** on JavaScript errors during startup.
2. Show **Startup Fatal Error** with exception message, stack trace, and boot trail.
3. Log **BOOT 1, BOOT 2, …** before first render to pinpoint the failing import/step.
4. Validate **release** build (`assembleRelease`), not Metro alone.

## Architecture

```text
index.js (custom entry)
  └─ early-boot.ts (BOOT marks + ErrorUtils handler)
  └─ expo-router/entry OR fatal-bootstrap fallback

app/_layout.tsx
  └─ RootErrorBoundary → StartupFatalGate → SafeAreaProvider → RootShell
```

| Module | Role |
|--------|------|
| `apps/mobile/index.js` | Custom entry; BOOT logging; fatal fallback if router entry throws |
| `apps/mobile/src/boot/early-boot.ts` | `bootMark()`, fatal store, global handler (no process exit) |
| `apps/mobile/src/boot/fatal-bootstrap.tsx` | Minimal fatal UI when Expo Router cannot load |
| `RootErrorBoundary` | Outermost React boundary → `StartupFatalErrorScreen` |
| `StartupFatalGate` | Shows fatal UI from `ErrorUtils` via `useSyncExternalStore` |
| `StartupFatalErrorScreen` | Title, exception, stack, component stack, boot trail |

## Boot trail (expected order)

```text
BOOT 1: early-boot module loaded
BOOT 2: startup crash handlers installed
BOOT 3: index.js entry start
BOOT 4: loading expo-router/entry
… module marks (_layout, app-store, NetworkBanner, …)
BOOT N: expo-router/entry loaded
BOOT N+1: RootLayout render
```

The last BOOT line before `FATAL (...)` on device pinpoints the crash step.

## Verification

```bash
npm run mobile:typecheck
npm run product:epic-84:p0-startup

# Release APK (not Metro dev)
cd apps/mobile && npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

Physical checklist: `artifacts/epic-84-p0-startup/physical-checklist.md`

## Recovery vs fatal

| Layer | Trigger | UI |
|-------|---------|-----|
| Startup pipeline failure | Network/bootstrap/session | `StartupErrorScreen` (stage + retry) |
| React render error | Component throw | `StartupFatalErrorScreen` via `RootErrorBoundary` |
| Uncaught JS (fatal) | `ErrorUtils` | `StartupFatalErrorScreen` via `StartupFatalGate` |
| Expo Router entry import | Sync `require` throw | `fatal-bootstrap` minimal screen |

Native module crashes (before JS) cannot be intercepted in JS.
