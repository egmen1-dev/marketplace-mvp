# APP-SHELL-0 Physical Device Acceptance

**EPIC:** APP-SHELL-0-PHYSICAL-ACCEPTANCE-001  
**Date:** 2026-08-16  
**Artifact:** `lot-android-alpha-0.1.0.apk`  
**SHA256:** `91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585` ✅ verified  
**Package:** `ru.lot.marketplace.alpha` · **0.1.0-alpha**

---

## Executive summary

| Verdict | Result |
|---|---|
| **MOBILE STAGING BACKEND** | **READY** (@ `1e9e15e`, MOB-PA-002 **CLOSED**) |
| **APP-SHELL-0 PHYSICAL DEVICE** | **NOT RUN** |
| **CLOSED ALPHA** | **NO-GO** |
| **APP-SHELL-1** | **BLOCKED** |

See `docs/mobile/MOBILE_RELEASE_GATE_003.md` and `docs/mobile/CLOSED_ALPHA_GO_NOGO.md`.

---

## Prior physical run (cloud agent)

Physical Android acceptance **cannot be marked PASS** from cloud agent: no USB device attached; emulator boot failed (ADB offline in headless VM despite KVM).

**Critical pre-device finding:** staging backend (`web-production-e56fb`) is still on **main @ eef7718** without APP-SHELL-0 mobile bridge deploy. Buyer home, catalog, wallet, favorites return **404**; cart/orders Bearer auth returns **401**. Physical device flows against current staging will fail core buyer/seller data loads until PR #84 is merged and deployed.

---

## Environment attempted

| Attempt | Result |
|---|---|
| USB physical device via `adb devices` | **None connected** |
| Android Emulator (Pixel 6, API 34, x86_64) | **FAILED** — emulator stuck offline, OS never reachable |
| APK install / launch | **Not executed** |
| APK security strings scan | **PASS** — no STRIPE_SECRET, DATABASE_URL, AUTH_SECRET in artifact |

---

## Staging API pre-check (not a substitute for device)

Script: `npx tsx scripts/mobile-staging-integration-smoke.ts`

| Endpoint | Status | Notes |
|---|---|---|
| bootstrap | 200 ✅ | |
| login | 200 ✅ | |
| refresh | 200 ✅ | |
| navigation | 200 ✅ | |
| android/update | 200 ✅ | downloadUrl null OK |
| buyer/home | 404 ❌ | not deployed |
| catalog/products | 404 ❌ | not deployed |
| favorites | 404 ❌ | not deployed |
| wallet | 404 ❌ | not deployed |
| cart (Bearer) | 401 ❌ | bearer bridge not deployed |
| orders (Bearer) | 401 ❌ | bearer bridge not deployed |

---

## Acceptance matrix (device scenarios)

| Scenario | Expected | Actual | PASS/FAIL |
|---|---|---|---|
| APK SHA256 verify | Match manifest | Match ✅ | PASS |
| Install on physical Android | Installs | **Not run** | **NOT RUN** |
| First launch (splash→login) | No crash/spinner hang | **Not run** | **NOT RUN** |
| Login + session restore | Token + restart | **Not run** | **NOT RUN** |
| Refresh rotation | Auto retry | **Not run** | **NOT RUN** |
| Logout + reopen | Login required | **Not run** | **NOT RUN** |
| Buyer smoke (home→PDP→cart) | Real staging data | **Blocked by staging deploy** | **FAIL*** |
| Seller smoke | Real staging data | **Blocked by staging deploy** | **FAIL*** |
| Mode switch persistence | Stable | **Not run** | **NOT RUN** |
| Android Back navigation | No loops | **Not run** | **NOT RUN** |
| Deep links (in/out login) | Route correctly | **Not run** | **NOT RUN** |
| Offline snapshot | Cache + banner | **Not run** | **NOT RUN** |
| Backend unavailable UX | Controlled state | **Not run** | **NOT RUN** |
| Background/resume | Session OK | **Not run** | **NOT RUN** |
| Force stop + reopen | Session restore | **Not run** | **NOT RUN** |
| Screen rotation | Portrait lock | **Not run** | **NOT RUN** |
| Small screen / keyboard | No clipped CTA | **Not run** | **NOT RUN** |
| Native share | Share sheet | **Not run** | **NOT RUN** |
| Camera/gallery permissions | No crash on deny | **Not run** | **NOT RUN** |
| APK secret leak scan | No secrets | Clean ✅ | PASS |
| Telemetry (no PII) | Safe events | **Not run on device** | **NOT RUN** |

\*Staging deploy gap — will fail on device until backend deploy, not necessarily app bug.

---

## Issues classification

| ID | Severity | Issue |
|---|---|---|
| MOB-PA-001 | **P0** | Physical device acceptance not executed — hard gate open |
| MOB-PA-002 | **P0** | Staging backend missing APP-SHELL-0 mobile endpoints + Bearer cart/orders |
| MOB-PA-003 | **P1** | Cloud agent cannot boot Android emulator (ADB offline) — blocks automated device proxy |

**P0 count:** 2 (device not run + staging deploy)  
**P1 count:** 1

---

## Screenshot / video evidence

| Artifact | Status |
|---|---|
| android-login.jpg | **NOT CAPTURED** — no device |
| android-buyer-home.jpg | **NOT CAPTURED** |
| android-catalog.jpg | **NOT CAPTURED** |
| android-pdp.jpg | **NOT CAPTURED** |
| android-seller-home.jpg | **NOT CAPTURED** |
| android-wallet.jpg | **NOT CAPTURED** |
| android-offline.jpg | **NOT CAPTURED** |
| walkthrough video | **NOT CAPTURED** |

---

## How to complete acceptance (operator checklist)

On a **physical Android** with USB debugging:

```bash
chmod +x scripts/mobile-physical-acceptance-adb.sh
APK_PATH=/path/to/lot-android-alpha-0.1.0.apk ./scripts/mobile-physical-acceptance-adb.sh
```

Then manually execute sections 4–23 of EPIC, capture screenshots to `artifacts/mobile-physical-acceptance/`, update this doc and `mobile-release-manifest.json`.

**Prerequisite:** deploy APP-SHELL-0 backend (PR #84) to staging before buyer/seller data flows.

---

## Final verdicts

```text
APP-SHELL-0 PHYSICAL DEVICE:     NOT RUN
ANDROID ALPHA:                   NOT READY
BUYER FLOW:                      FAIL (staging deploy blocker; device not run)
SELLER FLOW:                     FAIL (staging deploy blocker; device not run)
AUTH:                            NOT RUN (device); API login/refresh PASS on staging
OFFLINE:                         NOT RUN
DEEP LINKS:                      NOT RUN
P0 ISSUES:                       2
P1 ISSUES:                       1
CLOSED ALPHA DISTRIBUTION:       NOT READY
```

## Hard gate for APP-SHELL-1

**Do not start APP-SHELL-1** until:

- `PHYSICAL DEVICE ACCEPTANCE = PASS`
- `P0 = 0`
- Staging deploy includes mobile bearer bridge + home/catalog/wallet routes

---

## Parallel CCOS (Wave 6)

See `docs/CCOS_WAVE_6_STAGING_PARALLEL_GATE.md` — Wave 6 local acceptance PASS; staging `mobile_seller_home` gate false until Wave 6 deploy + flag.
