# CCOS Causal Graph Contract

Contract version: `knowledge-graph-v1`

## Node contract (app-agnostic)

Every node in `lib/ccos/graph/` must be expressible without Prisma or marketplace-specific types.

```typescript
interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  confidence: number;
  packId?: GraphPackId;
  app?: GraphAppId;
  factId?: string;
  evidenceIds?: string[];
}
```

## Edge contract

Every edge must carry full provenance — no “magic” links.

| Field | Required | Description |
|-------|----------|-------------|
| `from` | yes | Source node id |
| `to` | yes | Target node id |
| `weight` | yes | Influence strength 0–1 |
| `confidence` | yes | Edge confidence 0–1 |
| `evidence` | via `evidenceIds` / `sources` | Traceable evidence |
| `source` | via `sources[]` | Origin system/module |
| `version` | yes | Graph engine version |
| `relation` | yes | `causes` \| `influences` \| `correlates` \| `satisfies` \| `blocks` |
| `causal` | yes | Whether edge is causal (not correlation-only) |
| `app` | yes | `marketplace` \| `daos` \| `quicksale` \| … |
| `verified` | recommended | Candidate vs verified promotion |

Validation helper: `assertEdgeProvenance(edge)`.

## Causal vs correlation

- `relation: "causes"` + `causal: true` — admissible causal claim
- `relation: "correlates"` + `causal: false` — observational only
- Single correlation must **not** auto-promote to causal without verified promotion pipeline

## Core marketplace chain

```text
Photo (0.42) → CTR (0.31) → Conversion (0.28) → Revenue
```

## Cross-app extension

Synthetic nodes/edges from DAOS and QuickSale use `app` field without importing their codebases.

## Marketplace adapter

`lib/marketplace-cognitive-platform/graph/adapter.ts` maps DB observations → graph build input. Core engine stays in `lib/ccos/graph/`.
