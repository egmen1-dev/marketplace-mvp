# CCOS Wave 4 — Cognitive Knowledge Graph Platform

## Goal

Transform Knowledge from a flat fact table into a **causal model** of the marketplace. Brain can answer not only «CTR +12», but **why** — through Photo → CTR → Conversion → Revenue paths with weights and confidence propagation.

## Pipeline

```
Observation → Evidence → Candidate → Graph → Verified Knowledge
```

Graph reasoning complements Twin simulation:

- **Twin** — «what happens if we change X?»
- **Graph** — «why is X happening?» and counterfactual reasoning

## Modules

| Deliverable | Path |
|-------------|------|
| Universal Graph Engine | `lib/ccos/graph/engine.ts` |
| Causal edges | `lib/ccos/graph/edges.ts` |
| Causal Engine | `lib/ccos/graph/causal.ts` |
| Evidence Aggregator | `lib/ccos/graph/evidence-aggregator.ts` |
| Knowledge Promotion | `lib/ccos/graph/promotion.ts` |
| Confidence Propagation | `lib/ccos/graph/confidence.ts` |
| Graph Traversal | `lib/ccos/graph/traversal.ts` |
| Counterfactual Engine | `lib/ccos/graph/counterfactual.ts` |
| Category Packs (subgraphs) | `lib/ccos/graph/packs.ts` |
| Cross-App Graph | `lib/ccos/graph/cross-app.ts` |
| Graph Versioning | `lib/ccos/graph/versioning.ts` |
| Graph Health | `lib/ccos/graph/health.ts` |
| Offline Cache | `lib/ccos/graph/cache.ts` |
| Builder | `lib/ccos/graph/builder.ts` |

## Core causal chain

```
Photo  --0.42-->  CTR  --0.31-->  Conversion  --0.28-->  Revenue
```

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/ccos/graph/insights` | Mobile Graph Insights |
| `GET/POST /api/ccos/graph/cache` | Offline graph cache |
| `GET /api/mobile/dashboard` | Brain + Genome + Graph + Twin bundle |
| `GET /api/mobile/readiness` | Release readiness checklist |

## Brain integration

- `getMarketplaceBrainReport()` adds `knowledgeGraph`, `graphInsights`, `graphHealth`
- Report confidence capped by `propagateGraphConfidence()`
- Brain version: `marketplace-brain-v4-graph`

## Flags

- `CCOS_ENABLED=true`
- `CCOS_GRAPH_PLATFORM_ENABLED=true` (or twin/product/cognitive flags)

## Invariants preserved

- Advisory-only graph reasoning
- Live ranking unchanged
- Finance / moderation execution isolated
- Autopilot disabled
- Twin bridge `buildCausalKnowledgeGraph()` preserved for Wave 5
