# Search & Product Search Document

## Candidate retrieval

Catalog search (`listProducts` with `query`) tokenizes the query
(`features/products/search-query.ts`, RU stemming) and matches across
`name`, `description`, `category.name/slug`, `productType.name/lotName`,
`productType.aliases`, `category.aliases`, and `seller.storeName`. Multiple tokens
AND; each token ORs across fields.

## ProductSearchDocumentBuilder (section 21)

`lib/search/search-document.ts` derives a search document from a product — sellers
never edit it. It aggregates, with title/type weighted by repetition:

- title, description
- product type name
- category breadcrumb
- characteristics (name + value + unit)
- brand, aliases
- store name (low weight)

Outputs: `text` (relevance blob), `keywords` (distinct ≥3-char tokens),
`metaTitle`, `metaDescription` (auto SEO — see `docs/SEO_PRODUCT_CONTENT.md`).

## Dynamic category filters (section 40)

`getCategoryDynamicFilters(categoryIds)` (`features/taxonomy/queries.ts`) aggregates
`filterable` characteristics across a category's product types, exposing discrete
values (definition options + observed values). The catalog/category pages render
`DynamicCatalogFilters`; selections live in the URL as `ch_<slug>=v1,v2` and filter
products via `ProductCharacteristicValue` (AND across characteristics, OR within
values). Threaded through `/api/products` and the infinite grid.

## Ranking of results

Results default to `sort=recommended` (LOT Ranking v1 organic order). See
`docs/RANKING.md`.

## Analytics events (section 45, planned)

Event names reserved (no PII): `search_query`, `search_results_shown`,
`product_impression`, `product_open`, `add_to_cart`, `purchase`, `order_completed`,
`buyout`. Emission wiring is future work; `ProductRankingStats` already models the
aggregates these events would feed.
