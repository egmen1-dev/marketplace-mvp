# EPIC 84 — Marketplace Productization Platform (MPP)
## Phase 0 — Closed Alpha → Product-Market Fit Foundation

> **Философия:** платформа построена (EPIC 77–83). Теперь строим **продукт**, который люди хотят открывать каждый день.

---

## Миссия

После EPIC 77–83:

- построена CCOS;
- построена Mobile Release Platform (MRP);
- построена Product Operations Platform (POP);
- существует реальное Android-приложение;
- существует инфраструктура обновлений (`0.1.2-alpha` = first supported baseline).

**Главный вопрос меняется.**

| Было | Стало |
|------|-------|
| «Можем ли мы построить платформу?» | «Захочет ли человек пользоваться ЛОТ каждый день?» |

EPIC 84 полностью посвящён **пользовательской ценности**.

---

## Жёсткие ограничения

EPIC 84 **запрещает** до завершения Productization:

- ❌ новые AI Brain / Graph / Twin платформы
- ❌ новые инфраструктурные EPIC без прямого product impact
- ❌ APP-SHELL-1 (до physical PASS + seamless update E2E)

Каждое изменение должно напрямую повышать:

- удобство;
- продажи;
- удержание;
- доверие;
- скорость использования.

---

## Главный KPI (Closed Alpha)

| # | Критерий |
|---|----------|
| ✅ | Пользователь смог зарегистрироваться |
| ✅ | Пользователь понял приложение |
| ✅ | Пользователь нашёл товар |
| ✅ | Пользователь открыл карточку |
| ✅ | Пользователь добавил товар |
| ✅ | Пользователь захотел вернуться |

---

## PRODUCT DELIVERABLE №1 — Buyer Journey

Путь без ощущения «тестового приложения»:

```text
Splash → Авторизация → Главная → Каталог → Поиск → Карточка → Корзина → Оформление
```

**Wave 1** — Buyer Experience (рекомендации, недавно просмотренные, акции, популярное, похожие, «покупают вместе», полноценная корзина, checkout, empty states).

---

## PRODUCT DELIVERABLE №2 — Seller Journey

Путь без тупиков:

```text
Вход → Кабинет → Мои товары → Карточка → Редактирование → Статистика → Кошелёк → Заказы
```

**Wave 2** — Seller Experience (история продаж, аналитика, остатки, прибыль, AI рекомендации, быстрые действия, карточки).

---

## RELEASE DELIVERABLE №1 — Release Intelligence Pack

После каждого релиза POP автоматически формирует:

| Metric | Source |
|--------|--------|
| adoption | MRP version distribution |
| DAU | POP telemetry |
| retention | POP analytics (7d) |
| crash free | POP telemetry |
| update rate | MRP update funnel events |
| buyer funnel | POP session journey |
| seller funnel | POP seller journey |

API: `GET /api/admin/product-ops/release-verdict`  
Module: `lib/product-operations/release/verdict.ts`

---

## RELEASE DELIVERABLE №2 — Automatic GO / WATCH / NO-GO

POP выдаёт verdict **без ручного анализа**:

| Verdict | Meaning |
|---------|---------|
| **GO** | Release healthy; cohort can expand |
| **WATCH** | Insufficient data or partial gates |
| **NO-GO** | P0, crash regression, broken core funnel |

Gate: `npm run product:epic-84:gate`

---

## Waves

| Wave | Focus | Status |
|------|-------|--------|
| **0** | **Product Design System Audit & Mobile UX Redesign** — Design Standard v1, Marketplace Quality Score, CRUD detection, full screen rework (no local patches) | **ACTIVE** |
| 1 | Buyer Experience | **BLOCKED** until Wave 0 complete |
| 2 | Seller Experience | **BLOCKED** until Wave 0 complete |
| 3 | Marketplace Feel (skeleton, pull-to-refresh, haptics, transitions) | Planned |
| 4 | Trust (рейтинг, доставка, возврат, отзывы) | Planned |
| 5 | Conversion (A/B через POP) | Planned |
| 6 | Retention (избранное, подписки, персональные подборки) | Planned |
| 7 | Closed Alpha Learning (feedback → backlog) | Planned |
| 8 | Open Alpha Readiness | Planned |

Wave 0 docs:

- `docs/product/EPIC_84_WAVE_0_DESIGN_SYSTEM.md` — Product Design Standard v1 + Marketplace Quality Index
- `docs/product/EPIC_84_WAVE_0_UX_AUDIT.md` — operator walkthrough checklist
- `apps/mobile/src/design-system/` — design tokens + component registry
- `npm run product:epic-84:wave0` — automated audit gate

---

## Definition of Done

Приложение воспринимается не как «pet-проект», а как **маркетplace, который можно рекомендовать знакомым**.

Open Alpha gate (Wave 8):

```text
Crash Free > 99%
AND Retention sufficient
AND Buyer Flow PASS
AND Seller Flow PASS
AND Update PASS
AND Physical PASS
→ Closed Alpha → Open Alpha
```

---

## Roadmap после EPIC 84

```text
APP-SHELL-1
↓
Closed Alpha (реальные пользователи)
↓
Open Alpha → Beta → Play Internal → Play Closed → Play Open → Public Release
```

---

## Связанные документы

- `docs/product/EPIC_84_WAVE_0_UX_AUDIT.md` — screen audit matrix
- `docs/mobile/EPIC_81_PHYSICAL_ACCEPTANCE_CHECKLIST.md` — physical buyer/seller flows
- `docs/mobile/ALPHA_TESTER_PACKAGE.md` — tester install (0.1.2-alpha only)
- `docs/product/EPIC_79_POP_WAVE_0.md` — POP foundation
