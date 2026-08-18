# EPIC 84 · P0 — Verify Installed Build

## Problem

Device shows **old** Startup Error Screen without Startup ID, connectivity panel, copy/export diagnostics.

**Root cause:** Published APK `0.1.2-alpha` (versionCode 3) was built from commit `feb4b8d` on `origin/main`. EPIC-84 startup diagnostics (P0/P1) live on feature branch and are **not** in that APK.

| Source | Commit |
|--------|--------|
| Published APK / manifest | `feb4b8d` |
| `origin/main` (current) | `feb4b8d` |
| EPIC-84 branch (startup + PDP) | ahead of main |

## Fix

1. **Bake build metadata** into mobile bundle via `scripts/write-mobile-build-info.mjs` → `apps/mobile/src/config/build-info.generated.ts`
2. **Show Build Info** on `StartupErrorScreen` (Version, VersionCode, Commit, Build Date, Environment)
3. **Long-press splash logo** → `/build-info` (works during boot error)
4. **`npm run mobile:verify-build`** — CLI verification before/after APK build

## Developer workflow

```bash
# 1. Refresh embedded metadata (runs automatically in verify-build)
npm run mobile:write-build-info

# 2. Verify sources (+ optional APK)
npm run mobile:verify-build

# 3. Build APK (after write-build-info)
cd apps/mobile && npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

## On device (no adb)

- Startup error screen → **Build Info** panel at bottom
- Long-press **ЛОТ logo** on splash (even during error) → **Build Info** screen
- From Build Info → **Startup Diagnostics** for full timeline

## Commands

| Command | Purpose |
|---------|---------|
| `npm run mobile:write-build-info` | Regenerate `build-info.generated.ts` from git + app.json |
| `npm run mobile:verify-build` | Print Version/Commit/SHA/Manifest + alignment checks |

Optional: `MOBILE_APK_PATH=/path/to.apk npm run mobile:verify-build`

## Definition of Done

Developer can identify installed build from the app UI without adb or Android Studio.
