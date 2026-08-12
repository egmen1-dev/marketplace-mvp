# ProductType Dedup

Safe merge of duplicate ProductTypes without data loss.

## CLI

```bash
npm run taxonomy:dedupe           # dry-run
npm run taxonomy:dedupe -- --apply
```

## Strategy

```
Primary ProductType
  ← merge aliases
  ← remap products
  ← merge characteristic definitions (by slug)
  ← remap characteristic values
Duplicate → isActive=false
```

## Modules

| File | Role |
|------|------|
| `lib/catalog-taxonomy/dedupe.ts` | audit + merge |
| `scripts/dedupe-product-types.ts` | CLI |
| Admin ProductTypes panel | duplicate badges |

## Rollback

1. Re-activate soft-deactivated type (`isActive=true`, restore name)
2. Remap products manually if needed
3. Prefer restoring from DB backup for large merges

## Identity

`productTypeIdentityKey({ name, slug, categoryPath })` — stable matching key (not PK).
