# AI Product Understanding — EPIC-A-004

## Architecture

```
understandProduct(db, { title, description?, categoryHint?, images? })
  → matchProductTypes (existing Catalog Core matcher)  // NOT replaced
  → extractBrand / extractModel (rules dictionary + SKU patterns)
  → extractRawAttributes → mapAttributesToDefinitions (taxonomy defs)
  → suggestSeo (existing seoTitle / seoDescription fields)
  → confidence scores (high / medium / low)
  → ProductUnderstandingResult  // suggestions only
```

**Boundary:** Engine never writes `Product`. Persist only after seller confirmation via normal create/update.

**Engine id:** `rules-v1` (deterministic). Future LLM can implement the same `understandProduct` interface.

## Interface

```ts
POST /api/product-understanding
{ title, description?, categoryHint? }
→ ProductUnderstandingResult

PUT /api/product-understanding
{ field, suggested?, corrected?, title?, productTypeId?, meta? }
→ knowledge-loop row
```

Library: `lib/product-understanding/` (`understandProduct`, `ensureBrand`, extractors, SEO, corrections, search-boost).

## Confidence

| Level | Score | UX |
|-------|-------|----|
| high | ≥ 0.75 | Auto-suggest prominently; Apply enabled |
| medium | ≥ 0.45 | Suggest with badge |
| low | &lt; 0.45 | Warning — prefer manual TaxonomySelector |

Overall mixes ProductType (45%), brand (25%), characteristics (20%), model presence (10%).

## Brand

```
Brand { id, name, slug, aliases, normalizedName, isActive }
Product.brandId → Brand?
Product.modelName → string?   // SKU / model line, not Brand
```

`ensureBrand(name)` lazy-creates on **confirmed** save. No mass fill.

## Model recognition

Separates brand vs model (e.g. Makita / HR2470). Model is not written as a characteristic.

## Attribute extraction

Rules extract power / voltage / SDS / impact → map onto `ProductCharacteristicDefinition` by slug/name. Unmapped attrs returned with low confidence (not saved unless mapped + Apply).

## Facets

Confirmed characteristics → `ProductCharacteristicValue` → existing facet engine (A-003). No parallel facet schema.

## SEO

Suggests into existing `seoTitle` / `seoDescription` (+ short description → product description). No duplicate SEO columns.

## Search impact

`tokenMatchOr` includes `brand`, `modelName`, characteristic `valueText`.  
`SEARCH_SIGNAL_WEIGHTS` / `brandModelBoostHint` prepare ranked boosts for later Search Intelligence (matcher unchanged).

## Knowledge loop

`ProductUnderstandingCorrection` stores suggestion vs final / apply events. Admin: `/admin/ai-understanding`. Not used for training yet.

## Human approval

Seller must click **Применить предложение** (or fill manually). Publish still requires ProductType + required chars validation.

## Future LLM integration

1. Keep `UnderstandProductInput` / `ProductUnderstandingResult`.
2. Add provider behind `understandProduct` (or ensemble: rules + LLM).
3. Use corrections table as eval / few-shot ground truth.
4. Never auto-publish LLM output without confirmation.
