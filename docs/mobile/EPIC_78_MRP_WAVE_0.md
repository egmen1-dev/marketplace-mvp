# EPIC 78 — Mobile Release Platform (MRP) · Wave 0

> Последний большой инфраструктурный EPIC перед Closed Alpha.  
> Цель: превратить «есть APK» в полноценную систему выпуска мобильного приложения.

## Два измеримых deliverable к публичному релизу

1. **Closed Alpha Platform** — admin dashboard, tester assignment, APK registry, channels.
2. **Auto Update** — `/api/mobile/update` + баннер «Доступна версия» в приложении.

## Архитектура Wave 0

```
lib/mobile-release-platform/
├── release-manager/     # create · publish · rollback · rollout
├── registry/            # APK history + manifest seed
├── channels/            # Internal → Production
├── update-service/      # /api/mobile/update payload
├── compatibility/       # backend · schema · brain · min app
├── analytics/           # install · active · crash · session
├── distribution/        # Closed Alpha testers
├── manifest-sync.ts     # mobile-release-manifest.json
├── rollout/ · rollback/
└── types.ts
```

## API

| Endpoint | Назначение |
|----------|------------|
| `GET /api/mobile/update` | Unified update check (versionCode, deviceId, channel) |
| `GET /api/mobile/android/update` | Legacy-compatible shape |
| `GET /api/mobile/releases/manifest` | Registry-backed manifest |
| `GET/POST /api/admin/mobile/releases` | Dashboard data + publish/rollback/rollout/tester |

## Admin UI

`/admin/mobile/releases` — версии, SHA, канал, rollout, testers.

## Release channels

`INTERNAL → DEVELOPER → CLOSED_ALPHA → OPEN_ALPHA → BETA → RC → PRODUCTION`

## Rollout

Steps: **10% → 30% → 50% → 100%** (deterministic bucket by `deviceId` hash).

## Rollback

`POST /api/admin/mobile/releases` `{ "action": "rollback", "releaseId": "..." }`  
Re-publishes previous version without new build.

## Database

Migration: `20260816160000_epic78_mobile_release_platform`

Models: `MobileReleaseVersion`, `MobileReleaseTester`, `MobileReleaseTesterAssignment`, `MobileReleaseAnalyticsEvent`.

## Manifest

`mobile-release-manifest.json` синхронизируется из registry при publish/rollback.

## Что не входит (APP-SHELL-1+)

Push · Camera · Biometrics · Chat · Google Play · Firebase

## Правило для будущих EPIC

> Каждый новый EPIC должен содержать минимум **два измеримых deliverable**, напрямую сокращающих путь до публичного релиза приложения.

## Roadmap после EPIC 78

```
✅ CCOS · Evolution · Native App
⬜ EPIC 78 MRP (этот EPIC)
⬜ Physical Android PASS
⬜ Closed Alpha (5–10 testers)
⬜ APP-SHELL-1
⬜ Open Alpha → Beta → Play Internal → Production
```
