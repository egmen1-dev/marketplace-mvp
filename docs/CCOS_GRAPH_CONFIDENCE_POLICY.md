# CCOS Graph Confidence Policy

## Propagation

Graph confidence is computed from node confidences and edge weights:

```typescript
propagateGraphConfidence(nodes, edges)
```

Per-edge propagated signal: `min(fromConf, toConf) * weight`.

## Brain / recommendation cap

Brain and mobile insights must not exceed graph confidence:

```typescript
capRecommendationConfidence(graphConfidence, rawConfidence)
// cap = max(0.25, graphConfidence * 1.05)
```

Example: edge confidence 0.40 → Brain recommendation must not become 0.95.

## Twin integration

Twin confidence uses:

- `graphCoverage`
- `graphPropagatedConfidence` (Wave 4 full graph)

Twin overall is capped by graph propagated confidence when available.

## Seller copy policy

| Confidence | Language |
|------------|----------|
| `< 0.55` | Tentative: «Есть признаки, что…» |
| `≥ 0.55` | Direct cause statement allowed |

Implemented in `lib/ccos/graph/seller-copy.ts`.

## Evidence conflict

When sources disagree (positive vs negative claim polarity):

- Do **not** blind-average upward
- Lower confidence (~×0.55 of min)
- Set `conflict: true` on aggregated evidence
- Preserve all source provenance

## Low-confidence edges

Edges with `confidence < 0.45` increment `health.lowConfidenceEdgeCount`. Brain must not treat them as strong causal drivers.
