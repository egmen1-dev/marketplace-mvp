# CCOS Evolution Readiness

EPIC-77-PRE-WAVE-6 — prerequisites only. **No Evolution Engine in this epic.**

## Purpose

Gate Wave 6 (Cognitive Evolution Engine) behind honest readiness checks.

## API

`GET /api/admin/ccos/evolution-readiness` (admin session required)

Example response shape:

```json
{
  "ready": false,
  "checks": {
    "dependencyClean": true,
    "graphAccepted": true,
    "twinAccepted": true,
    "brainVersioned": true,
    "knowledgeVersioned": true,
    "rollbackAvailable": true,
    "shadowSimulationAvailable": true,
    "humanApprovalFoundation": true
  },
  "productionPromotionDisabled": true
}
```

## Prerequisites checklist

| Check | Meaning |
|---|---|
| Dependency clean | 0 marketplace imports in `lib/ccos`, 0 cycles |
| Graph accepted | Wave 4 staging gate passed on deployed main |
| Twin accepted | Wave 5 full graph connected on staging |
| Brain versioned | Current/previous brain version pointers |
| Knowledge versioned | Knowledge pack version tracked |
| Rollback available | Graph rollback + brain previous version |
| Shadow simulation | `ShadowEvaluation` contract stub |
| Human approval | `CognitiveApproval` interface defined |

## Contracts (foundation only)

- `CognitiveApproval` — human gate for brain/knowledge/graph versions
- `ShadowEvaluation` — compare current vs candidate brain (stub)
- `resolveVersionPointers()` — current/previous for brain, graph, knowledge

## Hard blocks

- `productionPromotionDisabled: true` always in PRE-WAVE-6
- Autopilot (L4) remains OFF
- Live ranking unchanged
- No automatic weight tuning
- No candidate → production promotion

## Admin UI

`/admin/ccos` shows **Evolution Readiness** section with prerequisite rows (not Evolution Engine).

## When `ready: true`

Only after **all** checks pass **and** merge chain + staging acceptance complete. Even then, Wave 6 is a separate epic — this API does not start evolution.
