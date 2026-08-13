# DESIGN-001.1 — Homepage Visual Conversion Acceptance

**Branch:** `cursor/design-001-1-d03e` (based on `cursor/design-001-d03e`)  
**Environment:** local production build (`npm run build && npm run start`) + seeded Postgres  
**Staging:** `https://web-production-e56fb.up.railway.app` — **DESIGN-001 not deployed** (PR #17 draft)

---

## 1. Общая оценка дизайна: **8 / 10**

После DESIGN-001 главная однозначно читается как маркетплейс. После точечных правок DESIGN-001.1 первый экран mobile продаёт товар, а не только бренд.

---

## 2. Что стало лучше после DESIGN-001

| Область | Улучшение |
|---------|-----------|
| Hero | H1 «Покупайте выгодно / Продавайте легко» + подпись «Маркетплейс ЛОТ» — за 3 сек понятны buy/sell |
| Поиск | Крупный hero-search, chips, CTA «Смотреть товары» / «Продать товар» |
| Featured | Товар с ценой, продавцом, наличием, доставкой СДЭК, мини-галерея |
| Масштаб | Категории с счётчиками, stats bar (43 / 5 / 32), сетки «Популярные» и «Новинки» |
| Mobile VK | `webview-compat`, sticky «Каталог», без boot-splash блокировки |
| Визуал | Тёмный marketplace shell, оранжевые CTA, плотнее WB-light, но премиальнее |

---

## 3. Что ещё мешает уровню WB / Ozon / Яндекс Маркет

| Gap | Комментарий |
|-----|-------------|
| Плотность карточек | Карточки крупнее и «премиальнее», но меньше SKU на экране, чем у WB/Ozon |
| Рейтинги | Нет звёзд/отзывов на hero и в листинге (ограничение Catalog Core — не трогали) |
| Доставка на карточках | Только город (MapPin), нет «завтра / от N дней» как у Ozon |
| Промо-блоки | Нет flash-sale / баннеров акций (вне scope) |
| Белый header | Конtrast с тёмным hero — ок для бренда, но не «маркетплейс-white» как WB |
| Desktop CLS | Высокий layout shift на desktop в lab-замере (см. Performance) |

---

## 4. Рекомендованные изменения (внесены в audit-fix)

### DESIGN-001.1 fixes (UI only)

1. **Mobile first screen:** compact featured product между subtitle и search — товар виден без скролла (VK funnel).
2. **Desktop featured:** вертикальная карточка 16:10, цена 3xl, social proof (просмотры).
3. **Thumbnails:** цены под мини-плитками — ощущение «много товаров».
4. **Hero density:** уменьшены `py` / `gap` hero — меньше «пустого воздуха».

### Follow-up (не блокирует merge)

- Merge PR #17 → Railway deploy → повторить Lighthouse на staging.
- Desktop CLS: проверить shift от hydration hero-search / шрифтов на реальном CDN.
- После Reviews API — звёзды на hero/card без изменения Catalog Core queries.

---

## 5. Screenshots

Сохранены в `/opt/cursor/artifacts/screenshots/`:

| Desktop 1920×1080 | Mobile 390px VK UA |
|-------------------|-------------------|
| `design001-desktop-1920-home-top.png` | `design001-mobile-390-first-screen.png` |
| `design001-desktop-1920-hero.png` | `design001-mobile-390-after-scroll.png` |
| `design001-desktop-1920-categories.png` | `design001-mobile-390-categories.png` |
| `design001-desktop-1920-products.png` | `design001-mobile-390-product-cards.png` |

(+ 1440×900 variants with same naming prefix `design001-desktop-1440-*`)

---

## 6. Performance

Production build (`commit 2ce6c7b` + audit fixes), `scripts/design-001-1-performance.mjs`:

| Viewport | FCP | LCP | CLS | WebView | Boot splash |
|----------|-----|-----|-----|---------|-------------|
| Desktop 1440×900 | 200 ms | 444 ms | **0.407** | — | 0 |
| Mobile 390 VK UA | 152 ms | 152 ms | **0.000** | ✅ | 0 |

**Hydration / UX-002:** e2e `external-traffic.spec.ts` — **5/5 PASS** (VK first paint, Telegram catalog→PDP, login, desktop, skeleton).

**Вывод:** mobile готов под VK WebView. Desktop CLS требует мониторинга на staging (lab-метрика может включать below-fold контент); mobile CLS не ухудшен относительно UX-002 baseline.

---

## 7. Tests

| Check | Result |
|-------|--------|
| `eslint` | ✅ PASS |
| `tsc --noEmit` | ✅ PASS |
| `npm run build` | ✅ PASS |
| `vitest tests/analytics-events.test.ts` | ✅ 6/6 |
| `playwright tests/e2e/external-traffic.spec.ts` | ✅ 5/5 |

---

## 8. Acceptance checklist

| Критерий | Статус |
|----------|--------|
| Главная выглядит как маркетплейс | ✅ |
| Первый экран продаёт товары | ✅ (после mobile compact hero) |
| Featured product — достаточный вес | ✅ desktop vertical / mobile compact |
| Нет ощущения пустоты | ✅ улучшено; desktop hero ещё просторнее Ozon |
| Mobile готов под VK рекламу | ✅ |
| Производительность не ухудшилась | ⚠️ mobile ✅; desktop CLS — follow-up |

---

## READY FOR ADS TRAFFIC: **NO** (staging)

**Причина:** DESIGN-001 (+ audit fixes) **не задеплоены** на `web-production-e56fb.up.railway.app`. Staging всё ещё на pre-DESIGN homepage (`f5591e0`).

**После merge PR #17 + Railway deploy:** ожидается **YES** для визуальной готовности и VK mobile traffic.

**На ветке `cursor/design-001-d03e` (с audit fixes):** визуальный acceptance **YES**.
