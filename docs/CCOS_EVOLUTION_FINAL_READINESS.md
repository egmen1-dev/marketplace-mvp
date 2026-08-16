# CCOS Evolution Final Readiness

EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001

## API

`GET /api/admin/ccos/evolution-readiness` (admin session required)

## Prerequisites (all must be true for `ready: true`)

| Check | Source |
|---|---|
| dependencyClean | `tsx scripts/ccos-rc-dependency-audit.ts` |
| graphAccepted | Wave 4 full staging acceptance on deployed main |
| twinAccepted | Wave 5 full graph connected on staging |
| brainVersioned | `resolveVersionPointers().brain` |
| knowledgeVersioned | Knowledge pack version |
| rollbackAvailable | Graph rollback + brain previous version |
| shadowSimulationAvailable | ShadowEvaluation stub |
| humanApprovalFoundation | CognitiveApproval interface |

## Anti-fake rules

`ready: true` is **forbidden** when:

- Graph not accepted on staging
- Twin not accepted on staging
- `main != staging`
- Rollback not verified
- Production promotion not explicitly disabled

## Current expected state (pre-full-stack deploy)

```text
dependencyClean: true (local)
graphAccepted: false (staging on Wave 0)
twinAccepted: false
ready: false
productionPromotionDisabled: true
```

## Wave 6 gate

Only when:

```text
FULL STACK STAGING = ACCEPTED
AND WAVE 4 = ACCEPTED
AND WAVE 5 = ACCEPTED
AND DEPENDENCY CLEAN = YES
AND EVOLUTION READINESS = READY
```

→ EPIC-77-WAVE-6 Cognitive Evolution Engine

## Related

- `docs/CCOS_EVOLUTION_READINESS.md`
- `docs/CCOS_FULL_STACK_STAGING_ACCEPTANCE.md`
