# CCOS Full Stack Staging Acceptance

EPIC-77-STACKED-MERGE-AND-STAGING-ACCEPTANCE-001

## Script

```bash
CCOS_ENABLED=true \
CCOS_GRAPH_PLATFORM_ENABLED=true \
CCOS_TWIN_PLATFORM_ENABLED=true \
MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true \
tsx scripts/ccos-full-stack-staging-acceptance.ts
```

Artifact: `artifacts/ccos-full-stack-staging/acceptance-report.json`

## Hard gates

| Gate | Requirement |
|---|---|
| `main == staging` | `/api/version` commit matches `origin/main` |
| Dependency clean | cycles=0, violations=0 |
| Health | `/api/health` OK |
| Wave 4 | Graph staging matrix (see `docs/CCOS_WAVE_4_STAGING_ACCEPTANCE.md`) |
| Wave 5 | Twin full graph connected, combo scenarios |
| Graph/Twin confidence | Twin ≤ graph cap × 1.05 |
| Evolution readiness | Honest — no `ready=true` if staging not accepted |
| Live ranking | Unchanged |
| Mobile smoke | bootstrap, config, navigation, readiness, deep-link, auth |

## Wave runtime smoke (post-deploy)

### Wave 1
Context engine, Brain report, simulator mode, NBA advisory.

### Wave 2
Verified knowledge, evidence, seller feedback, mobile Brain APIs.

### Wave 3
Product Identity, Genome, Need Graph, seller product-understanding UI.

### Wave 4
Full matrix from Wave 4 staging doc — causal graph, provenance, rollback, cycle safety.

### Wave 5
Twin uses Wave 4 graph (not fallback bridge); real product scenario scenarios.

## Mobile staging smoke

Deployed checks for:

- `/api/mobile/bootstrap`
- `/api/mobile/config`
- `/api/mobile/dashboard`
- `/api/mobile/readiness`
- `/api/mobile/navigation`
- `/api/mobile/deep-link/resolve`
- `/api/mobile/android/update`
- `POST /api/mobile/auth/session`

Payload sizes and latency recorded in acceptance artifact.

## Verdicts (updated after run)

See latest `artifacts/ccos-full-stack-staging/acceptance-report.json`.

```text
CCOS FULL STACK STAGING:     (see artifact)
WAVE 4 KNOWLEDGE GRAPH:      (see artifact)
WAVE 5 DIGITAL TWIN:         (see artifact)
EVOLUTION ENGINE READINESS:  (see artifact)
APP SHELL READINESS:         (see artifact)
```

## STOP conditions

If `staging SHA != origin/main SHA` → **STOP** — do not claim staging acceptance.

If Railway deploy fails → document blocker, do not start Wave 6.
