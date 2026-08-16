# DAOS ↔ Marketplace Quality Integration

## Boundary

```
DAOS (external)
  ↓ HTTP Quality Critics API
  lib/marketplace-content-quality/providers/daos/
  ↓ mapped hints
  Rule-based marketplace critics + gates
  ↓
  Commercial Quality Score
```

Marketplace does **not** embed:

- Render Engine
- Prompt Generator
- Scene Generation
- Provider Router (generation)
- Image/background generation pipelines

## Adapter files

- `providers/daos/client.ts` — HTTP client with timeout
- `providers/daos/mapper.ts` — request/response mapping
- `providers/daos/fallback.ts` — merge DAOS visual signals with marketplace-owned critics
- `providers/daos/types.ts` — contract types

## Failure modes

If DAOS is disabled, unreachable, slow, or errors:

- Marketplace continues with `RuleBasedFallbackProvider`
- Seller UI shows last snapshot or «Оценка качества обновляется»
- Never show `0/100` solely because provider failed

## Privacy

Only product content is sent to DAOS — never seller passwords, buyer PII, or payment data.

## First-wave DAOS critics (when available)

- Commercial Visibility
- Thumbnail Test
- Composition / Background / Lighting / Readability
- Grounding / Product Presence

Marketplace-owned critics always run locally:

- Photo Relevance
- Product Identity
- Text–Image Consistency
- SEO / Description / Attributes quality
- Manipulation
- Compliance adapter (Trust Loop)
