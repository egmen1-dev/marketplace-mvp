# Android bootstrap diagnostics (P0)

## Symptoms

| Device | Symptom | Likely cause |
|--------|---------|--------------|
| A | `Application not installed. Package is invalid.` | Corrupted/truncated APK download, signature mismatch vs prior install, or incomplete transfer |
| B | Splash → `Не удалось загрузить приложение` | Network failure to staging API, SSL/DNS issue, or boot pipeline timeout |

## RC1 APK metadata (reference)

From `artifacts/closed-beta-rc1/aapt-badging.txt`:

| Field | Value |
|-------|-------|
| package | `ru.lot.marketplace.alpha` |
| versionName | `0.1.6-beta.1` |
| versionCode | `4` |
| minSdk | `24` |
| targetSdk | `36` |
| ABIs | `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64` |
| Signing | Debug keystore (`androiddebugkey`) — internal RC only |

Verify any APK:

```bash
node scripts/verify-android-apk.mjs artifacts/closed-beta-rc1/lot-android-closed-beta-0.1.6-beta.1.apk
```

Compare SHA256 with `artifacts/closed-beta-rc1/sha256.txt`.

## Install failure (Device A)

1. Uninstall any prior `ru.lot.marketplace.alpha` build.
2. Re-download APK; confirm size ~93 MB and SHA256 matches manifest.
3. If upgrading from a **different signing key**, Android rejects install — uninstall old build first.
4. Confirm device API ≥ 24.

## Boot failure (Device B)

### Startup stages (logged)

1. `app_init` — embedded env (API URL, channel, version)
2. `api_health` — `GET /api/health`
3. `bootstrap` — `GET /api/mobile/bootstrap`
4. `remote_config` — `GET /api/product-ops/config`
5. `update_check` — `GET /api/mobile/update`
6. `session_restore` — SecureStore token/meta read
7. `navigation` — login vs app

### On-device diagnostics

After RC1.1+ builds with `EXPO_PUBLIC_STARTUP_VERBOSE=true`:

- Boot error screen shows **technical summary** (failed URL, HTTP status, timeout/SSL/DNS class).
- Tap **«Отправить диагностику»** to share full JSON via Android share sheet.

Logcat (verbose builds):

```bash
adb logcat | grep 'LOT:boot'
```

### Env verification

| Variable | Closed Beta RC expected |
|----------|-------------------------|
| `EXPO_PUBLIC_API_BASE_URL` | `https://web-production-e56fb.up.railway.app` |
| `EXPO_PUBLIC_RELEASE_CHANNEL` | `staging` |
| `EXPO_PUBLIC_BETA_CHANNEL` | `CLOSED_BETA` |
| `EXPO_PUBLIC_STARTUP_VERBOSE` | `true` (diagnostic RC builds) |

### Network / TLS

- `android/app/src/main/res/xml/network_security_config.xml` — system CA trust, cleartext blocked.
- Staging Railway uses public HTTPS; no custom pinning in RC.

### Boot timeout fix

RC1 used `BOOT_HARD_TIMEOUT_MS = 10_000` while sequential steps allowed up to 8s each — slow networks could hit the **hard timeout** before bootstrap finished. RC1.1 raises this to **60s** and logs the active stage on timeout.

## Telemetry

Failed boots emit `BOOT_DIAGNOSTICS` telemetry with `metadata.failures` (stage, URL, status, error kind).
