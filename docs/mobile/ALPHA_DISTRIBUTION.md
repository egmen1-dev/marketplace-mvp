# Alpha APK Distribution Foundation

**Release channel:** `alpha`  
**Package:** `ru.lot.marketplace.alpha`  
**Current artifact:** `lot-android-alpha-0.1.0.apk`

## Artifact location

| Field | Value |
|---|---|
| File | `lot-android-alpha-0.1.0.apk` |
| SHA256 | `91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585` |
| Size | 92,668,706 bytes (~88 MB) |
| Manifest | `mobile-release-manifest.json` |

Controlled hosting (recommended for closed Alpha):

1. Private object storage or GitHub Release asset (draft)
2. HTTPS download with checksum published alongside
3. `GET /api/mobile/android/update` returns `downloadUrl` + `sha256` when ready

**Do not** publish to Google Play in APP-SHELL-0/001.

## SHA256 verification (testers)

```bash
sha256sum lot-android-alpha-0.1.0.apk
# must equal manifest artifactSha256
```

## Version metadata publication

Backend endpoint: `/api/mobile/android/update`

Fields when Alpha distribution opens:

- `versionName`, `versionCode`, `downloadUrl`, `sha256`, `updateRequired`

Until hosting ready: `downloadUrl = null` (valid).

## Rollback

Keep previous Alpha APK + manifest row. Rollback = reinstall prior APK; never reuse `versionCode`.

## Update notification path (future)

```
installed Alpha → backend update metadata → in-app banner → download new APK → verify sha256 → install
```

Self-update installer deferred to APP-SHELL-1.
