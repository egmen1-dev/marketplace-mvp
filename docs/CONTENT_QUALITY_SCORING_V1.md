# Content Quality Scoring V1 (Candidate Weights)

> Weights below are **candidate V1** — calibrate via Ranking Lab before any live ranking use.

## Commercial Quality Score (0–100)

Weighted blend of:

| Factor | Candidate weight |
|--------|------------------|
| Photo Quality | 18% |
| Thumbnail Quality | 10% |
| Description Quality | 12% |
| SEO Quality | 8% |
| Attributes Quality | 10% |
| Video Quality | 5% |
| Consistency | 12% |
| Commercial Value | 15% |
| Compliance | 5% |
| Buyer Value | 5% |

Manipulation risk applies a penalty when score < 40.

## Each factor exports

- `score` (0–100)
- `confidence` (0–1)
- `evidence.reasons[]`

## Photo quality

Uses `effectivePhotoCount`, not raw `photoCount`.

## SEO

**Content SEO Quality** is separate from **Query Relevance** (ranking intelligence).

## Versioning

Stored on each snapshot:

- `qualityModelVersion`
- `criticVersion`
- `providerVersion`
