# CCOS Prediction Engine Adapter

Location: `lib/marketplace-cognitive-platform/brain/v1/prediction.ts`

## Adapter

Wraps `lib/ranking-lab/sensitivity-engine.ts` — **does not rewrite** ranking lab.

## Rules

- Simulations only when `MARKETPLACE_BRAIN_LEVEL=simulator` (L3) or `includeSimulations=true`
- No fabricated metrics — only available model outputs
- Low confidence → qualitative wording (`умеренное`, not fake `+11%`)
- `advisoryOnly: true` always

## Version

`PREDICTION_VERSION = prediction-v1`

## Lazy load

Default: simulations off on seller page load; admin/on-demand only.
