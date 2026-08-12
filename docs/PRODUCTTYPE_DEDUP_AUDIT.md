# ProductType Dedup Audit — EPIC-A-003

**Date:** 2026-08-12  
**Staging:** https://web-production-e56fb.up.railway.app  
**Method:** Matcher suggest samples + `auditProductTypeDuplicates()` / `npm run taxonomy:dedupe`

---

## Summary

Staging has **semantic duplicates** from WB sync + snapshot sync sharing names but different `(externalSource, externalId)` and often different slugs (`drills` vs `drills-lot-…` style / parallel WB subjects).

| Pattern | Examples | Sources |
|---------|----------|---------|
| Same normalized name | Дрели ×2, Перфораторы ×2, Ноутбуки ×2, Тепловые пушки ×2 | snapshot + wildberries |
| Same concept, spelling | Шуруповерты / Шуруповёрты | WB vs snapshot |
| Alias overlap | болгарка → two УШМ types | both |

---

## Candidate pairs (staging evidence)

| Primary (keep) | Duplicate | Reason | Products | Decision |
|----------------|-----------|--------|----------|----------|
| Тепловые пушки (`snapshot`/`cmsnia0…` heaters branch) | Тепловые пушки (alt id `cmsoz1le…`) | same_normalized_name | audit on apply | merge_into_primary |
| Дрели | Дрели (2nd id) | same_normalized_name | — | merge_into_primary |
| Перфораторы | Перфораторы (2nd) | same_normalized_name | — | merge_into_primary |
| Ноутбуки | Ноутбуки (2nd) | same_normalized_name | — | merge_into_primary |
| Шуруповерты | Шуруповёрты | same_normalized_name (ё/е via normalize) | — | merge_into_primary |
| УШМ | УШМ (УШМ) alt | same_normalized_name / shared_alias | — | merge_into_primary |
| Обувь | near-matches under merged footwear | review | — | review |

Exact product counts: run locally/staging:

```bash
npm run taxonomy:dedupe
# apply only after review:
npm run taxonomy:dedupe -- --apply
```

---

## Identity rules (target)

One ProductType entity when:

1. Same `normalizeAlias(lotName|name)` **and** same category branch, **or**
2. Same `baseProductTypeSlug(slug)` (`-lot-*` stripped), **or**
3. Shared alias with high overlap

Primary pick order: more products → `locallyEdited` → prefer `snapshot` → more aliases → older `createdAt`.

---

## Safety

- Soft-deactivate duplicate (`isActive=false`, name suffix `merged →`)
- Remap `Product.productTypeId`
- Merge aliases + characteristic defs by slug; remap values
- **Never hard-delete**
- Dry-run default

See [PRODUCTTYPE_DEDUP.md](./PRODUCTTYPE_DEDUP.md).
