# EPIC-84 P0 — Physical Acceptance (Android)

**Target build:** `0.1.5-alpha` (versionCode **6**) — expo-clipboard SDK 57 fix  
**Previous failing builds:** `0.1.3-alpha` / `0.1.4-alpha` (AnyTypeProvider crash)

## Preconditions

- Install **fresh release APK** from clean build (`mobile:p0:release-gate-015`)
- Verify build via long-press splash → **Build Info** (commit, versionCode, SHA)
- **Firebase Test Lab PASS** on Pixel 5 / API 30 required before partner handoff

## Mandatory release gates (before Test Lab upload)

```bash
npm run mobile:p0:expo-deps-gate      # Expo SDK compatibility
npm run mobile:p0:apk-metadata-gate     # aapt versionName/versionCode
npm run mobile:p0:bytecode-guard        # AnyTypeProvider=0
npm run mobile:p0:firebase-test-lab     # Robo on Pixel 5 API 30
npm run mobile:p0:release-gate-015      # full pipeline
```

## P0 cold launch (blocker)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Cold launch ×10 | Force-stop → launch ×10 | **10/10** no process crash |
| 2 | Boot trail | logcat during launch | `NATIVE_START` → `JS_BUNDLE_START` → `ROUTER_ENTRY` → pipeline |
| 3 | Happy path | Online cold start | Splash → Login or Home |
| 4 | Offline boot | Airplane mode → cold start | Controlled error — **no process crash** |

## Partner smoke (after Firebase PASS)

Login → Home → Catalog → PDP → Cart → Orders → Favorites → Profile → background/resume

## Sign-off

- [ ] Expo dependency gate PASS
- [ ] Bytecode guard: AnyTypeProvider = 0
- [ ] Firebase Test Lab Pixel 5 / API 30 PASS
- [ ] Partner cold launch ×10 PASS
- [ ] P0 **CLOSED**

See `docs/incidents/MOBILE-P0-EXPO-CLIPBOARD-ANYTYPEPROVIDER.md`.
