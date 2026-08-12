# Catalog Core Architecture — EPIC-A-002

Unified catalog foundation for WB/Ozon-scale growth.

---

## Catalog Core model

```
Catalog Core (PostgreSQL)
│
├── Category Tree
│     parentId, level, path, slug (unique)
│     externalSource + externalId (sync identity)
│     locallyEdited (admin override lock)
│
├── ProductType (subject / leaf)
│     categoryId → Category
│     characteristics[], aliases[]
│
├── Product
│     categoryId + productTypeId
│     characteristicValues[]
│
├── Search layer
│     aliases, stemming, matcher (cached)
│
└── Facets (foundation)
      filterable characteristics → GET /api/catalog/facets
```

---

## Single source of truth

| Layer | Authority |
|-------|-----------|
| ProductType branches | Taxonomy snapshot / WB sync |
| Browse-only categories | Manual seed + admin LOCAL |
| Names/slugs (synced rows) | Snapshot unless `locallyEdited` |
| Product category | Derived from ProductType on publish |

**No separate manual tree.** Seed and sync write to the same `Category` table with merge rules.

---

## Category lifecycle

1. **Import** — `TaxonomyProvider.fetchTaxonomy()` → normalized JSON
2. **Sync** — `syncTaxonomyToDb()` upsert by `(externalSource, externalId)` or slug
3. **Unify** — `unifyCatalogCore()`:
   - merge ProductType slug collisions
   - dedupe slug-suffix categories
   - rebuild `path` / `level`
   - invalidate matcher cache
4. **Admin edit** — sets `locallyEdited=true`; sync skips name/slug overwrite
5. **Soft delete** — `isActive=false`; never hard-delete with products

---

## Identity

| Field | Role |
|-------|------|
| `slug` | Stable URL key (`/category/[slug]`) |
| `path` | Materialized path (`tools/power-tools`) |
| `externalSource` + `externalId` | Sync dedup |
| `locallyEdited` | Conflict resolution — admin wins |

Future ProductType SEO: `productTypePagePath(categoryPath, typeSlug)` in `features/catalog/paths.ts`.

---

## Sync strategy

```bash
npm run taxonomy:sync          # snapshot (default)
npm run taxonomy:sync:wb         # live WB (capped)
POST /api/taxonomy/sync        # ops (Bearer secret)
```

After every sync: **`unifyCatalogCore()`** automatically.

Seed order: **sync → manual enrich → unify**.

---

## Taxonomy cache

`lib/catalog-taxonomy/cache.ts`

- `getMatchCandidates(db)` — TTL 60s in-process cache
- `invalidateTaxonomyCache()` — on sync/unify
- Ready for Redis swap at scale

---

## Publish rules

ACTIVE listings require:

1. `productTypeId` (enforced in Zod + `createProduct` / `updateProduct`)
2. Required characteristics (`canPublishActive`)

DRAFT / ARCHIVED — ProductType optional (legacy grandfathering).

---

## Facet foundation

```
ProductType → filterable CharacteristicDefinition
           → GET /api/catalog/facets?productTypeId=
           → GET /api/catalog/facets?categoryId=
```

UI facets deferred to EPIC-A-003+.

---

## Admin source labels

| Label | `externalSource` |
|-------|------------------|
| Wildberries | `wildberries` |
| Снимок | `snapshot` |
| Ручной seed | `manual` |
| Локально | null / other |

---

## Future import engine (not implemented)

```
Source → Normalize → Dedup → Conflict policy → ImportBatch → syncTaxonomyToDb → unify
```

See EPIC-A-001 design. No mass import in A-002.

---

## Key modules

| Path | Role |
|------|------|
| `lib/catalog-taxonomy/sync.ts` | Idempotent upsert |
| `lib/catalog-taxonomy/unify.ts` | Tree merge |
| `lib/catalog-taxonomy/cache.ts` | Matcher cache |
| `lib/catalog-taxonomy/facets.ts` | Facet definitions |
| `lib/catalog-taxonomy/publish.ts` | ACTIVE gates |
| `lib/catalog-taxonomy/source.ts` | Origin labels |
| `docs/CATALOG_CORE_AUDIT.md` | Pre/post audit |

---

## TASK 058 preserved

- Provider interface unchanged
- Matcher algorithm unchanged
- Sync API unchanged (+ unify in response)
- Tests: `tests/taxonomy-matcher.test.ts`, `tests/taxonomy-snapshot.test.ts`, `tests/catalog-core-unify.test.ts`
