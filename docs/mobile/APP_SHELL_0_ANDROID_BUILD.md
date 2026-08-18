# APP-SHELL-0 Android Build

## Target

- Package: `ru.lot.marketplace.alpha`
- versionName: `0.1.0-alpha`
- versionCode: `1`
- releaseChannel: `alpha`

## Local build (developer machine)

```bash
# Bake commit + build date into JS bundle (required for Build Info on device)
npm run mobile:write-build-info
npm run mobile:verify-build

cd apps/mobile
npm install --legacy-peer-deps
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

APK output (typical):

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

## EAS Build (recommended for CI)

```bash
npm i -g eas-cli
eas build -p android --profile preview
```

Do not commit production keystore or passwords.

## Cloud agent note

This EPIC branch validates project structure, typecheck, and Gradle prebuild readiness. Installable artifact SHA256 is recorded in `mobile-release-manifest.json` when a build completes on a machine with Android SDK.

## Security

- HTTPS only for staging/production API base URL
- No secrets in bundle
- Signing keys outside repository
