# Incident: MOBILE-P0-EXPO-CLIPBOARD-ANYTYPEPROVIDER

## Summary

Closed Alpha Android builds crashed immediately after splash during Expo native module registration.

## Affected releases

| Release | versionCode | Status |
|---------|-------------|--------|
| 0.1.3-alpha | 4 | CRASH |
| 0.1.4-alpha | 5 | CRASH |
| 0.1.5-alpha | 6 | Fix candidate — pending Firebase Test Lab PASS |

## Verified stack trace (Firebase Test Lab)

```
java.lang.NoClassDefFoundError
Failed resolution of: expo.modules.kotlin.types.AnyTypeProvider
at expo.modules.clipboard.ClipboardModule.definition(...)
```

## Root cause

**Expo SDK version mismatch:** `expo-clipboard@8.0.8` prebuilt AAR references `AnyTypeProvider`, removed from `expo-modules-core` in SDK 56+.

| Component | Broken | Fixed |
|-----------|--------|-------|
| expo-clipboard npm | 8.0.8 | 57.0.1 |
| prebuilt AAR | 8.0.8 | 57.0.1 |
| expo-modules-core | 57.0.11 | 57.0.11 (unchanged) |

## Fix

```diff
- "expo-clipboard": "~8.0.2"
+ "expo-clipboard": "~57.0.1"
```

## Prevention gates (mandatory)

| Gate | Script |
|------|--------|
| Expo dependency compatibility | `npx tsx scripts/mobile-p0-expo-deps-gate.ts` |
| APK metadata | `npx tsx scripts/mobile-p0-apk-metadata-gate.ts` |
| Bytecode guard (AnyTypeProvider=0) | `npx tsx scripts/mobile-p0-bytecode-guard.ts` |
| Firebase Test Lab (Pixel 5 API 30) | `npx tsx scripts/mobile-p0-firebase-test-lab.ts` |
| Full pipeline | `npm run mobile:p0:release-gate-015` |

### Regression guard

Release gate **FAIL** if:

- `expo-clipboard` prebuilt AAR is not SDK 57 line (`57.x`)
- `expo-clipboard` resolves to `8.x`
- APK dex contains `AnyTypeProvider`

## Revoked hypotheses

SecureStore, Expo Router sync imports, New Architecture disable, SplashScreen — not supported by verified stack trace.

## Validated release

| Field | Value |
|-------|-------|
| Target | 0.1.5-alpha / versionCode 6 |
| Firebase Test Lab | pending |
| Physical partner | pending after FTL PASS |

## Release policy (post-incident)

```text
dependency gate → clean build → APK metadata → bytecode guard → Firebase Test Lab → publish
```

No GitHub Release / MRP publish before Firebase Test Lab PASS on primary device matrix.

## References

- `docs/product/EPIC_84_P0_EXPO_CLIPBOARD_CRASH_FORENSICS.md`
- `scripts/mobile-p0-release-gate-015.ts`
- [expo#47076](https://github.com/expo/expo/issues/47076) — same failure class (`AnyTypeProvider`)
