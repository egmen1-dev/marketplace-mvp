# CCOS Wave 2 — Knowledge & Experiment Platform

## Goal

Transform CCOS from a point-in-time analyzer into a **controlled self-learning platform** where knowledge accumulates only through verification.

## Pipeline

```
Observation → Evidence → Hypothesis → Experiment → Candidate Knowledge
→ Verification → Verified Knowledge → Memory
```

## Strict rules

1. Observation never becomes Knowledge directly
2. Learning Engine never mutates production
3. Every recommendation requires Evidence
4. Brain reads Verified Knowledge only (not candidates)
5. Learning → Production path is blocked

## Modules

| Module | Path |
|--------|------|
| Knowledge Repository | `lib/ccos/knowledge/repository.ts` |
| Evidence Engine | `lib/ccos/knowledge/evidence-engine.ts` |
| Experiment Registry | `lib/ccos/knowledge/experiments/registry.ts` |
| Approval Workflow | `lib/ccos/knowledge/approval.ts` |
| Knowledge Packs | `lib/ccos/knowledge/packs.ts` |
| Seller Feedback | `lib/ccos/knowledge/feedback.ts` |
| Brain Version Registry | `lib/ccos/knowledge/versions.ts` |
| Timeline | `lib/ccos/knowledge/timeline.ts` |
| Offline Snapshots | `lib/ccos/knowledge/snapshots.ts` |
| Memory | `lib/ccos/memory/store.ts` |

## Marketplace Brain integration

`getMarketplaceBrainReport()` flow (Wave 2):

```
Observations → Verified Knowledge → Reasoning → Decision → Evidence → Recommendation
```

Implementation: `lib/marketplace-cognitive-platform/brain/knowledge-reasoning.ts`

## APIs

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ccos/observations` | Unified Observation Bus |
| `GET /api/ccos/knowledge` | Shared Verified Knowledge read API |
| `GET /api/ccos/brain/mobile` | Compact mobile brain response |
| `POST /api/ccos/brain/mobile` | Brain + knowledge offline bundle |
| `GET /api/ccos/snapshots` | Offline snapshot read |
| `POST /api/ccos/feedback` | Seller feedback → Evidence |

## Flags

- `CCOS_ENABLED=true`
- `CCOS_KNOWLEDGE_PLATFORM_ENABLED=true` (or `MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true`)

## Invariants preserved

- Live ranking unchanged
- Finance / moderation execution isolated
- Autopilot disabled
- Candidate knowledge blocked from Brain until human approval
