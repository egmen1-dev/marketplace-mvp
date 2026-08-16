# MOBILE-STAGING-DEPLOY-AND-PHYSICAL-GATE-002

**Date:** 2026-08-16  
**Branch:** `cursor/mobile-staging-deploy-physical-gate-002-d03e`

## Goal

Close P0 blockers MOB-PA-001 (physical device) and MOB-PA-002 (staging backend bridge).

---

## Acceptance matrix

| Gate | Result |
|---|---|
| PR #84 / APP-SHELL-0 on main | ✅ Merged locally to main branch |
| `npm run build` | ✅ PASS (tsconfig exclude apps/mobile + seller-home-data fixes) |
| staging SHA == main SHA | ⬜ **PENDING** — staging `baceeb4`, main `152d3ab` (PR #86 merged, deploy not landed) |
| mobile buyer/home | ✅ 200 on staging (Wave 6 route) |
| mobile seller/home | ✅ 200 + real data shape |
| catalog API | ❌ 404 until deploy |
| cart Bearer | ❌ 401 until deploy |
| orders Bearer | ❌ 401 until deploy |
| favorites Bearer | ❌ 404 until deploy |
| wallet Bearer | ❌ 404 until deploy |
| web cookie auth | ⬜ Verify post-deploy |
| physical install | **NOT RUN** — no USB device in cloud VM |
| launch / auth / flows | **NOT RUN** |
| P0 count | **2** (MOB-PA-001, MOB-PA-002 until deploy+device) |
| closed alpha | **NOT READY** |

---

## Build fixes applied

1. `tsconfig.json` — exclude `apps/mobile` from root typecheck (RN types broke web FormData).
2. `lib/mobile/seller-home-data.ts` — valid Prisma queries (stock, order items by seller).

---

## Deploy instructions (operator)

Railway CLI unauthorized in cloud agent — **push main + trigger deploy**:

```bash
# Project: marketplace-mvp-backup · Service: web-v2 · APP_ENV=staging
git push origin main
# After deploy:
curl -sS https://web-production-e56fb.up.railway.app/api/version
npx tsx scripts/mobile-staging-integration-smoke.ts
CCOS_EVOLUTION_PLATFORM_ENABLED=true npx tsx scripts/ccos-wave-6-staging-acceptance.ts
```

Hard gate: `stagingSha == origin/mainSha`

---

## Physical device (operator)

```bash
chmod +x scripts/mobile-physical-acceptance-adb.sh
adb devices   # must show "device"
./scripts/mobile-physical-acceptance-adb.sh
```

Capture screenshots + video per `APP_SHELL_0_PHYSICAL_ACCEPTANCE.md`.

APK: `lot-android-alpha-0.1.0.apk` (reuse unless native code changed).

---

## Final verdicts

```text
APP-SHELL-0 PHYSICAL DEVICE:     NOT RUN
ANDROID ALPHA:                   NOT READY
MOBILE STAGING BACKEND:          NOT READY (await deploy)
AUTH:                            NOT RUN (device)
BUYER FLOW:                      NOT RUN
SELLER FLOW:                      NOT RUN
P0:                              2
CLOSED ALPHA:                    NOT READY
```

## MOB issue status

| ID | Status |
|---|---|
| MOB-PA-002 | **OPEN** until staging smoke all green |
| MOB-PA-001 | **OPEN** until physical PASS |

## Hard gate for APP-SHELL-1

Blocked until: staging backend READY + physical PASS + P0=0.
