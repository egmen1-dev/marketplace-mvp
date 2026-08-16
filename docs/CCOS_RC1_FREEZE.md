# EPIC 77 — Release Candidate Freeze (RC-1)

**No new cognitive features.** Audit and mobile entrypoints only — gate before Wave 6 Evolution Engine.

## Chain validated

```text
Foundation → Brain → Knowledge → Product → Graph → Twin
→ (staging validation) → RC-1 → Evolution
```

## RC Deliverable 1 — Dependency Audit

Script:

```bash
tsx scripts/ccos-rc-dependency-audit.ts
```

Output: `artifacts/ccos-rc-1/dependency-audit.json`

Checks:

| Check | Description |
|-------|-------------|
| Module graph | Edges between `lib/ccos/*` modules |
| Cycles | Must be **0** (`passed: true`) |
| Marketplace imports in `lib/ccos` | Must trend to **0** (`architectureClean`) |
| Adapter boundaries | `lib/marketplace-cognitive-platform/*` uses CCOS via adapters |

### Known RC-1 architecture debt

`lib/ccos/twin/*` imports `@/lib/marketplace-ranking-intelligence` for shadow ranking simulation. Audit reports this; extract to adapter port before Wave 6.

## RC Deliverable 2 — CCOS Readiness Dashboard

Admin UI: **`/admin/ccos`**

API: `GET /api/admin/ccos/readiness` (admin session)

Shows platform rows: Observation, Knowledge, Graph, Twin, Brain, Marketplace, DAOS/QuickSale stubs, Learning/Evolution pending, Autopilot off, Android/Offline API status.

## App Release deliverables (≥2)

### 1. `GET /api/mobile/bootstrap`

Stable app launch bundle:

- API + schema version
- Feature flags
- Brain capabilities + maturity
- Supported schema versions
- Recommended sync interval (900s)
- Endpoint map

### 2. `GET /api/mobile/config`

Client configuration decoupled from backend deploy:

- Supported features list
- Module enablement + Graph/Twin contract versions
- Environment URLs (dev/staging/prod)
- Release channel
- Payload limits

Both require `CCOS_ENABLED=true`.

## RC exit criteria

| Gate | Required |
|------|----------|
| Wave 4 staging ACCEPTED | yes |
| Dependency cycles | 0 |
| Architecture clean | twin port extracted (or waived with plan) |
| Readiness dashboard | all core rows `ready` |
| Mobile bootstrap + config | deployed |
| Evolution | still `pending` |

## After RC

Start **Wave 6 — Cognitive Evolution Engine** as **brain version management**, not opaque learning:

```text
Brain vN → Graph Validation → Twin Validation → Regression → Shadow → Approval → Brain vN+1 → Rollback
```

## Roadmap rule

Each Wave ships ≥2 concrete App Release deliverables. RC-1 adds bootstrap + config on top of Wave 4 mobile APIs.
