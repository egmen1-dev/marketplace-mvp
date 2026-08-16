# CCOS Knowledge Pipeline

## Entities

| Entity | Meaning |
|---|---|
| Observation | Raw measurement |
| Evidence | Human-readable claim supported by observation IDs |
| Hypothesis | Proposed explanation, status `PROPOSED` in Wave 0 |
| Knowledge | Verified fact (not auto-created in Wave 0) |

## Strict rule

```text
Observation ↛ production rule
```

Allowed path:

```text
Observation
  ↓ Evidence
  ↓ Hypothesis
  ↓ Experiment
  ↓ Verified Knowledge
  ↓ Candidate Brain Version
  ↓ Validation
  ↓ Human Approval
  ↓ Production
```

## Wave 0 API

- `KnowledgeRepository` interface + `InMemoryKnowledgeRepository`
- `createEvidence()`, `proposeHypothesis()` — status stays `PROPOSED`
- `tryPromoteObservationToKnowledge()` — throws (safety test)

## Wave 2 extensions

- Full `KnowledgeFact` lifecycle: candidate → verified → deprecated → archived
- `approveKnowledge()` human approval workflow
- `completeExperiment()` → candidate knowledge
- Evidence Engine auto-builds evidence for Brain recommendations
- Shared read API: `/api/ccos/knowledge`
- Mobile compact API: `/api/ccos/brain/mobile`

See `docs/CCOS_WAVE_2_KNOWLEDGE_PLATFORM.md`.

## Evidence contract

Claims must be readable:

- Good: `CTR 1.8% при медиане категории 3.1%`
- Bad: `score=0.445`

## Persistence

Wave 0: in-memory only. Interface allows future Prisma/graph backends without changing publishers.

## Learning

No automatic weight learning or production promotion in Wave 0.
