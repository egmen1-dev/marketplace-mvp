# EPIC 86 — Seller Experience Platform

> **Философия:** покупательская часть завершена (EPIC 84–85). Теперь создаём платформу, которая помогает продавцу **зарабатывать деньги** — не управлять таблицами.

---

## Миссия

Продавец открывает приложение не для CRUD и не для admin panel.

Он открывает его, чтобы понимать:

- сколько заработал;
- что нужно сделать сегодня;
- какие товары продаются;
- где он теряет деньги;
- что делать дальше.

**Каждый экран отвечает на вопрос:** «Что мне сделать прямо сейчас, чтобы заработать больше?»

---

## Жёсткие ограничения

| Запрещено | Разрешено |
|-----------|-----------|
| CRUD-формы создания/редактирования | Blueprint + design language + registry |
| Admin Panel паттерны | Mobile-only seller product |
| Реализация экранов до gate PASS | Архитектура и документация |
| Изменения Backend / CCOS / Brain / Graph / Twin / MRP / POP / APP-SHELL-1 | Существующие seller APIs |

**Definition of Done EPIC 86:** полностью спроектированная Seller Experience Platform. Sprint 1 (Seller Home) начинается **только после** `npm run product:epic-86:architecture` → PASS и human approval.

---

## Архитектурный код

Единый источник правды:

```text
apps/mobile/src/design-system/seller/
├── tokens/              # Seller Design Language (teal/ink, revenue colors)
├── standards/           # Seller Design Standard v1
├── components/registry.ts
├── blueprints/          # Screen + Home block blueprints
├── journey/             # Seller User Journey
├── navigation/          # Tabs, stack, deep links, push
├── benchmark/           # WB / Ozon / Avito / Amazon / Shopify / Kaspi
├── audit/               # Pre-implementation product audit
└── roadmap/             # Sprints 1–8
```

Gate: `npm run product:epic-86:architecture`  
Report: `artifacts/epic-86-seller-experience/gate-report.json`

---

## Seller Design Language

Отдельный от buyer (orange commerce). Seller = **revenue-first operational clarity**.

| Token group | Назначение |
|-------------|------------|
| `sellerBrand` | Primary `#0F766E`, ink, paper |
| `sellerRevenue` | positive / negative / pending |
| `sellerInsight` | AI, promotion, priority |
| `sellerSurface` | backgrounds, cards, borders |
| `sellerText` | hierarchy + metric colors |

**Принципы (Seller Design Standard v1):**

1. Revenue first — каждый экран отвечает: что приносит деньги сегодня?
2. Action over inventory — задачи, не таблицы
3. Trust through clarity — деньги и статусы заказов однозначны
4. Separate language — seller teal/ink, не buyer orange
5. No CRUD — создание/редактирование через web-кабинет
6. Real data only — скрывать блоки без API, без placeholder metrics

**Component families:** Cards · Metrics · Charts · Order cards · Finance cards · Product cards · Promotion cards · AI cards · Status chips · Priority banners · Insight cards

---

## Seller User Journey

```text
Splash → Login → Seller Home → Products → Product Detail → Orders → Finance → Analytics → Promotion → AI Assistant → Profile
```

| # | Screen | Route | Вопрос продавца |
|---|--------|-------|-----------------|
| 1 | splash | `index` | Приложение готово к работе? |
| 2 | login | `login` | Я вошёл как продавец? |
| 3 | seller_home | `(tabs)/seller-home` | Что делать сегодня для заработка? |
| 4 | seller_products | `(tabs)/seller-products` | Какие товары приносят/теряют деньги? |
| 5 | seller_product_detail | `product/[id]?mode=seller` | Что исправить в этом SKU? |
| 6 | seller_orders | `(tabs)/seller-sales` | Какие заказы обработать сейчас? |
| 7 | seller_finance | `(tabs)/wallet` | Сколько заработал и когда выплата? |
| 8 | seller_analytics | `seller/analytics` | Где растёт и где падает выручка? |
| 9 | seller_promotion | `seller/promotion` | Как увеличить показы? |
| 10 | seller_ai_assistant | `seller/ai` | Что AI советует сделать? |
| 11 | profile | `(tabs)/profile` | Аккаунт и режим в порядке? |

Module: `apps/mobile/src/design-system/seller/journey/seller-user-journey.ts`

---

## Screen Blueprints

Для каждого экрана определены: Purpose · Primary CTA · Secondary CTA · Information hierarchy · Conversion goal · POP telemetry · Offline behaviour · Loading · Error · Empty state.

Module: `apps/mobile/src/design-system/seller/blueprints/`

### seller_home

- **Purpose:** операционный центр дня — «что сделать прямо сейчас»
- **Primary CTA:** Обработать срочные заказы
- **Secondary CTA:** Открыть кошелёк
- **Conversion goal:** действие по заказам / товарам / продвижению за ≤2 тапа
- **POP:** `seller_home_opened`, `seller_home_task_tap`, `seller_home_order_tap`, …

### seller_products

- **Purpose:** каталог через призму выручки
- **Primary CTA:** Открыть товар с низким остатком
- **Empty:** «Добавьте первый товар на web-кабинете» (link, не CRUD)

### seller_product_detail

- **Purpose:** карточка SKU глазами продавца — выручка, остаток, конверсия
- **Primary CTA:** Исправить проблему (остаток / цена / фото)
- **Secondary CTA:** Запустить продвижение

### seller_orders

- **Purpose:** очередь заказов — что обработать, где риск штрафа
- **Primary CTA:** Обработать следующий заказ

### seller_finance

- **Purpose:** прозрачность денег — available, pending, history
- **Primary CTA:** Запросить выплату (web deep link)

### seller_analytics

- **Purpose:** где растёт и теряется выручка без BI-перегруза
- **Primary CTA:** Исправить проседающий SKU

### seller_promotion

- **Purpose:** «что запустить сегодня», не ads manager
- **Primary CTA:** Запустить кампанию (web deep link)

### seller_ai_assistant

- **Purpose:** одна рекомендация → одно действие
- **Primary CTA:** Применить рекомендацию

### splash · login · profile

Shared blueprints в `seller-screens.blueprint.ts` — boot, auth, account center.

---

## Seller Home Blueprint

10 блоков (Sprint 1 deliverable). Каждый блок: цель · showWhen · hideWhen · apiSource · onPress.

| Block | Цель | API | On press |
|-------|------|-----|----------|
| **Сегодня** | Задачи дня из заказов, остатков, продвижения | `fetchSellerHome` | Deep link → Orders / Products / Promotion |
| **Продажи** | Динамика за сегодня/неделю | `fetchSellerHome` + `fetchOrders` | → Analytics |
| **Требует внимания** | Риски потери выручки | `fetchSellerHome` | → Orders / Products с фильтром |
| **Последние заказы** | Top 3 активных заказа | `fetchOrders` | → Order detail |
| **Лучшие товары** | Товары с наибольшим спросом | `fetchSellerProducts` | → Product detail |
| **Деньги** | Баланс и pending выплаты | `fetchSellerHome.money`, `fetchWallet` | → Finance |
| **Рост магазина** | Микро-KPI: SKU, конверсия, просмотры | `fetchSellerHome.products` | → Analytics |
| **AI рекомендации** | Главная рекомендация с confidence | `fetchSellerHome.intelligence` | → AI / Product detail |
| **Продвижение** | Активные кампании и CTA | `fetchSellerHome.promotion` | → Promotion |
| **История** | Лента действий | `fetchOrders` + wallet events | → Contextual detail |

Module: `apps/mobile/src/design-system/seller/blueprints/seller-home.blueprint.ts`

---

## Navigation

Module: `apps/mobile/src/design-system/seller/navigation/seller-navigation.ts`

### Bottom Tabs (5)

| Tab | Route | Badge |
|-----|-------|-------|
| Главная | `(tabs)/seller-home` | `orders.needAction` |
| Товары | `(tabs)/seller-products` | `products.needAttention` |
| Заказы | `(tabs)/seller-sales` | `orders.needAction` |
| Деньги | `(tabs)/wallet` | — |
| Профиль | `(tabs)/profile` | — |

### Stack routes

`seller/analytics` · `seller/promotion` · `seller/ai` · `product/[id]?mode=seller` · `order/[id]`

### Deep links

`lot://seller/home` · `lot://seller/products` · `lot://seller/orders` · `lot://seller/wallet` · `lot://seller/product/:id` · `lot://seller/analytics` · `lot://seller/promotion` · `lot://seller/ai`

### Push destinations

| Event | Route |
|-------|-------|
| `order.new` | seller-sales |
| `order.need_action` | seller-sales |
| `payout.completed` | wallet |
| `product.low_stock` | seller-products |
| `ai.recommendation` | seller/ai |
| `promotion.expiring` | seller/promotion |

**Rules:** seller mode скрывает buyer tabs; Analytics / Promotion / AI — stack из Home, не tabs.

---

## Component Registry

Module: `apps/mobile/src/design-system/seller/components/registry.ts`

**Statuses:** `ready` · `needs_redesign` · `planned`

| Category | Planned components (Sprint) | Legacy |
|----------|----------------------------|--------|
| layout | SellerPageShell, SellerSectionHeader, SellerHomeSkeleton (S1) | — |
| cards | SellerSurfaceCard, SellerTaskCard (S1) | — |
| metrics | SellerMetricHero, SellerMetricTile (S1), SellerMetricStrip (S2) | MetricCard → needs_redesign |
| charts | SellerRevenueChart, SellerSparkline, SellerFunnelChart (S6) | — |
| orders | SellerOrderCard, SellerOrderQueue, SellerSlaBanner (S4) | OrderCard → needs_redesign |
| finance | SellerFinanceHero, SellerPayoutCard, SellerTransactionRow (S5) | WalletCard → needs_redesign |
| products | SellerProductCard, SellerProductKpiRow, SellerStockBadge (S2–3) | SellerProductCard legacy |
| promotion | SellerCampaignCard, SellerPromotionCta (S7) | — |
| ai | SellerAiInsightCard, SellerAiActionQueue, SellerAiChatBubble (S8) | — |
| status | SellerStatusChip, SellerPriorityChip (S1) | — |
| banners | SellerPriorityBanner, SellerOfflineBanner (S1) | — |
| insights | SellerInsightCard, SellerGrowthCard (S1) | — |
| feedback | SellerEmptyState, SellerSectionError (S1) | — |

**40 components** — все `planned` или `needs_redesign`; **нет `.tsx` реализаций** до Sprint 1.

---

## Marketplace Benchmark

Изучены: Wildberries Seller · Ozon Seller · Авито Pro · Amazon Seller · Shopify · Kaspi Seller.

**Продуктовые принципы (не копирование UI):**

| Source | Principle | LOT application |
|--------|-----------|-----------------|
| Wildberries | Today-first dashboard | Блок «Сегодня» первый на Home |
| Ozon | Financial transparency | «Деньги» на Home + Finance |
| Авито Pro | Action cards | SellerTaskCard, SellerInsightCard |
| Amazon | Performance health | SellerPriorityBanner + StatusChip |
| Shopify | Revenue narrative | «Рост магазина» + Analytics |
| Kaspi | Order SLA urgency | SellerOrderQueue + tab badges |

**Anti-patterns:** pixel-perfect WB/Ozon copy · admin grids · CRUD forms · settings menu без revenue context · placeholder metrics

Module: `apps/mobile/src/design-system/seller/benchmark/seller-benchmark.ts`

---

## Marketplace Audit (pre-implementation)

Метрики оценки будущих экранов:

| Metric | Weight |
|--------|--------|
| Seller Productivity | 1.4 |
| Trust | 1.2 |
| Clarity | 1.2 |
| Business Feeling | 1.3 |
| Marketplace Feeling | 1.0 |
| Revenue Focus | 1.5 |

Projections для 8 seller screens (Sprints 1–8) с рисками — см. `seller-marketplace-audit.ts`.  
Target Seller Experience Index: **≥9.3** weighted average post-Sprint 8.

---

## Roadmap

| Sprint | Screen | Deliverable | Gate | Blocked by |
|--------|--------|-------------|------|------------|
| 1 | Seller Home | 10 blueprint blocks, revenue-first home | `product:epic-86:sprint1-seller-home` | EPIC 86 architecture approval |
| 2 | Products | Revenue KPI catalog | `product:epic-86:sprint2-products` | Sprint 1 PASS |
| 3 | Product Detail | Seller PDP — stock, conversion, AI | `product:epic-86:sprint3-product-detail` | Sprint 2 PASS |
| 4 | Orders | SLA queue + actions | `product:epic-86:sprint4-orders` | Sprint 3 PASS |
| 5 | Finance | Trust-first wallet | `product:epic-86:sprint5-finance` | Sprint 4 PASS |
| 6 | Analytics | Revenue charts + drill-down | `product:epic-86:sprint6-analytics` | Sprint 5 PASS |
| 7 | Promotion | Campaign overview + CTA | `product:epic-86:sprint7-promotion` | Sprint 6 PASS |
| 8 | AI Assistant | Insight → action conversion | `product:epic-86:sprint8-ai-assistant` | Sprint 7 PASS |

**Implementation rules:**

1. No screen before EPIC 86 architecture gate PASS
2. No CRUD — web cabinet for create/edit
3. No Admin Panel patterns
4. Each sprint: blueprint → hook → experience → design-system components → gate
5. Reuse existing APIs only — no backend changes

Module: `apps/mobile/src/design-system/seller/roadmap/seller-sprints.ts`

---

## Verification

```bash
npm run product:epic-86:architecture
```

Проверяет:

- ✅ complete user journey (11 screens)
- ✅ screen inventory
- ✅ blueprint completeness (all fields + 10 Home blocks)
- ✅ component registry completeness (13 categories, 40+ components)
- ✅ roadmap completeness (8 sprints)
- ✅ navigation (tabs, deep links, push)
- ✅ benchmark + audit modules
- ✅ documentation
- ✅ no seller component `.tsx` implementations (architecture only)

---

## Next step

После **PASS** gate + product approval → **Sprint 1: Seller Home** (`cursor/epic-86-sprint-1-seller-home-d03e`).
