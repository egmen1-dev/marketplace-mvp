# CCOS Wave 3 — Product Understanding & Product Genome Platform

## Goal

Teach CCOS to understand **the product itself**, not only photos, SEO, CTR, trust, and commercial metrics. Wave 3 adds a cognitive layer that answers:

- What is being sold?
- Which need does it satisfy?
- What should ideal content look like for this product?

Wave 3 does **not** change live ranking, financial operations, moderation, or marketplace behaviour.

## Pipeline

```
Observation
  ↓
Product Understanding
  ↓
Knowledge (Wave 2)
  ↓
Reasoning
  ↓
Recommendation
```

## Modules

| Deliverable | Path |
|-------------|------|
| Product Identity Engine | `lib/ccos/product/identity.ts` |
| Product Genome | `lib/ccos/product/genome.ts` |
| Product DNA | `lib/ccos/product/dna.ts` |
| Need Graph | `lib/ccos/product/need-graph.ts` |
| Product Relationships | `lib/ccos/product/relationships.ts` |
| Comparison Engine | `lib/ccos/product/comparison.ts` |
| Use Case Intelligence | `lib/ccos/product/use-cases.ts` |
| Category Knowledge Packs | `lib/ccos/product/category-packs.ts` |
| Product Context | `lib/ccos/product/context.ts` |
| DAOS Integration Layer | `lib/ccos/product/daos-layer.ts` |
| Cross-App Knowledge | `lib/ccos/product/cross-knowledge.ts` |
| Orchestrator | `lib/ccos/product/builder.ts` |
| Marketplace adapter | `lib/marketplace-cognitive-platform/product/` |
| Brain integration | `lib/marketplace-cognitive-platform/brain/v1/report.ts` |

## Unified Product Genome Contract

Contract version: `product-genome-v1`

Dimensions (independent from Ranking Genome `genome-v0`):

`visual`, `commercial`, `functional`, `emotional`, `seasonality`, `audience`, `complexity`, `trust`, `lifecycle`, `priceSegment`

Consumers: Marketplace Brain, DAOS (visual signals), QuickSale, Advertising Brain, Search Brain, Buyer Brain.

## Category Knowledge Packs

Independent packs under `lib/ccos/product/category-packs.ts`:

`fans`, `flowers`, `tools`, `electronics`, `garden`, `construction`, `generic`

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/ccos/product/scan?productId=` | Camera scan for existing product |
| `POST /api/ccos/product/scan` | Scan from title/metadata or productId |
| `POST /api/ccos/product/capture` | Guided mobile capture (`start` / `evaluate`) |

## Flags

- `CCOS_ENABLED=true`
- `CCOS_PRODUCT_PLATFORM_ENABLED=true` (or knowledge/cognitive flags)

Optional: `DAOS_LIVE_CONNECTION=true` for live DAOS visual signals.

## Brain version

When product platform is enabled: `marketplace-brain-v3-product`

## Invariants preserved

- Live ranking unchanged (`resolveOrderBy` isolation)
- Finance / moderation execution isolated
- Autopilot disabled
- Product Understanding is advisory-only
- Product Genome is separate from Ranking Genome
- Verified Knowledge rules from Wave 2 unchanged
