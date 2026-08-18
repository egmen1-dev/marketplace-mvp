# EPIC 84 · Wave 0 — Product Design System Audit & Mobile UX Redesign

> **Новая философия:** запрещено улучшать архитектуру ради архитектуры. Каждый релиз должен делать приложение ощутимо лучше для пользователя.

---

## Главная цель Wave 0

Полностью пересмотреть мобильное приложение глазами пользователя — не «исправить баги», а добиться реакции:

> «Выглядит как настоящий современный маркетплейс.»

**Принцип:** локальный косметический ремонт запрещён. Экран с серьёзными проблемами **перерабатывается полностью**.

---

## Product Design Standard v1

```
apps/mobile/src/design-system/
├── tokens/          # colors · typography · spacing · radius · elevation · opacity · borders · gradients
├── components/      # registry + coverage
└── index.ts         # DESIGN_SYSTEM_VERSION = 1.0.0
```

Legacy import path `apps/mobile/src/theme/tokens.ts` re-exports design-system for migration.

### Deliverables

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Design Language (brand, semantic, elevation, radius, shadows, opacity, borders, blur, gradients) | `design-system/tokens/` |
| 2 | Typography scale (Display, H1–H3, Body, BodySmall, Caption, Button, Price, Badge) | `tokens/typography.ts` |
| 3 | Spacing grid (4, 8, 12, 16, 20, 24, 32, 40, 48) | `tokens/spacing.ts` |
| 4 | Component library registry | `components/registry.ts` |

**Rules:** no random HEX · no manual font sizes · no arbitrary margin/padding.

---

## Marketplace Quality Audit (automated)

| Module | Purpose |
|--------|---------|
| `lib/product-operations/marketplace-quality/screens.ts` | Screen inventory (25 screens) |
| `lib/product-operations/marketplace-quality/criteria.ts` | 10 criteria × 0–10 + Marketplace Score |
| `lib/product-operations/marketplace-quality/crud-detection.ts` | CRUD / Admin / «Нет данных» / Alert.fail |
| `lib/product-operations/marketplace-quality/report.ts` | Quality report + index |

### Scoring criteria (0–10)

Visual Quality · Marketplace Feel · Premium Feel · Conversion · Trust · Accessibility · Consistency · Motion · Loading Experience · Error Experience

**Marketplace Score** = weighted average  
**Marketplace Feeling** = weighted subset (feel + premium + trust + visual)

### CRUD Detection = automatic FAIL

Triggers: `Alert.alert`, «Нет данных», admin/dashboard patterns, excessive non-standard `fontSize`.

---

## Benchmark reference (do not copy)

Wildberries · Ozon · Яндекс Маркет · Amazon · Shopify Shop · Airbnb · Apple Store

---

## Per-screen audit template

For each screen in `artifacts/epic-84-wave-0/marketplace-quality-audit.json`:

| Field | Required |
|-------|----------|
| scoresBefore / scoresAfter | 10 criteria |
| marketplaceFeelingBefore → After | e.g. 6.4 → 9.5 |
| marketplaceScoreBefore → After | weighted score |
| issues | P0 / P1 / P2 |
| improvements | why screen got better |
| problemsRemoved | what was fixed |

---

## Gates & APIs

```bash
npm run product:epic-84:wave0    # design system + CRUD scan + quality report
npm run product:epic-84:gate       # POP verdict + Wave 0 + MQI integration
```

| API | Output |
|-----|--------|
| `GET /api/admin/product-ops/marketplace-quality` | Marketplace Quality Report |
| `GET /api/admin/product-ops/release-verdict` | GO/WATCH/NO-GO incl. MQI delta |

**POP rule:** if Marketplace Quality Index drops > 0.3 → **NO-GO**. Any CRUD screen failure → **NO-GO**.

---

## Wave 0 exit criteria

- [ ] All 25 screens scored (before + after)
- [ ] P0 = 0
- [ ] No CRUD failures
- [ ] Marketplace Quality Index ≥ 8.0
- [ ] Marketplace Feeling delta ≥ +2.0 on redesigned screens
- [ ] Component coverage: missing → implemented or waived with reason
- [ ] Screenshot pack: before/after per major screen

**Only then:** Wave 1 (Buyer) and Wave 2 (Seller).

---

## Definition of Done

Приложение воспринимается как **готовый коммерческий продукт 2026**, а не MVP/pet-project.

Test: показать экран без контекста → «Это приложение, которым можно пользоваться каждый день.»
