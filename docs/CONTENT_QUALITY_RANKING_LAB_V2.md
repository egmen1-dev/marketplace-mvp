# Content Quality Ranking Lab V2

## Dataset types

| Type | Measures |
|------|----------|
| STRUCTURAL QUALITY | Counts, lengths, completeness |
| SEMANTIC QUALITY | Relevance, consistency, manipulation |

Example:

- Product A: 10 photos, `photoQuality = 15`
- Product B: 4 photos, `photoQuality = 94`
- Expected: **B > A** (advisory ranking with content quality enabled)

## Negative controls

| Test | Expected |
|------|----------|
| `dirty-socks-product-control` | Gate FAIL, TOP blocked |
| High quantity / low quality | `effectivePhotoCount` ≪ uploaded |
| Description spam | Low description + SEO quality |
| Video junk | Video quality ≈ 0 |
| Duplicate photos | `effectivePhotoCount ≈ 1` |
| Critical ranking test | Promoted junk must not outrank quality card |

## Experiments

See `lib/marketplace-content-quality/lab/experiments.ts` — 50+ quality-specific experiment IDs.

## Factor report V2

Break down photo influence into:

- Photo relevance
- Thumbnail quality
- Photo commercial quality
- Photo diversity (`effectivePhotoCount`)

## Live ranking

Lab results remain **experimental**. Do not treat candidate weights as live search rules.

## CLI / tests

```bash
MARKETPLACE_CONTENT_QUALITY_ENABLED=true npm test -- tests/content-quality-ranking-integration.test.ts
```
