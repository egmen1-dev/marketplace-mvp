# MOBILE-RELEASE-GATE-003

**Date:** 2026-08-16  
**Gate:** Staging Deploy → Real Android Acceptance → Closed Alpha GO/NO-GO

## Source of truth

| Item | Value |
|---|---|
| `origin/main` | `1e9e15e` |
| Staging `/api/version` commit | `1e9e15e` ✅ |
| APP-SHELL-0 on main | ✅ |
| APK | `lot-android-alpha-0.1.0.apk` |
| APK SHA256 | `91adc3822f4e1cc898bb605f2afb78a47c62d701a6054b5e92603cd0a1628585` |
| Mobile API | `mobile-v1` |
| Web build | PASS (on main) |

Native APK **not rebuilt** — backend-only deploy; same artifact valid.

---

## PART 1–12: Staging backend

### Deploy

Staging auto-deployed after main merge. Railway CLI unauthorized in cloud agent — no manual deploy required this run.

### Hard gate

```text
staging commit (1e9e15e) == main commit (1e9e15e)  ✅ PASS
```

### Health (`/api/health`)

| Check | Result |
|---|---|
| Application | ✅ ok |
| Database | ✅ ok |
| Auth | ✅ ok |
| Storage | ✅ configured |
| Stripe | ✅ configured (unchanged) |

### Mobile smoke

```bash
npx tsx scripts/mobile-release-gate-003-staging.ts
# artifacts/mobile-release-gate-003/staging-smoke.json
```

| Endpoint / flow | Result |
|---|---|
| bootstrap, config, readiness, navigation | ✅ 200 |
| auth session / refresh / logout / replay reject | ✅ |
| buyer/home | ✅ real data |
| seller/home | ✅ 37 active products (seller@demo.lot) |
| catalog/products + pagination payload | ✅ |
| cart Bearer get/add/update/remove | ✅ |
| orders Bearer | ✅ |
| favorites Bearer | ✅ |
| wallet Bearer | ✅ |
| android/update | ✅ (downloadUrl null OK) |
| deep-link/resolve | ✅ GET |
| MOB-PA-002 | **CLOSED** ✅ |

### Dual auth

| Path | Result |
|---|---|
| Mobile Bearer cart/orders | ✅ |
| Anonymous cart | ✅ 401 |
| Web cookie session | Code path preserved (`resolveRequestUser` → `getSessionUser`); not browser-tested in this gate |

### Wave 6 parallel

```bash
npx tsx scripts/ccos-wave-6-staging-acceptance.ts
```

| Verdict | Result |
|---|---|
| Evolution Engine staging | **ACCEPTED** |
| Live Ranking | UNCHANGED |
| Learning | NOT ACTIVE |
| Autopilot | DISABLED |
| mobile_seller_home | ✅ true |

**Note:** Set `CCOS_EVOLUTION_PLATFORM_ENABLED=true` on Railway `web-v2` for production evolution admin UI — operator action if not already set.

---

## PART 13–57: Physical Android

| Gate | Result |
|---|---|
| `adb devices` | **No device** |
| APK install | **NOT RUN** |
| Launch / auth / buyer / seller flows | **NOT RUN** |
| Screenshots / video | **NOT CAPTURED** |
| MOB-PA-001 | **OPEN** |

Operator runbook:

```bash
adb devices
sha256sum lot-android-alpha-0.1.0.apk
adb install -r lot-android-alpha-0.1.0.apk
./scripts/mobile-physical-acceptance-adb.sh
```

---

## Final matrix

| Gate | Result |
|---|---|
| staging == main | ✅ PASS |
| health | ✅ PASS |
| mobile smoke | ✅ PASS |
| MOB-PA-002 closed | ✅ CLOSED |
| APK hash | ✅ verified |
| physical install | NOT RUN |
| launch / auth / flows | NOT RUN |
| MOB-PA-001 closed | OPEN |
| P0 count | **1** (MOB-PA-001 only) |
| P1 count | 0 |
| Alpha distribution hosting | NOT READY (no HTTPS APK URL) |
| Tester package doc | ✅ `ALPHA_TESTER_PACKAGE.md` |

---

## Final verdicts

```text
MOBILE STAGING BACKEND:     READY
APP-SHELL-0 PHYSICAL DEVICE: NOT RUN
AUTH (device):              NOT RUN
BUYER CORE (device):        NOT RUN
SELLER CORE (device):       NOT RUN
SECURITY (staging API):     PASS
P0:                         1
P1:                         0
CLOSED ALPHA:               NO-GO
APP-SHELL-1:                BLOCKED
```

---

## Closed Alpha GO/NO-GO

```text
CLOSED ALPHA: NO-GO
```

**Reason:** Physical Android acceptance not executed (hard requirement).

**Unblocks when:** `PHYSICAL DEVICE = PASS` + `P0 = 0`.

---

## Release deliverables status

| Deliverable | Status |
|---|---|
| Real Android PASS | ❌ NOT RUN |
| Distribution channel | ⬜ Recommend GitHub Release asset + SHA256 in manifest |
| Tester package | ✅ docs ready |
| Release history | ✅ `mobile-release-manifest.json` |
| Update UI foundation | ✅ app handles null downloadUrl |
| Crash report button | ✅ Profile «Сообщить об ошибке» (device not verified) |

---

## Operator: close remaining P0

1. Physical Android full acceptance (see `APP_SHELL_0_PHYSICAL_ACCEPTANCE.md`)
2. Optional: publish APK to controlled HTTPS + fill `/api/mobile/android/update`
3. Set `CCOS_EVOLUTION_PLATFORM_ENABLED=true` on Railway if evolution admin needed

Then re-run gate → expect **CLOSED ALPHA: GO** and **APP-SHELL-1: UNBLOCKED**.
