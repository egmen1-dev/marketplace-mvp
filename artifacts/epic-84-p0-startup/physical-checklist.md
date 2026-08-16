# EPIC-84 P0 — Physical Acceptance (Android)

**Target build:** `0.1.4-alpha` (versionCode **5**) — P0 startup crash hotfix  
**Previous failing build:** `0.1.3-alpha` (versionCode 4)

## Preconditions

- Install **release APK** (`assembleRelease`), not Metro dev client
- Verify build via long-press splash → **Build Info** (commit, versionCode, SHA)
- Optional: `adb logcat | grep LOT` for boot trail

## P0 cold launch (blocker)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Cold launch ×10 | Force-stop → launch ×10 | **10/10** no process crash (no instant return to home) |
| 2 | Boot trail | logcat during launch | `NATIVE_START` → `JS_BUNDLE_START` → `ROUTER_ENTRY` → `ROOT_LAYOUT_INIT` → `BOOT_PIPELINE_INIT` |
| 3 | Happy path | Online cold start | Splash → Login or Home |
| 4 | Offline boot | Airplane mode → cold start | Controlled error/recovery — **no process crash** |
| 5 | Fatal JS (if injectable) | Dev-only throw after bundle | **Startup Fatal Error** with Crash ID + stack — app stays open |

## Startup pipeline (recoverable errors)

| # | Scenario | Expected |
|---|----------|----------|
| 6 | Offline bootstrap | Startup Error: stage Bootstrap, network reason |
| 7 | Retry | **Повторить** → pipeline restarts |
| 8 | Session expired | Opens Login |
| 9 | Diagnostics | Long-press splash → Build Info → Startup Diagnostics |

## Regression smoke (buyer funnel)

After cold launch PASS: Login → Home → Catalog → PDP → Cart → Orders

## Sign-off

- [ ] Cold launch **10/10 PASS** on same device that crashed on 0.1.3
- [ ] `npm run mobile:release-smoke` PASS
- [ ] `npm run product:epic-84:p0-startup` PASS
- [ ] P0 **CLOSED** — operator sign-off required

See `docs/product/EPIC_84_P0_FATAL_CRASH_RESOLUTION.md` for ROOT CAUSE and fix details.
