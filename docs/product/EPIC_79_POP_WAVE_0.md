# EPIC 79 — Product Operations Platform (POP) · Wave 0

> Операционная готовность продукта: не «как думает ИИ», а **как безопасно выпускать приложение, понимать пользователей и быстро улучшать продукт**.

## Два измеримых deliverable к публичному релизу

1. **Remote Config для мобильного приложения** — конфигурация и флаги без нового APK.
2. **Closed Alpha Console** — testers · versions · feedback · stability · решение Open Alpha.

## Архитектура Wave 0

```
lib/product-operations/
├── health/           # Product Health Center aggregator
├── feature-flags/    # OFF → Internal → Alpha → Beta → Production
├── remote-config/    # DB overrides → mobile bootstrap/config
├── telemetry/        # crash · error · session events
├── feedback/         # auto-classification
├── sessions/         # user journey + session replay
├── analytics/        # DAU · MAU · retention · GMV · crash-free
├── release/          # release intelligence + rollback risk
├── experiments/      # A/B foundation
├── timeline/         # product timeline
└── closed-alpha/     # Closed Alpha console
```

## Admin UI

| Page | Deliverable |
|------|-------------|
| `/admin/product-health` | Product Health Center |
| `/admin/operations` | Operational Dashboard (POP hub) |
| `/admin/closed-alpha` | Closed Alpha Console |

## API

| Endpoint | Назначение |
|----------|------------|
| `GET /api/product-ops/config` | Remote config + flags + experiments |
| `POST /api/product-ops/feedback` | Classified feedback ingest |
| `POST /api/product-ops/session` | Session replay steps |
| `POST /api/mobile/telemetry` | Persisted telemetry + journey |
| `GET/POST /api/admin/product-ops/flags` | Feature flag overrides |
| `GET/POST /api/admin/product-ops/config` | Remote config CRUD |

## Mobile integration

- Boot: `fetchBootstrap()` + `fetchRemoteConfig()` → Zustand `remoteConfig`
- `/api/mobile/config` и `/api/mobile/bootstrap` merge DB remote config
- Telemetry: `sessionId`, `deviceId`, `versionCode` persisted
- Profile «Сообщить об ошибке» → Feedback Intelligence

## Database

Migration: `20260816173000_epic79_product_operations_platform`

## Что не входит

Firebase Crashlytics · Push · In-app Chat · Payment analytics · ML behavior analysis

## Правило EPIC (продолжение EPIC 78)

> Каждый EPIC — минимум **два deliverable**, напрямую сокращающих путь до публичного релиза приложения.

## Roadmap после EPIC 79

```
✅ CCOS · Evolution · Native App · MRP
✅ POP Wave 0 (этот EPIC)
⬜ Physical Android Acceptance
⬜ Closed Alpha (5–10 testers)
⬜ APP-SHELL-1
⬜ Open Alpha → Beta → Play → Public Release
```
