# Catalog Core Audit — EPIC-A-002

**Date:** 2026-08-12  
**Baseline:** pre-unification audit → unified in EPIC-A-002

---

## Problem statement

Before EPIC-A-002 the catalog had **two parallel category trees**:

| Source | Created by | Purpose |
|--------|------------|---------|
| Manual seed tree | `prisma/seed.ts` → `upsertCategoryTree` | Demo catalog navigation (~40 nodes, 8 roots) |
| Taxonomy snapshot | `syncTaxonomyToDb` ← `data/taxonomy/wb-taxonomy.json` | WB-compatible ProductTypes (13 cats, 10 types) |

Both wrote to the same `Category` table, merging by **slug** but with **divergent hierarchy** under shared roots (`construction`, `tools`, …).

---

## Where categories are created

| Entry point | File | Behavior |
|-------------|------|----------|
| DB seed | `prisma/seed.ts` | Manual tree + taxonomy sync (order fixed in A-002) |
| Taxonomy sync CLI | `scripts/sync-wb-taxonomy.ts` | Snapshot or WB API |
| Taxonomy sync API | `POST /api/taxonomy/sync` | Ops endpoint (secret) |
| Admin UI | `/admin/categories` | Manual create/edit (`externalSource` null → LOCAL) |

---

## Source of truth (after A-002)

**Catalog Core = PostgreSQL `Category` + `ProductType` graph**, populated primarily by:

1. **Taxonomy snapshot/WB sync** — canonical branches for ProductTypes
2. **Manual seed** — enriches descriptions/images; adds seed-only branches (`materials`, `hand-tools`, …)
3. **Admin LOCAL** — overrides via `locallyEdited`

Unification: `lib/catalog-taxonomy/unify.ts` → `unifyCatalogCore()`

---

## Duplicated / conflicting data (before fix)

| Conflict | Example | Resolution |
|----------|---------|------------|
| Same root slug | `construction`, `tools` | Merge on slug; snapshot hierarchy wins for structure |
| Category slug = ProductType slug | `drills`, `heat-guns` | Soft-deactivate legacy Category; remap products to ProductType.categoryId |
| Divergent L2/L3 | seed `heating` vs snapshot `climate-tech` | Both may exist; ProductTypes attach to snapshot branch |
| Slug suffix dupes | `drills-lot-drills` from sync | `mergeSlugSuffixDuplicates()` |

---

## Relations in use

```
Category (tree)
  ├── ProductType (leaf subject)
  │     ├── ProductCharacteristicDefinition
  │     └── ProductTypeAlias
  ├── CategoryAlias (schema; sparse data)
  └── Product.categoryId

Product
  ├── productTypeId (required for new ACTIVE)
  └── ProductCharacteristicValue
```

---

## Models audited

| Model | Indexes | Notes |
|-------|---------|-------|
| Category | slug unique, path, level, externalId | `path` rebuilt on unify |
| ProductType | slug unique, categoryId | Sync + admin |
| ProductCharacteristicDefinition | filterable index | Facets API ready |
| ProductCharacteristicValue | productId + definitionId unique | Publish gate |
| CategoryAlias / ProductTypeAlias | normalized index | Search + matcher |

---

## Surfaces checked

| Surface | Status pre-fix | Post A-002 |
|---------|----------------|------------|
| Seller create | Dual CategoryPicker + TaxonomySelector | ProductType primary; legacy picker hidden when type set |
| Search | ILIKE on category + type + aliases | Unchanged; unified tree improves consistency |
| SEO `/category/[slug]` | Per-slug landings | `path` field consistent; ProductType SEO path helper added |
| Admin | No source labels | Source badges (LOCAL/WB/SNAPSHOT/MANUAL) |
| Matcher | Loads all types every request | Cached via `getMatchCandidates()` |

---

## ProductType coverage

Existing ACTIVE products without `productTypeId` **remain valid** (grandfathered).  
New ACTIVE creates/updates **require** `productTypeId`.

Migration path: `migrateExistingProducts()` (existing TASK 058 tool).

---

## TASK 058 compatibility

- `TaxonomyProvider`, `syncTaxonomyToDb`, `matchProductTypes` — **unchanged contract**
- Sync now calls `unifyCatalogCore()` + cache invalidation after upsert
- No mass WB import; snapshot size unchanged (10 ProductTypes)
