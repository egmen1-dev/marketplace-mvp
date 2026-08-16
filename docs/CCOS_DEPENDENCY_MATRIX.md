# CCOS Dependency Rule Matrix

EPIC-77-PRE-WAVE-6 — architecture boundary reference.

## Layer stack

```text
External Apps (DAOS, QuickSale, mobile shell)
        ↓
Application Routes (Next.js app/api, admin UI)
        ↓
Marketplace Binding (lib/marketplace-cognitive-platform/adapters)
        ↓
CCOS Core (lib/ccos/*)
        ↓
Execution Systems (finance, moderation — isolated)
```

## Rule matrix

| From | To | Allowed | Notes |
|---|---|---|---|
| Marketplace adapter | CCOS Core | YES | Implements simulation/knowledge ports |
| CCOS Core | Marketplace adapter | NO | Hard gate — use `RankingSimulationPort` |
| CCOS Core | Prisma marketplace models | NO | Adapters own persistence |
| CCOS Core | marketplace-ranking-intelligence | NO | Moved to adapter layer |
| Application routes | CCOS Core | YES | HTTP boundary |
| Application routes | Marketplace adapter | YES | Composition root |
| DAOS publisher | CCOS Core | YES | Observation/knowledge ingress |
| CCOS Core | DAOS internals | NO | Contract-only boundary |
| QuickSale publisher | CCOS Core | YES | Observation ingress |
| CCOS Core | QuickSale internals | NO | Contract-only boundary |
| UI | Marketplace Brain report | YES | Read-only advisory |
| Financial Engine | CCOS Core | NO dependency required | Finance isolated |
| Moderation execution | CCOS Core | NO dependency required | Trust loop isolated |
| Twin | Simulation port interface | YES | DI via registry |
| Twin | Shadow ranking implementation | NO | Adapter implements port |
| Evolution (future) | CCOS ports | YES | ShadowEvaluation contract |
| CCOS Core | Evolution Engine | NO | Wave 6+ only via contracts |

## Forbidden directions (enforced by audit v2)

1. `CCOS Core → Marketplace Binding` — any `@/lib/marketplace*` import inside `lib/ccos`
2. `CCOS Core → Execution Systems` — finance/moderation write paths
3. `Twin → Ranking implementation` — must use `RankingSimulationPort`

## Verification

```bash
tsx scripts/ccos-rc-dependency-audit.ts
```

Expected after PRE-WAVE-6:

```text
cycles = 0
marketplaceImportsInsideCcos = 0
forbiddenEdges = 0
```
