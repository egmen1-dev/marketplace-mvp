# Taxonomy Import Engine — EPIC-A-005

## Architecture

```
Taxonomy Source (WB / snapshot / manual)
  → Normalizer (slug, aliases, char types)
  → Validator / Planner (diff vs Catalog Core)
  → Deduplicator (A-003 audit + AI mapping suggestions)
  → Conflict Resolver (locallyEdited > products > existing > WB > snapshot)
  → ImportBatch + ImportItems (PENDING)
  → Dry-run report / Admin review
  → Approve / Reject
  → Apply → syncTaxonomyToDb → unifyCatalogCore → cache invalidate
```

**Does not replace** existing `TaxonomyProvider`, `syncTaxonomyToDb`, or matcher.

## Lifecycle

| Status | Meaning |
|--------|---------|
| PENDING | Awaiting review |
| APPROVED | Ready to apply |
| REJECTED | Will not apply |
| APPLIED | Written to Catalog Core |

## CLI

```bash
# Default: snapshot dry-run + persist PENDING batch
npm run taxonomy:import

# Explicit dry-run
npm run taxonomy:import -- --dry-run

# Live WB fetch (capped) — still dry-run
npm run taxonomy:import -- --source=wb --dry-run

# Apply reviewed batch
npm run taxonomy:import -- --batch=<id> --apply

# Apply with auto-approve of high-confidence CREATE/UPDATE
npm run taxonomy:import -- --batch=<id> --apply --auto-approve-safe

# WB mass apply blocked unless:
npm run taxonomy:import -- --source=wb --apply --i-understand-mass-import
```

## Admin

`/admin/taxonomy/import` — batches, items, Approve/Reject, Dry-run (snapshot), Apply approved.

All mutations require ADMIN and write `AdminActionLog`.

## Conflict rules

1. `locallyEdited=true` → SKIP / REJECT overwrite  
2. Entities with products → REVIEW for structural changes; never hard-delete  
3. Prefer existing Catalog Core over lower-priority incoming  
4. Soft deactivate only when no products and not locallyEdited  

## Characteristic mapping

Incoming names (e.g. «Мощность двигателя») map to LOT defs (e.g. «Мощность») via slug/name/alias/stem. Similar maps → REVIEW (no silent duplicate defs).

## AI mapping

`suggestProductTypeMapping` (rules-v1) + synonym boost (УШМ ↔ болгарка). Suggestions only — never auto-apply without approval.

## Search / SEO

Plan includes proposed `categoryPaths` and `productTypePagePath` candidates. Pages are **not** auto-created.

## Performance

- Item persistence via `createMany` chunks (200)
- Dedup audit reused (no N+1 merge loops on dry-run)
- Apply filters taxonomy subset before sync
- Indexes on batch status/hash and item batchId/status

## Security

- Admin UI + Server Actions gated by `requireAdminSession`
- No public apply API
- Audit log on dry-run / item status / apply
- Mass WB apply requires explicit GO flag

## Rollback

- Soft changes only (`isActive`, merges)
- Re-apply of APPLIED batch is idempotent no-op
- Restore from snapshot sync + unify if needed (ops playbook)
