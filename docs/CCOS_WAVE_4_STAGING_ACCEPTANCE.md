# CCOS Wave 4 — Staging Acceptance

Epic: **EPIC-77-WAVE-4-STAGING-ACCEPTANCE-001**

## Merge chain

```text
PR #78 Wave 3 Product Genome
↓
PR #79 Wave 5 Digital Twin
↓
PR #80 Wave 4 Knowledge Graph
```

Run acceptance only after all three are merged without conflict.

## Deploy

- Railway project: `marketplace-mvp-backup`
- Environment: production (staging URL)
- Service: `web-v2`
- Verify: `GET /api/version` — staging SHA must match main SHA

## Required flags

```bash
CCOS_ENABLED=true
CCOS_GRAPH_PLATFORM_ENABLED=true
CCOS_TWIN_PLATFORM_ENABLED=true
MARKETPLACE_BRAIN_LEVEL=simulator
```

Do **not** enable live ranking changes.

## Run acceptance

```bash
CCOS_ENABLED=true \
CCOS_GRAPH_PLATFORM_ENABLED=true \
CCOS_TWIN_PLATFORM_ENABLED=true \
MARKETPLACE_COGNITIVE_PLATFORM_ENABLED=true \
tsx scripts/ccos-wave-4-staging-acceptance.ts
```

Output: `artifacts/ccos-wave-4-staging/acceptance-report.json`

## Final matrix

| Gate | Result |
|------|--------|
| Wave 4 deployed | Run script |
| main == staging | `staging_equals_main` |
| Graph build | `graph_build` |
| Causal vs correlation | `causal_vs_correlation` |
| Weighted edges | `edge_provenance` |
| Evidence provenance | `edge_provenance` |
| Confidence propagation | `confidence_propagation_cap` |
| Why traversal | `why_path` |
| Counterfactual | `counterfactual` |
| Category isolation | `category_subgraph` |
| Need Graph merge | `need_graph_merge` |
| Multi-source evidence | `multi_source_evidence` |
| Evidence conflict handling | `evidence_conflict` |
| Versioning | `graph_versioning` |
| Rollback | `graph_rollback` |
| Graph health | `graph_health` |
| Cycle safety | `cycle_safe_traversal` |
| DAOS contract | `daos_contract` |
| QuickSale contract | `quicksale_contract` |
| Twin uses full Graph | `twin_full_graph` |
| Brain uses Graph | `brain_integration` |
| Seller explanation | `seller_ux` |
| Admin debug | `admin_debug_fields` |
| Performance | `performance` |
| Concurrent safety | `concurrency` |
| Live ranking unchanged | `live_search_isolation` |
| Finance isolated | `finance_isolation` |
| Moderation isolated | `moderation_isolation` |
| Mobile Graph API | `mobile_graph_insights_api` |
| Offline Graph cache | `offline_graph_cache` |
| Mobile dashboard | `mobile_dashboard_api` |
| API versioning | `api_versioning` |
| Mobile readiness | `mobile_readiness` |

## Verdict

Only one of:

- `CCOS WAVE 4 KNOWLEDGE GRAPH: ACCEPTED`
- `CCOS WAVE 4 KNOWLEDGE GRAPH: NOT ACCEPTED`

Sub-verdicts:

| Area | Values |
|------|--------|
| Digital Twin | FULL GRAPH CONNECTED / NOT CONNECTED |
| Marketplace Brain | GRAPH-AWARE / NOT GRAPH-AWARE |
| Live ranking | UNCHANGED |
| Autopilot | DISABLED |
| App readiness | READY / NOT_READY |

## After ACCEPTED

Proceed to **EPIC-77-WAVE-6 — Cognitive Evolution Engine** only after Wave 4 staging acceptance passes.

## Roadmap rule (from Wave 4 onward)

Each subsequent Wave must ship **minimum 2 concrete App Release deliverables** (real endpoints, version contracts, offline cache, deep links, push/auth foundation — not abstract “mobile ready”).

Wave 4 app deliverables:

1. `GET/POST /api/ccos/graph/insights?compact=1` — compact mobile payload
2. `GET /api/mobile/dashboard?productId=` — Brain + Genome + Graph + Twin bundle
3. `GET /api/mobile/readiness` — app readiness checklist with API contract version
4. `GET/POST /api/ccos/graph/cache` — offline graph snapshot

## Evidence artifacts

Save during manual UI pass:

- `ccos-graph-admin.png`
- `ccos-graph-why-path.png`
- `ccos-graph-health.png`
- `ccos-graph-counterfactual.png`
- `ccos-graph-version-diff.png`
- `ccos-mobile-graph-insight.png`
- `ccos-mobile-dashboard-response.png`
- `ccos-twin-full-graph.png`
