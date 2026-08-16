# EPIC-84 P0 Startup — Physical Acceptance (Android)

Run on a physical device with `0.1.2-alpha` or newer build containing P0 startup diagnostics.

## Preconditions

- Install APK from Closed Alpha channel
- Enable USB debugging / wireless adb optional for logcat
- Long-press splash logo → **Startup Diagnostics** screen available

## Checklist

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Offline bootstrap | Airplane mode ON → cold start | Error screen: stage **Bootstrap**, reason **Network unavailable** or timeout ≤ 8s |
| 2 | Online recovery | Tap **Повторить** with network ON | App reaches Login or Home without reinstall |
| 3 | Retry pipeline | From error screen tap **Повторить** | Splash → pipeline restarts (not full OS app kill) |
| 4 | Bootstrap timeout | Throttle/block `/api/mobile/bootstrap` > 8s | Stage Bootstrap, reason Request timeout |
| 5 | Update timeout | Block `/api/mobile/update` | App still launches (update stage recovered) |
| 6 | Session expired | Inject expired JWT in SecureStore | Opens **Login**, diagnostics show session recovered |
| 7 | Remote config fail | Block `/api/product-ops/config` | App launches with cached/default config |
| 8 | Post-retry launch | After any recovered failure + Retry | Successful boot within normal timeouts |

## Evidence

Capture for each scenario:

1. Startup Error Screen screenshot (stage + reason visible), OR
2. Login/Home screen after recovery, AND
3. Startup Diagnostics screenshot (stage durations + last error)

Store under `artifacts/epic-84-p0-startup/screenshots/`.

## Sign-off

- [ ] All 8 scenarios PASS on physical Android
- [ ] No generic «Не удалось загрузить приложение» without details observed
- [ ] `npm run product:epic-84:p0-startup` PASS in CI
