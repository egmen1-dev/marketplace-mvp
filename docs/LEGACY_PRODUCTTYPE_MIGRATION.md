# Legacy ProductType Migration — Dry Run (EPIC-A-003)

**Date:** 2026-08-12  
**Staging sync:** `POST /api/taxonomy/sync?migrate=1`

## Result (staging)

```json
{
  "mapped": 0,
  "needsReview": 4,
  "unmapped": 0
}
```

Interpretation:

- **mapped (auto):** 0 — no products crossed the high-confidence auto-apply threshold in this dry-run
- **needs review:** 4 ACTIVE/null-type products with matcher suggestions between 0.45–0.70
- **unmapped:** 0

## Command

```bash
npm run taxonomy:migrate
# apply only after review:
tsx scripts/sync-wb-taxonomy.ts --snapshot --migrate --apply
```

## Policy

Do **not** auto-apply on production/staging without reviewing the report rows.
Grandfathered ACTIVE products without ProductType remain valid until remapped.
