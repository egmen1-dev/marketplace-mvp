# Android Self-Update V2 / Post-Download Hardening

## Forensic input (immutable)

Physical RC10.5 → RC10.7 probe proved:

```text
HTTP_REQUEST_FROM_DEVICE=YES
NETWORK_DOWNLOAD_SUCCESS=PROVEN
FAILURE_BOUNDARY=POST_DOWNLOAD
RC10_5_REMOTE_RECOVERY=FAILED
MANUAL_BROWSER_BRIDGE=SUPPORTED
```

`PROVEN_ROOT_CAUSE` for SHA-only failure is **not** claimed. V2 hardens the entire post-download pipeline.

## V2 changes

| Area | Before | After |
|------|--------|-------|
| SHA verify | `file.arrayBuffer()` — 44MB JS heap | `File.open().readBytes(256KiB)` + incremental SHA256 |
| Progress | None | Truthful `%` / MB from `downloadFileAsync.onProgress` |
| Cache | Implicit | Explicit `CACHE_*` states + size check |
| Installer | Generic install error | `INSTALL_PERMISSION_REQUIRED` with dedicated CTA |
| Diagnostics | Partial events | Full V2 event chain with `actionId` |
| Errors | Generic Russian strings | Typed taxonomy with stage-accurate copy |

## SHA verification

```text
APK_SHA_IMPLEMENTATION=CHUNKED
FULL_FILE_JS_ARRAYBUFFER=NO
APK_VERIFY_PEAK_JS_MEMORY_SAFE=YES
```

## Manual bootstrap (RC10.5 only)

Browser install over existing app (no uninstall):

`https://web-production-e56fb.up.railway.app/api/mobile/releases/apk?versionCode=23`

Future RCs must self-update via V2 pipeline.

## Gates

```bash
npm run mobile:update-journey:gate
npm run mobile:android-update-install:gate
npm run mobile:update-device-bridge:gate
npm run mobile:pre-physical:v3
```

## Physical checklist (next RC)

See `docs/mobile/EPIC_ANDROID_SELF_UPDATE_V2_PHYSICAL_CHECKLIST.md`.

## Release discipline

- Do **not** build next RC until `PRE_PHYSICAL_V3=PASS`
- Do **not** mutate RC10.7 MRP or artifacts
- Physical proof required: `OLD_FIXED_RC → IN_APP_UPDATE → NEW_RC`
