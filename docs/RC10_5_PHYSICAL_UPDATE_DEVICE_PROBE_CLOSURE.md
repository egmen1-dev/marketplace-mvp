# RC10.5 Physical Update Device Probe Closure

**Date:** 2026-08-27  
**Status:** CLOSED — forensic classification complete  
**Immutable client:** RC10.5 commit `91b9c1d` (versionCode 21)  
**Target:** RC10.7 (versionCode 23)

## Summary

Physical device probe with server-side request logging **definitively proves** the RC10.5 update tap reached Railway and downloaded the full 44,411,738-byte APK. Failure occurs **after HTTP**, most likely during SHA verification (`file.arrayBuffer()` on ~44 MB). Server/proxy/MRP changes cannot repair the installed immutable client.

```text
HTTP_REQUEST_FROM_DEVICE=YES
FAILURE_BOUNDARY=SHA_VERIFY (primary) | INSTALLER_HANDOFF (secondary)
FINAL_VERDICT=BLOCKED_POST_DOWNLOAD
OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE=NO
```

## Deploy baseline

| Field | Value |
|-------|-------|
| PR #205 | MERGED |
| main / Railway | `b91871a` |
| DEVICE_PROBE_API_LIVE | YES |
| Control probe | `f9a2a06c-637` — 44,411,738 bytes PASS |

## Physical attempt

- **Screen:** Проверить обновление
- **Action:** Скачать обновление
- **Device display time:** 17:59 (no seconds)
- **Outcome:** RC10.5 remains; installer did not open; legacy failed+available UI

### Time mapping

| Field | Value |
|-------|-------|
| DEVICE_DISPLAY_TIME | 17:59 |
| DEVICE_TIMEZONE | UTC+5 (best-evidence) |
| TIME_MAPPING_CONFIDENCE | HIGH |
| Primary server match | `26ba1005-0c2` at `12:58:29Z` → **17:58:29** local (UTC+5) |
| SEARCH_WINDOW | `2026-08-27T12:25:00Z` .. `2026-08-27T13:30:00Z` |

Wide window used to avoid false NO from timezone ambiguity. UTC+5 alignment within 31 seconds of operator time.

## Request log correlation

### Excluded

| requestId | Reason |
|-----------|--------|
| `f9a2a06c-637` | Control probe (`device-bridge-control-probe/1.0`) |

### Physical (okhttp/4.9.2)

| requestId | Started (UTC) | Local UTC+5 | Bytes | Complete |
|-----------|---------------|-------------|-------|----------|
| `117959fd-9ae` | 12:56:04 | 17:56:04 | 44,411,738 | YES |
| `26ba1005-0c2` | 12:58:29 | 17:58:29 | 44,411,738 | YES |

Primary correlation to 17:59 tap: **`26ba1005-0c2`**.

## Server lifecycle (primary request)

```text
REQUEST_ID=26ba1005-0c2
REQUEST_STARTED_AT=2026-08-27T12:58:29.559Z
RESPONSE_STATUS=200
BYTES_SENT=44411738
RESPONSE_COMPLETE=YES
CLIENT_DISCONNECTED=NO
DURATION_MS=20367
```

Classification: **NETWORK_DOWNLOAD_SUCCESS** → failure is post-HTTP.

## Root cause

1. **SHA_VERIFY (primary):** `downloadVerifiedApk` → `sha256HexFromFile` → `file.arrayBuffer()` on full APK. Telemetry `update_downloaded` only fires after verify — likely never reached.
2. **INSTALLER_HANDOFF (secondary):** Only if verify passed; `openApkInstaller` needs `file.contentUri`.
3. **PRE-HTTP ruled out** by request-log for this attempt.

Legacy contradictory UI (failed check + available CTA) is a known RC10.5 bug — **not** the transport root cause.

## Previous hypotheses

| Hypothesis | Verdict |
|------------|---------|
| GitHub raw transport | **DISPROVEN** (proxy + physical okhttp both complete) |
| Railway proxy transport | **DISPROVEN** (full bytes on device path) |

## Recovery

```text
OLD_CLIENT_REMOTE_RECOVERY_POSSIBLE=NO
MANUAL_BROWSER_BRIDGE_SAFE=YES
SIGNER_MATCH=YES
```

Manual bridge (no uninstall):

`https://web-production-e56fb.up.railway.app/api/mobile/releases/apk?versionCode=23`

Signer: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`

## Gate gap

- **SERVER_BRIDGE_GATE:** Node/curl/MRP — does NOT prove physical Expo FileSystem.
- **DEVICE_BRIDGE_GATE:** Must require real Android download lifecycle evidence.

Never declare physical update READY from server gates alone.

## Future client hardening (no RC in this EPIC)

Observable stages required:

`CHECKING → UPDATE_AVAILABLE → DOWNLOAD_PREPARING → DOWNLOAD_STARTED → DOWNLOAD_PROGRESS → DOWNLOAD_COMPLETE → VERIFYING → VERIFIED → INSTALLER_HANDOFF → SUCCESS | VISIBLE_ERROR`

Replace full-file `arrayBuffer()` SHA with streaming/native digest for large APKs.

## Artifacts

`artifacts/mobile-update-device-probe/`

## Release constraints

```text
RC10.8=NOT_CREATED
MRP=UNCHANGED
```
