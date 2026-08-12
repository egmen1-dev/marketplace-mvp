# Taxonomy Import Engine Audit — EPIC-A-005

**Scope:** Local + Railway staging. Vercel production not modified.  
**Mass WB import:** not executed (requires separate GO).

## 1. Current flow

```
TaxonomyProvider (WB | snapshot)
  → NormalizedTaxonomy
  → syncTaxonomyToDb()          // direct upsert
  → unifyCatalogCore()          // collisions + paths + cache
  → (optional) migrateExistingProducts
  → (optional separate) taxonomy:dedupe
```

| Piece | Path | Role |
|-------|------|------|
| Provider interface | `lib/catalog-taxonomy/types.ts` | `fetchTaxonomy()` |
| WB provider | `lib/catalog-taxonomy/wb/provider.ts` | Live API (capped) |
| Snapshot | `lib/catalog-taxonomy/providers/snapshot.ts` | `data/taxonomy/wb-taxonomy.json` |
| Sync | `lib/catalog-taxonomy/sync.ts` | Idempotent upsert |
| Unify | `lib/catalog-taxonomy/unify.ts` | Tree integrity |
| Dedup | `lib/catalog-taxonomy/dedupe.ts` | ProductType soft-merge |
| Ops sync API | `POST /api/taxonomy/sync` | Bearer secret |
| Admin UI | `/admin/categories` | Manual edits only |

## 2. What already works

- Source-agnostic `NormalizedTaxonomy` contract
- `(externalSource, externalId)` + slug identity
- `locallyEdited` lock on name/slug
- Soft deactivate (no hard delete with products)
- ProductType dedup audit/apply CLI
- Matcher cache invalidation after sync/unify/dedupe

## 3. Limitations (pre-A-005)

| Gap | Impact |
|-----|--------|
| No ImportBatch / review queue | Sync writes immediately |
| No dry-run for sync itself | Only migrate/dedupe have dry-run |
| No conflict report before write | Admin discovers issues after |
| Char mapping ad-hoc | Risk of duplicate characteristics |
| No admin import center | Ops CLI / secret API only |
| WB live capped | Full marketplace dump not supported (by design) |
| Parallel snapshot+WB types | Need dedupe after sync |

## 4. Extension points (A-005)

```
Source → Normalizer → Validator → Deduplicator → Conflict Resolver
  → ImportBatch (PENDING)
  → Dry-run report / Admin approval
  → Apply → syncTaxonomyToDb → unifyCatalogCore → cache invalidate
```

**Do not replace** `TaxonomyProvider`, `syncTaxonomyToDb`, `unifyCatalogCore`, or `matchProductTypes`.

## 5. Safety policy

- Default CLI: **snapshot + dry-run**
- Live WB fetch only with explicit `--source=wb` (still dry-run unless `--apply`)
- `--apply` requires approved batch (or explicit auto-approve of safe high-confidence items)
- Never hard-delete categories/types with products
- Vercel production not touched
