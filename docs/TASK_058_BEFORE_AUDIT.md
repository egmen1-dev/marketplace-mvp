# TASK 058 — BEFORE AUDIT (фактическое состояние до изменений)

Дата аудита: 2026-08-11. Ветка: `cursor/task-058-taxonomy-ranking-87f6`.

## Фактические цифры (LOCAL, после seed)

| Показатель | Значение | Источник |
| --- | --- | --- |
| Category (в БД) | 45 | seed catalog tree + snapshot |
| ProductType / Subject | 10 | snapshot (`data/taxonomy/wb-taxonomy.json`) |
| CharacteristicDefinition | 28 | snapshot |
| ProductTypeAlias | 28 | snapshot |
| Snapshot: categories / types / chars / aliases | 13 / 10 / 28 / 28 | `data/taxonomy/wb-taxonomy.json` |
| Products с `productTypeId` | 15 из 44 | seed + e2e |
| Source taxonomy | `snapshot` (нет `WB_API_TOKEN`) | env |

## Что уже существует (архитектура на месте)

- **Модели БД**: `Category` (с `externalSource/externalId/level/path/locallyEdited/sourceUpdatedAt/lastSyncedAt`), `ProductType` (`lotName`, external ids), `ProductCharacteristicDefinition` (type/required/unit/options/filterable/sortOrder), `ProductCharacteristicValue`, `CategoryAlias`, `ProductTypeAlias`. Модель данных практически покрывает разделы 5–8 ТЗ.
- **Provider architecture**: `TaxonomyProvider` интерфейс, `WbTaxonomyProvider` (официальные Content API эндпоинты) и `LocalSnapshotProvider`. Разделы 4 и части 2–3 уже заложены.
- **Sync**: `syncTaxonomyToDb()` — идемпотентный upsert по `(externalSource, externalId)`/slug, soft-deactivate пропавших типов, уважение `locallyEdited`. Раздел 9 в основном закрыт (нет только `TaxonomySyncRun` метаданных и отчёта, раздел 10).
- **Matcher**: `matchProductTypes()` — детерминированный скоринг по имени/алиасам/breadcrumb + RU‑стемминг. Работает, но датасет типов маленький.
- **Seller UX**: `TaxonomySelector` (рекомендации по названию + ручной picker), `DynamicCharacteristicsFields`, `CategoryPicker` (legacy). Разделы 15–18 частично реализованы.
- **Валидация характеристик**: `canPublishActive()` — required блокируют ACTIVE, DRAFT разрешён. Раздел 18 закрыт на уровне логики.
- **Catalog**: `listProducts()` с фильтрами (category/price/seller/city/condition/inStock), сортировка `popular|newest|price_asc|price_desc`. Поиск `q` матчит name/description/category/productType/aliases/seller.

## Что сломано / чего не хватает (scope TASK 058)

1. **Taxonomy маленькая** — 10 ProductTypes покрывают только climate/tools/computers/clothing. Нет полного набора по сегментам (строительство, инструмент, электроника, дом, авто, одежда, обувь, красота, спорт). Это и есть причина «работает только на demo».
2. **Причина «работает только на тепловую пушку»**: matcher ищет только среди 10 типов из snapshot; для «болгарка/перфоратор/ноутбук/iphone/куртка/кроссовки» нет ProductType‑кандидатов в БД → рекомендация пустая или нерелевантная. Проблема в данных, не в алгоритме.
3. **Нет 50-query quality dataset** и измеренной Top-1/Top-3 accuracy.
4. **Дублирующие SEO поля** в `product-form.tsx` (секция «SEO»: `seoTitle`, `seoDescription`) — раздел 19 требует убрать из формы продавца.
5. **Нет `ProductSearchDocumentBuilder`** (раздел 21) и **`ProductContentQualityScore`** (раздел 22).
6. **Нет `MarketplaceRankingEngine` (LOT Ranking v1)** (разделы 23–38), **`ProductRankingStats`** (раздел 39) и cold‑start (раздел 36). Каталог сортирует по `views/favoritesCount`, коммерческие сигналы не влияют.
7. **Нет динамических category-specific фильтров** в каталоге (раздел 40) — фильтры статические.
8. **Нет `/admin/ranking`** debug (раздел 44) и `TaxonomySyncRun` (раздел 39/10).
9. **Live WB import** невозможен — нет `WB_API_TOKEN` (external blocker, раздел 3). Provider готов; используем snapshot.
10. **Railway staging** — нет `RAILWAY_TOKEN` (external blocker, раздел 54).

## Hardcoded vs snapshot vs синхронизируемое

- **Hardcoded**: базовое дерево категорий каталога — в `prisma/seed.ts` (8 корней). Алиасы поиска частично в `search-query.ts` (стемминг), не в БД.
- **Snapshot**: ProductTypes + characteristics + type aliases — `data/taxonomy/wb-taxonomy.json` (10 типов).
- **Реально синхронизируется**: всё из snapshot через `syncTaxonomyToDb` (idempotent). Категории каталога из seed и категории snapshot сосуществуют.

## Использует ли форма продавца ProductType из БД?

Да — `TaxonomySelector` дергает `/api/taxonomy/suggest` и `/api/taxonomy/browse`, `DynamicCharacteristicsFields` грузит характеристики выбранного типа. `createProduct/updateProduct` сохраняют `productTypeId` + значения характеристик и проверяют required для ACTIVE.

## Использует ли catalog новую taxonomy?

Частично: поиск матчит `productType.name` и алиасы. Но фильтры не зависят от характеристик типа, а ранжирование не учитывает коммерческие сигналы.

## План (TASK 058)

Расширить snapshot до полноценного WB‑подобного набора → поднять точность matcher на 50‑query датасете → убрать SEO поля → добавить SearchDocument + ContentQuality → добавить RankingEngine + RankingStats + cold start → динамические фильтры → миграция товаров → docs → quality gates. Live WB sync и Railway — отмечены как external blockers (нет токенов).
