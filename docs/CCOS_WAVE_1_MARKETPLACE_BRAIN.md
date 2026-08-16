# CCOS Wave 1 — Marketplace Brain & Context

## Summary

Wave 1 evolves CCOS from **observe + aggregate + explain** to **context + interpret + prioritize + simulate (advisory)**.

## Architecture

```
Observation (facts)
    ↓
Context Engine V1 (conditions)
    ↓
Signal interpreters (meaning)
    ↓
Genome V1 (base + contextual overlay)
    ↓
Decision orchestrator (capability gates)
    ↓
Next Best Action (single primary)
    ↓
Prediction adapter (optional L3 simulations)
    ↓
MarketplaceBrainReport
```

## Entry point

`getMarketplaceBrainReport(productId, contextInput?)` in `lib/marketplace-cognitive-platform/brain/v1/report.ts`.

## Invariants

| Invariant | Status |
|-----------|--------|
| Live ranking unchanged | ✓ |
| Base genome stable across queries | ✓ |
| Autopilot execute denied | ✓ |
| Promotion suppressed on quality gate | ✓ |
| Advisory-only deltas | ✓ |

## Flags

- `CCOS_ENABLED=true`
- `MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true`
- `MARKETPLACE_BRAIN_LEVEL=advisor|simulator` (default: advisor → L2)

## UI

- Seller: «Интеллект карточки» on product edit — summary only
- Admin: `/admin/cognitive/products/[id]?query=&compareQuery=&device=`

## Versions

- `marketplace-brain-v1`
- `genome-v0` base + `genome-v1` contextual overlay
- `context-v1`, `interpreter-v1`, `action-policy-v1`, `prediction-v1`
