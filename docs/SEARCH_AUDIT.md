# Search audit (AGENT-020, before)

Branch `cursor/agent-020-search-intelligence-87f6` (stacked on 058/059/019).

## How search works today

- **Entry points**: `GET /api/products?q=` and `/api/products/suggest?q=` → catalog
  `listProducts()` / `suggestCatalog()` (`features/products/queries.ts`).
- **Tokenization**: `features/products/search-query.ts` — lowercase, split on
  separators, `searchTokenVariants()` adds light RU stem prefixes.
- **Matching** (`buildWhere`): for each token, an `OR` over `name`, `description`,
  `category.name/slug`, `productType.name/lotName`, `productType.aliases`,
  `category.aliases`, `seller.storeName`. Multiple tokens are AND-ed.
- **Ranking**: results are ordered by the catalog `sort` (default `recommended` =
  precomputed `Product.rankingScore` from LOT Ranking v1). Text relevance is **not**
  computed per result — matching is boolean, ordering is the global ranking.
- **Taxonomy**: matched indirectly (productType name/alias contains). The matcher
  (`lib/catalog-taxonomy/matcher.ts`) is used for seller product-type suggestions,
  **not** for buyer search expansion.
- **Aliases**: DB `ProductTypeAlias` / `CategoryAlias` participate via `contains`.
- **SearchDocument** (`lib/search/search-document.ts`, TASK 058) exists for SEO/
  relevance text but is **not** used for query-time retrieval.

## Limitations / weak queries

- **No spell correction**: «болгарга», «перфораторр», «тепловая пушк» → poor/no
  results.
- **No synonym engine**: «УШМ» vs «болгарка», «ноут» vs «ноутбук», «минимойка» —
  only whatever DB aliases exist; not centralized.
- **No brand/model/attribute understanding**: «Makita HR2470», «болгарка Bosch 125»,
  «2200 Вт», «18 В» are matched only as raw substrings (brand/model rarely in
  `name`, attributes not in text).
- **No intent detection**: brand vs model vs type vs attribute vs mixed.
- **No text-relevance scoring / explainability**: cannot say *why* a product matched.
- **No diversification**: a single seller can fill the whole first page.
- **No search analytics**: empty queries, frequency, CTR, success are not recorded.
- **AND across tokens** is brittle for mixed queries (every token must match a field),
  so «Makita перфоратор 800Вт» often returns nothing.

## Where search is used directly

- `app/api/products/route.ts` (catalog list), `app/api/products/suggest/route.ts`
  (autocomplete), `features/products/queries.ts` (`listProducts`, `suggestCatalog`),
  catalog/category pages. UI and search logic are **coupled** inside `buildWhere`.

## Plan (AGENT-020)

Introduce a UI-independent **Search Intelligence** layer:
`normalize → spell → synonyms → taxonomy expansion → intent → candidate generation
→ ranking → diversification`. A pure `SearchQueryParser` produces an explainable
`ParsedQuery` (brands, models, attributes, product types, synonyms, negatives) that
drives retrieval; results reuse LOT Ranking v1 order and get diversified. Add search
analytics + an admin debug/explainability view.
