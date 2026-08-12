# Facet Platform — EPIC-A-003

## Architecture

```
ProductType
  → ProductCharacteristicDefinition (filterable=true)
       → Facet Definition
       → Facet Value buckets + counts
       → ProductCharacteristicValue on Products
```

## API

```
GET /api/catalog/facets?category=power-tools
GET /api/catalog/facets?productType=drills
GET /api/catalog/facets?category=power-tools&f_power-w=500-1000
```

Response: `{ facets: FacetWithValues[], selected }`

Each facet includes `values: [{ value, label, count }]`.

## Catalog URL

```
/catalog?category=power-tools&productType=drills&f_power-w=500-1000&f_brand=Makita
```

- `productType` — ProductType slug
- `f_<slug>` — facet selection (exact, boolean, or `min-max` for numbers)

## Listing

`listProducts({ facets, productType, category })` → `buildWhere` AND of `characteristicValues.some`.

## UI

- Desktop: sidebar `FacetFilters`
- Mobile: same fields inside filters drawer
- Apply persists URL; infinite scroll forwards facet params

## Types supported

| Type | UI / matching |
|------|----------------|
| TEXT / SELECT / COLOR / SIZE | exact valueText |
| NUMBER | range buckets + `min-max` filter |
| BOOLEAN | Да/Нет |
| MULTISELECT | valueText (primary); options listed |

## Indexes

Migration `20260812213000_facet_value_indexes`:

- `(definitionId, valueText)`
- `(definitionId, valueNumber)`
- `(definitionId, valueBoolean)`

## Seller UX

Characteristics grouped:

1. Обязательные  
2. Фильтруемые  
3. Рекомендуемые  

## Lifecycle

1. Sync taxonomy → definitions with `filterable`
2. Sellers fill values on publish
3. Facet API aggregates ACTIVE products
4. Catalog filters narrow listing

## Expansion

Next: dedicated ProductType SEO pages, brand entity facets, Meilisearch/FTS for scale.
