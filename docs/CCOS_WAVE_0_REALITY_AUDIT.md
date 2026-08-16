# CCOS Wave 0 — Reality Audit

Audit date: 2026-08-16 · base commit: `e785ef2` (main at Wave 0 start)

This document records what exists in `main` before EPIC-77-WAVE-0 merge, what is advisory vs production-enforcing, and which modules are publisher candidates.

## Summary

| Area | Status |
|---|---|
| Content Quality | **Merged**, snapshot-backed, seller UI + admin center |
| Ranking Intelligence | **Merged**, advisory layer; live sort unchanged |
| Ranking Lab | **Merged**, analysis-only (admin + academy) |
| Trust Score | **Merged**, feeds ranking inputs; moderation separate |
| Trust Loop | **Merged**, seller moderation preview |
| Seller BI / Promotion | **Merged**, separate seller islands |
| Wallet / Financial Engine | **Merged**, execution boundary — CCOS must not touch |
| Discovery / Conversion | **Merged**, feature-flagged islands |
| MIP (`marketplace-intelligence-platform`) | **Not present** — described in prior epics only |
| MCP / CCOS (`lib/ccos`, `lib/marketplace-cognitive-platform`) | **Wave 0 adds foundation** |

## Capability matrix

| Capability | Existing module | Production use | Advisory | Publisher candidate |
|---|---|---:|---:|---:|
| Content quality scoring | `lib/marketplace-content-quality/` | Yes (when `MARKETPLACE_CONTENT_QUALITY_ENABLED`) | Partial (gates enforced elsewhere) | Yes |
| Photo / SEO / consistency critics | `lib/marketplace-content-quality/` | Snapshot + seller card | Advisory recommendations | Yes |
| Trust score (seller/product) | `lib/marketplace-trust-score/` | Ranking input + admin | Mostly advisory display | Yes |
| Trust loop / moderation preview | `lib/marketplace-trust-loop/` | Preview + enforcement path | Mixed | Partial (gate mirror) |
| Ranking intelligence | `lib/marketplace-ranking-intelligence/` | Snapshots + dashboards | **Advisory only** | Yes |
| Ranking lab 100/1000 | `lib/ranking-lab/` | Admin/lab analysis | **Advisory only** | No (lab-only) |
| Behaviour metrics (views, orders) | `lib/marketplace-ranking-intelligence/queries` | Ranking inputs | Indirect | Yes |
| Seller business intelligence | `lib/seller-business-intelligence/` | Seller hub | Advisory | Future |
| Seller promotion center | `lib/seller-promotion-center/` | Billing/visibility execution | Execution | No (execution) |
| Wallet / payments | `lib/lot-wallet/` | **Production execution** | No | **Forbidden** |
| Financial transaction engine | `lib/financial-transaction-engine/` | **Production execution** | No | **Forbidden** |
| Discovery collections | `lib/marketplace-discovery/` | Feature-flagged UX | Advisory merchandising | Future |
| Marketplace conversion | `lib/marketplace-conversion/` | Completeness scoring | Advisory | Partial |
| MIP unified platform | — (docs only) | No | N/A | Superseded by CCOS Wave 0 |
| MCP 12-layer stack | — (docs only) | No | N/A | Implemented as MCP binding in Wave 0 |

## Feature flags observed

- `MARKETPLACE_CONTENT_QUALITY_ENABLED` — primary CQ gate; staging often `true`
- `MARKETPLACE_RANKING_INTELLIGENCE_ENABLED` — ranking advisory dashboards
- `MARKETPLACE_TRUST_SCORE_MODEL_ENABLED` — trust score model
- `MARKETPLACE_TRUST_LOOP_ENABLED` — seller moderation preview
- Wave 0 adds: `CCOS_ENABLED`, `MARKETPLACE_COGNITIVE_PLATFORM_ENABLED` (both default **off**)

## Production behaviour invariant (Wave 0)

When `CCOS_ENABLED=false` (default):

- No cognitive seller block
- No admin cognitive route data
- No observation bus side effects
- `resolveOrderBy()` unchanged — regression guarded in tests

## Publisher mapping (Wave 0)

| Publisher | Source module | Metrics |
|---|---|---|
| Content Quality | `marketplace-content-quality` | `content.*`, `visual.*`, `seo.*`, gates |
| Trust | `marketplace-trust-score` | `trust.*` |
| Behaviour | ranking input / analytics | `behaviour.*` (null + low confidence on cold start) |
| Ranking | `marketplace-ranking-intelligence` | `ranking.*` (advisory-only tags) |

## Verdict

**CCOS WAVE 0 FOUNDATION READY** (code + tests on branch) — not «CCOS READY».

Cross-app publishers (DAOS, QuickSale) are **contract-ready** via `AppId` but **not connected** in Wave 0.
