# RELEASE 0.1.3-alpha — Physical Acceptance

| # | Check | Expected |
|---|-------|----------|
| 1 | Install APK | versionCode 4, versionName 0.1.3-alpha |
| 2 | Trigger startup error (airplane mode + bad API) | Structured error screen, not generic string |
| 3 | Startup ID | Visible monospace ID |
| 4 | Stage | «Этап» label with boot stage |
| 5 | Code | Error code visible |
| 6 | Connectivity | Internet/API/Railway/DNS panel |
| 7 | Copy Diagnostics | Button works |
| 8 | Export Diagnostics | Button works |
| 9 | Version stamp | `Version: 0.1.3-alpha` at bottom |
| 10 | Build stamp | `Build: <7-char SHA>` at bottom |
| 11 | Long-press splash logo | Opens Build Info screen |
| 12 | Update from 0.1.2 (code 3) | OPTIONAL_UPDATE to 0.1.3 |

**FAIL** if any row missing on physical device.

APK: `artifacts/epic-84-release-013/lot-android-alpha-0.1.3.apk`
