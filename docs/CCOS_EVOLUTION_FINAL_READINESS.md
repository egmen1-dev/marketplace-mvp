# CCOS Evolution Final Readiness

EPIC-77-PRE-WAVE-6-FINAL-GATE-002

## API

`GET /api/admin/ccos/evolution-readiness` (admin session required)

## Prerequisites (all must be true for `ready: true`)

| Check | Source |
|---|---|
| dependencyClean | `tsx scripts/ccos-rc-dependency-audit.ts` |
| graphAccepted | Wave 4 full staging acceptance on deployed main |
| twinAccepted | Wave 5 full graph connected on staging |
| brainVersioned | `resolveRollbackVersionPointers().brain` |
| knowledgeVersioned | Knowledge pack version |
| rollbackAvailable | Verified previous graph/brain/knowledge + rollback foundation |
| shadowSimulationAvailable | ShadowEvaluation stub |
| humanApprovalFoundation | CognitiveApproval interface |

## Rollback foundation (FINAL-GATE-002)

Verified version pointers:

```text
currentGraphVersion / previousGraphVersion
currentBrainVersion / previousBrainVersion
currentKnowledgeVersion / previousKnowledgeVersion
```

Operations (human approval required — no automatic rollback):

- `rollbackGraphVersion({ fromVersion, toVersion, approvedBy, reason })`
- `rollbackBrainVersion(...)`
- `performKnowledgePackRollback(...)`

Each rollback writes audit log entry (artifact, from, to, reason, requestedBy, approvedBy, timestamp).

## Anti-fake rules

`ready: true` is **forbidden** when:

- Graph not accepted on staging
- Twin not accepted on staging
- `main != staging`
- Rollback not verified (previous version must exist with provenance + acceptance)
- Production promotion not explicitly disabled

## Current expected state (post final gate, local)

```text
dependencyClean: true
rollbackAvailable: true
ready: true (when graphAccepted + twinAccepted on staging)
productionPromotionDisabled: true
```

## Wave 6 gate

Only when:

```text
FULL STACK STAGING = ACCEPTED
AND WAVE 4 = ACCEPTED
AND WAVE 5 = ACCEPTED
AND DEPENDENCY CLEAN = YES
AND rollbackAvailable = true
AND EVOLUTION ENGINE READINESS = READY
AND APP_SHELL_READY = YES
```

→ EPIC-77-WAVE-6 Cognitive Evolution Engine

## Related

- `docs/CCOS_EVOLUTION_READINESS.md`
- `docs/CCOS_PRE_WAVE_6_FINAL_GATE_ACCEPTANCE.md`
- `lib/ccos/rollback/`
