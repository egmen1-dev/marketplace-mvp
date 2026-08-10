# LOT Taxonomy (WB-compatible)

## Architecture

```
TaxonomyProvider (WB | LocalSnapshot | future Ozon/Yandex/Manual)
        ↓
   NormalizedTaxonomy
        ↓
   syncTaxonomyToDb (idempotent upsert)
        ↓
LOT DB: Category → ProductType → CharacteristicDefinition
        ↓
Product.productTypeId + ProductCharacteristicValue
```

LOT never uses Wildberries IDs as primary keys. External IDs live in
`externalSource` + `externalId` only.

## Source

Official WB Content API (when `WB_API_TOKEN` or `WB_CONTENT_API_TOKEN` is set):

- `GET /content/v2/object/parent/all`
- `GET /content/v2/object/all`
- `GET /content/v2/object/charcs/{subjectId}`

Fallback: `data/taxonomy/wb-taxonomy.json` via `LocalSnapshotProvider`.

Code: `lib/catalog-taxonomy/`.

## Sync

```bash
# Prefer curated snapshot (default script)
npm run taxonomy:sync

# Live WB API (requires token)
npm run taxonomy:sync:wb

# Suggest productType mapping for existing products (dry-run)
npm run taxonomy:migrate

# Apply high-confidence mappings
tsx scripts/sync-wb-taxonomy.ts --snapshot --migrate --apply
```

Safety:

- Upsert by `(externalSource, externalId)` or slug — no duplicates
- `locallyEdited=true` → sync does not overwrite LOT name/slug
- Missing source rows → `isActive=false` (never hard-delete with products)
- Existing `Category` / `Product` rows are preserved

## Models

| Model | Role |
|-------|------|
| `Category` | Unlimited tree (`parentId`, `level`, `path`) |
| `ProductType` | Concrete subject (дрели, тепловые пушки) |
| `ProductCharacteristicDefinition` | Schema per ProductType |
| `ProductCharacteristicValue` | Values on a Product |
| `CategoryAlias` / `ProductTypeAlias` | RU synonyms for search/match |

## Smart matching

`matchProductTypes()` in `lib/catalog-taxonomy/matcher.ts` scores title tokens
against ProductType name, aliases, and breadcrumb with lightweight RU stemming.
Confidence is deterministic (`score / maxPossible`), not ML.

Seller create flow: title → suggestions → select ProductType → dynamic
characteristics → publish (ACTIVE requires required chars; DRAFT allowed).

## Seller UX

- `TaxonomySelector` — recommendations + manual browser (modal / mobile drawer)
- `DynamicCharacteristicsFields` — type-specific form
- Legacy `CategoryPicker` still available under “категория каталога”

## Admin

`/admin/categories` — category tree + ProductTypes panel (rename LOT name,
toggle active, add aliases, inspect characteristics).

## Migration of existing products

`productTypeId` is nullable. Unmapped products keep working with `categoryId`.
`migrateExistingProducts()` reports `mapped` / `needs_review` / `unmapped`.

## Search

Catalog `q` also matches `productType.name`, `lotName`, and aliases
(e.g. «болгарка» → УШМ products).

## SEO

Sitemap indexes only active categories that have ACTIVE products.

## Environment

Ship Local → Railway staging → smoke/Playwright → then production.
Do **not** auto-deploy taxonomy DB changes to Vercel production without
confirmation.

Env vars:

- `WB_API_TOKEN` / `WB_CONTENT_API_TOKEN` — optional live sync
- `WB_CONTENT_API_URL` — override API base
- `TAXONOMY_SNAPSHOT_PATH` — custom snapshot file
- `TAXONOMY_PREFER_SNAPSHOT=1` — force snapshot
