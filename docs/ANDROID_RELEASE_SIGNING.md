# Android Release Signing

EPIC-77-PRE-WAVE-6-FINAL-GATE-002 — foundation only (no secrets in repo).

## Release keystore

- One release keystore per distribution channel (staging vs production)
- Store keystore outside git — Railway secrets / CI vault
- Never commit `.jks`, `.keystore`, or passwords

## SHA-256 verification

- `GET /api/mobile/android/update` exposes `sha256` when APK is published
- Native shell verifies hash before install

## versionCode policy

- Monotonic integer per release (`versionCode`)
- `minimumSupportedVersionCode` gates forced upgrade

## Build channels

| Channel | Purpose |
|---|---|
| development | Local dev / emulator |
| staging | Railway staging APK sideload |
| production | Public store / direct download |

## API contract

See `GET /api/mobile/android/update` fields:

- `versionCode`, `versionName`
- `minimumSupportedVersionCode`
- `downloadUrl` (null until APK exists)
- `sha256`, `publishedAt`

## Next epic

App Shell EPIC will wire Gradle signingConfigs to this contract.
